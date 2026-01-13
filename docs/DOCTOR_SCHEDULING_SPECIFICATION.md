# MyMedic Doctor Scheduling & Calendar System
## Product Architecture Specification v1.0

---

## Executive Summary

This specification defines a comprehensive doctor scheduling and calendar management system for MyMedic that scales from independent practitioners to multi-location hospital chains. The system supports appointment scheduling, doctor availability management, resource allocation, and role-based workflows while maintaining clinical accuracy and operational efficiency.

---

## A. Doctor Profile Model

### 1.1 Core Profile Schema

```typescript
interface DoctorProfile {
  // Identity
  id: UUID
  user_id: UUID // Links to users table
  hospital_id: UUID
  
  // Basic Information
  full_name: string
  display_name?: string // "Dr. Smith" vs "Dr. Sarah Smith"
  salutation: "Dr." | "Prof." | "Mr." | "Ms." | "Mx."
  
  // Clinical Credentials
  primary_specialty: string // Mandatory
  sub_specialties: string[] // Optional, e.g., ["Interventional Cardiology"]
  qualifications: Qualification[] // See below
  registration_number: string // NMC/State Medical Council
  registration_authority: string // "NMC", "Medical Council of India", etc.
  registration_expiry?: Date
  
  // Languages & Communication
  languages: string[] // ["English", "Hindi", "Spanish"]
  consultation_languages: string[] // Subset of languages for medical consultation
  
  // Organizational
  department_id?: UUID // For hospitals
  departments: UUID[] // Multi-department support
  primary_location_id: UUID
  additional_locations: UUID[] // For chains
  
  // Practice Settings
  visit_types_supported: VisitType[] // See below
  consultation_modes: ("in_person" | "tele" | "hybrid")[]
  default_slot_duration: number // minutes, e.g., 15, 30
  slot_duration_by_type: Record<VisitType, number> // Override per visit type
  
  // Operational
  max_appointments_per_day?: number
  buffer_time_between_slots: number // minutes
  allow_walk_ins: boolean
  allow_emergency_overrides: boolean
  
  // Financial (Optional - OPD Billing)
  consultation_fee?: number
  follow_up_fee?: number
  tele_consultation_fee?: number
  pricing_by_visit_type?: Record<VisitType, number>
  
  // Metadata
  bio?: string
  profile_image_url?: string
  tags: string[] // ["pediatric_specialist", "trauma_certified"]
  status: "active" | "inactive" | "on_leave" | "terminated"
  
  // Audit
  created_at: timestamp
  updated_at: timestamp
  onboarded_by: UUID
  last_updated_by: UUID
}

interface Qualification {
  degree: string // "MBBS", "MD", "DM", "DNB"
  institution: string
  year: number
  specialization?: string
  verification_status: "pending" | "verified" | "rejected"
  document_url?: string
}

type VisitType = 
  | "consultation"
  | "follow_up"
  | "procedure"
  | "vaccination"
  | "health_checkup"
  | "emergency"
  | "pre_op_assessment"
  | "post_op_followup"
```

### 1.2 Role-Based Access Control

| Action | Admin | Department Head | Doctor (Self) | Receptionist | Viewer |
|--------|-------|-----------------|---------------|--------------|--------|
| Create Profile | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit Full Profile | ✅ | ✅ (dept only) | ⚠️ (limited) | ❌ | ❌ |
| Edit Availability | ✅ | ✅ | ✅ | ⚠️ (view only) | ❌ |
| View Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deactivate | ✅ | ✅ (dept only) | ❌ | ❌ | ❌ |

**Doctor Self-Edit Permissions:**
- Bio, profile image, languages
- Consultation fees (if enabled by admin)
- Tags
- Cannot edit: Credentials, department, status

### 1.3 Onboarding Flow

**Phase 1: Profile Creation (Admin/HR)**
```
1. Basic Info → Name, Registration Number, Specialty
2. Credentials → Upload documents for verification
3. Department Assignment → Primary + Additional
4. Location Assignment → Primary + Additional locations
5. Consultation Settings → Default duration, modes, visit types
```

**Phase 2: Self-Setup (Doctor Login)**
```
1. Set Availability Schedule (see Section B)
2. Customize Bio & Languages
3. Review & Confirm Settings
4. System generates shareable booking link (optional)
```

### 1.4 Multi-Location Support (Chains)

```typescript
interface DoctorLocationSchedule {
  doctor_id: UUID
  location_id: UUID
  days: DayOfWeek[]
  is_primary: boolean
  effective_from: Date
  effective_until?: Date
}

// Example: Dr. Smith works at Location A (Mon-Wed) and Location B (Thu-Fri)
```

**Routing Rules:**
- Appointments auto-route to correct location based on day
- Patient can filter by location when booking
- Receptionist sees location context in schedule

### 1.5 Multi-Department Support (Hospitals)

```typescript
interface DoctorDepartmentAssignment {
  doctor_id: UUID
  department_id: UUID
  role: "attending" | "consultant" | "head" | "resident"
  is_primary: boolean
  allocation_percentage: number // 70% Cardiology, 30% General Medicine
}
```

---

## B. Availability & Schedule Model

### 2.1 Schedule Architecture

**Three-Layer Model:**
1. **Base Schedule** - Recurring weekly pattern
2. **Overrides** - Specific date adjustments
3. **Exceptions** - Holidays, leave, emergencies

```typescript
interface DoctorSchedule {
  id: UUID
  doctor_id: UUID
  location_id?: UUID // null = all locations
  
  // Weekly Recurring Pattern
  recurring_schedule: WeeklySchedule[]
  
  // One-time Overrides
  schedule_overrides: ScheduleOverride[]
  
  // Exceptions (No availability)
  exceptions: ScheduleException[]
  
  // Metadata
  effective_from: Date
  effective_until?: Date
  created_by: UUID
  notes?: string
}

interface WeeklySchedule {
  day_of_week: 0-6 // 0=Sunday, 6=Saturday
  time_blocks: TimeBlock[]
}

interface TimeBlock {
  start_time: string // "09:00"
  end_time: string // "13:00"
  slot_duration: number // minutes
  consultation_mode: "in_person" | "tele" | "both"
  visit_types: VisitType[] // Can limit by visit type
  max_appointments?: number // Override default
  room_id?: UUID // Specific room assignment
  buffer_after: number // Extra buffer after this block (e.g., for lunch)
}

interface ScheduleOverride {
  id: UUID
  doctor_id: UUID
  date: Date
  type: "additional_availability" | "modified_hours" | "emergency_duty"
  time_blocks: TimeBlock[]
  reason?: string
}

interface ScheduleException {
  id: UUID
  doctor_id: UUID
  exception_type: "leave" | "holiday" | "conference" | "sick_leave" | "emergency_unavailable"
  start_date: Date
  end_date: Date
  start_time?: string // Partial day leave
  end_time?: string
  is_approved: boolean
  approved_by?: UUID
  reason?: string
  affects_scheduled_appointments: boolean // Trigger rescheduling workflow
}
```

### 2.2 Slot Generation Logic

**Slot Generation Algorithm:**
```typescript
function generateSlots(
  doctor: DoctorProfile,
  schedule: DoctorSchedule,
  date: Date,
  location?: UUID
): AppointmentSlot[] {
  
  // 1. Get base schedule for day of week
  const daySchedule = getBaseSchedule(schedule, date.getDay())
  
  // 2. Apply overrides for specific date
  const override = getOverride(schedule, date)
  const effectiveSchedule = override || daySchedule
  
  // 3. Check for exceptions
  if (hasException(schedule, date)) {
    return [] // No slots available
  }
  
  // 4. Generate slots from time blocks
  const slots = []
  for (const block of effectiveSchedule.time_blocks) {
    const blockSlots = generateSlotsFromBlock(
      block,
      doctor.buffer_time_between_slots
    )
    slots.push(...blockSlots)
  }
  
  // 5. Filter out already booked slots
  const availableSlots = filterBookedSlots(slots, date, doctor.id)
  
  // 6. Apply capacity constraints (rooms, equipment)
  return applyCapacityConstraints(availableSlots, location)
}
```

### 2.3 Break Management

```typescript
interface ScheduledBreak {
  id: UUID
  doctor_id: UUID
  break_type: "lunch" | "procedure" | "surgery" | "meeting" | "personal"
  date: Date
  start_time: string
  end_time: string
  blocks_appointments: boolean
  location_id?: UUID
  room_id?: UUID
  reason?: string
}
```

**Break Types:**
- **Lunch** - Daily recurring, blocks appointments
- **Procedure** - Scheduled, blocks appointments, may have patient attached
- **Surgery** - Extended block, affects entire day availability
- **Meeting** - Administrative, blocks appointments
- **Personal** - Short breaks, transparent to patients

### 2.4 Tele vs In-Person Routing

```typescript
interface SlotCapacity {
  time_slot: string // "2026-01-15 10:00"
  doctor_id: UUID
  location_id: UUID
  
  // Capacity by Mode
  in_person_capacity: number
  tele_capacity: number
  
  // Booked Count
  in_person_booked: number
  tele_booked: number
  
  // Constraints
  room_required: boolean
  equipment_required: string[] // ["ultrasound", "ecg"]
}
```

**Routing Logic:**
- Tele appointments don't consume room capacity
- In-person appointments check room availability
- Doctor can run tele and in-person simultaneously (configurable)
- Default: 1 in-person OR 2 tele appointments per slot

---

## C. Calendar UX

### 3.1 Calendar View Types

#### Day View (Primary Interface)
```
┌─────────────────────────────────────────────────────┐
│ Wed, Jan 15, 2026        Dr. Sarah Smith - Cardiology│
├─────────────────────────────────────────────────────┤
│ 09:00 ■■■■■■■■ John Doe - Consultation (In-person) │
│       Status: Checked In | Room: 201                │
├─────────────────────────────────────────────────────┤
│ 09:30 ■■■■■■■■ Mary Johnson - Follow-up (Tele)     │
│       Status: Scheduled | Link: Ready               │
├─────────────────────────────────────────────────────┤
│ 10:00 ▓▓▓▓▓▓▓▓ [AVAILABLE SLOT]                    │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 10:30 ■■■■■■■■ Alice Chen - Procedure               │
│       Status: In Progress | Started: 10:28          │
├─────────────────────────────────────────────────────┤
│ 11:00 ░░░░░░░░ LUNCH BREAK                          │
├─────────────────────────────────────────────────────┤
│ 12:00 ■■■■■■■■ Robert Davis - Emergency             │
│       Status: Walk-in | Priority: High              │
└─────────────────────────────────────────────────────┘

Legend:
■ Booked | ▓ Available | ░ Blocked | ⚠ Conflict
```

#### Week View (Overview)
```
┌──────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│          │ Mon 13  │ Tue 14  │ Wed 15  │ Thu 16  │ Fri 17  │
├──────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00    │ █████   │ █████   │ █████   │ ░░░░░   │ █████   │
│ 09:30    │ ▓▓▓▓▓   │ █████   │ █████   │ ░░░░░   │ █████   │
│ 10:00    │ █████   │ ▓▓▓▓▓   │ ▓▓▓▓▓   │ ░░░░░   │ ▓▓▓▓▓   │
│ 10:30    │ █████   │ █████   │ █████   │ ░░░░░   │ █████   │
│ 11:00    │ LUNCH   │ LUNCH   │ LUNCH   │ LEAVE   │ LUNCH   │
│          │ ...     │ ...     │ ...     │ ...     │ ...     │
└──────────┴─────────┴─────────┴─────────┴─────────┴─────────┘

Stats: 45/60 slots booked (75% utilization)
```

#### Multi-Doctor View (Clinic)
```
┌────────────────────────────────────────────────────────────┐
│ Cardiology Department - Wed, Jan 15, 2026                  │
├───────────┬────────────┬────────────┬────────────┬─────────┤
│ Time      │ Dr. Smith  │ Dr. Patel  │ Dr. Kumar  │ Room    │
├───────────┼────────────┼────────────┼────────────┼─────────┤
│ 09:00     │ John D.    │ Sarah M.   │ ▓▓▓▓▓      │ 201,202 │
│ 09:30     │ Mary J.    │ ▓▓▓▓▓      │ ▓▓▓▓▓      │ 201     │
│ 10:00     │ ▓▓▓▓▓      │ Robert K.  │ Alice C.   │ 202,203 │
│ 10:30     │ David L.   │ Nancy W.   │ ▓▓▓▓▓      │ 201,202 │
│ 11:00     │ ░ LUNCH ░  │ ░ LUNCH ░  │ ░ LUNCH ░  │         │
└───────────┴────────────┴────────────┴────────────┴─────────┘

Click any slot to: View Details | Reschedule | Cancel | Check-in
```

#### Multi-Location View (Chains)
```
┌────────────────────────────────────────────────────────────┐
│ Dr. Sarah Smith - Schedule Across Locations                │
├────────────┬──────────────────┬────────────────────────────┤
│ Location   │ Days             │ This Week's Appointments   │
├────────────┼──────────────────┼────────────────────────────┤
│ Downtown   │ Mon, Tue, Wed    │ 28 scheduled               │
│ (Primary)  │ 9AM - 2PM        │ 6 available slots          │
├────────────┼──────────────────┼────────────────────────────┤
│ Northside  │ Thu, Fri         │ 15 scheduled               │
│            │ 2PM - 7PM        │ 12 available slots         │
├────────────┼──────────────────┼────────────────────────────┤
│ Southside  │ Sat (Alternate)  │ 8 scheduled (next Sat)     │
│            │ 10AM - 4PM       │ 18 available slots         │
└────────────┴──────────────────┴────────────────────────────┘

[View Downtown] [View Northside] [View Southside] [Combined View]
```

### 3.2 Calendar Color Coding

**Status Colors:**
- **Blue** - Scheduled
- **Green** - Checked In / In Progress
- **Orange** - Running Late
- **Red** - No Show / Cancelled
- **Purple** - Completed
- **Grey** - Blocked / Break
- **Yellow** - Walk-in / Emergency

**Mode Indicators:**
- 📍 In-person
- 💻 Tele
- 🔄 Hybrid (can switch)

**Priority Badges:**
- 🔴 Emergency
- 🟠 Urgent
- 🟢 Routine

---

## D. Roles & Permissions

### 4.1 Role-Based Workflows

#### Receptionist Workflow
```
Primary Tasks:
1. Find Doctor Availability
   └─ Filter by: Specialty, Date, Location, Mode
   └─ See: Available slots, doctor names, durations
   
2. Book Appointment
   └─ Select: Patient, Doctor, Date/Time, Visit Type
   └─ Validate: Insurance, previous visits
   └─ Confirm: Send confirmation (SMS/Email)
   
3. Check-in Patient
   └─ Mark: Patient arrived
   └─ Notify: Doctor queue updated
   └─ Assign: Room number
   
4. Reschedule/Cancel
   └─ Permissions: Up to 24 hours before
   └─ Notifications: Auto-notify patient
   └─ Refund: Trigger refund workflow (if applicable)

View Permissions:
✅ All doctor calendars
✅ Patient demographics
✅ Appointment details
✅ Room availability
❌ Clinical notes
❌ Doctor personal info
❌ Financial details (unless billing role)
```

#### Doctor Workflow
```
Primary Tasks:
1. View Own Calendar
   └─ See: Today's schedule, upcoming, past
   └─ Filter: By location, mode, visit type
   └─ Stats: Utilization, no-shows, avg duration
   
2. Manage Appointments
   └─ Mark: No-show, in-progress, completed
   └─ Add: Clinical notes, diagnosis
   └─ Extend: Slot duration if running late
   
3. Block Time
   └─ Add: Break, procedure, surgery
   └─ Request: Leave (approval workflow)
   └─ Emergency: Block remainder of day
   
4. Availability Management
   └─ Update: Weekly schedule
   └─ Override: Specific dates
   └─ Location: Switch primary location

View Permissions:
✅ Own calendar only
✅ Full patient clinical data (assigned patients)
✅ Own availability settings
✅ Department schedule (read-only)
❌ Other doctor calendars (unless dept head)
❌ System-wide analytics
```

#### Department Head Workflow
```
Primary Tasks:
1. Department Calendar Management
   └─ View: All doctors in department
   └─ Assign: Doctor to patient (reassignment)
   └─ Balance: Load across doctors
   
2. Leave Approval
   └─ Review: Leave requests
   └─ Approve/Reject: With comments
   └─ Reassign: Affected appointments
   
3. Resource Allocation
   └─ Manage: Room assignments
   └─ Allocate: Equipment schedules
   └─ Monitor: Utilization by doctor
   
4. Analytics
   └─ View: Department utilization
   └─ Track: No-show rates
   └─ Identify: Scheduling conflicts

View Permissions:
✅ All department doctor calendars
✅ Patient demographics (department patients)
✅ Resource utilization
✅ Leave requests
❌ Financial details
❌ Cross-department data (unless hospital admin)
```

#### Admin / Chain Ops Workflow
```
Primary Tasks:
1. Centralized Schedule Management
   └─ Create: Doctor profiles & schedules
   └─ Modify: Availability across locations
   └─ Bulk: Holiday blocks, closures
   
2. Cross-Location Management
   └─ View: All locations simultaneously
   └─ Transfer: Appointments between locations
   └─ Balance: Load across branches
   
3. System Configuration
   └─ Set: Default slot durations
   └─ Define: Visit types
   └─ Configure: Automatic routing rules
   └─ Manage: Room & equipment master data
   
4. Advanced Analytics
   └─ Utilization: By doctor, location, department
   └─ Revenue: OPD collections by doctor
   └─ Trends: Peak hours, no-shows, wait times
   └─ Forecasting: Capacity planning

View Permissions:
✅ All calendars (all doctors, locations)
✅ System-wide analytics
✅ Financial reports
✅ Audit logs
✅ Configuration settings
```

---

## E. Scheduling Logic

### 5.1 Validation Rules

```typescript
interface ValidationRule {
  rule_id: string
  rule_type: "hard" | "soft" | "warning"
  priority: number
}

// Hard Rules (Must Pass)
const HARD_RULES = [
  {
    rule_id: "outside_availability",
    check: () => isWithinDoctorAvailability(slot, doctor),
    message: "Doctor not available at this time"
  },
  {
    rule_id: "slot_overlap",
    check: () => !hasOverlappingAppointment(slot, doctor),
    message: "Doctor already has appointment at this time"
  },
  {
    rule_id: "location_mismatch",
    check: () => doctorAtLocation(doctor, location, date),
    message: "Doctor not at this location on selected date"
  },
  {
    rule_id: "past_date",
    check: () => slot.start_time > now(),
    message: "Cannot book appointments in the past"
  },
  {
    rule_id: "doctor_on_leave",
    check: () => !doctorOnLeave(doctor, date),
    message: "Doctor is on leave on this date"
  }
]

// Soft Rules (Can Override with Permission)
const SOFT_RULES = [
  {
    rule_id: "max_daily_capacity",
    check: () => dailyBookingCount(doctor, date) < doctor.max_appointments_per_day,
    message: "Doctor has reached maximum appointments for the day",
    override_roles: ["admin", "department_head"]
  },
  {
    rule_id: "mode_mismatch",
    check: () => doctor.consultation_modes.includes(appointment.mode),
    message: "Doctor does not support this consultation mode",
    override_roles: ["admin", "doctor"]
  },
  {
    rule_id: "emergency_override",
    check: () => appointment.visit_type === "emergency" && doctor.allow_emergency_overrides,
    message: "Emergency appointments may overlap existing schedule",
    override_roles: ["receptionist", "admin", "doctor"]
  }
]

// Warning Rules (Show but Allow)
const WARNING_RULES = [
  {
    rule_id: "specialty_mismatch",
    check: () => appointmentMatchesSpecialty(appointment, doctor),
    message: "This appointment may not match doctor's primary specialty",
    level: "warning"
  },
  {
    rule_id: "back_to_back",
    check: () => hasBufferBetweenAppointments(doctor, slot),
    message: "No buffer time between appointments - doctor may run late",
    level: "warning"
  },
  {
    rule_id: "different_location_today",
    check: () => patientUsualLocation(patient) === appointment.location,
    message: "Patient usually visits a different location",
    level: "info"
  }
]
```

### 5.2 Capacity Constraints

```typescript
interface ResourceConstraint {
  resource_type: "room" | "equipment" | "staff"
  resource_id: UUID
  capacity: number
  allocation: ResourceAllocation[]
}

interface ResourceAllocation {
  time_slot: string
  allocated_to: "appointment" | "procedure" | "maintenance"
  entity_id: UUID
  priority: number
}

// Room Capacity Check
function validateRoomCapacity(appointment: Appointment): ValidationResult {
  const room = getRoom(appointment.room_id, appointment.location_id)
  const allocations = getRoomAllocations(room.id, appointment.start_time)
  
  if (allocations.length >= room.capacity) {
    return {
      valid: false,
      reason: "Room at full capacity",
      alternative_rooms: findAlternativeRooms(appointment)
    }
  }
  
  return { valid: true }
}

// Equipment Availability
function validateEquipmentAvailability(
  equipment_needed: string[],
  location: UUID,
  time_slot: string
): ValidationResult {
  for (const equipment of equipment_needed) {
    const available = checkEquipmentAvailable(equipment, location, time_slot)
    if (!available) {
      return {
        valid: false,
        reason: `${equipment} not available at this time`,
        suggested_slots: findSlotsWithEquipment(equipment, location, date)
      }
    }
  }
  
  return { valid: true }
}
```

### 5.3 Conflict Resolution

**Conflict Types:**

1. **Double Booking**
   - **Detection**: Two appointments at same time for same doctor
   - **Resolution**: Block second booking, suggest next available
   - **Override**: Emergency appointments can override (with permission)

2. **Room Conflict**
   - **Detection**: Room allocated to multiple appointments
   - **Resolution**: Auto-assign different room, or suggest time change
   - **Override**: Admin can force allocation

3. **Equipment Conflict**
   - **Detection**: Equipment needed by multiple procedures
   - **Resolution**: Suggest different time or use alternate equipment
   - **Override**: Department head can reprioritize

4. **Location Conflict**
   - **Detection**: Doctor scheduled at two locations simultaneously
   - **Resolution**: Reject booking, show correct location schedule
   - **Override**: None (hard constraint)

---

## F. Validation Rules (Detailed)

### 6.1 Pre-Booking Validation Checklist

```
✓ Patient Validation
  ├─ Active patient record exists
  ├─ No conflicting appointments (same time slot)
  ├─ Insurance valid (if applicable)
  └─ Outstanding balance < threshold (optional)

✓ Doctor Validation
  ├─ Doctor active and not on leave
  ├─ Within availability window
  ├─ Specialty matches visit type (warning only)
  ├─ Location correct for date
  └─ Not over max daily capacity

✓ Slot Validation
  ├─ Slot not already booked
  ├─ Sufficient duration for visit type
  ├─ Not in the past
  ├─ Within booking window (e.g., 90 days ahead)
  └─ Mode supported (tele/in-person)

✓ Resource Validation
  ├─ Room available (if in-person)
  ├─ Equipment available (if needed)
  ├─ Support staff available (future)
  └─ Location open (not holiday/closed)

✓ Business Rules
  ├─ Minimum advance booking (e.g., 1 hour)
  ├─ Maximum advance booking (e.g., 90 days)
  ├─ Cancellation window (e.g., 6 hours notice)
  └─ Reschedule limit (e.g., max 2 reschedules)
```

### 6.2 Constraint Priority Matrix

| Priority | Constraint Type | Can Override | Override Role |
|----------|----------------|--------------|---------------|
| P0 (Critical) | Past date booking | ❌ | None |
| P0 | Location mismatch (wrong branch) | ❌ | None |
| P0 | Doctor terminated | ❌ | None |
| P1 (High) | Outside availability | ⚠️ | Admin, Emergency |
| P1 | Double booking | ⚠️ | Admin, Emergency |
| P1 | Doctor on approved leave | ⚠️ | Department Head |
| P2 (Medium) | Room capacity exceeded | ✅ | Department Head |
| P2 | Equipment conflict | ✅ | Department Head |
| P2 | Max daily appointments reached | ✅ | Admin |
| P3 (Low) | Specialty mismatch | ✅ | All roles (warning) |
| P3 | Back-to-back appointments | ✅ | All roles (warning) |
| P3 | Different location than usual | ✅ | All roles (info) |

---

## G. Data Models

### 7.1 Core Entities

```typescript
// Doctor Profile (See Section A.1 for full schema)

// Doctor Schedule (See Section B.1 for full schema)

// Appointment Slot
interface AppointmentSlot {
  id: UUID
  slot_datetime: timestamp // "2026-01-15 10:00:00"
  doctor_id: UUID
  location_id: UUID
  room_id?: UUID
  
  // Slot Configuration
  duration_minutes: number
  consultation_mode: "in_person" | "tele" | "both"
  visit_types_allowed: VisitType[]
  
  // Status
  status: "available" | "booked" | "blocked" | "tentative"
  blocked_reason?: string
  
  // Capacity (for concurrent appointments)
  capacity: number // Usually 1, can be 2+ for tele
  booked_count: number
  
  // Metadata
  generated_from: "recurring" | "override" | "manual"
  generated_at: timestamp
}

// Appointment
interface Appointment {
  id: UUID
  appointment_number: string // "APT-2026-000123"
  hospital_id: UUID
  
  // Participants
  patient_id: UUID
  doctor_id: UUID
  booked_by_user_id: UUID
  
  // Scheduling
  scheduled_at: timestamp
  scheduled_end_at: timestamp // calculated
  actual_start_at?: timestamp
  actual_end_at?: timestamp
  duration_minutes: number
  
  // Location & Resources
  location_id: UUID
  room_id?: UUID
  equipment_needed: string[]
  
  // Appointment Details
  visit_type: VisitType
  consultation_mode: "in_person" | "tele"
  priority: "routine" | "urgent" | "emergency"
  reason: string
  notes?: string
  
  // Status Lifecycle
  status: AppointmentStatus
  status_history: StatusChange[]
  
  // Confirmations
  confirmation_sent_at?: timestamp
  confirmation_method?: "sms" | "email" | "whatsapp"
  confirmed_by_patient_at?: timestamp
  reminder_sent_at?: timestamp
  
  // Check-in
  checked_in_at?: timestamp
  checked_in_by?: UUID
  queue_number?: number
  
  // Financial
  consultation_fee?: number
  payment_status: "pending" | "paid" | "refunded"
  payment_id?: UUID
  
  // Cancellation/Rescheduling
  cancellation_reason?: string
  cancelled_at?: timestamp
  cancelled_by?: UUID
  reschedule_count: number
  rescheduled_from?: UUID // Previous appointment ID
  
  // Clinical
  chief_complaint?: string // Captured at check-in
  vitals_recorded_at?: timestamp
  consultation_notes_id?: UUID
  prescription_id?: UUID
  
  // Telehealth
  tele_meeting_url?: string
  tele_meeting_id?: string
  tele_meeting_started_at?: timestamp
  
  // Audit
  created_at: timestamp
  updated_at: timestamp
  current_version: number
  last_event_id: UUID
}

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rescheduled"

interface StatusChange {
  from_status: AppointmentStatus
  to_status: AppointmentStatus
  changed_at: timestamp
  changed_by: UUID
  reason?: string
}
```

### 7.2 Supporting Entities

```typescript
// Room
interface Room {
  id: UUID
  hospital_id: UUID
  location_id: UUID
  
  room_number: string
  room_name?: string
  room_type: "consultation" | "procedure" | "emergency" | "tele"
  floor: number
  capacity: number // Usually 1 for consultation rooms
  
  // Equipment
  equipment_installed: string[] // ["BP monitor", "ECG", "examination table"]
  
  // Availability
  is_active: boolean
  available_for_online_booking: boolean
  
  // Assignments
  default_doctor_id?: UUID
  department_id?: UUID
}

// Equipment
interface Equipment {
  id: UUID
  hospital_id: UUID
  location_id: UUID
  
  equipment_type: string // "ultrasound", "xray", "ecg"
  model: string
  serial_number: string
  
  // Scheduling
  requires_booking: boolean
  booking_duration: number // minutes per use
  maintenance_schedule: MaintenanceWindow[]
  
  // Status
  status: "available" | "in_use" | "maintenance" | "out_of_service"
  last_maintenance: Date
  next_maintenance: Date
}

// Department
interface Department {
  id: UUID
  hospital_id: UUID
  
  name: string
  code: string // "CARDIO", "ORTHO"
  description?: string
  
  // Structure
  parent_department_id?: UUID // For sub-departments
  head_doctor_id?: UUID
  
  // Resources
  rooms: UUID[]
  equipment: UUID[]
  
  // Settings
  allow_online_booking: boolean
  default_slot_duration: number
  
  // Metadata
  is_active: boolean
  created_at: timestamp
}

// Location
interface Location {
  id: UUID
  hospital_id: UUID
  
  name: string
  location_type: "main" | "branch" | "clinic" | "tele_center"
  
  // Address
  address: Address
  timezone: string
  
  // Operating Hours
  operating_hours: OperatingHours[]
  holidays: Holiday[]
  
  // Capacity
  total_rooms: number
  total_doctors: number
  total_beds?: number // For future IPD
  
  // Features
  has_emergency: boolean
  has_lab: boolean
  has_pharmacy: boolean
  has_imaging: boolean
  
  // Settings
  allow_online_booking: boolean
  advance_booking_days: number // Max days ahead
  
  // Metadata
  is_active: boolean
  opened_on: Date
}
```

### 7.3 Entity Relationships

```
Hospital (1) ──┬── (*) Locations
               ├── (*) Departments
               ├── (*) Doctors
               ├── (*) Patients
               └── (*) Appointments

Location (1) ──┬── (*) Rooms
               ├── (*) Equipment
               └── (*) Doctor Assignments

Doctor (1) ────┬── (1) Doctor Profile
               ├── (1) Doctor Schedule
               ├── (*) Schedule Overrides
               ├── (*) Schedule Exceptions
               ├── (*) Appointments
               └── (*) Location Assignments

Appointment (1) ─┬── (1) Patient
                 ├── (1) Doctor
                 ├── (1) Location
                 ├── (0-1) Room
                 ├── (0-1) Appointment Slot
                 └── (*) Status Changes

Room (1) ──────┬── (*) Appointments
               └── (0-1) Default Doctor

Department (1) ─┬── (*) Doctors
                ├── (*) Rooms
                └── (0-1) Head Doctor
```

---

## H. API Surface (Abstract)

### 8.1 Doctor Management APIs

```
# Doctor Profile Management

POST   /api/doctors
  Body: DoctorProfile (without id)
  Returns: DoctorProfile
  Auth: admin, department_head

GET    /api/doctors
  Query: ?location_id, ?department_id, ?specialty, ?status
  Returns: DoctorProfile[]
  Auth: any authenticated user

GET    /api/doctors/{doctor_id}
  Returns: DoctorProfile
  Auth: any authenticated user

PATCH  /api/doctors/{doctor_id}
  Body: Partial<DoctorProfile>
  Returns: DoctorProfile
  Auth: admin, department_head, doctor (self, limited fields)

DELETE /api/doctors/{doctor_id}
  (Soft delete - sets status to inactive)
  Auth: admin only

---

# Doctor Schedule Management

GET    /api/doctors/{doctor_id}/schedule
  Query: ?start_date, ?end_date, ?location_id
  Returns: DoctorSchedule
  Auth: any authenticated user

PUT    /api/doctors/{doctor_id}/schedule
  Body: DoctorSchedule
  Returns: DoctorSchedule
  Auth: admin, department_head, doctor (self)

POST   /api/doctors/{doctor_id}/schedule/overrides
  Body: ScheduleOverride
  Returns: ScheduleOverride
  Auth: admin, doctor (self)

POST   /api/doctors/{doctor_id}/schedule/exceptions
  Body: ScheduleException (leave request)
  Returns: ScheduleException
  Auth: doctor (self), admin

PATCH  /api/doctors/{doctor_id}/schedule/exceptions/{exception_id}
  Body: {is_approved: true, approved_by: UUID}
  Returns: ScheduleException
  Auth: department_head, admin

---

# Availability & Slots

GET    /api/availability
  Query: ?doctor_id, ?location_id, ?department_id, ?specialty,
         ?date_from, ?date_to, ?visit_type, ?consultation_mode
  Returns: AvailabilityResponse {
    doctors: DoctorAvailability[],
    slots_by_date: Record<string, AppointmentSlot[]>
  }
  Auth: any authenticated user

GET    /api/doctors/{doctor_id}/available-slots
  Query: ?date_from, ?date_to, ?location_id, ?consultation_mode
  Returns: AppointmentSlot[]
  Auth: any authenticated user

POST   /api/doctors/{doctor_id}/slots/block
  Body: {start_time, end_time, reason, block_type}
  Returns: BlockedTimeSlot
  Auth: doctor (self), admin
```

### 8.2 Appointment APIs

```
# Appointment Booking

POST   /api/appointments
  Body: {
    patient_id: UUID,
    doctor_id: UUID,
    scheduled_at: timestamp,
    location_id: UUID,
    visit_type: VisitType,
    consultation_mode: "in_person" | "tele",
    reason: string,
    notes?: string,
    room_id?: UUID
  }
  Returns: Appointment
  Auth: receptionist, admin, patient (self)

GET    /api/appointments
  Query: ?patient_id, ?doctor_id, ?location_id, ?status,
         ?date_from, ?date_to
  Returns: Appointment[]
  Auth: receptionist, admin, doctor (own appointments)

GET    /api/appointments/{appointment_id}
  Returns: Appointment (with full details)
  Auth: receptionist, admin, doctor (own), patient (own)

PATCH  /api/appointments/{appointment_id}
  Body: Partial<Appointment> (limited fields)
  Returns: Appointment
  Auth: receptionist, admin

---

# Appointment Actions

POST   /api/appointments/{appointment_id}/check-in
  Body: {queue_number?: number, chief_complaint?: string}
  Returns: Appointment
  Auth: receptionist, doctor

POST   /api/appointments/{appointment_id}/start
  Returns: Appointment (status: in_progress)
  Auth: doctor (assigned)

POST   /api/appointments/{appointment_id}/complete
  Body: {notes?: string, prescription_id?: UUID}
  Returns: Appointment
  Auth: doctor (assigned)

POST   /api/appointments/{appointment_id}/mark-no-show
  Body: {reason?: string}
  Returns: Appointment
  Auth: receptionist, doctor, admin

POST   /api/appointments/{appointment_id}/cancel
  Body: {reason: string, refund_payment?: boolean}
  Returns: Appointment
  Auth: receptionist, admin, patient (self, within window)

POST   /api/appointments/{appointment_id}/reschedule
  Body: {new_scheduled_at: timestamp, reason?: string}
  Returns: {
    old_appointment: Appointment (cancelled),
    new_appointment: Appointment
  }
  Auth: receptionist, admin, patient (self, within limit)

---

# Calendar Views

GET    /api/calendar/doctor/{doctor_id}
  Query: ?date_from, ?date_to, ?view=day|week|month
  Returns: CalendarView {
    appointments: Appointment[],
    blocked_times: BlockedTimeSlot[],
    availability: AppointmentSlot[],
    stats: {total_appointments, completed, no_shows, etc.}
  }
  Auth: doctor (self), admin, department_head (department doctors)

GET    /api/calendar/location/{location_id}
  Query: ?date_from, ?date_to, ?department_id
  Returns: LocationCalendarView {
    doctors: DoctorCalendarView[],
    rooms: RoomUtilization[],
    stats: {...}
  }
  Auth: admin, department_head, receptionist

GET    /api/calendar/department/{department_id}
  Query: ?date_from, ?date_to
  Returns: DepartmentCalendarView
  Auth: admin, department_head
```

### 8.3 Resource Management APIs

```
# Rooms

GET    /api/locations/{location_id}/rooms
  Returns: Room[]
  
GET    /api/rooms/{room_id}/availability
  Query: ?date_from, ?date_to
  Returns: RoomAvailability[]

POST   /api/rooms/{room_id}/block
  Body: {start_time, end_time, reason}
  Returns: BlockedRoom
  Auth: admin, department_head

---

# Equipment

GET    /api/locations/{location_id}/equipment
  Query: ?type, ?status
  Returns: Equipment[]

GET    /api/equipment/{equipment_id}/availability
  Query: ?date_from, ?date_to
  Returns: EquipmentAvailability[]

POST   /api/equipment/{equipment_id}/reserve
  Body: {appointment_id, start_time, duration}
  Returns: EquipmentReservation
  Auth: receptionist, admin
```

### 8.4 Analytics APIs

```
GET    /api/analytics/doctor-utilization
  Query: ?doctor_id, ?date_from, ?date_to, ?location_id
  Returns: {
    total_slots: number,
    booked_slots: number,
    utilization_rate: number,
    no_show_rate: number,
    avg_wait_time: number,
    revenue: number (optional)
  }
  Auth: admin, department_head, doctor (self)

GET    /api/analytics/location-stats
  Query: ?location_id, ?date_from, ?date_to
  Returns: {
    total_appointments: number,
    by_department: Record<string, number>,
    by_visit_type: Record<VisitType, number>,
    peak_hours: {hour: number, count: number}[],
    room_utilization: number
  }
  Auth: admin, location manager

GET    /api/analytics/no-shows
  Query: ?doctor_id, ?patient_id, ?date_from, ?date_to
  Returns: NoShowAnalytics
  Auth: admin, department_head
```

---

## I. Future Extensions

### 9.1 Phase 2: Advanced Features

**1. Intelligent Routing**
```typescript
interface RoutingRule {
  rule_id: UUID
  hospital_id: UUID
  priority: number
  
  // Conditions
  condition: {
    visit_type?: VisitType[]
    patient_tags?: string[] // "VIP", "pediatric", "geriatric"
    time_of_day?: {start: string, end: string}
    day_of_week?: number[]
    specialty_required?: string
  }
  
  // Actions
  action: {
    route_to: "first_available" | "specific_doctor" | "specialty_group" | "nearest_location"
    doctor_ids?: UUID[]
    location_ids?: UUID[]
    department_ids?: UUID[]
    preference_order: ("shortest_wait" | "highest_rated" | "cost_effective")[]
  }
  
  // Overrides
  allow_patient_override: boolean
}

// Example: Route pediatric patients to pediatricians first
{
  condition: {patient_tags: ["pediatric"]},
  action: {route_to: "specialty_group", specialty: "pediatrics"}
}
```

**2. Waitlist Management**
```typescript
interface Waitlist {
  id: UUID
  patient_id: UUID
  doctor_id?: UUID // null = any doctor in specialty
  specialty?: string
  visit_type: VisitType
  preferred_dates: Date[]
  preferred_times: string[] // ["morning", "evening"]
  preferred_locations: UUID[]
  priority: "routine" | "urgent"
  added_at: timestamp
  expires_at: timestamp
  
  // Notification settings
  notify_on_cancellation: boolean
  notify_advance_hours: number // How much notice needed
  notification_methods: ("sms" | "email" | "whatsapp")[]
}

// Auto-notification when slot becomes available
function onAppointmentCancelled(appointment: Appointment) {
  const matchingWaitlist = findMatchingWaitlistEntries(appointment)
  for (const entry of matchingWaitlist) {
    notifyPatient(entry.patient_id, {
      message: "Slot available with Dr. ${appointment.doctor.name}",
      slot: appointment.scheduled_at,
      expiry: now() + entry.notify_advance_hours
    })
  }
}
```

**3. Queue Management (for walk-ins)**
```typescript
interface Queue {
  id: UUID
  location_id: UUID
  doctor_id?: UUID // null = general queue
  department_id?: UUID
  
  date: Date
  queue_entries: QueueEntry[]
  
  // Settings
  estimated_time_per_patient: number
  allow_walk_ins: boolean
  max_queue_length: number
}

interface QueueEntry {
  position: number
  patient_id: UUID
  appointment_id?: UUID // null for walk-ins
  joined_at: timestamp
  estimated_wait_time: number // calculated
  priority: number // Higher = seen first
  status: "waiting" | "called" | "in_progress" | "completed" | "left"
  called_at?: timestamp
}
```

**4. Group Appointments (Family bookings)**
```typescript
interface GroupAppointment {
  id: UUID
  group_type: "family" | "couple" | "vaccination_camp"
  primary_patient_id: UUID
  related_appointments: UUID[]
  
  // Preferences
  prefer_same_doctor: boolean
  prefer_same_time: boolean
  prefer_consecutive_slots: boolean
  
  // Booking
  booked_as_group: boolean
  group_discount?: number
}
```

### 9.2 Phase 3: Hospital ADT Integration

**Admit-Discharge-Transfer Integration:**

```typescript
// Link appointments to admissions
interface Admission {
  id: UUID
  patient_id: UUID
  admission_number: string
  
  // Link to OPD
  source_appointment_id?: UUID // Came from OPD visit
  admitting_doctor_id: UUID
  primary_consultant_id: UUID
  
  // Admission
  admitted_at: timestamp
  admission_type: "emergency" | "planned" | "transfer"
  admission_department_id: UUID
  bed_id: UUID
  
  // Discharge
  expected_discharge_date?: Date
  discharged_at?: timestamp
  discharge_type?: "home" | "referred" | "LAMA" | "death"
  
  // Follow-up
  follow_up_required: boolean
  follow_up_appointment_id?: UUID // Auto-schedule OPD follow-up
}

// Procedure scheduling
interface ProcedureSchedule {
  id: UUID
  procedure_type: string
  patient_id: UUID
  doctor_id: UUID
  scheduled_at: timestamp
  duration_minutes: number
  
  // Resources
  operating_theatre_id?: UUID
  equipment_needed: UUID[]
  staff_required: StaffRequirement[]
  
  // Dependencies
  pre_op_appointment_id?: UUID
  post_op_appointments: UUID[] // Follow-ups
  
  // Status
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
}
```

**Integration Points:**
- OPD visit → Admit patient → IPD care → Discharge → OPD follow-up
- OPD appointment → Pre-op assessment → Surgery → Recovery → Follow-up
- Emergency → Triage → Doctor assignment → Admit/Discharge

### 9.3 Phase 4: Telemedicine Enhancements

```typescript
interface TeleConsultation extends Appointment {
  // Video platform
  platform: "zoom" | "meet" | "webrtc" | "whatsapp_video"
  meeting_url: string
  meeting_id: string
  meeting_password?: string
  
  // Session
  session_started_at?: timestamp
  session_ended_at?: timestamp
  session_duration_actual?: number
  session_recording_url?: string // If consent given
  
  // Quality
  connection_quality?: "excellent" | "good" | "poor"
  technical_issues_reported: boolean
  
  // Follow-up
  requires_in_person_followup: boolean
  in_person_appointment_id?: UUID
}
```

### 9.4 Phase 5: Advanced Analytics

**Predictive Features:**
- **No-show prediction** - ML model to predict no-show likelihood
- **Wait time estimation** - Real-time wait time calculation
- **Demand forecasting** - Predict busy periods, recommend staffing
- **Revenue optimization** - Suggest optimal slot pricing
- **Capacity planning** - Recommend when to hire more doctors

**Dashboard Metrics:**
```typescript
interface AnalyticsDashboard {
  // Utilization
  doctor_utilization_rate: number // % of slots filled
  room_utilization_rate: number
  peak_hours: {hour: number, appointments: number}[]
  
  // Quality
  no_show_rate: number
  average_wait_time: number // minutes
  patient_satisfaction_score: number
  
  // Financial
  revenue_per_doctor: Record<UUID, number>
  revenue_by_visit_type: Record<VisitType, number>
  
  // Operational
  appointments_per_day: number
  average_consultation_duration: number
  overbooking_incidents: number
  cancellation_rate: number
}
```

---

## J. Implementation Roadmap

### Phase 1: Foundation (MVP)
- ✅ Doctor profile management
- ✅ Basic weekly schedule
- ✅ Slot generation
- ✅ Single-location appointments
- ✅ Day/week calendar views
- ✅ Receptionist booking workflow
- ✅ Basic validations

### Phase 2: Multi-Location & Resources
- 🔲 Multi-location schedules
- 🔲 Room allocation
- 🔲 Equipment booking
- 🔲 Department management
- 🔲 Leave approval workflow
- 🔲 Multi-doctor calendar view
- 🔲 Advanced validations

### Phase 3: Intelligence & Automation
- 🔲 Automatic routing
- 🔲 Waitlist management
- 🔲 Queue management (walk-ins)
- 🔲 Group appointments
- 🔲 Predictive analytics
- 🔲 No-show prediction

### Phase 4: Enterprise & Integration
- 🔲 ADT integration (IPD)
- 🔲 Procedure scheduling
- 🔲 Operating theatre booking
- 🔲 Lab/imaging integration
- 🔲 Billing integration
- 🔲 Insurance verification

---

## K. Success Metrics

**Operational Efficiency:**
- Doctor utilization rate > 75%
- Room utilization rate > 80%
- Average wait time < 15 minutes
- No-show rate < 10%

**User Satisfaction:**
- Booking completion time < 2 minutes (receptionist)
- Schedule update time < 1 minute (doctor)
- Patient satisfaction score > 4.0/5.0

**System Performance:**
- Slot generation < 500ms
- Calendar load time < 1 second
- Booking confirmation < 2 seconds
- 99.9% uptime

---

## L. Technical Considerations

**Concurrency Handling:**
- Optimistic locking on appointments
- Real-time slot availability updates
- Conflict detection on double-booking
- Queue-based booking for high-traffic

**Scalability:**
- Slot pre-generation (cache 90 days ahead)
- Indexed queries on doctor_id + date
- Partitioned tables by month
- CDN for static resources

**Notifications:**
- SMS/Email/WhatsApp confirmations
- Reminder 24h before appointment
- Doctor queue updates (real-time)
- Cancellation/reschedule notifications

---

**End of Specification**

This specification provides a comprehensive, enterprise-ready blueprint for implementing doctor scheduling and calendar management in MyMedic. It balances simplicity for small practices with the scalability needed for hospital chains, while maintaining clinical accuracy and operational efficiency.
