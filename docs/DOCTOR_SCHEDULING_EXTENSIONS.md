# MyMedic Doctor Scheduling Extensions
## Enterprise Features Specification v1.0

---

## Document Overview

This document extends the core [DOCTOR_SCHEDULING_SPECIFICATION.md](./DOCTOR_SCHEDULING_SPECIFICATION.md) with enterprise-grade features for billing integration, migration, advanced scheduling modes, and operational workflows.

---

## A. Billing Alignment

### A.1 Visit Type Pricing Model

```typescript
interface VisitTypePricing {
  id: UUID
  hospital_id: UUID
  visit_type: VisitType

  // Base Pricing
  base_price: number
  currency: string // "INR", "USD"

  // Consultation Mode Pricing
  in_person_price?: number // Override base
  tele_price?: number // Usually lower

  // Follow-up Pricing
  is_follow_up_eligible: boolean
  follow_up_price?: number
  follow_up_validity_days: number // 30, 60, 90

  // Time-based Pricing
  price_by_time_of_day?: {
    time_range: {start: string, end: string}
    price_multiplier: number // 1.5 for after-hours
  }[]

  // Day-based Pricing
  weekend_multiplier?: number // 1.25 for Sat/Sun
  holiday_multiplier?: number // 1.5 for public holidays

  // Doctor-level Overrides
  doctor_pricing: DoctorPricing[]

  // Tax Configuration
  tax_config: TaxConfiguration

  // Payment Requirements
  payment_timing: "pre_payment" | "post_consultation" | "optional"
  deposit_required: boolean
  deposit_amount?: number
  deposit_refundable: boolean

  // Cancellation & Refund
  cancellation_policy: CancellationPolicy

  // Metadata
  effective_from: Date
  effective_until?: Date
  is_active: boolean
}

interface DoctorPricing {
  doctor_id: UUID
  base_price_override?: number
  follow_up_price_override?: number
  pricing_tier: "standard" | "senior" | "consultant" | "specialist" | "super_specialist"
  allows_discount: boolean
  max_discount_percentage: number
}

interface TaxConfiguration {
  gst_applicable: boolean
  gst_percentage: number // 18% for services in India
  gst_breakdown: {
    cgst: number // 9%
    sgst: number // 9%
    igst?: number // 18% for inter-state
  }
  tax_included_in_price: boolean // true = MRP includes GST
  hsn_code?: string // "999311" for medical services
}

interface CancellationPolicy {
  policy_type: "time_based" | "fixed"

  // Time-based Rules
  refund_rules: RefundRule[]

  // Fixed Policy
  cancellation_fee?: number
  cancellation_fee_percentage?: number

  // No-show
  no_show_penalty: number
  no_show_affects_deposit: boolean
}

interface RefundRule {
  cancellation_hours_before: number // 24, 48, etc.
  refund_percentage: number // 100%, 50%, 0%
  processing_fee?: number // Flat fee deducted from refund
  refund_method: "original_payment_method" | "wallet" | "manual"
  refund_processing_days: number
}
```

### A.2 Corporate & Insurance Billing

```typescript
interface CorporatePricing {
  id: UUID
  hospital_id: UUID
  corporate_id: UUID // Links to corporate master

  // Agreement Details
  agreement_number: string
  agreement_valid_from: Date
  agreement_valid_until: Date

  // Pricing Model
  pricing_model: "fixed_rate" | "percentage_discount" | "capped_amount" | "package_based"

  // Fixed Rate
  fixed_rates?: Record<VisitType, number>

  // Discount Model
  discount_percentage?: number
  discount_applies_to: ("consultation" | "procedures" | "diagnostics" | "pharmacy")[]

  // Capped Amount
  max_amount_per_visit?: number
  max_amount_per_employee_per_month?: number

  // Package Model
  packages?: CorporatePackage[]

  // Payment Terms
  payment_terms: "credit" | "immediate" | "monthly_billing"
  credit_days?: number // 30, 45, 60
  billing_cycle: "monthly" | "quarterly"

  // Eligibility
  eligible_employees: "all" | "grade_based" | "whitelist"
  employee_whitelist?: string[] // Employee IDs
  grade_eligibility?: string[] // ["manager", "senior_manager"]

  // Pre-authorization
  requires_pre_authorization: boolean
  pre_auth_threshold_amount?: number

  // Co-payment
  employee_copay_percentage?: number
  employee_copay_cap?: number
}

interface CorporatePackage {
  package_id: UUID
  package_name: string
  package_price: number
  validity_days: number

  inclusions: {
    visit_type: VisitType
    consultation_count: number
    includes_diagnostics: boolean
    includes_medicines: boolean
  }

  restrictions: {
    specific_doctors?: UUID[]
    specific_specialties?: string[]
    excluded_visit_types?: VisitType[]
  }
}

interface InsuranceClaim {
  id: UUID
  appointment_id: UUID
  patient_id: UUID
  insurance_provider_id: UUID

  // Policy Details
  policy_number: string
  policy_holder_name: string
  policy_holder_relationship: string

  // Claim Details
  claim_number: string
  claim_amount: number
  claim_date: Date

  // Pre-authorization
  pre_auth_number?: string
  pre_auth_amount?: number
  pre_auth_valid_until?: Date

  // Status
  claim_status: "initiated" | "submitted" | "under_review" | "approved" | "rejected" | "settled"
  approved_amount?: number
  rejection_reason?: string

  // Settlement
  patient_payable: number // Amount patient needs to pay
  insurance_payable: number // Amount insurance will pay
  settled_amount?: number
  settlement_date?: Date

  // Documents
  claim_documents: ClaimDocument[]

  // Audit
  submitted_by: UUID
  submitted_at: timestamp
  approved_by?: UUID
  approved_at?: timestamp
}

interface ClaimDocument {
  document_type: "prescription" | "bill" | "test_reports" | "discharge_summary"
  document_url: string
  uploaded_at: timestamp
}
```

### A.3 Payment Processing Integration

```typescript
interface PaymentTransaction {
  id: UUID
  transaction_number: string
  hospital_id: UUID

  // Linked Entities
  appointment_id?: UUID
  invoice_id?: UUID
  patient_id: UUID

  // Amount Details
  amount: number
  tax_amount: number
  discount_amount: number
  net_amount: number
  currency: string

  // Payment Type
  payment_type: "consultation_fee" | "deposit" | "procedure_payment" | "package_payment"
  payment_timing: "advance" | "post_service"

  // Payment Method
  payment_method: "cash" | "card" | "upi" | "net_banking" | "wallet" | "insurance" | "corporate"

  // Card/Online Details
  payment_gateway?: "razorpay" | "stripe" | "paytm"
  gateway_transaction_id?: string
  payment_mode_details?: {
    card_last_4?: string
    upi_id?: string
    bank_name?: string
  }

  // Status
  payment_status: "pending" | "processing" | "completed" | "failed" | "refunded" | "partially_refunded"
  payment_timestamp?: timestamp

  // Refund Details
  refund_amount?: number
  refund_reason?: string
  refund_initiated_at?: timestamp
  refund_completed_at?: timestamp
  refund_transaction_id?: string

  // Reconciliation
  reconciled: boolean
  reconciled_at?: timestamp
  reconciliation_batch_id?: UUID

  // Audit
  created_by: UUID
  created_at: timestamp
  updated_at: timestamp
}

interface DepositManagement {
  id: UUID
  patient_id: UUID
  appointment_id?: UUID

  // Deposit Details
  deposit_amount: number
  deposit_reason: "procedure" | "surgery" | "admission" | "equipment_usage"
  deposit_date: Date

  // Utilization
  utilized_amount: number
  remaining_amount: number

  // Refund
  is_refundable: boolean
  refund_policy: CancellationPolicy
  refund_status: "none" | "partial" | "full"
  refund_amount?: number
  refund_date?: Date

  // Status
  status: "active" | "utilized" | "refunded" | "forfeited"

  // Audit
  collected_by: UUID
  collected_at: timestamp
}
```

### A.4 Billing Workflow Integration

```typescript
interface AppointmentBillingWorkflow {
  appointment_id: UUID

  // Step 1: Pricing Calculation
  pricing_calculated_at?: timestamp
  base_price: number
  applicable_discounts: AppliedDiscount[]
  tax_amount: number
  final_amount: number

  // Step 2: Payment Collection (if pre-payment required)
  payment_required_before_booking: boolean
  payment_transaction_id?: UUID
  payment_collected_at?: timestamp

  // Step 3: Deposit (if applicable)
  deposit_required: boolean
  deposit_transaction_id?: UUID

  // Step 4: Post-Consultation (if post-payment)
  consultation_completed_at?: timestamp
  additional_charges: AdditionalCharge[]
  final_invoice_id?: UUID

  // Step 5: Claims (if insurance/corporate)
  claim_id?: UUID
  claim_submitted: boolean

  // Step 6: Settlement
  fully_paid: boolean
  outstanding_amount: number
  settlement_date?: timestamp
}

interface AppliedDiscount {
  discount_type: "percentage" | "fixed_amount" | "coupon" | "corporate" | "loyalty"
  discount_code?: string
  discount_amount: number
  discount_reason: string
  approved_by?: UUID
}

interface AdditionalCharge {
  charge_type: "procedure" | "medication" | "test" | "equipment" | "consultation_extension"
  description: string
  amount: number
  quantity: number
  added_by: UUID
  added_at: timestamp
}
```

### A.5 Validation Rules for Billing

```typescript
// Pre-booking Validation
function validateAppointmentPayment(
  appointment: AppointmentBookingRequest,
  pricing: VisitTypePricing,
  patient: Patient
): ValidationResult {

  // Check if payment required before booking
  if (pricing.payment_timing === "pre_payment") {
    if (!appointment.payment_transaction_id) {
      return {
        valid: false,
        message: "Payment required before booking",
        required_amount: calculateAmount(appointment, pricing)
      }
    }
  }

  // Check deposit requirements
  if (pricing.deposit_required) {
    if (!appointment.deposit_transaction_id) {
      return {
        valid: false,
        message: `Deposit of ${pricing.deposit_amount} required`,
        deposit_amount: pricing.deposit_amount
      }
    }
  }

  // Check outstanding balance
  const outstandingBalance = getPatientOutstandingBalance(patient.id)
  if (outstandingBalance > OUTSTANDING_THRESHOLD) {
    return {
      valid: false,
      message: "Please clear outstanding balance before booking",
      outstanding_amount: outstandingBalance
    }
  }

  // Check insurance/corporate eligibility
  if (appointment.payment_method === "insurance") {
    const insuranceValid = validateInsuranceCoverage(patient, appointment)
    if (!insuranceValid.valid) {
      return insuranceValid
    }
  }

  return { valid: true }
}

// Cancellation Refund Calculation
function calculateCancellationRefund(
  appointment: Appointment,
  payment: PaymentTransaction,
  cancellation_time: timestamp
): RefundCalculation {
  const hoursBeforeAppointment =
    (appointment.scheduled_at - cancellation_time) / (1000 * 60 * 60)

  const policy = getPricingPolicy(appointment).cancellation_policy

  // Find applicable refund rule
  const applicableRule = policy.refund_rules
    .filter(rule => hoursBeforeAppointment >= rule.cancellation_hours_before)
    .sort((a, b) => b.cancellation_hours_before - a.cancellation_hours_before)[0]

  if (!applicableRule) {
    return {
      refund_eligible: false,
      refund_amount: 0,
      reason: "Cancellation window expired"
    }
  }

  const refundPercentage = applicableRule.refund_percentage
  const refundAmount = (payment.net_amount * refundPercentage / 100)
  const processingFee = applicableRule.processing_fee || 0
  const finalRefund = Math.max(0, refundAmount - processingFee)

  return {
    refund_eligible: true,
    refund_amount: finalRefund,
    refund_percentage: refundPercentage,
    processing_fee: processingFee,
    refund_method: applicableRule.refund_method,
    processing_days: applicableRule.refund_processing_days
  }
}
```

---

## B. Migration Path

### B.1 Data Import Models

```typescript
interface DoctorRosterImport {
  // Source System
  source_system: "excel" | "csv" | "legacy_hims" | "api"
  import_batch_id: UUID
  imported_at: timestamp
  imported_by: UUID

  // Doctor Mapping
  doctors: DoctorImportRecord[]

  // Validation
  total_records: number
  successful_imports: number
  failed_imports: number
  validation_errors: ImportError[]

  // Dry Run Support
  is_dry_run: boolean
  preview_results?: PreviewResult[]
}

interface DoctorImportRecord {
  // Source Data
  source_doctor_id: string // ID from legacy system
  source_row_number?: number

  // Basic Info
  full_name: string
  registration_number: string
  specialty: string
  qualifications: string // "MBBS, MD (Cardiology)"

  // Schedule Data
  weekly_schedule: ImportedWeeklySchedule[]

  // Contact
  email?: string
  phone?: string

  // Mapping
  mapped_to_doctor_id?: UUID // If already exists
  create_new_profile: boolean

  // Validation Status
  validation_status: "pending" | "valid" | "warning" | "error"
  validation_messages: string[]
}

interface ImportedWeeklySchedule {
  day: string // "Monday", "Tuesday"
  location: string // "Main Branch", "Satellite Clinic"
  start_time: string // "09:00 AM"
  end_time: string // "01:00 PM"
  slot_duration?: number // 15, 30
  consultation_mode?: string // "In-person", "Tele"

  // Parsing Status
  parsed_successfully: boolean
  parse_errors?: string[]
}

interface OTBlockImport {
  // Source
  source_system: string
  import_batch_id: UUID

  // OT Schedule Data
  ot_blocks: OTBlockRecord[]

  // Validation
  total_records: number
  conflicts_detected: number
  resolution_strategy: "skip_conflicts" | "override_existing" | "merge"
}

interface OTBlockRecord {
  // Source
  source_record_id: string

  // OT Details
  doctor_name: string
  doctor_registration_number?: string
  mapped_doctor_id?: UUID

  // Scheduling
  ot_date: Date
  ot_start_time: string
  ot_end_time: string
  ot_room?: string
  procedure_type?: string

  // Patient (if pre-scheduled)
  patient_name?: string
  patient_id?: string

  // Resources
  anesthesia_type?: string
  staff_required?: string[]
  equipment_needed?: string[]

  // Status
  import_status: "pending" | "imported" | "conflict" | "error"
  conflict_reason?: string
  conflict_with_appointment_id?: UUID
}

interface LeaveVacationImport {
  import_batch_id: UUID
  source_file: string

  leave_records: LeaveImportRecord[]

  total_records: number
  imported_count: number
  pending_approval_count: number
}

interface LeaveImportRecord {
  // Doctor
  doctor_name: string
  doctor_id_in_source: string
  mapped_doctor_id?: UUID

  // Leave Details
  leave_type: "casual" | "vacation" | "sick" | "conference" | "training"
  start_date: Date
  end_date: Date
  is_half_day: boolean
  half_day_period?: "morning" | "afternoon"

  // Reason
  reason?: string
  notes?: string

  // Approval
  pre_approved: boolean // If importing from approved legacy system
  approved_by_name?: string
  approval_date?: Date

  // Affected Appointments
  has_scheduled_appointments: boolean
  affected_appointment_count: number
  rescheduling_action: "cancel" | "reschedule" | "reassign" | "notify_only"

  // Status
  import_status: "pending" | "imported" | "requires_approval" | "error"
  import_notes?: string
}

interface ProcedureCalendarImport {
  import_batch_id: UUID

  procedures: ProcedureImportRecord[]

  // Conflict Resolution
  conflict_resolution: {
    existing_appointment_conflicts: number
    resource_conflicts: number
    resolution_strategy: "skip" | "force_import" | "manual_review"
  }
}

interface ProcedureImportRecord {
  // Source
  source_procedure_id: string

  // Patient & Doctor
  patient_name: string
  patient_id_source?: string
  mapped_patient_id?: UUID

  doctor_name: string
  mapped_doctor_id?: UUID

  // Procedure
  procedure_name: string
  procedure_type: string
  scheduled_date: Date
  scheduled_time: string
  estimated_duration: number

  // Location & Resources
  location: string
  ot_room?: string
  equipment_needed: string[]
  staff_required: string[]

  // Clinical
  pre_op_assessment_done: boolean
  consent_obtained: boolean

  // Import Status
  import_status: "pending" | "imported" | "conflict" | "error"
  validation_errors: string[]
}

interface HistoricalAppointmentImport {
  import_batch_id: UUID
  import_date_range: { from: Date, to: Date }

  appointments: HistoricalAppointmentRecord[]

  // Purpose
  import_purpose: "analytics" | "patient_history" | "billing_reconciliation"
  include_in_active_schedule: boolean // Usually false for historical

  total_records: number
  imported_count: number
  skipped_count: number
}

interface HistoricalAppointmentRecord {
  // Source
  source_appointment_id: string
  legacy_system_id: string

  // Basic Info
  appointment_date: Date
  appointment_time: string

  // Patient
  patient_name: string
  patient_identifier: string // Phone, MR number, etc.
  mapped_patient_id?: UUID

  // Doctor
  doctor_name: string
  mapped_doctor_id?: UUID

  // Details
  visit_type: string
  consultation_mode: string
  status: string // "completed", "cancelled", "no-show"

  // Clinical (optional)
  diagnosis?: string
  treatment_given?: string

  // Billing (optional)
  amount_charged?: number
  payment_status?: string

  // Import Decision
  import_decision: "import" | "skip" | "requires_mapping"
  skip_reason?: string
}
```

### B.2 Import Workflow

```typescript
interface ImportWorkflow {
  workflow_id: UUID
  workflow_name: string
  import_type: "doctor_roster" | "ot_blocks" | "leave" | "procedures" | "historical"

  // Phases
  phases: ImportPhase[]
  current_phase: number

  // Status
  status: "initiated" | "validating" | "previewing" | "importing" | "completed" | "failed"

  // Configuration
  config: ImportConfiguration

  // Results
  summary: ImportSummary
}

interface ImportPhase {
  phase_number: number
  phase_name: string
  phase_status: "pending" | "in_progress" | "completed" | "failed"

  // Actions
  actions_required: ImportAction[]
  automated: boolean
}

interface ImportConfiguration {
  // Data Handling
  duplicate_handling: "skip" | "update" | "create_new" | "prompt"
  conflict_resolution: "skip" | "override" | "merge" | "manual"

  // Validation
  strict_validation: boolean
  allow_partial_imports: boolean

  // Mapping
  auto_map_doctors: boolean // By registration number
  auto_map_patients: boolean // By phone/MR number
  auto_map_locations: boolean // By name matching

  // Schedule Handling
  create_schedule_overrides: boolean
  block_conflicting_slots: boolean

  // Notifications
  notify_doctors: boolean
  notify_patients: boolean
  notification_template: string

  // Dry Run
  dry_run: boolean
  preview_limit: number // Show first N records
}

interface ImportAction {
  action_type: "map_doctor" | "resolve_conflict" | "approve_leave" | "assign_room"
  description: string
  required_by: "system" | "admin" | "department_head"
  blocking: boolean // Blocks further import
  resolved: boolean
}

interface ImportSummary {
  total_records: number
  successful_imports: number
  failed_imports: number
  skipped_records: number
  warnings: number

  // Details
  errors_by_type: Record<string, number>
  conflicts_detected: number
  manual_actions_required: number

  // Timing
  started_at: timestamp
  completed_at?: timestamp
  duration_seconds?: number

  // Rollback
  can_rollback: boolean
  rollback_batch_id?: UUID
}
```

### B.3 Import Validation Rules

```typescript
// Doctor Roster Validation
function validateDoctorImport(record: DoctorImportRecord): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required Fields
  if (!record.full_name) errors.push("Doctor name is required")
  if (!record.registration_number) errors.push("Registration number is required")
  if (!record.specialty) errors.push("Specialty is required")

  // Format Validation
  if (record.email && !isValidEmail(record.email)) {
    errors.push("Invalid email format")
  }
  if (record.phone && !isValidPhone(record.phone)) {
    warnings.push("Phone number format may be incorrect")
  }

  // Duplicate Check
  const existingDoctor = findDoctorByRegistration(record.registration_number)
  if (existingDoctor) {
    warnings.push(`Doctor already exists: ${existingDoctor.full_name} (ID: ${existingDoctor.id})`)
    record.mapped_to_doctor_id = existingDoctor.id
    record.create_new_profile = false
  }

  // Schedule Validation
  for (const schedule of record.weekly_schedule) {
    if (!parseTime(schedule.start_time)) {
      errors.push(`Invalid start time: ${schedule.start_time}`)
    }
    if (!parseTime(schedule.end_time)) {
      errors.push(`Invalid end time: ${schedule.end_time}`)
    }
    if (!parseDay(schedule.day)) {
      errors.push(`Invalid day: ${schedule.day}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// OT Block Conflict Detection
function detectOTConflicts(
  otBlock: OTBlockRecord,
  existingSchedule: DoctorSchedule
): ConflictDetectionResult {
  const conflicts: Conflict[] = []

  // Check doctor availability
  const doctorAvailable = isDoctorAvailable(
    otBlock.mapped_doctor_id,
    otBlock.ot_date,
    otBlock.ot_start_time,
    otBlock.ot_end_time
  )

  if (!doctorAvailable.available) {
    conflicts.push({
      conflict_type: "doctor_unavailable",
      reason: doctorAvailable.reason,
      conflicting_entity_id: doctorAvailable.conflicting_appointment_id
    })
  }

  // Check OT room availability
  if (otBlock.ot_room) {
    const roomAvailable = isRoomAvailable(
      otBlock.ot_room,
      otBlock.ot_date,
      otBlock.ot_start_time,
      otBlock.ot_end_time
    )

    if (!roomAvailable.available) {
      conflicts.push({
        conflict_type: "room_conflict",
        reason: "OT room already booked",
        conflicting_entity_id: roomAvailable.conflicting_booking_id
      })
    }
  }

  // Check equipment availability
  for (const equipment of otBlock.equipment_needed || []) {
    const equipAvailable = isEquipmentAvailable(
      equipment,
      otBlock.ot_date,
      otBlock.ot_start_time
    )

    if (!equipAvailable) {
      conflicts.push({
        conflict_type: "equipment_conflict",
        reason: `${equipment} not available`
      })
    }
  }

  return {
    has_conflicts: conflicts.length > 0,
    conflicts,
    can_auto_resolve: conflicts.every(c => c.auto_resolvable),
    suggested_resolution: suggestOTResolution(conflicts)
  }
}
```

---

## C. Scheduling Modes

### C.1 Routing Mode Definitions

```typescript
interface SchedulingMode {
  mode_id: string
  mode_name: string
  mode_type: "doctor_first" | "specialty_first" | "slot_first" | "location_first"

  // Configuration
  hospital_id: UUID
  is_default: boolean
  enabled_for_roles: ("receptionist" | "patient" | "admin")[]

  // Behavior
  search_flow: SearchFlowStep[]
  filter_priority: FilterPriority[]
  display_config: DisplayConfiguration
}

type SearchFlowStep =
  | { step: "select_doctor"; required: boolean }
  | { step: "select_specialty"; required: boolean }
  | { step: "select_date"; required: boolean }
  | { step: "select_time_preference"; required: boolean }
  | { step: "select_location"; required: boolean }
  | { step: "select_visit_type"; required: boolean }

interface FilterPriority {
  filter_field: "doctor" | "specialty" | "location" | "date" | "time" | "visit_type"
  priority: number // 1 = highest
  auto_populate: boolean
  locked: boolean // Cannot change once set
}

interface DisplayConfiguration {
  show_doctor_photos: boolean
  show_availability_count: boolean
  show_next_available: boolean
  show_price_upfront: boolean
  group_by_field?: "specialty" | "location" | "date"
  sort_by: "availability" | "price" | "rating" | "name"
}
```

### C.2 Mode 1: Doctor-First Routing

**Use Case:** Small clinic where patients have preferred doctors, patient loyalty programs

**Flow:**
```
1. Select Doctor (required)
   ↓
2. Select Visit Type (optional)
   ↓
3. Select Date Range
   ↓
4. Show Available Slots
   ↓
5. Book Appointment
```

**UX Characteristics:**
- Prominent doctor list with photos, ratings, specialties
- Patient can search/filter doctors by name or specialty
- Shows "Next Available" badge for each doctor
- Shows doctor's next 3 available dates
- Option to "View Full Calendar" for selected doctor

**Configuration:**
```typescript
const DOCTOR_FIRST_MODE: SchedulingMode = {
  mode_type: "doctor_first",
  search_flow: [
    { step: "select_doctor", required: true },
    { step: "select_visit_type", required: false },
    { step: "select_date", required: true },
  ],
  filter_priority: [
    { filter_field: "doctor", priority: 1, auto_populate: false, locked: true },
    { filter_field: "date", priority: 2, auto_populate: false, locked: false },
    { filter_field: "visit_type", priority: 3, auto_populate: true, locked: false }
  ],
  display_config: {
    show_doctor_photos: true,
    show_next_available: true,
    show_price_upfront: true,
    sort_by: "name"
  }
}
```

**UI Wireframe:**
```
┌────────────────────────────────────────────────────────┐
│ Book Appointment - Select Doctor                       │
├────────────────────────────────────────────────────────┤
│ Search: [________________] 🔍  Filter: [Specialty ▼]   │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐  │
│ │ 👨‍⚕️ Dr. Sarah Smith          ⭐ 4.8  [Select →] │  │
│ │ Cardiologist | 15 years exp                      │  │
│ │ 💰 ₹800 | Next: Tomorrow 10:00 AM               │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 👨‍⚕️ Dr. Raj Patel            ⭐ 4.9  [Select →] │  │
│ │ Cardiologist | 20 years exp                      │  │
│ │ 💰 ₹1200 | Next: Jan 15, 2:00 PM                │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### C.3 Mode 2: Specialty-First Routing

**Use Case:** Large hospitals, patients don't know specific doctors, symptom-based routing

**Flow:**
```
1. Select Specialty (required)
   ↓
2. Select Location (if multi-location)
   ↓
3. Select Date/Time Preference
   ↓
4. Show Available Doctors & Slots
   ↓
5. Patient picks doctor + slot
   ↓
6. Book Appointment
```

**UX Characteristics:**
- Specialty selector with common symptoms/conditions
- Location filter (for chains)
- Date preference: "Today", "Tomorrow", "This Week", "Specific Date"
- Time preference: "Morning", "Afternoon", "Evening"
- Shows all available doctors in specialty with slots
- Option to "Show All Slots" or "Next Available Only"

**Configuration:**
```typescript
const SPECIALTY_FIRST_MODE: SchedulingMode = {
  mode_type: "specialty_first",
  search_flow: [
    { step: "select_specialty", required: true },
    { step: "select_location", required: true }, // For chains
    { step: "select_date", required: true },
    { step: "select_time_preference", required: false },
  ],
  filter_priority: [
    { filter_field: "specialty", priority: 1, auto_populate: false, locked: true },
    { filter_field: "location", priority: 2, auto_populate: true, locked: false },
    { filter_field: "date", priority: 3, auto_populate: false, locked: false }
  ],
  display_config: {
    show_doctor_photos: true,
    show_availability_count: true,
    group_by_field: "specialty",
    sort_by: "availability"
  }
}
```

**UI Wireframe:**
```
┌────────────────────────────────────────────────────────┐
│ Book Appointment - Find Specialist                     │
├────────────────────────────────────────────────────────┤
│ What do you need help with?                            │
│ [Cardiology ▼] [Downtown Clinic ▼]                    │
│                                                         │
│ When do you want to visit?                             │
│ ○ Today  ● Tomorrow  ○ This Week  ○ Pick Date         │
│                                                         │
│ Preferred time: ● Any  ○ Morning  ○ Afternoon          │
├────────────────────────────────────────────────────────┤
│ Available Cardiologists (3 doctors, 12 slots)          │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Dr. Sarah Smith | ₹800                           │  │
│ │ 10:00 AM · 10:30 AM · 11:00 AM [+3 more]        │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Dr. Raj Patel | ₹1200                            │  │
│ │ 2:00 PM · 2:30 PM · 3:00 PM [+2 more]           │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### C.4 Mode 3: Slot-First Routing

**Use Case:** Urgent care, walk-in clinics, "find me anything available now"

**Flow:**
```
1. Select Date/Time Preference (required)
   ↓
2. Show ALL Available Slots (any doctor, any specialty)
   ↓
3. Filter by specialty/location (optional)
   ↓
4. Select slot + doctor
   ↓
5. Book Appointment
```

**UX Characteristics:**
- Prominent time selector
- "Available Now" / "Next 2 Hours" quick filters
- Timeline view showing all slots
- Doctor details shown within slot card
- Fastest booking path (2 clicks)

**Configuration:**
```typescript
const SLOT_FIRST_MODE: SchedulingMode = {
  mode_type: "slot_first",
  search_flow: [
    { step: "select_date", required: true },
    { step: "select_time_preference", required: true },
    { step: "select_specialty", required: false }, // Filter
  ],
  filter_priority: [
    { filter_field: "date", priority: 1, auto_populate: true, locked: false }, // Auto = today
    { filter_field: "time", priority: 2, auto_populate: true, locked: false },
    { filter_field: "specialty", priority: 3, auto_populate: false, locked: false }
  ],
  display_config: {
    show_doctor_photos: true,
    show_availability_count: true,
    group_by_field: "date",
    sort_by: "availability" // Soonest first
  }
}
```

**UI Wireframe:**
```
┌────────────────────────────────────────────────────────┐
│ Find Next Available Appointment                        │
├────────────────────────────────────────────────────────┤
│ ● Today  ○ Tomorrow  ○ This Week                      │
│ [Available Now] [Next 2 Hours] [Morning] [Afternoon]  │
│                                                         │
│ Filter: [All Specialties ▼] [All Locations ▼]        │
├────────────────────────────────────────────────────────┤
│ 28 slots available today                               │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🕐 10:00 AM - Dr. Sarah Smith (Cardiology)       │  │
│ │    Downtown | In-person | ₹800     [Book →]     │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🕐 10:15 AM - Dr. Kumar Reddy (General Med)      │  │
│ │    Downtown | Tele | ₹500            [Book →]   │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🕐 10:30 AM - Dr. Raj Patel (Cardiology)         │  │
│ │    Northside | In-person | ₹1200   [Book →]     │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### C.5 Mode 4: Location-First Routing

**Use Case:** Hospital chains, patients prefer nearest location

**Flow:**
```
1. Detect/Select Location (required)
   ↓
2. Select Specialty/Department
   ↓
3. Select Date
   ↓
4. Show Available Doctors at that Location
   ↓
5. Book Appointment
```

**UX Characteristics:**
- Map view showing nearby locations
- Auto-detect user location (with permission)
- Show distance from user
- Location-specific services/departments highlighted
- Cross-location transfer option

**Configuration:**
```typescript
const LOCATION_FIRST_MODE: SchedulingMode = {
  mode_type: "location_first",
  search_flow: [
    { step: "select_location", required: true },
    { step: "select_specialty", required: true },
    { step: "select_date", required: true },
  ],
  filter_priority: [
    { filter_field: "location", priority: 1, auto_populate: true, locked: true }, // Auto-detect
    { filter_field: "specialty", priority: 2, auto_populate: false, locked: false },
    { filter_field: "date", priority: 3, auto_populate: false, locked: false }
  ],
  display_config: {
    show_doctor_photos: true,
    show_availability_count: true,
    group_by_field: "location",
    sort_by: "availability"
  }
}
```

**UI Wireframe:**
```
┌────────────────────────────────────────────────────────┐
│ Select Nearest Location                                │
├────────────────────────────────────────────────────────┤
│ [Detect My Location 📍] or search manually             │
│                                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 📍 Downtown Clinic        2.3 km  [Select →]     │  │
│ │    45 available appointments today               │  │
│ │    Cardiology · Ortho · General · Pediatrics     │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 📍 Northside Hospital     5.1 km  [Select →]     │  │
│ │    32 available appointments today               │  │
│ │    Cardiology · Neurology · Surgery              │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 📍 Southside Clinic       8.7 km  [Select →]     │  │
│ │    18 available appointments today               │  │
│ │    General · Pediatrics                           │  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ [View on Map 🗺️]                                      │
└────────────────────────────────────────────────────────┘
```

### C.6 Mode Switching & Hybrid

```typescript
interface ModeSwitchingConfig {
  allow_mode_switching: boolean
  default_mode_by_role: Record<UserRole, SchedulingModeType>
  user_can_override: boolean

  // Adaptive Mode (AI-based)
  enable_adaptive_mode: boolean
  adaptive_rules: AdaptiveRule[]
}

interface AdaptiveRule {
  condition: {
    time_of_day?: "morning" | "afternoon" | "evening"
    day_of_week?: number[]
    user_history?: "repeat_patient" | "new_patient"
    urgency_level?: "emergency" | "urgent" | "routine"
  }
  suggested_mode: SchedulingModeType
  auto_switch: boolean
}

// Example: Emergency → Slot-First, Returning Patient → Doctor-First
const ADAPTIVE_RULES: AdaptiveRule[] = [
  {
    condition: { urgency_level: "emergency" },
    suggested_mode: "slot_first",
    auto_switch: true
  },
  {
    condition: { user_history: "repeat_patient" },
    suggested_mode: "doctor_first",
    auto_switch: false // Suggest but don't force
  },
  {
    condition: { time_of_day: "evening", day_of_week: [0, 6] },
    suggested_mode: "slot_first", // Weekend evenings → show what's available
    auto_switch: true
  }
]
```

---

## D. Recurring Appointments

### D.1 Recurrence Models

```typescript
interface RecurringAppointment {
  id: UUID
  series_id: UUID // Groups all appointments in series
  patient_id: UUID
  doctor_id: UUID

  // Recurrence Pattern
  recurrence_rule: RecurrenceRule
  recurrence_type: "dialysis" | "physiotherapy" | "chemotherapy" | "vaccination_series" | "chronic_care" | "custom"

  // Template
  template: AppointmentTemplate

  // Series Metadata
  series_start_date: Date
  series_end_date?: Date // null = indefinite
  total_occurrences?: number // Alternative to end_date

  // Generated Appointments
  generated_appointments: UUID[]
  next_occurrence_date?: Date

  // Status
  series_status: "active" | "paused" | "completed" | "cancelled"
  paused_until?: Date
  pause_reason?: string

  // Modification Handling
  allow_individual_modifications: boolean
  modification_policy: "this_only" | "this_and_future" | "all_in_series"

  // Cancellation Policy
  cancellation_notice_days: number
  auto_cancel_on_miss: boolean
  max_consecutive_misses: number

  // Audit
  created_at: timestamp
  created_by: UUID
}

interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "custom"

  // Daily
  interval_days?: number // Every N days

  // Weekly
  days_of_week?: number[] // [1,3,5] = Mon, Wed, Fri
  weeks_interval?: number // Every N weeks

  // Monthly
  day_of_month?: number // 15th of every month
  week_of_month?: number // 2nd week
  day_of_week_in_month?: number // 2nd Monday
  months_interval?: number // Every N months

  // Custom (for complex patterns like chemo cycles)
  custom_pattern?: CustomRecurrencePattern

  // Time
  preferred_time: string // "10:00 AM"
  flexible_time_window?: number // +/- N minutes

  // Exclusions
  exclude_dates?: Date[] // Skip specific dates
  exclude_holidays: boolean
}

interface CustomRecurrencePattern {
  pattern_name: string // "21-day chemo cycle"
  pattern_description: string
  cycle_length_days: number
  treatment_days: number[] // Days within cycle: [1, 8, 15]
  cycles_count?: number // How many cycles
}

interface AppointmentTemplate {
  visit_type: VisitType
  consultation_mode: "in_person" | "tele"
  duration_minutes: number
  location_id?: UUID // Can be null = patient chooses
  room_id?: UUID

  // Clinical
  reason: string
  protocol_name?: string // "Hemodialysis Protocol A"
  special_instructions?: string

  // Resources
  equipment_needed: string[]
  staff_required: StaffRequirement[]

  // Billing
  pricing_package_id?: UUID // Special pricing for series
  prepaid: boolean
  payment_plan_id?: UUID
}
```

### D.2 Use Case Implementations

#### Dialysis (3x/week, indefinite)
```typescript
const DIALYSIS_SERIES: RecurringAppointment = {
  recurrence_type: "dialysis",
  recurrence_rule: {
    frequency: "weekly",
    days_of_week: [1, 3, 5], // Mon, Wed, Fri
    weeks_interval: 1,
    preferred_time: "08:00 AM",
    flexible_time_window: 30, // Can shift ±30 min
    exclude_holidays: true
  },
  template: {
    visit_type: "procedure",
    consultation_mode: "in_person",
    duration_minutes: 240, // 4 hours
    protocol_name: "Hemodialysis - 4hr session",
    equipment_needed: ["dialysis_machine", "bed"],
    staff_required: [
      { role: "nephrologist", count: 1, required: true },
      { role: "dialysis_nurse", count: 2, required: true }
    ],
    prepaid: true,
    pricing_package_id: "dialysis_monthly_package"
  },
  series_start_date: new Date("2026-01-20"),
  series_end_date: null, // Indefinite
  modification_policy: "this_only", // Each session independent
  auto_cancel_on_miss: false,
  max_consecutive_misses: 2 // Alert after 2 missed sessions
}
```

#### Physiotherapy (5x/week for 4 weeks)
```typescript
const PHYSIOTHERAPY_SERIES: RecurringAppointment = {
  recurrence_type: "physiotherapy",
  recurrence_rule: {
    frequency: "weekly",
    days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
    weeks_interval: 1,
    preferred_time: "03:00 PM",
    flexible_time_window: 60,
    exclude_holidays: true
  },
  template: {
    visit_type: "procedure",
    consultation_mode: "in_person",
    duration_minutes: 45,
    protocol_name: "Post-surgical Physiotherapy",
    equipment_needed: ["physio_table", "resistance_bands"],
    staff_required: [
      { role: "physiotherapist", count: 1, required: true }
    ],
    prepaid: true,
    pricing_package_id: "physio_20_session_package"
  },
  series_start_date: new Date("2026-01-20"),
  total_occurrences: 20, // 4 weeks * 5 days
  modification_policy: "this_and_future",
  auto_cancel_on_miss: true,
  cancellation_notice_days: 1
}
```

#### Chemotherapy (21-day cycle, 6 cycles)
```typescript
const CHEMOTHERAPY_SERIES: RecurringAppointment = {
  recurrence_type: "chemotherapy",
  recurrence_rule: {
    frequency: "custom",
    custom_pattern: {
      pattern_name: "AC-T Protocol (21-day cycle)",
      pattern_description: "Adriamycin + Cyclophosphamide on Day 1, repeat every 21 days",
      cycle_length_days: 21,
      treatment_days: [1], // Day 1 of each cycle
      cycles_count: 6
    },
    preferred_time: "10:00 AM",
    flexible_time_window: 0, // Strict timing for chemo
    exclude_holidays: false // Medical necessity overrides holidays
  },
  template: {
    visit_type: "procedure",
    consultation_mode: "in_person",
    duration_minutes: 180, // 3 hours
    protocol_name: "AC-T Chemotherapy Protocol",
    equipment_needed: ["infusion_pump", "chemo_chair"],
    staff_required: [
      { role: "oncologist", count: 1, required: true },
      { role: "chemo_nurse", count: 1, required: true }
    ],
    special_instructions: "Pre-medication 30 min before. Post-infusion monitoring 1 hr.",
    prepaid: false,
    pricing_package_id: "chemo_package_6cycles"
  },
  series_start_date: new Date("2026-01-20"),
  total_occurrences: 6,
  modification_policy: "all_in_series", // Entire protocol must be adjusted
  auto_cancel_on_miss: false, // Requires manual rescheduling
  cancellation_notice_days: 7 // 1 week notice for drug preparation
}
```

#### Vaccination Series (3 doses: 0, 1, 6 months)
```typescript
const VACCINATION_SERIES: RecurringAppointment = {
  recurrence_type: "vaccination_series",
  recurrence_rule: {
    frequency: "custom",
    custom_pattern: {
      pattern_name: "Hepatitis B Vaccine Series",
      pattern_description: "3 doses: Initial, 1 month, 6 months",
      cycle_length_days: 180,
      treatment_days: [0, 30, 180] // Day 0, 30, 180
    },
    preferred_time: "11:00 AM",
    flexible_time_window: 120, // ±2 hours, flexible
    exclude_holidays: true
  },
  template: {
    visit_type: "vaccination",
    consultation_mode: "in_person",
    duration_minutes: 15,
    protocol_name: "Hepatitis B Vaccination",
    equipment_needed: [],
    staff_required: [
      { role: "nurse", count: 1, required: true }
    ],
    prepaid: true,
    pricing_package_id: "hepb_vaccine_series"
  },
  series_start_date: new Date("2026-01-20"),
  total_occurrences: 3,
  modification_policy: "this_and_future",
  auto_cancel_on_miss: false
}
```

### D.3 Recurrence Generation Logic

```typescript
// Generate appointments for recurring series
function generateRecurringAppointments(
  series: RecurringAppointment,
  generateUntil: Date
): Appointment[] {
  const appointments: Appointment[] = []
  let currentDate = series.series_start_date

  while (shouldGenerateNext(series, currentDate, generateUntil)) {
    const nextDates = calculateNextOccurrences(series.recurrence_rule, currentDate)

    for (const date of nextDates) {
      // Check if date is excluded
      if (isDateExcluded(date, series.recurrence_rule)) {
        continue
      }

      // Check if doctor available
      const slot = findAvailableSlot(
        series.doctor_id,
        date,
        series.template.preferred_time,
        series.recurrence_rule.flexible_time_window
      )

      if (slot) {
        const appointment = createAppointmentFromTemplate(
          series,
          slot.slot_datetime
        )
        appointments.push(appointment)
      } else {
        // Handle unavailability
        handleSlotUnavailability(series, date)
      }
    }

    currentDate = getNextCycleStartDate(series, currentDate)
  }

  return appointments
}

// Handle modifications to recurring series
function modifyRecurringSeries(
  series_id: UUID,
  appointment_id: UUID,
  modification: AppointmentModification,
  policy: "this_only" | "this_and_future" | "all_in_series"
): ModificationResult {

  switch (policy) {
    case "this_only":
      // Modify only this appointment
      // Mark as exception to series
      return modifySingleAppointment(appointment_id, modification)

    case "this_and_future":
      // Create new series from this point
      // Original series ends before this appointment
      const originalSeries = getSeries(series_id)
      const splitDate = getAppointmentDate(appointment_id)

      // End original series
      updateSeries(series_id, { series_end_date: splitDate })

      // Create new series with modifications
      const newSeries = createNewSeries({
        ...originalSeries,
        ...modification,
        series_start_date: splitDate
      })

      return { split_series: true, new_series_id: newSeries.id }

    case "all_in_series":
      // Modify all appointments in series (past + future)
      const allAppointments = getSeriesAppointments(series_id)

      for (const apt of allAppointments) {
        if (apt.status === "scheduled" || apt.status === "confirmed") {
          updateAppointment(apt.id, modification)
        }
      }

      updateSeries(series_id, modification)

      return { modified_count: allAppointments.length }
  }
}

// Cancellation logic for recurring series
function cancelRecurringSeries(
  series_id: UUID,
  reason: string,
  policy: CancellationPolicy
): CancellationResult {
  const series = getSeries(series_id)
  const futureAppointments = getFutureAppointments(series_id)

  const results = {
    cancelled_count: 0,
    refund_amount: 0,
    notifications_sent: 0
  }

  for (const appointment of futureAppointments) {
    // Calculate refund based on cancellation policy
    const refund = calculateSeriesRefund(
      appointment,
      series,
      policy
    )

    // Cancel appointment
    cancelAppointment(appointment.id, reason)

    // Process refund
    if (refund.eligible && refund.amount > 0) {
      processRefund(appointment.payment_id, refund.amount)
      results.refund_amount += refund.amount
    }

    // Notify patient
    notifyAppointmentCancellation(appointment.patient_id, appointment.id)
    results.notifications_sent++
    results.cancelled_count++
  }

  // Update series status
  updateSeries(series_id, { series_status: "cancelled" })

  return results
}
```

### D.4 UI for Recurring Appointments

**Receptionist View:**
```
┌────────────────────────────────────────────────────────┐
│ Book Recurring Appointment                             │
├────────────────────────────────────────────────────────┤
│ Patient: [John Doe ▼]                                  │
│ Doctor: [Dr. Sarah Smith ▼]                            │
│ Visit Type: [Procedure ▼]                              │
│                                                         │
│ Recurrence Pattern:                                    │
│ ● Pre-defined Protocol  ○ Custom Schedule              │
│                                                         │
│ Select Protocol: [Dialysis - 3x/week ▼]                │
│ → Mon, Wed, Fri at 8:00 AM                            │
│ → 4 hours per session                                  │
│ → Indefinite duration                                  │
│                                                         │
│ Start Date: [Jan 20, 2026 📅]                          │
│                                                         │
│ Pricing: Dialysis Monthly Package - ₹45,000/month     │
│ ☑ Prepaid (Required)                                   │
│                                                         │
│ [Preview Schedule] [Book Series]                       │
├────────────────────────────────────────────────────────┤
│ Preview (Next 4 weeks):                                │
│ ✓ Mon, Jan 20, 8:00 AM - Dr. Smith available          │
│ ✓ Wed, Jan 22, 8:00 AM - Dr. Smith available          │
│ ✓ Fri, Jan 24, 8:00 AM - Dr. Smith available          │
│ ... (12 appointments will be created)                  │
└────────────────────────────────────────────────────────┘
```

**Patient View (Manage Series):**
```
┌────────────────────────────────────────────────────────┐
│ Your Dialysis Appointments                             │
├────────────────────────────────────────────────────────┤
│ Series: Mon, Wed, Fri at 8:00 AM                       │
│ Started: Jan 20, 2026                                  │
│ Status: Active | 15 completed, 3 upcoming              │
│                                                         │
│ [Pause Series] [Request Reschedule] [Cancel Series]   │
├────────────────────────────────────────────────────────┤
│ Upcoming:                                              │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Mon, Feb 10, 8:00 AM                             │  │
│ │ Status: Confirmed     [Reschedule This] [Cancel] │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Wed, Feb 12, 8:00 AM                             │  │
│ │ Status: Scheduled     [Reschedule This] [Cancel] │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Fri, Feb 14, 8:00 AM                             │  │
│ │ Status: Scheduled     [Reschedule This] [Cancel] │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## E. Overbooking & Prediction

### E.1 Overbooking Configuration

```typescript
interface OverbookingPolicy {
  id: UUID
  hospital_id: UUID

  // Scope
  applies_to: "hospital" | "department" | "doctor"
  entity_id?: UUID // department_id or doctor_id

  // Overbooking Limits
  enable_overbooking: boolean
  overbooking_percentage: number // 10% = 0.10
  max_overbooked_slots_per_day: number
  max_overbooked_slots_per_block: number // Per time block

  // Conditions
  allowed_for_visit_types: VisitType[]
  allowed_for_consultation_modes: ("in_person" | "tele")[]
  time_restrictions: TimeRestriction[]

  // Prediction Integration
  use_no_show_prediction: boolean
  prediction_confidence_threshold: number // 0.7 = 70% confidence

  // Safety Rules
  never_overbook_if: OverbookingConstraint[]

  // Analytics
  historical_no_show_rate: number
  actual_capacity_utilization: number

  // Approval
  requires_approval: boolean
  approval_roles: ("department_head" | "admin")[]

  // Metadata
  effective_from: Date
  effective_until?: Date
  created_by: UUID
}

interface TimeRestriction {
  time_of_day: { start: string, end: string }
  days_of_week: number[]
  reason?: string // "High no-show period"
}

interface OverbookingConstraint {
  constraint_type: "procedure" | "surgery" | "emergency" | "new_patient" | "custom"
  description: string
  hard_constraint: boolean // true = never overbook, false = warn only
}

interface NoShowPrediction {
  id: UUID
  appointment_id: UUID
  patient_id: UUID

  // Prediction
  no_show_probability: number // 0.0 to 1.0
  confidence_score: number
  predicted_at: timestamp

  // Factors
  contributing_factors: PredictionFactor[]
  risk_level: "low" | "medium" | "high"

  // Actions Taken
  actions_triggered: PredictionAction[]

  // Actual Outcome (post-appointment)
  actual_outcome?: "attended" | "no_show" | "cancelled"
  prediction_accurate?: boolean
}

interface PredictionFactor {
  factor_name: string
  factor_value: any
  weight: number // Impact on prediction

  // Common factors:
  // - "previous_no_shows": 2
  // - "cancellation_history": 3
  // - "advance_booking_days": 45
  // - "weather_forecast": "heavy_rain"
  // - "day_of_week": "Monday"
  // - "time_of_day": "early_morning"
  // - "distance_to_clinic": 25
  // - "payment_status": "unpaid"
}

interface PredictionAction {
  action_type: "send_reminder" | "confirm_attendance" | "allow_overbooking" | "waitlist_notification"
  action_timestamp: timestamp
  action_result?: string
}
```

### E.2 Overbooking Logic

```typescript
// Check if slot can be overbooked
function canOverbookSlot(
  doctor_id: UUID,
  slot_datetime: timestamp,
  policy: OverbookingPolicy
): OverbookingDecision {

  // 1. Check if overbooking enabled
  if (!policy.enable_overbooking) {
    return { allowed: false, reason: "Overbooking disabled" }
  }

  // 2. Get current bookings for slot
  const existingBookings = getAppointmentsForSlot(doctor_id, slot_datetime)
  const baseCapacity = getDoctorSlotCapacity(doctor_id, slot_datetime)

  // 3. Calculate allowed overbooking
  const maxAllowed = Math.floor(baseCapacity * (1 + policy.overbooking_percentage))

  if (existingBookings.length >= maxAllowed) {
    return {
      allowed: false,
      reason: "Max overbooking limit reached",
      current: existingBookings.length,
      max: maxAllowed
    }
  }

  // 4. Check daily overbooking limit
  const dailyOverbooked = getDailyOverbookedCount(doctor_id, slot_datetime)
  if (dailyOverbooked >= policy.max_overbooked_slots_per_day) {
    return {
      allowed: false,
      reason: "Daily overbooking limit reached"
    }
  }

  // 5. Check hard constraints
  for (const constraint of policy.never_overbook_if) {
    if (constraint.hard_constraint && violatesConstraint(constraint, existingBookings)) {
      return {
        allowed: false,
        reason: `Constraint violated: ${constraint.description}`
      }
    }
  }

  // 6. Check no-show predictions
  if (policy.use_no_show_prediction) {
    const predictions = getNoShowPredictions(existingBookings)
    const highRiskCount = predictions.filter(p =>
      p.no_show_probability >= policy.prediction_confidence_threshold
    ).length

    if (highRiskCount === 0) {
      return {
        allowed: false,
        reason: "No high-risk no-show predictions to justify overbooking"
      }
    }

    return {
      allowed: true,
      reason: `${highRiskCount} high-risk no-show predictions`,
      risk_level: "calculated",
      expected_attendance: existingBookings.length - highRiskCount + 1
    }
  }

  // 7. Use historical no-show rate
  const expectedNoShows = Math.floor(
    existingBookings.length * policy.historical_no_show_rate
  )

  if (expectedNoShows >= 1) {
    return {
      allowed: true,
      reason: `Historical no-show rate: ${policy.historical_no_show_rate * 100}%`,
      expected_attendance: existingBookings.length - expectedNoShows + 1
    }
  }

  return {
    allowed: false,
    reason: "No justification for overbooking"
  }
}

// Generate alternative slot suggestions
function suggestAlternativeSlots(
  requested_slot: AppointmentSlotRequest,
  overbooked: boolean
): AlternativeSlotSuggestion[] {
  const suggestions: AlternativeSlotSuggestion[] = []

  // 1. Same doctor, nearby times
  const sameDoctorSlots = findAvailableSlots({
    doctor_id: requested_slot.doctor_id,
    date: requested_slot.date,
    time_window: { start: -120, end: 120 }, // ±2 hours
    exclude_overbooked: true
  })

  for (const slot of sameDoctorSlots) {
    suggestions.push({
      suggestion_type: "same_doctor_different_time",
      doctor_id: slot.doctor_id,
      slot_datetime: slot.slot_datetime,
      priority: 1,
      reason: "Same doctor, nearby time"
    })
  }

  // 2. Same specialty, same time, different doctor
  const sameSpecialtySlots = findAvailableSlots({
    specialty: requested_slot.specialty,
    date: requested_slot.date,
    time: requested_slot.time,
    exclude_doctors: [requested_slot.doctor_id],
    exclude_overbooked: true
  })

  for (const slot of sameSpecialtySlots) {
    suggestions.push({
      suggestion_type: "different_doctor_same_time",
      doctor_id: slot.doctor_id,
      slot_datetime: slot.slot_datetime,
      priority: 2,
      reason: "Different doctor, same specialty"
    })
  }

  // 3. Same doctor, next available day
  const nextDaySlots = findNextAvailableSlots({
    doctor_id: requested_slot.doctor_id,
    after_date: requested_slot.date,
    limit: 3
  })

  for (const slot of nextDaySlots) {
    suggestions.push({
      suggestion_type: "same_doctor_next_day",
      doctor_id: slot.doctor_id,
      slot_datetime: slot.slot_datetime,
      priority: 3,
      reason: "Same doctor, next available"
    })
  }

  // 4. Waitlist option
  suggestions.push({
    suggestion_type: "waitlist",
    priority: 4,
    reason: "Get notified if slot becomes available"
  })

  return suggestions.sort((a, b) => a.priority - b.priority)
}
```

### E.3 No-Show Prediction ML Hook

```typescript
// Webhook/Hook for external ML prediction service
interface NoShowPredictionRequest {
  appointment_id: UUID
  patient_id: UUID
  doctor_id: UUID
  appointment_datetime: timestamp

  // Patient Features
  patient_features: {
    age: number
    previous_appointments_count: number
    previous_no_shows: number
    previous_cancellations: number
    average_advance_booking_days: number
    has_chronic_condition: boolean
    insurance_type?: string
    distance_to_clinic_km: number
  }

  // Appointment Features
  appointment_features: {
    day_of_week: number
    time_of_day: "morning" | "afternoon" | "evening"
    advance_booking_days: number
    is_follow_up: boolean
    visit_type: VisitType
    consultation_mode: "in_person" | "tele"
    payment_status: "paid" | "unpaid"
    reminder_sent: boolean
  }

  // External Features
  external_features: {
    weather_forecast?: string
    is_holiday: boolean
    is_long_weekend: boolean
  }
}

interface NoShowPredictionResponse {
  prediction_id: UUID
  no_show_probability: number // 0.0 to 1.0
  confidence_score: number
  risk_level: "low" | "medium" | "high"

  contributing_factors: {
    factor: string
    importance: number
  }[]

  recommended_actions: {
    action: "send_confirmation_sms" | "call_patient" | "allow_overbooking" | "no_action"
    priority: number
  }[]

  model_version: string
  predicted_at: timestamp
}

// Integration example
async function getPredictionForAppointment(
  appointment_id: UUID
): Promise<NoShowPrediction> {

  const appointment = await getAppointment(appointment_id)
  const patient = await getPatient(appointment.patient_id)
  const doctor = await getDoctor(appointment.doctor_id)

  // Prepare request
  const request: NoShowPredictionRequest = {
    appointment_id,
    patient_id: patient.id,
    doctor_id: doctor.id,
    appointment_datetime: appointment.scheduled_at,
    patient_features: buildPatientFeatures(patient),
    appointment_features: buildAppointmentFeatures(appointment),
    external_features: await getExternalFeatures(appointment.scheduled_at)
  }

  // Call ML service (webhook, API, or internal model)
  const response = await fetch(ML_PREDICTION_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { 'Content-Type': 'application/json' }
  })

  const prediction: NoShowPredictionResponse = await response.json()

  // Store prediction
  return storePrediction(prediction)
}
```

---

## F. Walk-in & Queue Routing

### F.1 Queue Management Models

```typescript
interface Queue {
  id: UUID
  queue_type: "opd_walkin" | "emergency_triage" | "appointment_checkin"
  location_id: UUID
  department_id?: UUID

  // Queue Configuration
  queue_date: Date
  queue_status: "active" | "paused" | "closed"

  // Entries
  entries: QueueEntry[]
  active_entry_id?: UUID // Currently being served

  // Capacity
  max_queue_length?: number
  estimated_wait_per_patient: number // minutes

  // Doctors
  assigned_doctors: UUID[]
  load_balancing_strategy: "round_robin" | "least_loaded" | "specialty_based" | "manual"

  // Metadata
  created_at: timestamp
  created_by: UUID
}

interface QueueEntry {
  id: UUID
  queue_id: UUID

  // Patient
  patient_id: UUID
  appointment_id?: UUID // null for walk-ins

  // Queue Position
  queue_number: number // Display number (e.g., "Q-045")
  position: number // Actual position in queue
  priority: number // Higher = served first

  // Timing
  joined_at: timestamp
  estimated_wait_time: number // minutes, calculated
  expected_call_time?: timestamp

  // Assignment
  assigned_doctor_id?: UUID
  assigned_room_id?: UUID
  assignment_method: "auto" | "manual" | "patient_preference"

  // Status
  status: "waiting" | "called" | "in_consultation" | "completed" | "left" | "transferred"
  called_at?: timestamp
  consultation_started_at?: timestamp
  consultation_ended_at?: timestamp

  // Clinical
  chief_complaint?: string
  triage_level?: "emergency" | "urgent" | "semi_urgent" | "non_urgent" // For emergency
  vitals?: VitalSigns

  // Notifications
  notification_sent: boolean
  notification_method?: "sms" | "display_board" | "announcement"
}

interface LoadBalancingConfig {
  strategy: "round_robin" | "least_loaded" | "specialty_based" | "skill_based"

  // Round Robin
  round_robin_order?: UUID[] // Doctor IDs in order

  // Least Loaded
  include_scheduled_appointments: boolean // Count scheduled + queue
  weight_by_consultation_duration: boolean

  // Specialty Based
  specialty_routing_rules?: SpecialtyRoutingRule[]

  // Skill Based (future)
  required_skills?: string[]
}

interface SpecialtyRoutingRule {
  condition: {
    chief_complaint_keywords?: string[]
    visit_type?: VisitType
    patient_age_range?: { min: number, max: number }
    triage_level?: string
  }
  route_to_doctor_ids: UUID[]
  route_to_specialty?: string
  priority: number
}
```

### F.2 Load Balancing Algorithms

```typescript
// Round Robin Assignment
function assignDoctorRoundRobin(
  queue: Queue,
  entry: QueueEntry,
  config: LoadBalancingConfig
): UUID {
  const lastAssignment = getLastAssignment(queue.id)
  const doctorOrder = config.round_robin_order || queue.assigned_doctors

  if (!lastAssignment) {
    return doctorOrder[0]
  }

  const lastIndex = doctorOrder.indexOf(lastAssignment.doctor_id)
  const nextIndex = (lastIndex + 1) % doctorOrder.length

  return doctorOrder[nextIndex]
}

// Least Loaded Assignment
function assignDoctorLeastLoaded(
  queue: Queue,
  entry: QueueEntry,
  config: LoadBalancingConfig
): UUID {
  const doctorLoads: Map<UUID, number> = new Map()

  for (const doctorId of queue.assigned_doctors) {
    let load = 0

    // Count queue entries
    const queueEntries = getQueueEntriesForDoctor(queue.id, doctorId)
    load += queueEntries.filter(e => e.status === "waiting" || e.status === "called").length

    // Count scheduled appointments (if configured)
    if (config.include_scheduled_appointments) {
      const appointments = getTodayAppointmentsForDoctor(doctorId)
      load += appointments.filter(a => a.status === "in_progress" || a.status === "checked_in").length
    }

    // Weight by duration (if configured)
    if (config.weight_by_consultation_duration) {
      const avgDuration = getAvgConsultationDuration(doctorId)
      load = load * (avgDuration / 15) // Normalize to 15-min slots
    }

    doctorLoads.set(doctorId, load)
  }

  // Return doctor with least load
  return Array.from(doctorLoads.entries())
    .sort((a, b) => a[1] - b[1])[0][0]
}

// Specialty-Based Assignment
function assignDoctorBySpecialty(
  queue: Queue,
  entry: QueueEntry,
  config: LoadBalancingConfig
): UUID | null {
  if (!config.specialty_routing_rules) {
    return null
  }

  // Find matching rule
  for (const rule of config.specialty_routing_rules.sort((a, b) => b.priority - a.priority)) {
    if (matchesRoutingCondition(entry, rule.condition)) {
      // Filter available doctors from rule
      const availableDoctors = rule.route_to_doctor_ids.filter(id =>
        queue.assigned_doctors.includes(id) && isDoctorAvailable(id)
      )

      if (availableDoctors.length > 0) {
        // Use least loaded among matching doctors
        return assignDoctorLeastLoaded(
          { ...queue, assigned_doctors: availableDoctors },
          entry,
          config
        )
      }
    }
  }

  return null // No matching rule
}

// Emergency Triage Assignment
function assignEmergencyTriage(
  entry: QueueEntry,
  availableDoctors: UUID[]
): { doctor_id: UUID, priority: number } {
  const triage = entry.triage_level || "non_urgent"

  // Priority scoring
  const priorityMap = {
    "emergency": 100,
    "urgent": 75,
    "semi_urgent": 50,
    "non_urgent": 25
  }

  const priority = priorityMap[triage]

  // For emergency, assign to first available
  if (triage === "emergency") {
    const emergencyDoctor = availableDoctors.find(id =>
      isDoctorQualifiedForEmergency(id)
    )
    return {
      doctor_id: emergencyDoctor || availableDoctors[0],
      priority
    }
  }

  // For others, use least loaded
  const leastLoaded = availableDoctors
    .map(id => ({ id, load: getCurrentLoad(id) }))
    .sort((a, b) => a.load - b.load)[0]

  return {
    doctor_id: leastLoaded.id,
    priority
  }
}
```

### F.3 Walk-in Patient Flow

**Registration Desk Flow:**
```
1. Patient Walks In
   ↓
2. Receptionist: Check if existing patient
   - Yes: Load patient profile
   - No: Quick registration (name, phone, age, chief complaint)
   ↓
3. Select Queue Type
   - OPD General
   - OPD Specialty (select specialty)
   - Emergency
   ↓
4. Generate Queue Number
   ↓
5. Collect Payment (if required)
   ↓
6. Add to Queue
   ↓
7. Print Queue Ticket + Send SMS
```

**Queue Ticket:**
```
┌──────────────────────────────────┐
│  MyMedic Hospital - Downtown     │
│                                  │
│  Queue Number: Q-045             │
│  Patient: John Doe               │
│  Department: General Medicine    │
│                                  │
│  Your Position: 5                │
│  Est. Wait Time: 25 minutes      │
│                                  │
│  Doctor will be assigned shortly │
│                                  │
│  Please wait in the lobby        │
│  Your number will be displayed   │
│  and announced when ready        │
│                                  │
│  Date: Jan 15, 2026 10:30 AM     │
└──────────────────────────────────┘
```

**Display Board:**
```
┌────────────────────────────────────────────────────────┐
│           MYMEDIC HOSPITAL - OPD QUEUE                 │
├────────────────────────────────────────────────────────┤
│  NOW SERVING                                           │
│                                                         │
│  🔵 Q-042  →  Dr. Sarah Smith   Room 201              │
│  🔵 Q-043  →  Dr. Raj Patel     Room 202              │
│  🔵 Q-044  →  Dr. Kumar Reddy   Room 203              │
│                                                         │
├────────────────────────────────────────────────────────┤
│  WAITING                                               │
│                                                         │
│  Q-045  Q-046  Q-047  Q-048  Q-049                     │
│                                                         │
│  Estimated Wait: 20-30 minutes                         │
└────────────────────────────────────────────────────────┘
```

### F.4 UI for Queue Management

**Receptionist Queue Dashboard:**
```
┌────────────────────────────────────────────────────────┐
│ OPD Queue Management - Jan 15, 2026                    │
├────────────────────────────────────────────────────────┤
│ Active Queues: 3 | Total Waiting: 12 | Avg Wait: 22min│
│                                                         │
│ [Add Walk-in] [Call Next] [Pause Queue] [Close Queue] │
├────────────────────────────────────────────────────────┤
│ General Medicine Queue (6 waiting)                     │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Q-042 | John Doe | In Consultation - Dr. Smith  │  │
│ │        Started: 10:28 AM (12 min ago)           │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Q-045 | Mary Johnson | Waiting | Priority: Normal│  │
│ │        Wait: 15 min | [Call Now] [Assign Doctor]│  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Q-046 | Robert Davis | Waiting | Priority: Normal│  │
│ │        Wait: 12 min | [Call Now] [Assign Doctor]│  │
│ └──────────────────────────────────────────────────┘  │
│                                                         │
│ Cardiology Queue (4 waiting)                           │
│ Emergency Queue (2 waiting - 1 URGENT)                 │
└────────────────────────────────────────────────────────┘
```

---

## G. Staff & Equipment Scheduling

### G.1 Staff Resource Models

```typescript
interface StaffMember {
  id: UUID
  hospital_id: UUID
  user_id?: UUID // Links to users table if they have login

  // Identity
  full_name: string
  employee_id: string
  staff_type: StaffType
  role: string // "senior_nurse", "technician", "anesthetist"

  // Credentials
  qualifications: Qualification[]
  certifications: Certification[]
  license_number?: string
  license_expiry?: Date

  // Skills & Specializations
  skills: string[] // ["pediatric_care", "iv_insertion", "ecg_reading"]
  specializations: string[] // ["cardiac_care", "icu"]
  languages: string[]

  // Assignment
  primary_department_id?: UUID
  departments: UUID[] // Multi-department support
  primary_location_id: UUID
  additional_locations: UUID[]

  // Availability
  default_shift: "morning" | "afternoon" | "night" | "rotating"
  works_weekends: boolean
  works_holidays: boolean

  // Scheduling
  max_hours_per_week: number
  max_consecutive_days: number
  requires_break_every_n_hours: number

  // Status
  status: "active" | "on_leave" | "inactive"
  available_from?: Date
  available_until?: Date

  // Metadata
  hire_date: Date
  created_at: timestamp
  updated_at: timestamp
}

type StaffType =
  | "nurse"
  | "technician"
  | "lab_technician"
  | "radiology_technician"
  | "physiotherapist"
  | "anesthetist"
  | "ot_assistant"
  | "paramedic"
  | "pharmacist"
  | "receptionist"
  | "clerical"

interface StaffSchedule {
  id: UUID
  staff_id: UUID
  schedule_type: "regular" | "on_call" | "overtime"

  // Schedule Pattern
  recurring_schedule: StaffShift[]
  schedule_overrides: StaffShiftOverride[]
  leave_periods: StaffLeave[]

  // Effective Period
  effective_from: Date
  effective_until?: Date

  // Metadata
  created_by: UUID
  created_at: timestamp
}

interface StaffShift {
  day_of_week: number // 0-6
  shift_type: "morning" | "afternoon" | "night" | "full_day"
  start_time: string
  end_time: string

  // Assignment
  location_id: UUID
  department_id?: UUID
  assigned_area?: string // "ICU", "OT-1", "Ward-A"

  // Break
  break_duration_minutes: number
  break_start_time?: string
}

interface StaffRequirement {
  // Required for Appointment/Procedure
  role: StaffType | string // "nurse" or specific like "anesthetist"
  count: number
  required: boolean // true = must have, false = optional

  // Skills Required
  required_skills?: string[]
  required_certifications?: string[]

  // Timing
  required_at: "during" | "before" | "after" | "throughout"
  duration_minutes?: number

  // Assigned Staff (after booking)
  assigned_staff_ids?: UUID[]
}

interface StaffAssignment {
  id: UUID
  staff_id: UUID

  // Assignment Type
  assignment_type: "appointment" | "procedure" | "surgery" | "shift_coverage"
  entity_id: UUID // appointment_id, procedure_id, etc.

  // Timing
  assigned_date: Date
  assigned_start_time: string
  assigned_end_time: string
  actual_start_time?: timestamp
  actual_end_time?: timestamp

  // Location
  location_id: UUID
  department_id?: UUID
  room_id?: UUID

  // Status
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled"

  // Notes
  notes?: string
  special_instructions?: string

  // Metadata
  assigned_by: UUID
  assigned_at: timestamp
}
```

### G.2 Equipment Resource Models

```typescript
interface MedicalEquipment {
  id: UUID
  hospital_id: UUID
  location_id: UUID

  // Identity
  equipment_name: string
  equipment_type: EquipmentType
  equipment_category: "diagnostic" | "therapeutic" | "monitoring" | "surgical" | "life_support"

  // Details
  manufacturer: string
  model: string
  serial_number: string
  asset_number?: string

  // Specifications
  specifications: Record<string, any>
  requires_operator: boolean
  operator_qualification_required?: string

  // Location
  permanent_location?: string // "Radiology Room 2", "OT-1"
  is_portable: boolean
  current_location?: string

  // Scheduling
  requires_booking: boolean
  booking_duration_unit: "minutes" | "hours" | "days"
  min_booking_duration: number
  max_booking_duration: number
  buffer_time_between_bookings: number

  // Availability
  operating_hours?: OperatingHours[]
  maintenance_schedule: MaintenanceSchedule[]
  next_maintenance_date: Date

  // Status
  status: "available" | "in_use" | "maintenance" | "out_of_service" | "retired"
  status_notes?: string

  // Usage Tracking
  total_usage_hours: number
  last_used_at?: timestamp
  usage_requires_tracking: boolean

  // Calibration
  requires_calibration: boolean
  last_calibration_date?: Date
  next_calibration_date?: Date
  calibration_frequency_days?: number

  // Compliance
  requires_quality_check: boolean
  quality_check_frequency_days?: number
  last_quality_check_date?: Date

  // Metadata
  purchase_date?: Date
  warranty_expiry?: Date
  cost: number
  created_at: timestamp
  updated_at: timestamp
}

type EquipmentType =
  | "xray_machine"
  | "ultrasound"
  | "ct_scanner"
  | "mri_machine"
  | "ecg_machine"
  | "dialysis_machine"
  | "ventilator"
  | "infusion_pump"
  | "defibrillator"
  | "patient_monitor"
  | "anesthesia_machine"
  | "surgical_microscope"
  | "endoscope"
  | "laboratory_analyzer"
  | "other"

interface EquipmentBooking {
  id: UUID
  equipment_id: UUID

  // Booking Details
  booked_for: "appointment" | "procedure" | "surgery" | "maintenance" | "calibration" | "training"
  entity_id?: UUID // appointment_id, procedure_id
  patient_id?: UUID

  // Timing
  booking_date: Date
  booking_start_time: string
  booking_end_time: string
  actual_start_time?: timestamp
  actual_end_time?: timestamp

  // Status
  status: "reserved" | "in_use" | "completed" | "cancelled"

  // Operator
  operated_by?: UUID // staff_id
  supervised_by?: UUID // senior staff_id

  // Usage Notes
  usage_notes?: string
  issues_reported?: string
  consumables_used?: ConsumableUsage[]

  // Metadata
  booked_by: UUID
  booked_at: timestamp
}

interface ConsumableUsage {
  consumable_name: string
  quantity_used: number
  unit: string
  cost?: number
}

interface MaintenanceSchedule {
  equipment_id: UUID
  maintenance_type: "routine" | "preventive" | "corrective" | "calibration"
  frequency_days: number
  last_maintenance_date?: Date
  next_maintenance_date: Date
  estimated_duration_hours: number
  performed_by?: string // "Internal", "Vendor", specific vendor name
  cost_per_maintenance?: number
}
```

### G.3 Resource Allocation Logic

```typescript
// Check staff availability
function isStaffAvailable(
  staff_id: UUID,
  date: Date,
  start_time: string,
  end_time: string
): boolean {
  // Check if staff is active
  const staff = getStaffMember(staff_id)
  if (staff.status !== "active") return false

  // Check leave
  if (isStaffOnLeave(staff_id, date)) return false

  // Check existing assignments
  const existingAssignments = getStaffAssignments(staff_id, date)
  for (const assignment of existingAssignments) {
    if (hasTimeOverlap(assignment, start_time, end_time)) {
      return false
    }
  }

  // Check max hours
  const weekHours = getStaffWeekHours(staff_id, date)
  const additionalHours = calculateDuration(start_time, end_time)
  if (weekHours + additionalHours > staff.max_hours_per_week) {
    return false
  }

  return true
}

// Find available staff for requirement
function findAvailableStaff(
  requirement: StaffRequirement,
  date: Date,
  start_time: string,
  end_time: string,
  location_id: UUID
): UUID[] {
  const allStaff = getStaffByType(requirement.role, location_id)

  return allStaff.filter(staff => {
    // Check availability
    if (!isStaffAvailable(staff.id, date, start_time, end_time)) {
      return false
    }

    // Check required skills
    if (requirement.required_skills) {
      const hasAllSkills = requirement.required_skills.every(skill =>
        staff.skills.includes(skill)
      )
      if (!hasAllSkills) return false
    }

    // Check certifications
    if (requirement.required_certifications) {
      const hasAllCerts = requirement.required_certifications.every(cert =>
        staff.certifications.some(c => c.certification_name === cert && !c.is_expired)
      )
      if (!hasAllCerts) return false
    }

    return true
  }).map(s => s.id)
}

// Check equipment availability
function isEquipmentAvailable(
  equipment_id: UUID,
  date: Date,
  start_time: string,
  duration_minutes: number
): boolean {
  const equipment = getEquipment(equipment_id)

  // Check status
  if (equipment.status !== "available") return false

  // Check maintenance schedule
  if (isMaintenanceScheduled(equipment_id, date)) return false

  // Check existing bookings
  const existingBookings = getEquipmentBookings(equipment_id, date)
  const end_time = addMinutes(start_time, duration_minutes + equipment.buffer_time_between_bookings)

  for (const booking of existingBookings) {
    if (hasTimeOverlap(booking, start_time, end_time)) {
      return false
    }
  }

  // Check operating hours
  if (equipment.operating_hours) {
    if (!isWithinOperatingHours(equipment.operating_hours, date, start_time)) {
      return false
    }
  }

  return true
}

// Auto-assign resources for appointment
async function autoAssignResources(
  appointment: Appointment
): Promise<ResourceAssignment> {
  const requirements = getResourceRequirements(appointment.visit_type)

  const assignments: ResourceAssignment = {
    staff: [],
    equipment: [],
    conflicts: []
  }

  // Assign staff
  for (const staffReq of requirements.staff) {
    const availableStaff = findAvailableStaff(
      staffReq,
      appointment.scheduled_at,
      appointment.start_time,
      appointment.end_time,
      appointment.location_id
    )

    if (availableStaff.length >= staffReq.count) {
      // Assign first N available
      const assigned = availableStaff.slice(0, staffReq.count)
      assignments.staff.push(...assigned)

      // Create staff assignments
      for (const staff_id of assigned) {
        await createStaffAssignment({
          staff_id,
          assignment_type: "appointment",
          entity_id: appointment.id,
          assigned_date: appointment.scheduled_at,
          assigned_start_time: appointment.start_time,
          assigned_end_time: appointment.end_time,
          location_id: appointment.location_id,
          room_id: appointment.room_id
        })
      }
    } else if (staffReq.required) {
      assignments.conflicts.push({
        type: "staff_unavailable",
        requirement: staffReq,
        available_count: availableStaff.length
      })
    }
  }

  // Assign equipment
  for (const equipReq of requirements.equipment) {
    const available = isEquipmentAvailable(
      equipReq.equipment_id,
      appointment.scheduled_at,
      appointment.start_time,
      equipReq.duration_minutes
    )

    if (available) {
      assignments.equipment.push(equipReq.equipment_id)

      // Create equipment booking
      await createEquipmentBooking({
        equipment_id: equipReq.equipment_id,
        booked_for: "appointment",
        entity_id: appointment.id,
        patient_id: appointment.patient_id,
        booking_date: appointment.scheduled_at,
        booking_start_time: appointment.start_time,
        booking_end_time: addMinutes(appointment.start_time, equipReq.duration_minutes)
      })
    } else if (equipReq.required) {
      assignments.conflicts.push({
        type: "equipment_unavailable",
        equipment_id: equipReq.equipment_id
      })
    }
  }

  return assignments
}
```

---

## H. Telemedicine Compliance

### H.1 Consent & Legal Models

```typescript
interface TelehealthConsent {
  id: UUID
  patient_id: UUID
  hospital_id: UUID

  // Consent Details
  consent_type: "telehealth_general" | "video_consultation" | "audio_only" | "store_and_forward"
  consent_version: string // Version of consent form
  consent_text: string // Full consent text shown to patient

  // Consent Given
  consent_given: boolean
  consented_at: timestamp
  consent_method: "digital_signature" | "verbal_recorded" | "physical_form_scanned"

  // Digital Signature
  signature_data?: string // Base64 encoded signature image
  ip_address?: string
  user_agent?: string
  geolocation?: { lat: number, lon: number }

  // Witness (if required)
  witnessed_by?: UUID // staff_id
  witness_signature?: string

  // Scope
  scope: {
    allows_video: boolean
    allows_audio_only: boolean
    allows_messaging: boolean
    allows_recording: boolean
    allows_screenshot: boolean
    allows_third_party_observers: boolean // For teaching
  }

  // Privacy & Data
  privacy_policy_version: string
  data_retention_agreed: boolean
  allows_data_sharing_with: string[] // ["referring_doctor", "insurance", "family_member"]

  // Limitations Acknowledged
  limitations_acknowledged: {
    technical_issues_possible: boolean
    emergency_limitations: boolean
    prescription_limitations: boolean
    physical_exam_limitations: boolean
  }

  // Validity
  valid_from: Date
  valid_until: Date // null = indefinite
  revoked: boolean
  revoked_at?: timestamp
  revocation_reason?: string

  // Compliance
  complies_with: string[] // ["HIPAA", "GDPR", "Telemedicine Practice Guidelines 2020"]

  // Audit
  created_at: timestamp
  updated_at: timestamp
}

interface TelehealthSession {
  id: UUID
  appointment_id: UUID
  patient_id: UUID
  doctor_id: UUID

  // Platform
  platform: "zoom" | "google_meet" | "webrtc_native" | "whatsapp" | "custom"
  meeting_id: string
  meeting_url: string
  meeting_password?: string

  // Consent Verification
  consent_id: UUID
  consent_verified_at: timestamp
  consent_verified_by: UUID

  // Session Timing
  session_scheduled_at: timestamp
  session_started_at?: timestamp
  session_ended_at?: timestamp
  session_duration_seconds?: number

  // Connection Quality
  connection_logs: ConnectionLog[]
  technical_issues: TechnicalIssue[]
  connection_quality_avg: "excellent" | "good" | "fair" | "poor"

  // Participants
  participants: TelehealthParticipant[]

  // Recording (if consented)
  is_recorded: boolean
  recording_consent_confirmed: boolean
  recording_url?: string
  recording_duration_seconds?: number
  recording_storage_location?: string
  recording_retention_until?: Date

  // Clinical Documentation
  consultation_notes_id?: UUID
  prescription_id?: UUID
  follow_up_required: boolean
  follow_up_type?: "in_person" | "tele"

  // Billing
  session_fee: number
  payment_id?: UUID

  // Fallback
  fallback_to_in_person: boolean
  fallback_reason?: string
  fallback_appointment_id?: UUID

  // Compliance Logging
  compliance_checks: ComplianceCheck[]
  audit_trail: AuditEntry[]

  // Metadata
  created_at: timestamp
  updated_at: timestamp
}

interface TelehealthParticipant {
  participant_type: "patient" | "doctor" | "family_member" | "interpreter" | "student_observer"
  user_id?: UUID
  name: string
  relationship?: string // For family members

  joined_at: timestamp
  left_at?: timestamp
  duration_seconds?: number

  // Consent
  consent_for_presence: boolean
  consented_by: UUID // patient_id or guardian_id

  // Connection
  connection_type: "video" | "audio_only" | "chat_only"
  device_type: "desktop" | "mobile" | "tablet"
  browser: string
  ip_address: string
}

interface ConnectionLog {
  timestamp: timestamp
  event_type: "connected" | "disconnected" | "reconnected" | "quality_change" | "error"
  connection_quality: "excellent" | "good" | "fair" | "poor"

  // Technical Details
  bandwidth_mbps?: number
  latency_ms?: number
  packet_loss_percentage?: number
  video_resolution?: string
  framerate?: number

  // Error Details
  error_code?: string
  error_message?: string
}

interface TechnicalIssue {
  issue_type: "audio_failure" | "video_failure" | "connection_drop" | "platform_error" | "device_issue"
  occurred_at: timestamp
  resolved_at?: timestamp
  description: string
  resolution_action?: string
  impacted_session: boolean
}

interface ComplianceCheck {
  check_type: "consent_verification" | "identity_verification" | "license_verification" | "location_verification"
  performed_at: timestamp
  passed: boolean
  details: string
  performed_by?: UUID
}
```

### H.2 Regulatory Compliance Features

```typescript
// Pre-Session Compliance Checklist
interface PreSessionCompliance {
  // 1. Patient Identity Verification
  identity_verified: boolean
  identity_verification_method: "government_id" | "previous_visit_photo" | "security_questions" | "two_factor_auth"
  identity_verified_by: UUID
  identity_verified_at: timestamp

  // 2. Consent Verification
  consent_obtained: boolean
  consent_id: UUID
  consent_verified_at: timestamp

  // 3. Location Verification
  patient_location: {
    country: string
    state: string
    city: string
    detected_via: "ip" | "gps" | "user_entered"
  }
  doctor_location: {
    country: string
    state: string
    city: string
  }
  cross_state_consultation: boolean
  cross_state_license_valid: boolean

  // 4. Doctor License Verification
  doctor_license_valid_in_patient_state: boolean
  telehealth_license_verified: boolean
  license_expiry_checked: boolean

  // 5. Emergency Protocol
  emergency_contact_available: boolean
  patient_address_confirmed: boolean
  nearest_hospital_identified: boolean

  // 6. Technical Readiness
  platform_functional: boolean
  bandwidth_adequate: boolean
  devices_tested: boolean

  // 7. Privacy & Security
  secure_connection_established: boolean
  end_to_end_encryption: boolean
  waiting_room_private: boolean

  // Overall Status
  all_checks_passed: boolean
  blocking_issues: string[]
  warnings: string[]
}

// In-Session Monitoring
interface SessionMonitoring {
  session_id: UUID

  // Quality Monitoring (real-time)
  current_connection_quality: "excellent" | "good" | "fair" | "poor"
  quality_below_threshold_duration_seconds: number
  quality_alerts: QualityAlert[]

  // Participant Monitoring
  all_participants_connected: boolean
  unauthorized_participants_detected: boolean

  // Recording Compliance
  recording_indicator_visible: boolean
  recording_consent_displayed: boolean

  // Clinical Documentation
  notes_being_taken: boolean
  notes_auto_save_enabled: boolean

  // Session Duration
  session_duration_seconds: number
  scheduled_duration_seconds: number
  overtime_alert: boolean
}

// Post-Session Compliance
interface PostSessionCompliance {
  session_id: UUID

  // Documentation
  consultation_notes_completed: boolean
  consultation_notes_signed: boolean
  prescription_generated: boolean
  prescription_delivered: boolean

  // Patient Follow-up
  patient_satisfaction_survey_sent: boolean
  follow_up_appointment_scheduled: boolean
  instructions_sent_to_patient: boolean

  // Billing
  billing_completed: boolean
  insurance_claim_submitted: boolean

  // Data Retention
  session_data_archived: boolean
  recording_stored_securely: boolean
  recording_retention_policy_applied: boolean

  // Audit Trail
  audit_log_generated: boolean
  compliance_report_generated: boolean

  // Regulatory
  reported_to_telehealth_registry: boolean // If required by jurisdiction
  anonymized_data_for_quality_reporting: boolean
}
```

### H.3 Fallback to In-Person Logic

```typescript
// Determine if session should fallback to in-person
function evaluateFallbackNeed(
  session: TelehealthSession
): FallbackDecision {
  const issues: string[] = []
  let severity: "none" | "warning" | "critical" = "none"

  // 1. Technical Issues
  if (session.connection_quality_avg === "poor") {
    issues.push("Poor connection quality throughout session")
    severity = "warning"
  }

  const disconnections = session.connection_logs.filter(
    log => log.event_type === "disconnected"
  ).length

  if (disconnections >= 3) {
    issues.push("Multiple disconnections (3+)")
    severity = "critical"
  }

  // 2. Clinical Necessity
  const requiresPhysicalExam = requiresPhysicalExamination(session)
  if (requiresPhysicalExam) {
    issues.push("Physical examination required for accurate diagnosis")
    severity = "critical"
  }

  // 3. Diagnostic Limitation
  const requiresImaging = requiresImagingOrLabs(session)
  if (requiresImaging) {
    issues.push("Imaging or lab tests required")
    severity = "warning"
  }

  // 4. Patient Request
  if (patientRequestedInPerson(session)) {
    issues.push("Patient requested in-person visit")
    severity = "warning"
  }

  // 5. Regulatory
  if (!isComplianceMetForState(session)) {
    issues.push("Regulatory compliance issues detected")
    severity = "critical"
  }

  const shouldFallback = severity === "critical"

  return {
    should_fallback: shouldFallback,
    severity,
    reasons: issues,
    recommended_action: shouldFallback
      ? "Schedule in-person appointment within 48 hours"
      : "Continue with telehealth",
    auto_schedule_inperson: shouldFallback && severity === "critical"
  }
}

// Auto-schedule fallback appointment
async function scheduleFallbackAppointment(
  original_session: TelehealthSession,
  fallback_decision: FallbackDecision
): Promise<Appointment> {

  // Find next available in-person slot
  const slots = await findAvailableSlots({
    doctor_id: original_session.doctor_id,
    consultation_mode: "in_person",
    date_from: addDays(new Date(), 0), // From today
    date_to: addDays(new Date(), 2), // Within 2 days
    visit_type: "follow_up"
  })

  if (slots.length === 0) {
    // Escalate to admin
    await notifyAdminNoAvailableSlots(original_session)
    throw new Error("No available slots for fallback appointment")
  }

  // Create appointment
  const appointment = await createAppointment({
    patient_id: original_session.patient_id,
    doctor_id: original_session.doctor_id,
    scheduled_at: slots[0].slot_datetime,
    visit_type: "follow_up",
    consultation_mode: "in_person",
    reason: `Follow-up from telehealth session - ${fallback_decision.reasons.join(", ")}`,
    notes: `Fallback from telehealth session ${original_session.id}`,
    linked_telehealth_session_id: original_session.id,
    consultation_fee: 0 // Waive fee as it's a fallback
  })

  // Update original session
  await updateTelehealthSession(original_session.id, {
    fallback_to_in_person: true,
    fallback_reason: fallback_decision.reasons.join("; "),
    fallback_appointment_id: appointment.id
  })

  // Notify patient
  await notifyPatientFallbackScheduled(
    original_session.patient_id,
    appointment
  )

  return appointment
}
```

---

## I. Summary: Updated Data Models

All data models extend the core specification with:

**New Tables:**
- `visit_type_pricing`
- `corporate_pricing`
- `insurance_claims`
- `payment_transactions`
- `deposit_management`
- `recurring_appointments`
- `recurrence_rules`
- `overbooking_policies`
- `no_show_predictions`
- `queues`
- `queue_entries`
- `staff_members`
- `staff_schedules`
- `staff_assignments`
- `medical_equipment`
- `equipment_bookings`
- `telehealth_consents`
- `telehealth_sessions`
- `session_connection_logs`

**Extended Tables:**
- `appointments` - add fields: `series_id`, `recurrence_type`, `telehealth_session_id`, `queue_entry_id`
- `doctors` - add fields: `overbooking_policy_id`, `allows_walkins`
- `locations` - add fields: `queue_management_enabled`, `telehealth_enabled`

---

## J. Summary: Updated APIs

**New API Endpoints:**

```
# Billing
POST   /api/pricing/visit-types
GET    /api/pricing/calculate
POST   /api/payments/deposits
POST   /api/insurance/claims

# Recurring
POST   /api/appointments/recurring
GET    /api/appointments/series/{series_id}
PATCH  /api/appointments/series/{series_id}
DELETE /api/appointments/series/{series_id}/cancel

# Queues
POST   /api/queues
POST   /api/queues/{queue_id}/entries
PATCH  /api/queues/{queue_id}/entries/{entry_id}/call
GET    /api/queues/{queue_id}/display

# Staff
GET    /api/staff/available
POST   /api/staff/assignments
GET    /api/appointments/{appointment_id}/resources

# Equipment
GET    /api/equipment/available
POST   /api/equipment/bookings

# Telehealth
POST   /api/telehealth/consents
POST   /api/telehealth/sessions
GET    /api/telehealth/sessions/{session_id}/compliance
POST   /api/telehealth/sessions/{session_id}/fallback
```

---

## K. Implementation Priority

### Phase 1: Billing Foundation (Weeks 1-2)
- Visit type pricing
- Payment integration
- GST calculation
- Basic refund logic

### Phase 2: Operational Essentials (Weeks 3-5)
- Walk-in queue management
- Load balancing
- Staff availability checking
- Equipment booking

### Phase 3: Advanced Scheduling (Weeks 6-8)
- Recurring appointments (dialysis, physio)
- Scheduling modes (doctor-first, specialty-first)
- Overbooking configuration

### Phase 4: Compliance & Quality (Weeks 9-10)
- Telehealth consent workflow
- Session monitoring
- Compliance checklists
- Fallback logic

### Phase 5: Intelligence & Optimization (Weeks 11-12)
- No-show prediction integration
- Smart routing
- Migration tools
- Analytics dashboard

---

## L. Success Metrics

**Operational:**
- Queue wait time < 20 minutes (90th percentile)
- Staff utilization 70-85%
- Equipment utilization > 80%
- Recurring appointment adherence > 90%

**Financial:**
- Payment collection rate > 95%
- Refund processing < 48 hours
- Corporate billing accuracy 100%
- Pricing compliance 100%

**Clinical:**
- Telehealth completion rate > 85%
- Fallback rate < 10%
- Patient satisfaction > 4.2/5.0
- Same-day walk-in capacity > 20 slots/day

**Compliance:**
- Consent capture rate 100%
- Session recording compliance 100%
- License verification 100%
- Audit trail completeness 100%

---

## M. Operational Gaps & Extensions

This section addresses critical operational workflows, ownership models, and preconditions that govern the day-to-day functioning of the scheduling system.

---

### M.1 Doctor Onboarding Workflow

#### M.1.1 Onboarding State Machine

```typescript
interface DoctorOnboardingState {
  doctor_id: UUID
  current_stage: OnboardingStage
  overall_status: "draft" | "in_progress" | "pending_verification" | "active" | "blocked"

  // Stage Completion
  stages: StageStatus[]

  // Verification
  verification_checks: VerificationCheck[]
  all_verifications_passed: boolean

  // Activation Blockers
  blockers: OnboardingBlocker[]
  can_accept_appointments: boolean
  public_profile_visible: boolean

  // Ownership & Approval
  created_by: UUID
  current_owner: UUID // Who needs to act next
  approval_chain: ApprovalRecord[]

  // Metadata
  started_at: timestamp
  target_completion_date?: Date
  completed_at?: timestamp
  activated_at?: timestamp
}

type OnboardingStage =
  | "profile_creation"
  | "credential_verification"
  | "department_assignment"
  | "location_assignment"
  | "fee_configuration"
  | "availability_setup"
  | "resource_allocation"
  | "compliance_checks"
  | "final_approval"
  | "activation"

interface StageStatus {
  stage: OnboardingStage
  status: "pending" | "in_progress" | "completed" | "blocked" | "skipped"

  // Ownership
  assigned_to_role: UserRole
  assigned_to_user?: UUID

  // Completion
  completed: boolean
  completed_at?: timestamp
  completed_by?: UUID

  // Dependencies
  depends_on_stages: OnboardingStage[]
  blocking_stages: OnboardingStage[]

  // Progress
  required_fields: FieldRequirement[]
  optional_fields: FieldRequirement[]
  fields_completion_percentage: number

  // Validation
  validation_errors: ValidationError[]
  can_proceed: boolean
}

interface FieldRequirement {
  field_name: string
  field_label: string
  required: boolean
  completed: boolean
  data_type: "text" | "number" | "date" | "file" | "array" | "object"
  validation_rules: ValidationRule[]
}

interface VerificationCheck {
  check_type: "license_verification" | "qualification_verification" | "background_check" | "reference_check" | "insurance_verification"
  status: "pending" | "in_progress" | "verified" | "failed" | "expired"

  // Verification Details
  verified_by?: UUID
  verified_at?: timestamp
  verification_method: "manual" | "automated" | "third_party"
  verification_source?: string // "NMC Portal", "University Database"

  // Expiry
  valid_until?: Date
  requires_renewal: boolean
  renewal_reminder_days: number

  // Documents
  documents_required: string[]
  documents_submitted: DocumentSubmission[]

  // Result
  verification_notes?: string
  rejection_reason?: string
}

interface OnboardingBlocker {
  blocker_type: "missing_data" | "failed_verification" | "pending_approval" | "missing_license" | "no_availability" | "no_fees_configured"
  severity: "critical" | "high" | "medium" | "low"

  description: string
  blocking_stage: OnboardingStage

  // Resolution
  resolution_required_by: UserRole
  resolution_action: string
  can_auto_resolve: boolean

  // Impact
  blocks_activation: boolean
  blocks_public_visibility: boolean

  created_at: timestamp
  resolved_at?: timestamp
  resolved_by?: UUID
}
```

#### M.1.2 Onboarding Workflow Definition

```typescript
const ONBOARDING_WORKFLOW: WorkflowDefinition = {
  stages: [
    {
      stage: "profile_creation",
      name: "Profile Creation",
      assigned_to_role: "admin",
      description: "Create basic doctor profile with identity information",

      required_fields: [
        "full_name",
        "primary_specialty",
        "registration_number",
        "registration_authority",
        "hospital_id",
        "user_id"
      ],

      optional_fields: [
        "display_name",
        "salutation",
        "sub_specialties",
        "bio",
        "profile_image_url",
        "languages"
      ],

      dependencies: [],

      validation_rules: [
        { field: "registration_number", rule: "unique", message: "Registration number already exists" },
        { field: "user_id", rule: "unique", message: "User already linked to another doctor" },
        { field: "primary_specialty", rule: "in_list", list: "specialties", message: "Invalid specialty" }
      ],

      on_complete: "trigger_credential_verification"
    },

    {
      stage: "credential_verification",
      name: "Credential Verification",
      assigned_to_role: "admin",
      description: "Verify medical license, qualifications, and certifications",

      verifications: [
        {
          type: "license_verification",
          required: true,
          method: "manual", // or "automated" if integration available
          documents: ["medical_license", "registration_certificate"],
          verification_checklist: [
            "License number matches registration authority records",
            "License is current and not expired",
            "No disciplinary actions on record",
            "Specialization matches claimed credentials"
          ]
        },
        {
          type: "qualification_verification",
          required: true,
          method: "manual",
          documents: ["degree_certificates", "transcripts"],
          verification_checklist: [
            "Degrees verified from issuing institutions",
            "Graduation years consistent",
            "Specialization training completed"
          ]
        }
      ],

      dependencies: ["profile_creation"],

      blocks_activation_if_incomplete: true,

      on_complete: "trigger_department_assignment"
    },

    {
      stage: "department_assignment",
      name: "Department Assignment",
      assigned_to_role: "admin",
      description: "Assign doctor to department(s) and define role",

      required_fields: [
        "primary_department_id"
      ],

      optional_fields: [
        "departments", // Additional departments
        "department_role" // "attending", "consultant", "head"
      ],

      dependencies: ["credential_verification"],

      approval_required: true,
      approval_role: "department_head",

      on_complete: "trigger_location_assignment"
    },

    {
      stage: "location_assignment",
      name: "Location Assignment",
      assigned_to_role: "admin",
      description: "Assign primary and additional locations",

      required_fields: [
        "primary_location_id"
      ],

      optional_fields: [
        "additional_locations"
      ],

      dependencies: ["department_assignment"],

      validation_rules: [
        {
          rule: "location_has_capacity",
          message: "Location does not have available capacity for new doctors"
        }
      ],

      on_complete: "trigger_fee_configuration"
    },

    {
      stage: "fee_configuration",
      name: "Fee Configuration",
      assigned_to_role: "admin",
      description: "Configure consultation fees and pricing",

      required_fields: [
        "consultation_fee"
      ],

      optional_fields: [
        "follow_up_fee",
        "tele_consultation_fee",
        "pricing_by_visit_type"
      ],

      dependencies: ["location_assignment"],

      blocks_activation_if_incomplete: true,

      validation_rules: [
        {
          field: "consultation_fee",
          rule: "greater_than",
          value: 0,
          message: "Consultation fee must be greater than 0"
        }
      ],

      on_complete: "notify_doctor_for_availability_setup"
    },

    {
      stage: "availability_setup",
      name: "Availability Setup",
      assigned_to_role: "doctor",
      description: "Doctor sets their weekly availability schedule",

      required_fields: [
        "weekly_schedule"
      ],

      dependencies: ["fee_configuration"],

      blocks_activation_if_incomplete: true,

      validation_rules: [
        {
          rule: "at_least_one_time_block",
          message: "At least one availability time block required"
        }
      ],

      self_service: true,
      doctor_can_complete: true,

      on_complete: "trigger_resource_allocation"
    },

    {
      stage: "resource_allocation",
      name: "Resource Allocation",
      assigned_to_role: "admin",
      description: "Allocate rooms and equipment",

      optional_fields: [
        "default_room_id",
        "equipment_access"
      ],

      dependencies: ["availability_setup"],

      can_skip: true,

      on_complete: "trigger_compliance_checks"
    },

    {
      stage: "compliance_checks",
      name: "Compliance Checks",
      assigned_to_role: "admin",
      description: "Final compliance and regulatory checks",

      verifications: [
        {
          type: "insurance_verification",
          required: true,
          description: "Professional liability insurance verified"
        },
        {
          type: "background_check",
          required: false,
          description: "Background check completed (if required by hospital policy)"
        }
      ],

      dependencies: ["resource_allocation"],

      blocks_activation_if_incomplete: true,

      on_complete: "trigger_final_approval"
    },

    {
      stage: "final_approval",
      name: "Final Approval",
      assigned_to_role: "admin",
      description: "Final review and approval for activation",

      approval_required: true,
      approval_roles: ["admin", "department_head"],

      approval_checklist: [
        "All credentials verified",
        "Fees configured appropriately",
        "Availability schedule set",
        "Compliance checks passed",
        "No outstanding blockers"
      ],

      dependencies: ["compliance_checks"],

      on_complete: "activate_doctor"
    },

    {
      stage: "activation",
      name: "Activation",
      assigned_to_role: "system",
      description: "Activate doctor profile and make available for scheduling",

      actions: [
        "set_doctor_status_active",
        "publish_public_profile",
        "generate_booking_slots",
        "send_activation_notification",
        "create_audit_log"
      ],

      dependencies: ["final_approval"]
    }
  ]
}
```

#### M.1.3 Role-Based Workflow Actions

```typescript
interface WorkflowRolePermissions {
  // Admin
  admin: {
    can_create_profile: true,
    can_edit_all_stages: true,
    can_verify_credentials: true,
    can_assign_departments: true,
    can_assign_locations: true,
    can_configure_fees: true,
    can_allocate_resources: true,
    can_perform_compliance: true,
    can_give_final_approval: true,
    can_activate: true,
    can_view_all_doctors: true
  },

  // Department Head
  department_head: {
    can_create_profile: true,
    can_edit_own_department: true,
    can_verify_credentials: false,
    can_assign_departments: true, // Only to own department
    can_assign_locations: false,
    can_configure_fees: false,
    can_allocate_resources: true, // Department resources
    can_perform_compliance: false,
    can_give_final_approval: true, // For own department
    can_activate: false,
    can_view_department_doctors: true
  },

  // Doctor (Self)
  doctor: {
    can_create_profile: false,
    can_edit_own_profile: true, // Limited fields
    can_verify_credentials: false,
    can_assign_departments: false,
    can_assign_locations: false,
    can_configure_fees: false, // Cannot set own fees
    can_allocate_resources: false,
    can_perform_compliance: false,
    can_give_final_approval: false,
    can_activate: false,
    can_setup_availability: true, // Can set own availability
    can_view_own_profile: true
  }
}
```

#### M.1.4 Activation Preconditions

```typescript
function canActivateDoctor(doctor: DoctorProfile, onboarding: DoctorOnboardingState): ActivationCheck {
  const blockers: string[] = []

  // 1. Profile Complete
  if (!doctor.full_name || !doctor.primary_specialty || !doctor.registration_number) {
    blockers.push("Profile incomplete: Missing required fields")
  }

  // 2. Credentials Verified
  const licenseVerification = onboarding.verification_checks.find(v => v.check_type === "license_verification")
  if (!licenseVerification || licenseVerification.status !== "verified") {
    blockers.push("License verification not completed")
  }

  const qualificationVerification = onboarding.verification_checks.find(v => v.check_type === "qualification_verification")
  if (!qualificationVerification || qualificationVerification.status !== "verified") {
    blockers.push("Qualification verification not completed")
  }

  // 3. Fees Configured
  if (!doctor.consultation_fee || doctor.consultation_fee <= 0) {
    blockers.push("Consultation fees not configured")
  }

  // 4. Location Assigned
  if (!doctor.primary_location_id) {
    blockers.push("Primary location not assigned")
  }

  // 5. Availability Set
  const schedule = getDoctorSchedule(doctor.id)
  if (!schedule || schedule.recurring_schedule.length === 0) {
    blockers.push("Weekly availability schedule not configured")
  }

  // 6. Department Assigned (for hospitals)
  if (isHospitalMode() && !doctor.department_id) {
    blockers.push("Department not assigned")
  }

  // 7. Compliance Checks
  const insuranceVerification = onboarding.verification_checks.find(v => v.check_type === "insurance_verification")
  if (requiresInsurance() && (!insuranceVerification || insuranceVerification.status !== "verified")) {
    blockers.push("Professional liability insurance not verified")
  }

  // 8. Final Approval
  const finalApproval = onboarding.approval_chain.find(a => a.stage === "final_approval")
  if (!finalApproval || finalApproval.status !== "approved") {
    blockers.push("Final approval pending")
  }

  return {
    can_activate: blockers.length === 0,
    can_accept_appointments: blockers.length === 0,
    public_profile_visible: blockers.length === 0,
    blockers,
    required_actions: generateRequiredActions(blockers)
  }
}

// What blocks public scheduling
function isPubliclyBookable(doctor: DoctorProfile, onboarding: DoctorOnboardingState): BookabilityCheck {
  const activationCheck = canActivateDoctor(doctor, onboarding)

  if (!activationCheck.can_activate) {
    return {
      is_bookable: false,
      reason: "Doctor not fully activated",
      blockers: activationCheck.blockers
    }
  }

  // Additional runtime checks
  if (doctor.status !== "active") {
    return {
      is_bookable: false,
      reason: "Doctor status is not active",
      blockers: [`Current status: ${doctor.status}`]
    }
  }

  // Check for active availability
  const hasAvailableSlots = checkHasAvailableSlots(doctor.id, /* next 7 days */ 7)
  if (!hasAvailableSlots) {
    return {
      is_bookable: false,
      reason: "No available slots in the next 7 days",
      blockers: ["No availability configured or all slots booked"]
    }
  }

  return {
    is_bookable: true,
    reason: "Doctor is publicly bookable",
    blockers: []
  }
}
```

---

### M.2 Doctor Availability Ownership Model

#### M.2.1 Availability Ownership Matrix

```typescript
interface AvailabilityOwnership {
  // Who can modify what
  base_schedule: {
    can_create: ["admin", "department_head", "doctor"],
    can_modify: ["admin", "department_head", "doctor"],
    can_delete: ["admin"],
    default_owner: "doctor",
    requires_approval: false
  },

  schedule_overrides: {
    can_create: ["admin", "department_head", "doctor"],
    can_modify: ["admin", "department_head", "doctor"],
    can_delete: ["admin", "department_head", "doctor"],
    default_owner: "doctor",
    requires_approval: false,

    // Special rules
    emergency_override: {
      can_create: ["admin", "department_head", "doctor"],
      bypass_approval: true
    }
  },

  schedule_exceptions: {
    // Leave
    leave: {
      can_create: ["doctor"],
      can_modify: ["doctor"], // Before approval
      can_delete: ["admin", "department_head"],
      default_owner: "doctor",
      requires_approval: true,
      approval_roles: ["department_head", "admin"],

      approval_rules: {
        casual_leave: {
          max_days_without_approval: 3,
          advance_notice_days: 7
        },
        vacation: {
          max_days_without_approval: 0,
          advance_notice_days: 30
        },
        sick_leave: {
          max_days_without_approval: 2,
          advance_notice_days: 0, // Emergency
          requires_medical_certificate_after_days: 3
        }
      }
    },

    // Holiday Blocks
    holiday: {
      can_create: ["admin"],
      can_modify: ["admin"],
      can_delete: ["admin"],
      default_owner: "admin",
      requires_approval: false,
      applies_to: "all_doctors" // Hospital-wide
    },

    // Emergency Unavailability
    emergency: {
      can_create: ["admin", "department_head", "doctor"],
      can_modify: ["admin", "department_head"],
      can_delete: ["admin", "department_head"],
      default_owner: "requester",
      requires_approval: false, // Immediate
      requires_post_justification: true,

      triggers: [
        "notify_admin",
        "notify_department_head",
        "reschedule_affected_appointments",
        "create_incident_report"
      ]
    }
  },

  forced_blocks: {
    // System-forced or admin-forced blocks
    can_create: ["admin"],
    can_modify: ["admin"],
    can_delete: ["admin"],
    default_owner: "admin",
    requires_approval: false,
    cannot_be_overridden: true,

    use_cases: [
      "Doctor suspension",
      "Facility closure",
      "Equipment maintenance",
      "System maintenance",
      "Regulatory compliance"
    ]
  }
}
```

#### M.2.2 Leave Approval Workflow

```typescript
interface LeaveRequest {
  id: UUID
  doctor_id: UUID
  leave_type: "casual" | "vacation" | "sick" | "conference" | "training" | "personal"

  // Dates
  start_date: Date
  end_date: Date
  total_days: number
  is_half_day: boolean
  half_day_period?: "morning" | "afternoon"

  // Request Details
  reason: string
  notes?: string
  supporting_documents?: string[] // URLs

  // Status
  status: "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "cancelled"

  // Approval Flow
  submitted_at?: timestamp
  submitted_by: UUID
  approver_role: "department_head" | "admin"
  reviewed_by?: UUID
  reviewed_at?: timestamp
  approval_notes?: string
  rejection_reason?: string

  // Impact Assessment
  affected_appointments_count: number
  affected_appointments: UUID[]
  requires_coverage: boolean
  coverage_doctor_id?: UUID

  // Auto-checks
  conflicts_with_existing_leave: boolean
  exceeds_leave_balance: boolean
  violates_advance_notice: boolean

  // Metadata
  created_at: timestamp
  updated_at: timestamp
}

// Leave Approval State Machine
const leaveApprovalFlow = {
  draft: {
    actions: ["submit", "delete"],
    next_states: ["submitted", "deleted"]
  },

  submitted: {
    actions: ["approve", "reject", "request_modification", "cancel"],
    next_states: ["pending_approval", "approved", "rejected", "draft", "cancelled"],

    auto_checks: [
      "check_leave_balance",
      "check_advance_notice",
      "check_conflicts",
      "assess_impact_on_appointments"
    ]
  },

  pending_approval: {
    actions: ["approve", "reject"],
    next_states: ["approved", "rejected"],

    approval_logic: async (request: LeaveRequest) => {
      // Check if requires special approval
      if (request.total_days > 7) {
        return { requires: "admin", reason: "Leave exceeds 7 days" }
      }

      if (request.affected_appointments_count > 10) {
        return { requires: "admin", reason: "High impact on appointments" }
      }

      // Check if department head can approve
      const deptHead = getDepartmentHead(request.doctor_id)
      if (deptHead) {
        return { requires: "department_head", approver_id: deptHead.id }
      }

      return { requires: "admin" }
    }
  },

  approved: {
    actions: ["cancel"],
    next_states: ["cancelled"],

    on_enter: async (request: LeaveRequest) => {
      // Create schedule exception
      await createScheduleException({
        doctor_id: request.doctor_id,
        exception_type: request.leave_type,
        start_date: request.start_date,
        end_date: request.end_date,
        is_approved: true,
        approved_by: request.reviewed_by,
        reason: request.reason,
        affects_scheduled_appointments: true
      })

      // Handle affected appointments
      if (request.affected_appointments_count > 0) {
        await triggerAppointmentReschedulingWorkflow(request.affected_appointments)
      }

      // Notify doctor
      await notifyDoctor(request.doctor_id, "leave_approved", request)

      // Update leave balance
      await deductLeaveBalance(request.doctor_id, request.leave_type, request.total_days)
    }
  },

  rejected: {
    actions: ["resubmit"],
    next_states: ["submitted"],

    on_enter: async (request: LeaveRequest) => {
      await notifyDoctor(request.doctor_id, "leave_rejected", {
        ...request,
        rejection_reason: request.rejection_reason
      })
    }
  }
}
```

---

### M.3 Scheduling Source Priority Model

#### M.3.1 Priority Hierarchy

```typescript
enum SchedulingSourcePriority {
  FORCED_BLOCK = 1,        // Highest priority
  EMERGENCY_EXCEPTION = 2,
  APPROVED_LEAVE = 3,
  HOLIDAY = 4,
  SCHEDULE_OVERRIDE = 5,
  BASE_SCHEDULE = 6        // Lowest priority
}

interface SchedulingSource {
  source_type: "base" | "override" | "exception" | "forced_block"
  priority: SchedulingSourcePriority
  effective_date: Date
  created_by: UUID
  can_override: boolean
  override_requires_permission: UserRole[]
}
```

#### M.3.2 Conflict Resolution Rules

```typescript
function resolveSchedulingConflict(
  date: Date,
  doctor_id: UUID
): ResolvedSchedule {

  // 1. Get all scheduling sources for the date
  const baseSchedule = getBaseSchedule(doctor_id, date.getDay())
  const overrides = getScheduleOverrides(doctor_id, date)
  const exceptions = getScheduleExceptions(doctor_id, date)
  const forcedBlocks = getForcedBlocks(doctor_id, date)

  // 2. Apply priority resolution
  const sources: SchedulingSource[] = [
    ...forcedBlocks.map(fb => ({ ...fb, source_type: "forced_block", priority: SchedulingSourcePriority.FORCED_BLOCK })),
    ...exceptions.filter(e => e.exception_type === "emergency").map(e => ({ ...e, source_type: "exception", priority: SchedulingSourcePriority.EMERGENCY_EXCEPTION })),
    ...exceptions.filter(e => e.is_approved).map(e => ({ ...e, source_type: "exception", priority: SchedulingSourcePriority.APPROVED_LEAVE })),
    ...exceptions.filter(e => e.exception_type === "holiday").map(e => ({ ...e, source_type: "exception", priority: SchedulingSourcePriority.HOLIDAY })),
    ...overrides.map(o => ({ ...o, source_type: "override", priority: SchedulingSourcePriority.SCHEDULE_OVERRIDE })),
    { ...baseSchedule, source_type: "base", priority: SchedulingSourcePriority.BASE_SCHEDULE }
  ]

  // 3. Sort by priority
  sources.sort((a, b) => a.priority - b.priority)

  // 4. Apply conflict resolution
  let effectiveSchedule: TimeBlock[] = []
  let availabilityBlocked = false
  let blockReason: string | null = null

  for (const source of sources) {
    // Forced blocks override everything
    if (source.source_type === "forced_block") {
      availabilityBlocked = true
      blockReason = source.reason
      effectiveSchedule = []
      break
    }

    // Emergency exceptions override all except forced blocks
    if (source.source_type === "exception" && source.exception_type === "emergency") {
      availabilityBlocked = true
      blockReason = source.reason
      effectiveSchedule = []
      break
    }

    // Approved leave blocks availability
    if (source.source_type === "exception" && source.is_approved) {
      availabilityBlocked = true
      blockReason = `${source.exception_type}: ${source.reason}`
      effectiveSchedule = []
      break
    }

    // Holidays block availability (unless override exists)
    if (source.source_type === "exception" && source.exception_type === "holiday") {
      // Check if there's an override that explicitly adds availability on holiday
      const holidayOverride = overrides.find(o => o.type === "additional_availability")
      if (!holidayOverride) {
        availabilityBlocked = true
        blockReason = "Holiday"
        effectiveSchedule = []
        break
      }
    }

    // Schedule overrides replace base schedule
    if (source.source_type === "override") {
      effectiveSchedule = source.time_blocks
      break
    }

    // Base schedule (default)
    if (source.source_type === "base") {
      effectiveSchedule = source.time_blocks || []
    }
  }

  return {
    date,
    doctor_id,
    availability_blocked: availabilityBlocked,
    block_reason: blockReason,
    effective_schedule: effectiveSchedule,
    applied_sources: sources.map(s => ({
      type: s.source_type,
      priority: s.priority,
      applied: s === sources[0]
    })),
    conflicts_detected: sources.length > 2, // More than base + one override
    resolution_method: "priority_based"
  }
}
```

#### M.3.3 Override Permission Matrix

```typescript
interface OverridePermissions {
  // Who can override what
  override_rules: {
    // Override base schedule with specific date schedule
    base_to_override: {
      allowed_roles: ["admin", "department_head", "doctor"],
      requires_approval: false,
      advance_notice_days: 0
    },

    // Override approved leave (emergency only)
    override_approved_leave: {
      allowed_roles: ["admin"],
      requires_approval: true,
      approval_roles: ["ceo", "medical_director"],
      requires_justification: true,
      use_cases: ["critical_emergency", "no_coverage_available"]
    },

    // Override holiday (add availability on holiday)
    override_holiday: {
      allowed_roles: ["admin", "doctor"],
      requires_approval: true,
      approval_roles: ["department_head", "admin"],
      compensation_required: true // Additional pay
    },

    // Remove forced block
    remove_forced_block: {
      allowed_roles: ["admin"],
      requires_approval: true,
      approval_roles: ["admin", "compliance_officer"],
      requires_justification: true
    }
  }
}
```

---

### M.4 Extended Calendar Model

#### M.4.1 Tentative Holds vs Confirmed Appointments

```typescript
interface AppointmentSlotState {
  slot_id: UUID
  slot_datetime: timestamp
  doctor_id: UUID

  // Slot Status
  status: SlotStatus

  // Holds
  holds: TentativeHold[]
  total_holds: number

  // Bookings
  confirmed_bookings: UUID[] // appointment_ids
  total_confirmed: number

  // Capacity
  base_capacity: number
  available_capacity: number
  overbooked: boolean

  // State
  last_updated: timestamp
  version: number // For optimistic locking
}

type SlotStatus =
  | "available"
  | "held" // One or more tentative holds
  | "partially_booked" // Some capacity available
  | "fully_booked"
  | "overbooked"
  | "blocked"

interface TentativeHold {
  hold_id: UUID
  slot_id: UUID

  // Hold Details
  held_for_patient_id?: UUID
  held_for_session_id: string // Browser session or booking flow ID
  hold_type: "booking_in_progress" | "payment_pending" | "admin_reserved"

  // Timing
  held_at: timestamp
  expires_at: timestamp
  auto_release_seconds: number // 300 = 5 minutes

  // Status
  status: "active" | "expired" | "confirmed" | "cancelled"

  // Conversion
  converted_to_appointment_id?: UUID
  confirmed_at?: timestamp

  // Metadata
  created_by?: UUID
  booking_source: "web" | "mobile" | "admin" | "receptionist"
  ip_address?: string
}

// Tentative hold configuration
const HOLD_CONFIG = {
  patient_booking: {
    auto_release_seconds: 600, // 10 minutes
    allow_multiple_holds_per_patient: false,
    max_holds_per_session: 1
  },

  admin_booking: {
    auto_release_seconds: 1800, // 30 minutes
    allow_multiple_holds: true,
    max_holds_per_admin: 5
  },

  payment_pending: {
    auto_release_seconds: 900, // 15 minutes
    send_reminder_at_seconds: 600, // Reminder at 10 min
    allow_extension: true,
    max_extensions: 1
  }
}
```

#### M.4.2 Auto-Release Logic

```typescript
// Auto-release expired holds
async function processExpiredHolds(): Promise<void> {
  const now = new Date()

  // Find all expired holds
  const expiredHolds = await db.query(`
    SELECT * FROM tentative_holds
    WHERE status = 'active'
    AND expires_at <= $1
  `, [now])

  for (const hold of expiredHolds) {
    await releaseHold(hold.hold_id, "auto_expired")
  }
}

async function releaseHold(
  hold_id: UUID,
  reason: "auto_expired" | "manual_cancel" | "confirmed" | "payment_failed"
): Promise<void> {

  const hold = await getTentativeHold(hold_id)

  // Update hold status
  await db.query(`
    UPDATE tentative_holds
    SET status = 'expired',
        released_at = NOW(),
        release_reason = $2
    WHERE hold_id = $1
  `, [hold_id, reason])

  // Update slot availability
  await recalculateSlotAvailability(hold.slot_id)

  // Emit real-time event
  await emitSlotAvailabilityChange(hold.slot_id, "hold_released")

  // Notify waitlist if any
  if (reason === "auto_expired" || reason === "manual_cancel") {
    await notifyWaitlist(hold.slot_id)
  }

  // Log
  await createAuditLog({
    event_type: "hold_released",
    entity_type: "tentative_hold",
    entity_id: hold_id,
    reason,
    metadata: { slot_id: hold.slot_id }
  })
}

// No-show republishing
async function handleNoShow(appointment: Appointment): Promise<void> {
  // Mark appointment as no-show
  await updateAppointmentStatus(appointment.id, "no_show")

  // Release the slot
  await releaseSlot(appointment.slot_id, appointment.id)

  // Make slot available again
  await republishSlot(appointment.slot_id, {
    reason: "no_show",
    previous_appointment_id: appointment.id,
    republished_at: new Date()
  })

  // Notify waitlist with priority
  await notifyWaitlistPriority(appointment.slot_id, "no_show_replacement")

  // Update doctor's no-show stats
  await updateDoctorStats(appointment.doctor_id, { no_shows: +1 })

  // Update patient's no-show record
  await updatePatientReliability(appointment.patient_id, { no_shows: +1 })

  // Apply no-show penalty if configured
  if (hasNoShowPenalty(appointment)) {
    await applyNoShowPenalty(appointment)
  }
}
```

#### M.4.3 Real-Time Updates

```typescript
// WebSocket event types
interface SlotAvailabilityEvent {
  event_type: "slot_available" | "slot_held" | "slot_booked" | "slot_blocked" | "slot_released"
  slot_id: UUID
  doctor_id: UUID
  slot_datetime: timestamp

  // Availability
  available_capacity: number
  total_capacity: number

  // Timestamp
  occurred_at: timestamp

  // Metadata
  reason?: string
  triggered_by?: UUID
}

// Emit to subscribed clients
function emitSlotAvailabilityChange(
  slot_id: UUID,
  event_type: string
): void {
  const slot = getSlot(slot_id)

  const event: SlotAvailabilityEvent = {
    event_type,
    slot_id,
    doctor_id: slot.doctor_id,
    slot_datetime: slot.slot_datetime,
    available_capacity: slot.available_capacity,
    total_capacity: slot.base_capacity,
    occurred_at: new Date()
  }

  // Emit to all subscribers
  websocketServer.emit(`slot:${slot_id}`, event)
  websocketServer.emit(`doctor:${slot.doctor_id}:slots`, event)
  websocketServer.emit(`calendar:updates`, event)
}

// Client subscription example
interface CalendarSubscription {
  subscription_id: UUID
  user_id: UUID
  subscription_type: "doctor_calendar" | "specific_slots" | "location_calendar"

  filters: {
    doctor_ids?: UUID[]
    location_ids?: UUID[]
    slot_ids?: UUID[]
    date_range?: { start: Date, end: Date }
  }

  // Delivery
  delivery_method: "websocket" | "webhook" | "polling"
  webhook_url?: string

  // Status
  active: boolean
  created_at: timestamp
  expires_at?: timestamp
}
```

---

### M.5 Resource Allocation Extensions

#### M.5.1 Auto Room Assignment Policies

```typescript
interface RoomAssignmentPolicy {
  policy_id: UUID
  hospital_id: UUID
  policy_name: string

  // Scope
  applies_to: "all" | "department" | "visit_type" | "doctor"
  entity_ids?: UUID[]

  // Assignment Strategy
  strategy: "doctor_default" | "room_rotation" | "visit_type_based" | "manual_only"

  // Rules
  assignment_rules: RoomAssignmentRule[]

  // Fallback
  fallback_strategy: "any_available" | "prompt_user" | "queue_without_room"

  // Status
  is_active: boolean
  priority: number
}

interface RoomAssignmentRule {
  rule_id: UUID
  priority: number

  // Conditions
  conditions: {
    visit_types?: VisitType[]
    consultation_modes?: ("in_person" | "tele")[]
    doctor_ids?: UUID[]
    department_ids?: UUID[]
    time_of_day?: { start: string, end: string }
    days_of_week?: number[]
  }

  // Assignment Logic
  room_selection: {
    preferred_rooms: UUID[]
    exclude_rooms: UUID[]
    room_features_required?: string[] // ["ultrasound", "ecg", "procedure_table"]
    prefer_nearest_to_doctor: boolean
    prefer_ground_floor: boolean // Accessibility
  }

  // Validation
  validate_equipment_availability: boolean
  validate_room_capacity: boolean

  // Action
  auto_assign: boolean
  prompt_if_unavailable: boolean
}

// Auto-assignment logic
async function autoAssignRoom(
  appointment: Appointment
): Promise<RoomAssignment> {

  // 1. Get applicable policies
  const policies = await getRoomAssignmentPolicies({
    hospital_id: appointment.hospital_id,
    doctor_id: appointment.doctor_id,
    visit_type: appointment.visit_type,
    location_id: appointment.location_id
  })

  // 2. Sort by priority
  policies.sort((a, b) => b.priority - a.priority)

  // 3. Try each policy
  for (const policy of policies) {
    for (const rule of policy.assignment_rules.sort((a, b) => b.priority - a.priority)) {

      // Check if rule applies
      if (!ruleApplies(rule, appointment)) continue

      // Try to assign from preferred rooms
      for (const room_id of rule.room_selection.preferred_rooms) {
        const available = await isRoomAvailable(
          room_id,
          appointment.scheduled_at,
          appointment.duration_minutes
        )

        if (available) {
          // Validate equipment if required
          if (rule.validate_equipment_availability) {
            const equipmentAvailable = await validateRoomEquipment(
              room_id,
              appointment.equipment_needed
            )
            if (!equipmentAvailable) continue
          }

          // Assign room
          return await assignRoomToAppointment(appointment.id, room_id, {
            assigned_by: "auto_policy",
            policy_id: policy.policy_id,
            rule_id: rule.rule_id
          })
        }
      }
    }
  }

  // 4. Fallback strategy
  return await applyFallbackStrategy(appointment, policies[0]?.fallback_strategy || "prompt_user")
}
```

#### M.5.2 Manual Override Flows

```typescript
interface ManualRoomOverride {
  override_id: UUID
  appointment_id: UUID

  // Original Assignment
  original_room_id?: UUID
  original_assignment_method: "auto" | "manual" | "default"

  // New Assignment
  new_room_id: UUID
  override_reason: string

  // Permissions
  overridden_by: UUID
  overridden_at: timestamp
  requires_approval: boolean
  approved_by?: UUID

  // Conflicts
  conflicts_detected: RoomConflict[]
  conflict_resolution: "force" | "reschedule_conflicting" | "cancelled"

  // Notification
  notify_affected_parties: boolean
  notifications_sent: UUID[]
}

// Manual override workflow
async function manuallyOverrideRoom(
  appointment_id: UUID,
  new_room_id: UUID,
  reason: string,
  user_id: UUID
): Promise<ManualRoomOverride> {

  const appointment = await getAppointment(appointment_id)

  // 1. Check permissions
  if (!canOverrideRoom(user_id, appointment)) {
    throw new Error("Insufficient permissions to override room assignment")
  }

  // 2. Check for conflicts
  const conflicts = await checkRoomConflicts(
    new_room_id,
    appointment.scheduled_at,
    appointment.duration_minutes
  )

  // 3. If conflicts exist, require resolution
  if (conflicts.length > 0) {
    return await initiateConflictResolution({
      appointment_id,
      new_room_id,
      conflicts,
      requested_by: user_id,
      reason
    })
  }

  // 4. Perform override
  const override = await createRoomOverride({
    appointment_id,
    original_room_id: appointment.room_id,
    new_room_id,
    override_reason: reason,
    overridden_by: user_id,
    overridden_at: new Date()
  })

  // 5. Update appointment
  await updateAppointment(appointment_id, {
    room_id: new_room_id,
    room_assignment_method: "manual_override"
  })

  // 6. Notify affected parties
  await notifyRoomChange(appointment, new_room_id, reason)

  return override
}
```

#### M.5.3 Equipment Resolution Suggestions

```typescript
interface EquipmentResolution {
  // When equipment is unavailable, suggest alternatives
  resolution_type: "alternative_equipment" | "different_time" | "different_room" | "external_referral"

  suggestions: EquipmentSuggestion[]

  auto_resolve: boolean
  requires_approval: boolean
}

interface EquipmentSuggestion {
  suggestion_type: "alternative_equipment" | "alternative_time" | "alternative_location"

  // Alternative Equipment
  alternative_equipment_id?: UUID
  equipment_name: string
  equipment_location: string
  comparable: boolean // Is it comparable to requested?
  quality_difference?: "better" | "same" | "lower"

  // Alternative Time
  alternative_time_slots?: timestamp[]

  // Alternative Location
  alternative_location_id?: UUID
  travel_distance_km?: number

  // Feasibility
  feasibility_score: number // 0-100
  cost_impact: number
  delay_impact_minutes: number

  // Recommendation
  recommended: boolean
  recommendation_reason: string
}

async function resolveEquipmentUnavailability(
  appointment: Appointment,
  unavailable_equipment: string[]
): Promise<EquipmentResolution> {

  const suggestions: EquipmentSuggestion[] = []

  // 1. Find alternative equipment at same location
  for (const equipment_type of unavailable_equipment) {
    const alternatives = await findAlternativeEquipment(
      equipment_type,
      appointment.location_id,
      {
        exclude_unavailable: true,
        prefer_same_quality: true
      }
    )

    for (const alt of alternatives) {
      suggestions.push({
        suggestion_type: "alternative_equipment",
        alternative_equipment_id: alt.id,
        equipment_name: alt.equipment_name,
        equipment_location: alt.current_location,
        comparable: alt.specifications.quality >= getEquipmentQuality(equipment_type),
        quality_difference: compareQuality(alt, equipment_type),
        feasibility_score: 90,
        cost_impact: 0,
        delay_impact_minutes: 0,
        recommended: true,
        recommendation_reason: "Comparable equipment available at same location"
      })
    }
  }

  // 2. Find alternative time slots when equipment is available
  const availabilitySlots = await findEquipmentAvailability(
    unavailable_equipment[0],
    appointment.location_id,
    {
      date_from: appointment.scheduled_at,
      date_to: addDays(appointment.scheduled_at, 7),
      doctor_id: appointment.doctor_id
    }
  )

  if (availabilitySlots.length > 0) {
    suggestions.push({
      suggestion_type: "alternative_time",
      equipment_name: unavailable_equipment[0],
      equipment_location: appointment.location_id,
      alternative_time_slots: availabilitySlots.map(s => s.slot_datetime),
      comparable: true,
      quality_difference: "same",
      feasibility_score: 70,
      cost_impact: 0,
      delay_impact_minutes: calculateDelay(appointment.scheduled_at, availabilitySlots[0].slot_datetime),
      recommended: availabilitySlots[0].slot_datetime < addDays(appointment.scheduled_at, 2),
      recommendation_reason: "Equipment available within 48 hours"
    })
  }

  // 3. Find alternative locations with equipment
  const otherLocations = await findEquipmentAtOtherLocations(
    unavailable_equipment[0],
    appointment.hospital_id,
    {
      exclude_location: appointment.location_id,
      date: appointment.scheduled_at
    }
  )

  for (const loc of otherLocations) {
    const distance = calculateDistance(appointment.location_id, loc.location_id)

    suggestions.push({
      suggestion_type: "alternative_location",
      equipment_name: unavailable_equipment[0],
      equipment_location: loc.location_name,
      alternative_location_id: loc.location_id,
      travel_distance_km: distance,
      comparable: true,
      quality_difference: "same",
      feasibility_score: 50 - (distance * 2), // Decrease score with distance
      cost_impact: 0,
      delay_impact_minutes: distance * 3, // Rough estimate: 3 min per km
      recommended: distance < 10,
      recommendation_reason: distance < 5
        ? "Equipment available at nearby location"
        : "Equipment available but requires travel"
    })
  }

  // 4. Sort by feasibility score
  suggestions.sort((a, b) => b.feasibility_score - a.feasibility_score)

  return {
    resolution_type: suggestions[0]?.suggestion_type || "external_referral",
    suggestions,
    auto_resolve: suggestions[0]?.feasibility_score > 80,
    requires_approval: suggestions[0]?.suggestion_type === "alternative_location"
  }
}
```

#### M.5.4 Cross-Location Fallback

```typescript
interface CrossLocationFallback {
  fallback_id: UUID
  original_appointment: Appointment

  // Reason for fallback
  fallback_reason: "equipment_unavailable" | "doctor_unavailable" | "location_closed" | "emergency_capacity"

  // Alternative Location
  fallback_location_id: UUID
  fallback_doctor_id?: UUID // Different doctor at fallback location
  fallback_slot_datetime?: timestamp

  // Patient Consent
  patient_notified: boolean
  patient_consent: "pending" | "approved" | "declined"
  patient_consent_at?: timestamp

  // Logistics
  transportation_arranged: boolean
  ambulance_required: boolean
  travel_distance_km: number
  estimated_travel_time_minutes: number

  // Status
  status: "proposed" | "accepted" | "declined" | "in_transit" | "completed"

  // Audit
  proposed_by: UUID
  proposed_at: timestamp
  approved_by?: UUID
}

async function proposeLocationFallback(
  appointment: Appointment,
  reason: string
): Promise<CrossLocationFallback> {

  // 1. Find alternative locations
  const alternativeLocations = await findAlternativeLocations({
    hospital_id: appointment.hospital_id,
    exclude_location: appointment.location_id,
    specialty_required: appointment.doctor.primary_specialty,
    date: appointment.scheduled_at,
    within_radius_km: 50
  })

  if (alternativeLocations.length === 0) {
    throw new Error("No alternative locations available")
  }

  // 2. Score locations by suitability
  const scored = alternativeLocations.map(loc => ({
    ...loc,
    score: calculateLocationScore(loc, appointment)
  })).sort((a, b) => b.score - a.score)

  const bestLocation = scored[0]

  // 3. Find available slot at alternative location
  const availableSlot = await findAvailableSlot({
    location_id: bestLocation.id,
    specialty: appointment.doctor.primary_specialty,
    date_from: appointment.scheduled_at,
    date_to: addHours(appointment.scheduled_at, 4), // Within 4 hours
    visit_type: appointment.visit_type
  })

  // 4. Create fallback proposal
  const fallback = await createLocationFallback({
    original_appointment: appointment,
    fallback_reason: reason,
    fallback_location_id: bestLocation.id,
    fallback_doctor_id: availableSlot?.doctor_id,
    fallback_slot_datetime: availableSlot?.slot_datetime,
    travel_distance_km: bestLocation.distance_km,
    estimated_travel_time_minutes: bestLocation.distance_km * 2,
    proposed_by: getCurrentUser().id,
    status: "proposed"
  })

  // 5. Notify patient for consent
  await requestPatientConsent(fallback)

  return fallback
}
```

---

### M.6 Patient-Side Booking UX

#### M.6.1 Self-Booking Workflow State Machine

```typescript
interface PatientBookingSession {
  session_id: UUID
  patient_id?: UUID // null if guest

  // Session State
  current_step: BookingStep
  completed_steps: BookingStep[]

  // Booking Data
  booking_data: {
    // Step 1: Search criteria
    search_mode?: "doctor_first" | "symptom_first" | "slot_first"
    selected_doctor_id?: UUID
    selected_specialty?: string
    selected_symptoms?: string[]
    selected_date?: Date
    selected_time_preference?: "morning" | "afternoon" | "evening"

    // Step 2: Slot selection
    selected_slot_id?: UUID
    selected_slot_datetime?: timestamp
    consultation_mode?: "in_person" | "tele"

    // Step 3: Visit details
    visit_type?: VisitType
    reason_for_visit?: string
    chief_complaint?: string
    is_follow_up?: boolean
    previous_visit_id?: UUID

    // Step 4: Patient details (if guest)
    patient_details?: {
      full_name: string
      phone: string
      email?: string
      age: number
      gender: string
    }

    // Step 5: Payment
    payment_required?: boolean
    consultation_fee?: number
    payment_method?: "online" | "at_clinic"
    payment_status?: "pending" | "completed" | "failed"
    payment_transaction_id?: UUID

    // Tentative hold
    tentative_hold_id?: UUID
  }

  // Session Management
  started_at: timestamp
  last_activity_at: timestamp
  expires_at: timestamp
  completed: boolean
  abandoned: boolean

  // Device/Context
  device_type: "desktop" | "mobile" | "tablet"
  browser: string
  ip_address: string
  referral_source?: string
}

type BookingStep =
  | "search"
  | "doctor_selection"
  | "slot_selection"
  | "visit_details"
  | "patient_details"
  | "payment"
  | "confirmation"

const BOOKING_FLOW: Record<BookingStep, StepConfig> = {
  search: {
    step: "search",
    required: true,
    can_skip: false,
    next_step: "doctor_selection",
    validation: (session) => {
      return session.booking_data.search_mode !== undefined
    }
  },

  doctor_selection: {
    step: "doctor_selection",
    required: true,
    can_skip: false,
    next_step: "slot_selection",
    validation: (session) => {
      return session.booking_data.selected_doctor_id !== undefined
    }
  },

  slot_selection: {
    step: "slot_selection",
    required: true,
    can_skip: false,
    next_step: "visit_details",
    validation: async (session) => {
      // Create tentative hold when slot selected
      if (session.booking_data.selected_slot_id && !session.booking_data.tentative_hold_id) {
        const hold = await createTentativeHold({
          slot_id: session.booking_data.selected_slot_id,
          session_id: session.session_id,
          patient_id: session.patient_id,
          hold_type: "booking_in_progress",
          auto_release_seconds: 600 // 10 minutes
        })
        session.booking_data.tentative_hold_id = hold.hold_id
      }
      return true
    }
  },

  visit_details: {
    step: "visit_details",
    required: true,
    can_skip: false,
    next_step: "patient_details",
    validation: (session) => {
      return session.booking_data.visit_type !== undefined &&
             session.booking_data.reason_for_visit !== undefined
    }
  },

  patient_details: {
    step: "patient_details",
    required: (session) => !session.patient_id, // Required if guest
    can_skip: (session) => !!session.patient_id,
    next_step: "payment",
    validation: (session) => {
      if (session.patient_id) return true

      const details = session.booking_data.patient_details
      return details?.full_name && details?.phone && details?.age
    }
  },

  payment: {
    step: "payment",
    required: (session) => session.booking_data.payment_required,
    can_skip: (session) => !session.booking_data.payment_required,
    next_step: "confirmation",
    validation: async (session) => {
      if (!session.booking_data.payment_required) return true

      // Check payment status
      if (session.booking_data.payment_status === "completed") {
        return true
      }

      // Extend hold if payment in progress
      if (session.booking_data.tentative_hold_id) {
        await extendTentativeHold(session.booking_data.tentative_hold_id, 600)
      }

      return session.booking_data.payment_status === "completed"
    }
  },

  confirmation: {
    step: "confirmation",
    required: true,
    can_skip: false,
    next_step: null,
    validation: async (session) => {
      // Convert hold to confirmed appointment
      const appointment = await confirmAppointment(session)
      session.completed = true
      return true
    }
  }
}
```

#### M.6.2 Teleconsultation Setup

```typescript
interface TeleconsultationSetup {
  appointment_id: UUID
  patient_id: UUID
  doctor_id: UUID

  // Setup Status
  setup_status: "pending" | "in_progress" | "ready" | "failed"
  setup_checklist: TeleSetupCheck[]

  // Consent
  consent_obtained: boolean
  consent_id?: UUID
  consent_obtained_at?: timestamp

  // Platform
  platform: "zoom" | "google_meet" | "webrtc_native" | "whatsapp"
  meeting_url?: string
  meeting_id?: string
  meeting_password?: string

  // Device Check
  device_check_completed: boolean
  device_compatibility: {
    camera_available: boolean
    microphone_available: boolean
    browser_compatible: boolean
    bandwidth_adequate: boolean
  }

  // Instructions
  patient_instructions_sent: boolean
  doctor_instructions_sent: boolean

  // Backup Plan
  fallback_to_phone: boolean
  phone_number?: string

  // Status
  ready_at?: timestamp
  failed_reason?: string
}

interface TeleSetupCheck {
  check_type: "consent" | "device" | "connection" | "platform" | "instructions"
  status: "pending" | "passed" | "failed"
  details: string
  checked_at?: timestamp
}

// Teleconsultation flow
async function setupTeleconsultation(
  appointment: Appointment
): Promise<TeleconsultationSetup> {

  const setup: TeleconsultationSetup = {
    appointment_id: appointment.id,
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    setup_status: "in_progress",
    setup_checklist: []
  }

  // 1. Obtain consent
  const consentCheck = await checkTelehealthConsent(appointment.patient_id)
  if (!consentCheck.has_valid_consent) {
    // Request consent
    const consent = await requestTelehealthConsent({
      patient_id: appointment.patient_id,
      consultation_type: "video",
      appointment_id: appointment.id
    })

    setup.consent_obtained = false
    setup.setup_checklist.push({
      check_type: "consent",
      status: "pending",
      details: "Waiting for patient consent"
    })
  } else {
    setup.consent_obtained = true
    setup.consent_id = consentCheck.consent_id
    setup.setup_checklist.push({
      check_type: "consent",
      status: "passed",
      details: "Valid consent on file",
      checked_at: new Date()
    })
  }

  // 2. Select platform
  const platform = selectTelePlatform(appointment.doctor_id)
  setup.platform = platform

  // 3. Create meeting
  try {
    const meeting = await createVideoMeeting({
      platform,
      scheduled_at: appointment.scheduled_at,
      duration_minutes: appointment.duration_minutes,
      participants: [appointment.patient_id, appointment.doctor_id]
    })

    setup.meeting_url = meeting.meeting_url
    setup.meeting_id = meeting.meeting_id
    setup.meeting_password = meeting.password

    setup.setup_checklist.push({
      check_type: "platform",
      status: "passed",
      details: `Meeting created on ${platform}`,
      checked_at: new Date()
    })
  } catch (error) {
    setup.setup_status = "failed"
    setup.failed_reason = `Failed to create meeting: ${error.message}`
    setup.setup_checklist.push({
      check_type: "platform",
      status: "failed",
      details: error.message
    })
    return setup
  }

  // 4. Send instructions
  await sendTeleconsultationInstructions({
    appointment,
    meeting_url: setup.meeting_url,
    meeting_id: setup.meeting_id,
    platform: setup.platform
  })

  setup.patient_instructions_sent = true
  setup.doctor_instructions_sent = true
  setup.setup_checklist.push({
    check_type: "instructions",
    status: "passed",
    details: "Instructions sent to both parties",
    checked_at: new Date()
  })

  // 5. Device check (patient side - sent as link)
  await sendDeviceCheckLink(appointment.patient_id, setup.meeting_url)

  // 6. Mark as ready
  setup.setup_status = "ready"
  setup.ready_at = new Date()

  return setup
}
```

#### M.6.3 Rescheduling & Cancellation Rules

```typescript
interface ReschedulePolicy {
  policy_id: UUID
  hospital_id: UUID

  // Applicability
  applies_to: "all" | "visit_type" | "doctor"
  visit_types?: VisitType[]
  doctor_ids?: UUID[]

  // Reschedule Rules
  max_reschedules_allowed: number // Per appointment
  min_hours_before_appointment: number // 24, 48, etc.
  advance_booking_required_hours: number

  // Allowed Actions
  patient_can_reschedule: boolean
  patient_can_cancel: boolean
  receptionist_can_reschedule: boolean
  receptionist_can_cancel: boolean

  // Restrictions
  cannot_reschedule_if_checked_in: boolean
  cannot_reschedule_if_in_progress: boolean
  reschedule_to_same_doctor_only: boolean
  reschedule_within_days: number // Must reschedule within N days

  // Fees
  reschedule_fee: number
  cancel_fee: number
  waive_fee_if_hours_before: number // 48 hours = no fee

  // Refund Policy
  refund_policy: CancellationPolicy

  // Notifications
  notify_doctor: boolean
  notify_department: boolean
  requires_reason: boolean
}

interface RescheduleCancellationRules {
  // Can reschedule?
  can_reschedule: boolean
  reschedule_blocked_reason?: string

  // Can cancel?
  can_cancel: boolean
  cancel_blocked_reason?: string

  // Fees
  reschedule_fee_applicable: boolean
  reschedule_fee_amount: number
  cancellation_fee_applicable: boolean
  cancellation_fee_amount: number

  // Refund
  refund_eligible: boolean
  refund_amount: number
  refund_percentage: number

  // Limits
  reschedules_used: number
  reschedules_remaining: number

  // Time constraints
  hours_before_appointment: number
  within_allowed_window: boolean
  deadline: timestamp
}

async function canRescheduleOrCancel(
  appointment: Appointment,
  action: "reschedule" | "cancel",
  requested_by: "patient" | "receptionist" | "admin"
): Promise<RescheduleCancellationRules> {

  const policy = await getReschedulePolicy(appointment)
  const now = new Date()
  const hoursBeforeAppointment = (appointment.scheduled_at - now) / (1000 * 60 * 60)

  const rules: RescheduleCancellationRules = {
    can_reschedule: false,
    can_cancel: false,
    reschedule_fee_applicable: false,
    reschedule_fee_amount: 0,
    cancellation_fee_applicable: false,
    cancellation_fee_amount: 0,
    refund_eligible: false,
    refund_amount: 0,
    refund_percentage: 0,
    reschedules_used: appointment.reschedule_count || 0,
    reschedules_remaining: policy.max_reschedules_allowed - (appointment.reschedule_count || 0),
    hours_before_appointment: hoursBeforeAppointment,
    within_allowed_window: hoursBeforeAppointment >= policy.min_hours_before_appointment,
    deadline: new Date(appointment.scheduled_at.getTime() - (policy.min_hours_before_appointment * 60 * 60 * 1000))
  }

  // Check appointment status
  if (appointment.status === "checked_in" && policy.cannot_reschedule_if_checked_in) {
    rules.reschedule_blocked_reason = "Cannot reschedule after check-in"
    rules.cancel_blocked_reason = "Cannot cancel after check-in"
    return rules
  }

  if (appointment.status === "in_progress" && policy.cannot_reschedule_if_in_progress) {
    rules.reschedule_blocked_reason = "Cannot reschedule appointment in progress"
    rules.cancel_blocked_reason = "Cannot cancel appointment in progress"
    return rules
  }

  // Check time window
  if (hoursBeforeAppointment < policy.min_hours_before_appointment) {
    rules.reschedule_blocked_reason = `Must request ${action} at least ${policy.min_hours_before_appointment} hours before appointment`
    rules.cancel_blocked_reason = `Must cancel at least ${policy.min_hours_before_appointment} hours before appointment`
    return rules
  }

  // Check reschedule limit
  if (action === "reschedule") {
    if (rules.reschedules_remaining <= 0) {
      rules.reschedule_blocked_reason = `Maximum reschedules (${policy.max_reschedules_allowed}) reached`
      return rules
    }
  }

  // Check permissions
  if (requested_by === "patient") {
    if (action === "reschedule" && !policy.patient_can_reschedule) {
      rules.reschedule_blocked_reason = "Patients cannot reschedule. Please contact reception."
      return rules
    }
    if (action === "cancel" && !policy.patient_can_cancel) {
      rules.cancel_blocked_reason = "Patients cannot cancel. Please contact reception."
      return rules
    }
  }

  // Calculate fees
  if (action === "reschedule") {
    if (hoursBeforeAppointment < policy.waive_fee_if_hours_before) {
      rules.reschedule_fee_applicable = true
      rules.reschedule_fee_amount = policy.reschedule_fee
    }
    rules.can_reschedule = true
  }

  if (action === "cancel") {
    // Calculate refund
    const refundCalc = calculateCancellationRefund(
      appointment,
      policy.refund_policy,
      now
    )

    rules.can_cancel = true
    rules.refund_eligible = refundCalc.eligible
    rules.refund_amount = refundCalc.amount
    rules.refund_percentage = refundCalc.percentage

    if (hoursBeforeAppointment < policy.waive_fee_if_hours_before) {
      rules.cancellation_fee_applicable = true
      rules.cancellation_fee_amount = policy.cancel_fee
      rules.refund_amount = Math.max(0, rules.refund_amount - rules.cancellation_fee_amount)
    }
  }

  return rules
}

// Reschedule flow
async function rescheduleAppointment(
  appointment_id: UUID,
  new_slot_id: UUID,
  reason: string,
  requested_by: UUID
): Promise<RescheduleResult> {

  const appointment = await getAppointment(appointment_id)
  const newSlot = await getSlot(new_slot_id)

  // 1. Check if reschedule is allowed
  const rules = await canRescheduleOrCancel(appointment, "reschedule", "patient")
  if (!rules.can_reschedule) {
    throw new Error(rules.reschedule_blocked_reason)
  }

  // 2. Check if new slot is with same doctor (if required)
  const policy = await getReschedulePolicy(appointment)
  if (policy.reschedule_to_same_doctor_only && newSlot.doctor_id !== appointment.doctor_id) {
    throw new Error("Must reschedule with the same doctor")
  }

  // 3. Check if within allowed time window
  const daysDifference = Math.abs((newSlot.slot_datetime - appointment.scheduled_at) / (1000 * 60 * 60 * 24))
  if (daysDifference > policy.reschedule_within_days) {
    throw new Error(`Must reschedule within ${policy.reschedule_within_days} days of original appointment`)
  }

  // 4. Create tentative hold on new slot
  const hold = await createTentativeHold({
    slot_id: new_slot_id,
    patient_id: appointment.patient_id,
    hold_type: "booking_in_progress",
    auto_release_seconds: 600
  })

  // 5. Collect reschedule fee if applicable
  if (rules.reschedule_fee_applicable && rules.reschedule_fee_amount > 0) {
    const payment = await collectRescheduleFee({
      appointment_id,
      amount: rules.reschedule_fee_amount,
      patient_id: appointment.patient_id
    })

    if (payment.status !== "completed") {
      await releaseHold(hold.hold_id, "payment_failed")
      throw new Error("Reschedule fee payment failed")
    }
  }

  // 6. Cancel original appointment
  await updateAppointment(appointment_id, {
    status: "rescheduled",
    cancellation_reason: `Rescheduled to ${newSlot.slot_datetime}`,
    cancelled_at: new Date(),
    cancelled_by: requested_by
  })

  // 7. Release original slot
  await releaseSlot(appointment.slot_id, appointment_id)

  // 8. Create new appointment
  const newAppointment = await createAppointment({
    ...appointment,
    id: undefined, // New ID
    scheduled_at: newSlot.slot_datetime,
    slot_id: new_slot_id,
    reschedule_count: (appointment.reschedule_count || 0) + 1,
    rescheduled_from: appointment_id,
    status: "scheduled"
  })

  // 9. Confirm hold
  await confirmHold(hold.hold_id, newAppointment.id)

  // 10. Notify parties
  await notifyReschedule({
    old_appointment: appointment,
    new_appointment: newAppointment,
    reason,
    notify_doctor: policy.notify_doctor,
    notify_department: policy.notify_department
  })

  return {
    success: true,
    old_appointment_id: appointment_id,
    new_appointment_id: newAppointment.id,
    new_slot_datetime: newSlot.slot_datetime,
    fee_charged: rules.reschedule_fee_amount
  }
}
```

#### M.6.4 Payment & Pre-Payment Enforcement

```typescript
interface PaymentEnforcement {
  enforcement_type: "none" | "optional" | "required"

  // When to enforce
  enforce_at: "booking" | "check_in" | "post_consultation"

  // Payment modes
  allowed_payment_methods: PaymentMethod[]

  // Exceptions
  waive_for_corporate: boolean
  waive_for_insurance: boolean
  allow_credit_patients: string[] // patient_ids with credit facility

  // Grace period
  grace_period_hours?: number
  grace_period_applies_to: ("new_patients" | "follow_ups" | "emergencies")[]

  // Enforcement actions
  block_booking_if_unpaid: boolean
  block_check_in_if_unpaid: boolean
  send_payment_reminders: boolean
  reminder_intervals_hours: number[]
}

type PaymentMethod = "cash" | "card" | "upi" | "net_banking" | "wallet" | "insurance" | "corporate"

async function enforcePayment(
  appointment: Appointment,
  enforcement: PaymentEnforcement
): Promise<PaymentEnforcementResult> {

  const patient = await getPatient(appointment.patient_id)

  // 1. Check if payment required
  if (enforcement.enforcement_type === "none") {
    return { payment_required: false, can_proceed: true }
  }

  // 2. Check exceptions
  if (appointment.payment_method === "corporate" && enforcement.waive_for_corporate) {
    return { payment_required: false, can_proceed: true }
  }

  if (appointment.payment_method === "insurance" && enforcement.waive_for_insurance) {
    return { payment_required: false, can_proceed: true }
  }

  if (enforcement.allow_credit_patients.includes(patient.id)) {
    return { payment_required: false, can_proceed: true, reason: "Credit facility" }
  }

  // 3. Check grace period
  if (enforcement.grace_period_hours) {
    const hoursUntilAppointment = (appointment.scheduled_at - new Date()) / (1000 * 60 * 60)
    if (hoursUntilAppointment > enforcement.grace_period_hours) {
      const applyGrace = enforcement.grace_period_applies_to.some(type => {
        if (type === "new_patients") return !patient.has_previous_visits
        if (type === "follow_ups") return appointment.is_follow_up
        if (type === "emergencies") return appointment.visit_type === "emergency"
        return false
      })

      if (applyGrace) {
        return {
          payment_required: true,
          can_proceed: true,
          grace_period_active: true,
          payment_due_by: new Date(appointment.scheduled_at.getTime() - (enforcement.grace_period_hours * 60 * 60 * 1000))
        }
      }
    }
  }

  // 4. Check payment status
  if (appointment.payment_status === "paid") {
    return { payment_required: true, can_proceed: true, payment_status: "paid" }
  }

  // 5. Enforce payment based on stage
  const currentStage = getCurrentBookingStage(appointment)

  if (enforcement.enforce_at === "booking" && currentStage === "booking") {
    if (enforcement.block_booking_if_unpaid) {
      return {
        payment_required: true,
        can_proceed: false,
        blocking_reason: "Payment required before booking confirmation",
        amount_due: appointment.consultation_fee
      }
    }
  }

  if (enforcement.enforce_at === "check_in" && currentStage === "check_in") {
    if (enforcement.block_check_in_if_unpaid) {
      return {
        payment_required: true,
        can_proceed: false,
        blocking_reason: "Payment required before check-in",
        amount_due: appointment.consultation_fee
      }
    }
  }

  // 6. Optional payment - allow to proceed but send reminders
  if (enforcement.enforcement_type === "optional") {
    if (enforcement.send_payment_reminders) {
      await schedulePaymentReminders({
        appointment_id: appointment.id,
        patient_id: patient.id,
        amount_due: appointment.consultation_fee,
        intervals_hours: enforcement.reminder_intervals_hours
      })
    }

    return {
      payment_required: true,
      can_proceed: true,
      payment_status: "pending",
      reminders_scheduled: true
    }
  }

  return {
    payment_required: true,
    can_proceed: true,
    payment_status: "pending"
  }
}
```

---

### M.7 Bookability Preconditions

#### M.7.1 Bookability Checklist

```typescript
interface BookabilityCheck {
  doctor_id: UUID
  is_bookable: boolean
  bookability_score: number // 0-100

  // Preconditions
  preconditions: BookabilityPrecondition[]
  failed_preconditions: BookabilityPrecondition[]
  passed_preconditions: BookabilityPrecondition[]

  // Status
  public_profile_visible: boolean
  accepts_new_patients: boolean
  accepts_online_bookings: boolean

  // Blockers
  blockers: string[]

  // Metadata
  checked_at: timestamp
  next_check_at: timestamp
}

interface BookabilityPrecondition {
  precondition_id: string
  precondition_name: string
  category: "profile" | "credentials" | "configuration" | "availability" | "resources"

  required: boolean
  passed: boolean

  details: string
  resolution_action?: string
  resolution_owner?: UserRole

  // Impact
  blocks_public_booking: boolean
  blocks_internal_booking: boolean
  blocks_profile_visibility: boolean
}

const BOOKABILITY_PRECONDITIONS: BookabilityPrecondition[] = [
  // 1. Profile Completeness
  {
    precondition_id: "profile_complete",
    precondition_name: "Profile Complete",
    category: "profile",
    required: true,
    details: "Basic profile fields completed: name, specialty, registration number",
    resolution_action: "Complete doctor profile",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: true,
    passed: false
  },

  // 2. License Verified
  {
    precondition_id: "license_verified",
    precondition_name: "Medical License Verified",
    category: "credentials",
    required: true,
    details: "Medical license verified by admin",
    resolution_action: "Verify medical license documents",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: true,
    passed: false
  },

  // 3. Qualifications Verified
  {
    precondition_id: "qualifications_verified",
    precondition_name: "Qualifications Verified",
    category: "credentials",
    required: true,
    details: "Educational qualifications verified",
    resolution_action: "Verify qualification documents",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 4. Fees Configured
  {
    precondition_id: "fees_configured",
    precondition_name: "Consultation Fees Set",
    category: "configuration",
    required: true,
    details: "Consultation fee configured (>0)",
    resolution_action: "Configure consultation fees",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 5. Location Assigned
  {
    precondition_id: "location_assigned",
    precondition_name: "Location Assigned",
    category: "configuration",
    required: true,
    details: "Primary location assigned",
    resolution_action: "Assign doctor to location",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 6. Availability Configured
  {
    precondition_id: "availability_active",
    precondition_name: "Availability Schedule Set",
    category: "availability",
    required: true,
    details: "Weekly availability schedule configured with at least one time block",
    resolution_action: "Set up weekly availability schedule",
    resolution_owner: "doctor",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 7. Available Slots Exist
  {
    precondition_id: "has_available_slots",
    precondition_name: "Has Available Slots",
    category: "availability",
    required: true,
    details: "Has at least one available slot in next 7 days",
    resolution_action: "Ensure availability schedule is active and not fully booked",
    resolution_owner: "doctor",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 8. Department Assigned (for hospitals)
  {
    precondition_id: "department_assigned",
    precondition_name: "Department Assigned",
    category: "configuration",
    required: (hospital_mode) => hospital_mode, // Conditional
    details: "Assigned to at least one department",
    resolution_action: "Assign doctor to department",
    resolution_owner: "admin",
    blocks_public_booking: false,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 9. Insurance Verified (if required)
  {
    precondition_id: "insurance_verified",
    precondition_name: "Professional Liability Insurance",
    category: "credentials",
    required: (config) => config.requires_insurance,
    details: "Professional liability insurance verified",
    resolution_action: "Verify insurance documentation",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: false,
    blocks_profile_visibility: false,
    passed: false
  },

  // 10. Status Active
  {
    precondition_id: "status_active",
    precondition_name: "Doctor Status Active",
    category: "profile",
    required: true,
    details: "Doctor status is 'active' (not inactive, on_leave, or terminated)",
    resolution_action: "Activate doctor profile",
    resolution_owner: "admin",
    blocks_public_booking: true,
    blocks_internal_booking: true,
    blocks_profile_visibility: true,
    passed: false
  }
]
```

#### M.7.2 Bookability Evaluation

```typescript
async function evaluateBookability(doctor_id: UUID): Promise<BookabilityCheck> {
  const doctor = await getDoctorProfile(doctor_id)
  const onboarding = await getDoctorOnboardingState(doctor_id)
  const config = await getHospitalConfig(doctor.hospital_id)

  const preconditions = BOOKABILITY_PRECONDITIONS.map(p => ({ ...p }))

  // Evaluate each precondition
  for (const precondition of preconditions) {
    switch (precondition.precondition_id) {
      case "profile_complete":
        precondition.passed = !!(
          doctor.full_name &&
          doctor.primary_specialty &&
          doctor.registration_number &&
          doctor.registration_authority
        )
        break

      case "license_verified":
        const licenseVerification = onboarding.verification_checks.find(
          v => v.check_type === "license_verification"
        )
        precondition.passed = licenseVerification?.status === "verified"
        break

      case "qualifications_verified":
        const qualVerification = onboarding.verification_checks.find(
          v => v.check_type === "qualification_verification"
        )
        precondition.passed = qualVerification?.status === "verified"
        break

      case "fees_configured":
        precondition.passed = !!(
          doctor.consultation_fee && doctor.consultation_fee > 0
        )
        break

      case "location_assigned":
        precondition.passed = !!doctor.primary_location_id
        break

      case "availability_active":
        const schedule = await getDoctorSchedule(doctor_id)
        precondition.passed = !!(
          schedule &&
          schedule.recurring_schedule &&
          schedule.recurring_schedule.length > 0 &&
          schedule.recurring_schedule.some(s => s.time_blocks && s.time_blocks.length > 0)
        )
        break

      case "has_available_slots":
        const hasSlots = await checkHasAvailableSlots(doctor_id, 7) // Next 7 days
        precondition.passed = hasSlots
        break

      case "department_assigned":
        if (config.hospital_mode) {
          precondition.required = true
          precondition.passed = !!doctor.department_id
        } else {
          precondition.required = false
          precondition.passed = true // N/A for clinics
        }
        break

      case "insurance_verified":
        if (config.requires_insurance) {
          precondition.required = true
          const insuranceVerification = onboarding.verification_checks.find(
            v => v.check_type === "insurance_verification"
          )
          precondition.passed = insuranceVerification?.status === "verified"
        } else {
          precondition.required = false
          precondition.passed = true
        }
        break

      case "status_active":
        precondition.passed = doctor.status === "active"
        break
    }
  }

  // Separate passed and failed
  const passedPreconditions = preconditions.filter(p => p.passed)
  const failedPreconditions = preconditions.filter(p => !p.passed && p.required)

  // Calculate bookability
  const isBookable = failedPreconditions.length === 0
  const bookabilityScore = (passedPreconditions.length / preconditions.filter(p => p.required).length) * 100

  // Determine visibility and booking acceptance
  const publicProfileVisible = !preconditions.some(
    p => p.required && !p.passed && p.blocks_profile_visibility
  )
  const acceptsPublicBookings = isBookable && !failedPreconditions.some(p => p.blocks_public_booking)
  const acceptsInternalBookings = !failedPreconditions.some(p => p.blocks_internal_booking)

  // Generate blockers list
  const blockers = failedPreconditions.map(p => p.precondition_name)

  return {
    doctor_id,
    is_bookable: isBookable,
    bookability_score,
    preconditions,
    failed_preconditions: failedPreconditions,
    passed_preconditions: passedPreconditions,
    public_profile_visible: publicProfileVisible,
    accepts_new_patients: acceptsPublicBookings,
    accepts_online_bookings: acceptsPublicBookings,
    blockers,
    checked_at: new Date(),
    next_check_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Check again in 24 hours
  }
}

// Real-time bookability check (used before showing doctor in search)
function canShowInSearch(bookability: BookabilityCheck): boolean {
  return bookability.public_profile_visible && bookability.bookability_score >= 60
}

// Can patient book this doctor?
function canPatientBook(bookability: BookabilityCheck): boolean {
  return bookability.accepts_online_bookings && bookability.is_bookable
}

// Can receptionist book this doctor (internal booking)?
function canReceptionistBook(bookability: BookabilityCheck): boolean {
  // Receptionists can book even if public booking is blocked
  // But doctor must have basic requirements met
  const criticalFailed = bookability.failed_preconditions.filter(p =>
    p.blocks_internal_booking
  )
  return criticalFailed.length === 0
}
```

---

## N. Summary: Operational Gaps Addressed

This section M comprehensively addressed:

1. **Doctor Onboarding Workflow** - Complete 10-stage workflow from profile creation to activation, with role-based permissions, verification checks, approval flows, and activation preconditions.

2. **Doctor Availability Ownership Model** - Defined ownership for base schedules, overrides, exceptions (leave, holidays, emergency), and forced blocks, with approval workflows and role permissions.

3. **Scheduling Source Priority Model** - Established priority hierarchy (Forced Block → Emergency → Leave → Holiday → Override → Base) with conflict resolution rules and override permissions.

4. **Extended Calendar Model** - Implemented tentative holds vs confirmed bookings, auto-release logic (10-15 min), no-show republishing, and real-time WebSocket updates.

5. **Resource Allocation Extensions** - Created auto room assignment policies with fallback strategies, manual override workflows with conflict resolution, equipment resolution suggestions, and cross-location fallback logic.

6. **Patient-Side Booking UX** - Built complete self-booking state machine (search → doctor → slot → details → payment → confirmation), teleconsultation setup workflow, rescheduling/cancellation rules with fees and refunds, and payment enforcement policies.

7. **Bookability Preconditions** - Defined 10 preconditions that must be met before a doctor becomes bookable, with clear blocking rules for public vs internal booking and profile visibility.

All models include data schemas, state machines, validation rules, and role-based permissions maintaining consistency with the core specification.

---

**End of Extensions Specification**

This extension specification adds enterprise-grade capabilities to the core doctor scheduling system while maintaining backward compatibility and operational simplicity for smaller practices.
