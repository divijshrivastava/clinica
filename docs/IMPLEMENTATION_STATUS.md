# Doctor Scheduling System - Implementation Status

## Overview

This document tracks the implementation status of the comprehensive doctor scheduling system based on the specifications in `DOCTOR_SCHEDULING_SPECIFICATION.md` and `DOCTOR_SCHEDULING_EXTENSIONS.md`.

**Last Updated:** 2026-01-10

---

## ✅ Completed Components

### 1. Database Schema (100% Complete)

All database tables, indexes, and constraints have been implemented in `schema.sql`:

#### Core Tables:
- **departments** - Department master data
- **locations** - Multi-location support for clinic chains
- **doctor_profiles** - Comprehensive doctor profile data
  - Specialties, qualifications, languages
  - Consultation modes (in-person, tele)
  - Fees configuration
  - Status tracking (draft → pending_verification → active)
  - Bookability indicators

- **doctor_department_assignments** - Many-to-many doctor-department relationships
- **doctor_location_assignments** - Multi-location doctor assignments
- **doctor_onboarding_states** - Onboarding workflow state tracking

#### Schedule Tables:
- **doctor_schedules** - Recurring weekly base schedules
- **schedule_overrides** - Specific date overrides
- **schedule_exceptions** - Emergency unavailable, forced blocks, holidays
- **leave_requests** - Leave management with approval workflow

#### Slot & Booking Tables:
- **appointment_slots** - Pre-generated slots with capacity tracking
- **tentative_holds** - Temporary slot reservations with auto-release
- **appointment_room_assignments** - Room assignment history

#### Resource Tables:
- **rooms** - Consultation room management
- **equipment** - Equipment tracking and maintenance

#### Materialized Views:
- **doctor_availability_cache** - Performance-optimized availability lookup

#### Enums Added:
- `doctor_status`, `onboarding_stage`, `stage_status`, `verification_status`
- `leave_status`, `leave_type`, `schedule_source`
- `slot_status`, `hold_type`, `consultation_mode`

#### Event Store Enhancements:
- Added 47 new event types for doctor scheduling
- Added 8 new aggregate types
- Updated event-aggregate mapping constraints

#### Indexes:
- Performance indexes on all lookup patterns
- GIN indexes for JSONB columns (specialties, qualifications)
- Partial indexes for active/non-deleted records
- Composite indexes for common query patterns

---

### 2. Event Sourcing Types (100% Complete)

Updated `/backend/src/event-sourcing/types.ts`:

#### New Aggregate Types:
- `doctor_profile`
- `doctor_schedule`
- `appointment_slot`
- `room`
- `equipment`
- `leave_request`
- `department`
- `location`

#### New Event Types (47 total):
- **Doctor Profile Events (14):** profile creation, specialty/qualification management, department/location assignment, fee updates, status changes, verification, activation
- **Doctor Schedule Events (12):** base schedule CRUD, overrides, leave management, exceptions, forced blocks, holidays
- **Appointment Slot Events (8):** slot generation, blocking, capacity changes, tentative holds
- **Resource Events (9):** room/equipment CRUD, assignment, maintenance
- **Master Data Events (4):** department/location management

---

### 3. Command Handlers (Partial - Core Commands Implemented)

Created command handlers in `/backend/src/commands/`:

#### Implemented:
- ✅ **create-doctor-profile.ts** - Create new doctor profiles with full validation
  - User linkage, specialties, qualifications
  - License tracking, fees configuration
  - Initial onboarding state creation

- ✅ **update-doctor-fees.ts** - Update consultation fees
  - Consultation, follow-up, tele-consultation fees
  - Multi-currency support (default INR)

- ✅ **create-base-schedule.ts** - Create recurring weekly schedules
  - Day/time configuration
  - Slot duration and buffer time
  - Capacity limits for in-person and tele
  - Effective date ranges

#### Validation Features:
- Comprehensive payload validation
- Field-level error reporting
- Date/time format validation
- Business rule enforcement (e.g., end_time > start_time)

---

### 4. Projection Handlers (Partial - Core Projections Implemented)

Created projection handlers in `/backend/src/projections/handlers/`:

#### Implemented:
- ✅ **doctor-profile-projection.ts** - Handles 14 doctor profile events
  - Profile CRUD operations
  - Department/location assignment tracking
  - Fee updates
  - Status changes and activation workflow
  - Auto-creates onboarding state

- ✅ **doctor-schedule-projection.ts** - Handles 12 schedule events
  - Base schedule CRUD
  - Schedule overrides
  - Leave request workflow (request → approve/reject → cancel)
  - Exception management (emergency, forced blocks, holidays)

#### Projection Features:
- Idempotent event handling
- Aggregate version tracking
- Event sourcing audit trail (last_event_id)
- Optimistic concurrency support

---

## 🚧 In Progress

### 5. Slot Generation Algorithm (30% Complete)

**Status:** Core logic designed, implementation pending

**What's Needed:**
- Background job/cron to pre-generate slots 90 days ahead
- Algorithm to:
  1. Fetch all active doctor schedules
  2. Resolve conflicts using priority model (Forced Block → Emergency → Leave → Holiday → Override → Base)
  3. Generate slots respecting buffer time
  4. Assign room availability
  5. Store in `appointment_slots` table
- Slot regeneration on schedule changes
- Conflict detection and resolution

**Technical Approach:**
```typescript
// Pseudo-code
async function generateSlotsForDoctor(
  doctorProfileId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // 1. Get all schedule sources (base, overrides, exceptions)
  // 2. Apply priority-based conflict resolution
  // 3. For each effective schedule:
  //    - Generate slots based on slot_duration + buffer
  //    - Check room availability
  //    - Insert into appointment_slots table
  // 4. Emit slots_generated event
}
```

---

## 📋 Pending Components

### 6. Remaining Command Handlers

**Need to Implement:**
- `assign-doctor-to-department.ts` - Department assignment
- `assign-doctor-to-location.ts` - Location assignment
- `activate-doctor.ts` - Activate doctor profile
- `add-schedule-override.ts` - Specific date overrides
- `request-leave.ts` - Leave request submission
- `approve-leave.ts` - Leave approval workflow
- `reject-leave.ts` - Leave rejection workflow
- `add-forced-block.ts` - Admin-only unavailability
- `create-tentative-hold.ts` - Reserve slot temporarily
- `release-tentative-hold.ts` - Release held slot
- `generate-slots.ts` - Trigger slot generation
- `block-slot.ts` - Block specific slot
- `create-room.ts` - Room management
- `create-equipment.ts` - Equipment management

**Priority:** High (needed for MVP)

---

### 7. Remaining Projection Handlers

**Need to Implement:**
- `appointment-slot-projection.ts` - Handle slot events
  - Slot generation, blocking, capacity updates
  - Tentative hold tracking
  - Slot booking state changes

- `tentative-hold-projection.ts` - Handle hold events
  - Hold creation, release, expiration
  - Auto-release mechanism (cron job)

- `resource-projection.ts` - Handle room/equipment events
  - Room CRUD
  - Equipment CRUD and maintenance tracking

- `department-projection.ts` - Handle department events
- `location-projection.ts` - Handle location events

**Priority:** High (needed for MVP)

---

### 8. Backend Services

**Need to Implement:**

#### Slot Generation Service:
```typescript
// backend/src/services/slot-generation-service.ts
class SlotGenerationService {
  async generateSlotsForDateRange(doctorId, startDate, endDate): Promise<void>
  async regenerateSlotsForDoctor(doctorId): Promise<void>
  async handleScheduleChange(scheduleId): Promise<void>
}
```

#### Bookability Evaluation Service:
```typescript
// backend/src/services/bookability-service.ts
class BookabilityService {
  async evaluateBookability(doctorId): Promise<BookabilityCheck>
  async updateBookabilityScore(doctorId): Promise<number>
}
```

#### Hold Auto-Release Service:
```typescript
// backend/src/services/hold-release-service.ts
class HoldReleaseService {
  async processExpiredHolds(): Promise<void> // Cron: every minute
  async releaseHold(holdId, reason): Promise<void>
}
```

**Priority:** High (core business logic)

---

### 9. API Routes

**Need to Implement:**
```
POST   /api/doctors                    - Create doctor profile
GET    /api/doctors                    - List doctors (with filtering)
GET    /api/doctors/:id                - Get doctor profile
PUT    /api/doctors/:id                - Update doctor profile
PUT    /api/doctors/:id/fees           - Update fees
POST   /api/doctors/:id/departments    - Assign to department
POST   /api/doctors/:id/locations      - Assign to location
POST   /api/doctors/:id/activate       - Activate doctor
POST   /api/doctors/:id/deactivate     - Deactivate doctor

POST   /api/doctors/:id/schedules      - Create base schedule
GET    /api/doctors/:id/schedules      - List schedules
PUT    /api/schedules/:id              - Update schedule
DELETE /api/schedules/:id              - Delete schedule

POST   /api/schedules/:id/overrides    - Add override
POST   /api/schedules/:id/exceptions   - Add exception

POST   /api/leave-requests             - Request leave
GET    /api/leave-requests             - List leave requests
POST   /api/leave-requests/:id/approve - Approve leave
POST   /api/leave-requests/:id/reject  - Reject leave

GET    /api/slots/availability         - Search available slots
POST   /api/slots/:id/hold             - Create tentative hold
DELETE /api/slots/:id/hold             - Release tentative hold
POST   /api/slots/:id/book             - Book appointment (converts hold)

GET    /api/rooms                      - List rooms
POST   /api/rooms                      - Create room
GET    /api/equipment                  - List equipment
POST   /api/equipment                  - Create equipment
```

**Priority:** High (needed for frontend integration)

---

### 10. Frontend Components

**Need to Implement:**

#### Doctor Management:
- `DoctorListPage.tsx` - List all doctors with search/filter
- `DoctorDetailPage.tsx` - View/edit doctor profile
- `CreateDoctorPage.tsx` - Create new doctor profile
- `DoctorOnboardingPage.tsx` - Onboarding workflow wizard
- `DoctorFeesManagement.tsx` - Manage consultation fees
- `DoctorScheduleEditor.tsx` - Visual schedule editor (drag-and-drop)

#### Schedule Management:
- `WeeklyScheduleEditor.tsx` - Edit recurring weekly schedule
- `ScheduleOverridesPage.tsx` - Manage specific date overrides
- `LeaveManagementPage.tsx` - Request and track leave
- `LeaveApprovalPage.tsx` - Department head approval interface

#### Availability & Booking:
- `AvailabilityCalendar.tsx` - Calendar view with slot availability
- `SlotSearchComponent.tsx` - Search slots by doctor/specialty/date
- `BookingWizard.tsx` - Multi-step booking flow
  - Search doctors → Select slot → Patient details → Confirm → Payment
- `TentativeHoldIndicator.tsx` - Show countdown timer for holds

#### Resource Management:
- `RoomManagementPage.tsx` - Manage consultation rooms
- `EquipmentManagementPage.tsx` - Track equipment and maintenance

**Priority:** Medium-High (after backend APIs are ready)

---

### 11. Onboarding Workflow

**Need to Implement:**
- Onboarding wizard with 10 stages (profile → credentials → departments → locations → fees → availability → resources → compliance → approval → activation)
- Verification checks (license, qualifications, background)
- Approval chain tracking
- Blocker management
- Progress dashboard

**Database Support:** ✅ Already in schema (`doctor_onboarding_states` table)
**Events:** ✅ Already defined (`doctor_onboarding_stage_completed`, etc.)
**UI:** ❌ Pending

**Priority:** Medium (can be simplified for MVP)

---

### 12. Bookability Preconditions

**Need to Implement:**
- Evaluate 10 preconditions before allowing bookings:
  1. Profile complete
  2. License verified
  3. Fees configured
  4. At least one location assigned
  5. At least one specialty defined
  6. Base schedule exists
  7. Slots available in next 90 days
  8. No critical verification failures
  9. Status = 'active'
  10. No active forced blocks

- Calculate bookability score (0-100)
- Determine visibility levels:
  - `canShowInSearch()`: bookability_score >= 60 && public_profile_visible
  - `canPatientBook()`: accepts_online_bookings && is_bookable
  - `canReceptionistBook()`: no critical blockers

**Database Support:** ✅ Fields exist in `doctor_profiles`
**Logic:** ❌ Pending service implementation

**Priority:** High (required for production)

---

### 13. Tentative Holds & Auto-Release

**Need to Implement:**
- Create hold on slot selection (10-minute timer for patients, 30 minutes for admin)
- Background worker to auto-release expired holds every minute
- Real-time hold status updates via WebSocket
- Extend hold if payment is in progress
- Convert hold to confirmed booking

**Database Support:** ✅ `tentative_holds` table exists
**Events:** ✅ Already defined
**Logic:** ❌ Pending service + cron job

**Priority:** High (critical for preventing double-booking)

---

### 14. Real-Time Calendar Updates

**Need to Implement:**
- WebSocket server for slot availability updates
- Subscribe to doctor availability by doctor_id or date range
- Emit events:
  - `slot_availability_changed` - When slot becomes available/unavailable
  - `hold_created` - When someone holds a slot
  - `hold_released` - When hold is released
  - `slot_booked` - When appointment is confirmed

**Tech Stack:** Consider using Socket.io or native WebSockets

**Priority:** Medium (nice-to-have for MVP, critical for production)

---

### 15. Analytics & Reporting

**Need to Implement:**
- Doctor utilization rate (booked slots / total slots)
- No-show rate by doctor
- Revenue per doctor (OPD collections)
- Peak hours analysis
- Room utilization
- Wait time estimation
- Slot search-to-booking conversion rate

**Database Support:** ✅ Can be derived from existing tables
**UI:** ❌ Pending dashboard components

**Priority:** Low (post-MVP feature)

---

## 📊 Implementation Progress Summary

| Component | Status | Completion |
|-----------|--------|------------|
| Database Schema | ✅ Complete | 100% |
| Event Types | ✅ Complete | 100% |
| Command Handlers | 🚧 Partial | 25% |
| Projection Handlers | 🚧 Partial | 40% |
| Backend Services | ❌ Not Started | 0% |
| API Routes | ❌ Not Started | 0% |
| Frontend Components | ❌ Not Started | 0% |
| Slot Generation | 🚧 In Progress | 30% |
| Bookability Logic | ❌ Not Started | 0% |
| Tentative Holds | 🚧 Partial | 20% |
| Real-Time Updates | ❌ Not Started | 0% |
| Onboarding Workflow | 🚧 Partial | 15% |
| **Overall Progress** | 🚧 In Progress | **35%** |

---

## 🎯 Recommended Implementation Roadmap

### Phase 1: MVP Foundation (2-3 weeks)
**Goal:** Basic doctor scheduling with manual slot booking

1. ✅ Complete command handlers (7 remaining)
2. ✅ Complete projection handlers (5 remaining)
3. ✅ Implement slot generation service (background job)
4. ✅ Implement bookability evaluation service
5. ✅ Create basic API routes (doctor CRUD, schedule CRUD, slot search)
6. ✅ Build basic frontend (doctor list, schedule editor, slot search)

**Deliverable:** Receptionists can create doctors, set schedules, and book appointments

---

### Phase 2: Patient Booking & Holds (1-2 weeks)
**Goal:** Enable patient self-booking with tentative holds

1. ✅ Implement tentative hold service
2. ✅ Create auto-release cron job
3. ✅ Build booking wizard UI
4. ✅ Add hold countdown timers
5. ✅ Integrate payment gateway (if applicable)

**Deliverable:** Patients can search for doctors and book appointments online

---

### Phase 3: Advanced Features (2-3 weeks)
**Goal:** Multi-location, onboarding, and analytics

1. ✅ Implement onboarding workflow
2. ✅ Build calendar views (day, week, multi-doctor)
3. ✅ Add real-time WebSocket updates
4. ✅ Implement leave management
5. ✅ Build resource allocation (rooms, equipment)
6. ✅ Create analytics dashboard

**Deliverable:** Full-featured scheduling system with enterprise capabilities

---

### Phase 4: Optimization & Polish (1-2 weeks)
**Goal:** Performance tuning and UX improvements

1. ✅ Optimize slot generation algorithm
2. ✅ Cache doctor availability (materialize view refresh)
3. ✅ Add no-show prediction
4. ✅ Implement waitlist management
5. ✅ Add mobile-responsive UI
6. ✅ Load testing and performance tuning

**Deliverable:** Production-ready system at scale

---

## 🧪 Testing Strategy

### Unit Tests:
- Command handler validation logic
- Projection handler event processing
- Slot generation algorithm
- Bookability precondition evaluation
- Hold auto-release logic

### Integration Tests:
- End-to-end booking flow (search → hold → book → confirm)
- Schedule conflict resolution
- Leave approval workflow
- Room assignment logic

### Load Tests:
- Concurrent slot booking (race conditions)
- Hold expiration under high load
- WebSocket connection handling
- Slot search performance (10k+ doctors)

---

## 🚀 Next Steps

### Immediate (This Week):
1. Complete remaining command handlers (7 commands)
2. Complete remaining projection handlers (5 projections)
3. Implement slot generation service
4. Create basic API routes

### Short Term (Next 2 Weeks):
1. Build frontend components for doctor management
2. Implement tentative holds service
3. Create booking wizard UI
4. Integrate slot search and booking APIs

### Medium Term (Next Month):
1. Onboarding workflow
2. Real-time WebSocket updates
3. Calendar views
4. Analytics dashboard

---

## 📝 Notes

### Architecture Decisions:
- ✅ Event sourcing provides full audit trail
- ✅ Pre-generated slots improve search performance (vs. on-demand calculation)
- ✅ Tentative holds prevent double-booking with acceptable UX trade-off
- ✅ Priority-based conflict resolution ensures deterministic behavior
- ✅ Materialized view caching for fast availability lookup

### Performance Considerations:
- Slot generation should run as background job (not blocking API)
- Hold auto-release should be lightweight (indexed query)
- WebSocket connections should be horizontally scalable (use Redis pub/sub)
- Consider partitioning `appointment_slots` table by month (like `event_store`)

### Security Considerations:
- Role-based access control enforced at API layer
- Multi-tenant isolation via hospital_id (Row-Level Security enabled)
- Sensitive doctor data (license numbers) only visible to admins
- Audit trail via event store (immutable)

---

**Document Version:** 1.0
**Last Review:** 2026-01-10
**Next Review:** After Phase 1 completion
