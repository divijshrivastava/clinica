# Onboarding Product Specification
## MyMedic Patient Management Platform

**Version:** 1.0  
**Date:** January 2026  
**Author:** Product Engineering Team

---

## 1. EXECUTIVE SUMMARY

This document specifies the onboarding system for MyMedic, a doctor-first patient management platform. The onboarding strategy supports three distinct user segments while maintaining a single application architecture:

1. **Independent Doctors** - Self-serve, activation-focused
2. **Clinics (2-10 doctors)** - Guided setup with team invites
3. **Hospitals (Enterprise)** - Sales-assisted with internal onboarding support

**Core Principle:** Onboarding is layered on top of the existing event-sourced system. No separate apps, no hard blockers, activation over completion.

---

## 2. ENTRY POINTS & ROUTING

### 2.1 Public Landing Flow

```
/signup
  ↓
[Select Provider Type]
  ├─ "I'm a Doctor" → /onboarding/doctor
  ├─ "I'm a Clinic" → /onboarding/clinic
  └─ "I'm a Hospital" → /onboarding/hospital (or sales contact)
```

### 2.2 Entry Point UI

**Screen: Provider Type Selection** (`/signup`)

```
┌─────────────────────────────────────────────┐
│         Welcome to MyMedic                  │
│    Modern Patient Management Platform       │
│                                             │
│  [Card: Independent Doctor]                 │
│   • Quick setup in minutes                  │
│   • Perfect for solo practice               │
│   • Start with 100 patients free            │
│   [Get Started →]                           │
│                                             │
│  [Card: Clinic (2-10 doctors)]              │
│   • Team collaboration                      │
│   • Shared patient records                  │
│   • Multi-user management                   │
│   [Get Started →]                           │
│                                             │
│  [Card: Hospital / Enterprise]              │
│   • Custom workflows                        │
│   • Dedicated support                       │
│   • Enterprise features                     │
│   [Contact Sales] [Self-Serve Setup →]      │
│                                             │
│  Already have an account? [Log In]          │
└─────────────────────────────────────────────┘
```

**Routing Logic:**
- Doctor → Minimal 3-step flow
- Clinic → 5-step wizard with team setup
- Hospital (self-serve) → 5-step wizard + optional sales contact
- Hospital (assisted) → Sales team creates account via admin panel

---

## 3. ROLE-SPECIFIC ONBOARDING FLOWS

### 3.1 Independent Doctor Flow

**Goal:** First patient added within 15 minutes

**Steps:**
1. **Basic Info** (30 seconds)
   - Full name
   - Email (becomes username)
   - Phone
   - Create password

2. **Practice Details** (45 seconds)
   - Practice name
   - Specialization (dropdown)
   - License number (optional, can skip)
   - Timezone (auto-detected)

3. **WhatsApp Setup** (30 seconds)
   - "Enable WhatsApp notifications?" [Yes/Skip]
   - If yes: verify phone number

**Post-Signup:**
- Redirect to `/dashboard` with welcome modal
- Show activation checklist (non-blocking)
- Empty state: "Add your first patient"

**Activation Checklist** (in-app, dismissible):
```
□ Add first patient
□ Schedule first appointment
□ Create first visit note
□ Upload practice logo
□ Set working hours
```

---

### 3.2 Clinic Flow

**Goal:** Admin setup + 2 doctors invited within 30 minutes

**Steps:**
1. **Admin Account** (1 min)
   - Admin name, email, password
   - Phone number

2. **Clinic Details** (2 min)
   - Clinic name
   - Address (full)
   - License number
   - Specializations (multi-select)
   - Working hours

3. **Subscription** (1 min)
   - Show Professional tier features
   - Payment setup (or 14-day trial)

4. **Invite Team** (2 min)
   - Add doctors/staff emails
   - Assign roles (doctor, nurse, receptionist)
   - Send invites

5. **Settings** (1 min)
   - WhatsApp integration toggle
   - Appointment duration default
   - Visit types

**Post-Signup:**
- Redirect to `/dashboard`
- Show onboarding progress: "3/5 doctors accepted invites"
- Empty state guidance for first patient

**Activation Checklist:**
```
□ Invite team members (2/5 accepted)
□ Add first patient
□ Schedule first appointment
□ Set up appointment types
□ Configure WhatsApp templates
```

---

### 3.3 Hospital Flow (Self-Serve)

**Goal:** Department structure + 5 admins invited within 1 hour

**Steps:**
1. **Primary Admin** (1 min)
   - Name, email, password, phone

2. **Hospital Details** (3 min)
   - Hospital name
   - Full address
   - License type & number
   - Timezone

3. **Departments** (3 min)
   - Add departments (Cardiology, Orthopedics, etc.)
   - Assign department heads (email)

4. **Admin Team** (3 min)
   - Invite hospital admins
   - Invite department admins
   - Assign permissions

5. **Enterprise Settings** (2 min)
   - Domain verification (optional)
   - SSO setup (optional, can skip)
   - API access request

**Post-Signup:**
- Redirect to `/admin/onboarding-dashboard`
- Show setup progress
- Option to "Request Onboarding Assistance"

**Activation Checklist:**
```
□ Departments created (3/5)
□ Admins invited (5/10 accepted)
□ First department has 3+ doctors
□ First patient added
□ Domain verified (optional)
```

---

### 3.4 Hospital Flow (Assisted)

**Trigger:** Sales team or customer requests assisted onboarding

**Process:**
1. **Sales Handoff**
   - Sales creates hospital record via admin panel
   - Assigns to onboarding agent
   - Sets expected go-live date

2. **Onboarding Agent Actions** (via `/admin/onboarding`)
   - Create hospital + primary admin
   - Send login credentials
   - Schedule kickoff call
   - Create departments
   - Invite initial users
   - Import patient data (if needed)

3. **Customer Actions** (guided by agent)
   - Log in with provided credentials
   - Review setup
   - Add additional team members
   - Configure settings
   - Test workflows

4. **Go-Live**
   - Onboarding agent marks as "Live"
   - Transitions to self-managed
   - Assigns to support team

**Handoff Criteria:**
- ✅ All departments created
- ✅ 80%+ invited users active
- ✅ First 10 patients added
- ✅ First 20 appointments scheduled
- ✅ Admin trained on key workflows

---

## 4. ASSISTED ONBOARDING SYSTEM

### 4.1 Internal Roles

**Onboarding Agent**
- Can create hospitals/clinics on behalf of customers
- Can create users and send login links
- Can view onboarding progress
- Can mark accounts as "assisted onboarded"
- Can import patient data
- Cannot access patient medical records

**Support Agent**
- Can view onboarding status (read-only)
- Can resend login links
- Can reset passwords
- Cannot create hospitals or users

### 4.2 Admin Panel Routes

```
/admin/onboarding
  ├─ /dashboard          # Overview of all onboarding accounts
  ├─ /create-hospital    # Create hospital on behalf of customer
  ├─ /create-clinic      # Create clinic on behalf of customer
  ├─ /accounts/:id       # Manage specific account
  ├─ /import-data        # Bulk patient import
  └─ /handoff-checklist  # Go-live checklist
```

### 4.3 Admin Panel UI

**Screen: Onboarding Dashboard** (`/admin/onboarding/dashboard`)

```
┌─────────────────────────────────────────────────────────────┐
│ Onboarding Dashboard                    [+ Create Account]  │
├─────────────────────────────────────────────────────────────┤
│ Filters: [All] [In Progress] [Blocked] [Ready for Handoff]  │
│                                                              │
│ Account Name        Type      Agent       Progress  Status   │
│ ─────────────────────────────────────────────────────────── │
│ City Hospital       Hospital  Sarah K.    75%      Active   │
│ ├─ 8/10 admins active                                       │
│ ├─ 45 patients imported                                     │
│ └─ Go-live: Jan 15, 2026                [View Details →]    │
│                                                              │
│ Green Clinic        Clinic    John D.     40%      Blocked  │
│ ├─ 2/5 doctors invited                                      │
│ ├─ Waiting on license verification                          │
│ └─ Go-live: Jan 20, 2026                [View Details →]    │
└─────────────────────────────────────────────────────────────┘
```

**Screen: Create Hospital** (`/admin/onboarding/create-hospital`)

```
┌─────────────────────────────────────────────┐
│ Create Hospital Account                     │
├─────────────────────────────────────────────┤
│ Hospital Information                        │
│ Name: [___________________________]         │
│ Email: [___________________________]        │
│ Phone: [___________________________]        │
│ License #: [___________________________]    │
│                                             │
│ Primary Admin                               │
│ Name: [___________________________]         │
│ Email: [___________________________]        │
│ Phone: [___________________________]        │
│ □ Send login credentials via email         │
│                                             │
│ Onboarding Settings                         │
│ Assigned Agent: [Select Agent ▼]           │
│ Expected Go-Live: [Date Picker]            │
│ □ Mark as assisted onboarding              │
│                                             │
│ [Cancel]              [Create Account]      │
└─────────────────────────────────────────────┘
```

### 4.4 Assisted Onboarding Features

**Create Account on Behalf:**
- Onboarding agent fills form
- System creates hospital + admin user
- Sends email with login link
- Tracks in onboarding dashboard

**Resend Login Links:**
- From account detail page
- Generates new magic link (24hr expiry)
- Logs action in audit trail

**Import Patient Data:**
- CSV upload (template provided)
- Validation + error reporting
- Bulk create via events
- Progress tracking

**Onboarding Progress Tracking:**
- Stored in `hospital.settings.onboarding_state`
- Updated via events
- Displayed in admin panel

---

## 5. UX & UI STRATEGY

### 5.1 Progressive Disclosure

**Principle:** Show only what's needed now, reveal more as user progresses

**Implementation:**
- Step 1: Minimal fields (name, email, password)
- Step 2: Essential practice details
- Step 3+: Optional features (can skip)
- Post-signup: In-app checklists for advanced features

### 5.2 Empty State Guidance

**Every empty screen has:**
1. Illustration (friendly, not clinical)
2. Clear headline: "Add your first patient"
3. Subtext: "Patients are the heart of your practice"
4. Primary CTA: [+ Add Patient]
5. Secondary: "Import from CSV" or "Need help?"

**Examples:**
- Empty patients list → "Add first patient"
- Empty appointments → "Schedule first appointment"
- Empty team → "Invite your first team member"

### 5.3 In-App Checklists

**Location:** Dismissible card on dashboard (top-right)

```
┌─────────────────────────────────┐
│ Getting Started (3/5 complete)  │
├─────────────────────────────────┤
│ ✅ Account created              │
│ ✅ First patient added          │
│ ✅ First appointment scheduled  │
│ ⬜ Upload practice logo         │
│ ⬜ Set working hours            │
│                                 │
│ [Dismiss] [Complete Setup →]    │
└─────────────────────────────────┘
```

**Behavior:**
- Auto-checks items as completed
- Persisted in `user.settings.onboarding_checklist`
- Can be dismissed (reopened from help menu)
- Completion triggers celebration modal

### 5.4 Contextual Nudges

**Trigger-based hints:**
- First login: "👋 Welcome! Let's add your first patient"
- 3 patients, 0 appointments: "💡 Schedule appointments to track visits"
- 5 appointments, 0 WhatsApp: "📱 Enable WhatsApp for automatic reminders"

**Implementation:**
- Stored in `user.settings.dismissed_nudges`
- Each nudge has unique ID
- Can be dismissed permanently

### 5.5 Human Fallback

**"Need Help?" button (always visible)**
- Opens contextual help panel
- Shows relevant docs/videos
- Option to "Chat with Support" (for paid tiers)
- Option to "Request Onboarding Call" (for hospitals)

---

## 6. ONBOARDING STATE MODEL

### 6.1 Hospital-Level State

**Stored in:** `hospitals.settings.onboarding_state` (JSONB)

```json
{
  "onboarding_type": "self_serve" | "assisted",
  "onboarding_started_at": "2026-01-07T10:00:00Z",
  "onboarding_completed_at": null,
  "current_step": "team_invites",
  "completed_steps": ["account_created", "hospital_details"],
  "activation_checklist": {
    "first_patient_added": true,
    "first_appointment_scheduled": false,
    "team_invited": true,
    "team_acceptance_rate": 0.6,
    "whatsapp_enabled": false,
    "logo_uploaded": true
  },
  "assisted_onboarding": {
    "assigned_agent_id": "uuid",
    "expected_golive_date": "2026-01-15",
    "handoff_completed": false,
    "handoff_checklist": {
      "departments_created": true,
      "admins_active": true,
      "first_patients_added": false,
      "training_completed": false
    }
  }
}
```

**Updated via events:**
- `hospital_onboarding_step_completed`
- `hospital_activation_milestone_reached`
- `hospital_onboarding_completed`

### 6.2 User-Level State

**Stored in:** `users.settings.onboarding_state` (JSONB)

```json
{
  "onboarding_completed": false,
  "completed_checklist_items": ["first_patient", "first_appointment"],
  "dismissed_nudges": ["whatsapp_setup", "logo_upload"],
  "last_nudge_shown_at": "2026-01-07T12:00:00Z",
  "activation_achieved": true,
  "activation_achieved_at": "2026-01-07T11:30:00Z"
}
```

### 6.3 Onboarding Completion Criteria

**Independent Doctor:**
- ✅ Account created
- ✅ First patient added
- ✅ First appointment scheduled OR first visit created

**Clinic:**
- ✅ Account created
- ✅ 50%+ invited team members accepted
- ✅ First patient added
- ✅ First appointment scheduled

**Hospital:**
- ✅ Account created
- ✅ Departments created
- ✅ 80%+ invited admins active
- ✅ At least one department has 3+ doctors
- ✅ First 10 patients added
- ✅ (Assisted only) Handoff checklist completed

**Note:** Completion is tracked but NOT enforced. Users can use the app before completing onboarding.

---

## 7. ANALYTICS & ACTIVATION METRICS

### 7.1 Key Metrics

**Onboarding Funnel:**
```
Signup Started → Account Created → First Login → Activated
```

**Activation Definition by Role:**

| Role | Activation Criteria | Target Time |
|------|---------------------|-------------|
| Doctor | First patient + first visit/appointment | < 24 hours |
| Clinic | 2+ team members active + first patient | < 3 days |
| Hospital | 5+ users active + 10+ patients | < 7 days |

**Tracked Metrics:**
- Time to activation (by role)
- Onboarding completion rate
- Step drop-off rates
- Team invitation acceptance rate
- First-week retention
- Feature adoption (WhatsApp, appointments, prescriptions)

### 7.2 Intervention Triggers

**Automated:**
- No login within 24 hours → Send reminder email
- Stuck on step 3 for 2 days → Send help email
- 0 patients after 3 days → "Need help importing?" email

**Manual (for assisted onboarding):**
- < 50% team acceptance after 5 days → Onboarding agent reaches out
- No progress in 3 days → Onboarding agent calls
- Blocked on license verification → Escalate to support

### 7.3 Analytics Events

**Track via event store:**
- `onboarding_started` (aggregate: hospital)
- `onboarding_step_completed` (aggregate: hospital)
- `onboarding_activation_achieved` (aggregate: hospital)
- `onboarding_completed` (aggregate: hospital)
- `onboarding_checklist_item_completed` (aggregate: user)
- `onboarding_nudge_shown` (aggregate: user)
- `onboarding_nudge_dismissed` (aggregate: user)

**Dashboard queries:**
- Activation rate by role (last 30 days)
- Average time to activation
- Drop-off by step
- Assisted onboarding pipeline

---

## 8. APIS & BACKEND CHANGES

### 8.1 New Commands

**1. `start-onboarding`**
```typescript
{
  aggregate_type: 'hospital',
  aggregate_id: hospital_id,
  payload: {
    onboarding_type: 'self_serve' | 'assisted',
    provider_type: 'independent_doctor' | 'small_clinic' | 'large_hospital',
    assigned_agent_id?: string
  }
}
// Emits: onboarding_started
```

**2. `complete-onboarding-step`**
```typescript
{
  aggregate_type: 'hospital',
  aggregate_id: hospital_id,
  payload: {
    step_name: string,
    step_data: object
  }
}
// Emits: onboarding_step_completed
```

**3. `achieve-activation`**
```typescript
{
  aggregate_type: 'hospital',
  aggregate_id: hospital_id,
  payload: {
    activation_type: 'first_patient' | 'first_appointment' | 'team_active'
  }
}
// Emits: onboarding_activation_milestone_reached
```

**4. `complete-onboarding`**
```typescript
{
  aggregate_type: 'hospital',
  aggregate_id: hospital_id,
  payload: {
    completed_by: 'user' | 'agent',
    completion_type: 'full' | 'partial'
  }
}
// Emits: onboarding_completed
```

**5. `create-hospital-assisted`** (admin only)
```typescript
{
  aggregate_type: 'hospital',
  payload: {
    name: string,
    email: string,
    admin_user: {
      name: string,
      email: string,
      phone: string
    },
    assigned_agent_id: string,
    expected_golive_date: string,
    send_credentials: boolean
  }
}
// Emits: hospital_created, user_registered, onboarding_started
```

### 8.2 New Events

```typescript
// Add to event_type enum
'onboarding_started',
'onboarding_step_completed',
'onboarding_activation_milestone_reached',
'onboarding_completed',
'onboarding_agent_assigned',
'onboarding_handoff_completed'
```

### 8.3 New API Routes

**Public Routes:**
```
POST /api/onboarding/start
POST /api/onboarding/complete-step
GET  /api/onboarding/status/:hospital_id
```

**Admin Routes (requires onboarding_agent or support_agent role):**
```
GET  /api/admin/onboarding/dashboard
POST /api/admin/onboarding/create-hospital
POST /api/admin/onboarding/create-clinic
POST /api/admin/onboarding/send-login-link
POST /api/admin/onboarding/import-patients
GET  /api/admin/onboarding/accounts/:id
PATCH /api/admin/onboarding/accounts/:id
POST /api/admin/onboarding/handoff/:id
```

### 8.4 Role-Based Permissions

**New Roles:**
```sql
ALTER TYPE user_role ADD VALUE 'onboarding_agent';
ALTER TYPE user_role ADD VALUE 'support_agent';
```

**Permission Matrix:**

| Action | Doctor | Admin | Onboarding Agent | Support Agent |
|--------|--------|-------|------------------|---------------|
| Create hospital | ❌ | ❌ | ✅ | ❌ |
| View onboarding dashboard | ❌ | Own only | All | All (read-only) |
| Send login links | ❌ | ❌ | ✅ | ✅ |
| Import patient data | ❌ | ✅ | ✅ | ❌ |
| Mark handoff complete | ❌ | ❌ | ✅ | ❌ |
| Access patient records | ✅ | ✅ | ❌ | ❌ |

### 8.5 Event-Sourced Implications

**Projections to Update:**
- `hospitals_projection` - Add onboarding_state handling
- `users_projection` - Add onboarding_state handling

**New Projection:**
- `onboarding_progress_projection` - Materialized view for admin dashboard

**Snapshot Strategy:**
- No snapshots needed for onboarding (low event volume)

**Idempotency:**
- All onboarding commands use idempotency keys
- Mobile apps can retry safely

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Self-Serve Foundations (Week 1-2)
- [ ] Entry point UI (`/signup`)
- [ ] Doctor onboarding flow (3 steps)
- [ ] Clinic onboarding flow (5 steps)
- [ ] Onboarding state model
- [ ] Basic activation tracking
- [ ] Empty state guidance

### Phase 2: In-App Onboarding (Week 3)
- [ ] Onboarding checklists
- [ ] Contextual nudges
- [ ] Progress tracking
- [ ] Completion detection
- [ ] Analytics events

### Phase 3: Assisted Onboarding (Week 4-5)
- [ ] Admin panel routes
- [ ] Onboarding agent role
- [ ] Create hospital/clinic on behalf
- [ ] Onboarding dashboard
- [ ] Login link generation
- [ ] Handoff checklist

### Phase 4: Advanced Features (Week 6)
- [ ] Patient data import
- [ ] Automated intervention emails
- [ ] Onboarding analytics dashboard
- [ ] Support agent tools
- [ ] Documentation & training

---

## 10. ASSUMPTIONS & CONSTRAINTS

### Assumptions
1. Doctors are impatient - minimize steps
2. Clinics are understaffed - automate invites
3. Hospitals care about compliance - track everything
4. Sales teams need visibility - real-time dashboard
5. Support teams need control - admin panel access

### Constraints
1. Single application (no separate onboarding app)
2. Event-sourced backend (all changes via events)
3. Multi-tenant (hospital_id isolation)
4. Mobile + web (responsive UI)
5. WhatsApp integration (optional but recommended)

### Non-Goals
1. Payment processing (handled separately)
2. License verification (manual for now)
3. SSO integration (Phase 2)
4. Custom branding (Enterprise only, later)
5. Multi-language (English only for MVP)

---

## 11. SUCCESS CRITERIA

### Launch Criteria
- [ ] 80%+ doctors activate within 24 hours
- [ ] 70%+ clinics activate within 3 days
- [ ] 60%+ hospitals activate within 7 days
- [ ] < 5% drop-off at any single step
- [ ] Onboarding agent can create account in < 5 minutes

### Post-Launch Monitoring
- Weekly activation rate review
- Monthly drop-off analysis
- Quarterly onboarding flow optimization
- Customer feedback integration

---

## APPENDIX A: Screen Flows

### Doctor Flow Diagram
```
/signup → Select "Doctor" → /onboarding/doctor
  ↓
Step 1: Basic Info (name, email, password)
  ↓
Step 2: Practice Details (name, specialization, license)
  ↓
Step 3: WhatsApp Setup (optional)
  ↓
Account Created → /dashboard
  ↓
Welcome Modal + Activation Checklist
  ↓
Empty State: "Add First Patient"
```

### Clinic Flow Diagram
```
/signup → Select "Clinic" → /onboarding/clinic
  ↓
Step 1: Admin Account
  ↓
Step 2: Clinic Details
  ↓
Step 3: Subscription
  ↓
Step 4: Invite Team
  ↓
Step 5: Settings
  ↓
Account Created → /dashboard
  ↓
Onboarding Progress Card
  ↓
Empty State: "Add First Patient"
```

### Assisted Hospital Flow Diagram
```
Sales Team → /admin/onboarding/create-hospital
  ↓
Fill Hospital + Admin Details
  ↓
Assign Onboarding Agent
  ↓
[Create Account] → Hospital + Admin User Created
  ↓
Email Sent to Customer (login link)
  ↓
Customer Logs In → Guided Setup with Agent
  ↓
Agent Tracks Progress in Dashboard
  ↓
Handoff Checklist Completed
  ↓
Mark as "Live" → Transition to Self-Managed
```

---

## APPENDIX B: Database Schema Changes

```sql
-- Add onboarding events
ALTER TYPE event_type ADD VALUE 'onboarding_started';
ALTER TYPE event_type ADD VALUE 'onboarding_step_completed';
ALTER TYPE event_type ADD VALUE 'onboarding_activation_milestone_reached';
ALTER TYPE event_type ADD VALUE 'onboarding_completed';
ALTER TYPE event_type ADD VALUE 'onboarding_agent_assigned';
ALTER TYPE event_type ADD VALUE 'onboarding_handoff_completed';

-- Add onboarding roles
ALTER TYPE user_role ADD VALUE 'onboarding_agent';
ALTER TYPE user_role ADD VALUE 'support_agent';

-- Onboarding state already stored in hospitals.settings and users.settings (JSONB)
-- No new tables needed - event-sourced!
```

---

**END OF SPECIFICATION**
