-- Doctor Scheduling System Schema Migration
-- This script creates all tables and types needed for the doctor scheduling system

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

-- Check and create types if they don't exist
DO $$ BEGIN
    CREATE TYPE doctor_status AS ENUM ('draft', 'pending_verification', 'active', 'on_leave', 'inactive', 'terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE onboarding_stage AS ENUM ('profile_creation', 'credential_verification', 'department_assignment', 'location_assignment', 'fee_configuration', 'availability_setup', 'resource_allocation', 'compliance_checks', 'final_approval', 'activation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_status AS ENUM ('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_type AS ENUM ('vacation', 'sick', 'emergency', 'conference', 'personal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE schedule_source AS ENUM ('base_schedule', 'override', 'leave', 'holiday', 'emergency', 'forced_block');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE slot_status AS ENUM ('available', 'tentative', 'booked', 'blocked', 'completed', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE hold_type AS ENUM ('booking_in_progress', 'payment_pending', 'admin_reserved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE consultation_mode AS ENUM ('in_person', 'tele_consultation', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- DOCTOR PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    user_id UUID NOT NULL REFERENCES users(id),

    -- Basic Info
    display_name VARCHAR(255),
    salutation VARCHAR(20),
    bio TEXT,
    profile_image_url TEXT,
    years_of_experience INT,

    -- Registration & Licensing
    registration_number VARCHAR(100) UNIQUE,
    license_number VARCHAR(100),
    license_expiry_date DATE,
    license_verified BOOLEAN DEFAULT FALSE,
    license_verified_at TIMESTAMPTZ,
    license_verified_by UUID REFERENCES users(id),

    -- Specialties (primary specialty in JSON array)
    specialties JSONB DEFAULT '[]',

    -- Qualifications
    qualifications JSONB DEFAULT '[]',

    -- Languages
    languages TEXT[] DEFAULT '{"English"}',

    -- Consultation Modes
    consultation_modes consultation_mode[] DEFAULT '{in_person}',

    -- Status
    status doctor_status DEFAULT 'draft',
    is_bookable BOOLEAN DEFAULT FALSE,
    accepts_online_bookings BOOLEAN DEFAULT FALSE,
    public_profile_visible BOOLEAN DEFAULT FALSE,
    bookability_score DECIMAL(5,2) DEFAULT 0.0,

    -- Fees (base consultation fee)
    consultation_fee DECIMAL(10,2),
    follow_up_fee DECIMAL(10,2),
    tele_consultation_fee DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',

    -- Metadata
    tags TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(hospital_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_hospital ON doctor_profiles(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user ON doctor_profiles(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_status ON doctor_profiles(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_bookable ON doctor_profiles(hospital_id, is_bookable) WHERE is_bookable = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialties ON doctor_profiles USING gin(specialties);

-- =====================================================
-- DOCTOR DEPARTMENT ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS doctor_department_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,

    allocation_percentage DECIMAL(5,2) DEFAULT 100.0,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),

    UNIQUE(doctor_profile_id, department_id),
    CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_doctor_dept_assignments_doctor ON doctor_department_assignments(doctor_profile_id);
CREATE INDEX IF NOT EXISTS idx_doctor_dept_assignments_department ON doctor_department_assignments(department_id);

-- =====================================================
-- DOCTOR LOCATION ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS doctor_location_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    removed_at TIMESTAMPTZ,

    UNIQUE(doctor_profile_id, location_id, removed_at)
);

CREATE INDEX IF NOT EXISTS idx_doctor_loc_assignments_doctor ON doctor_location_assignments(doctor_profile_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctor_loc_assignments_location ON doctor_location_assignments(location_id) WHERE removed_at IS NULL;

-- =====================================================
-- DOCTOR ONBOARDING STATES
-- =====================================================

CREATE TABLE IF NOT EXISTS doctor_onboarding_states (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

    current_stage onboarding_stage DEFAULT 'profile_creation',
    overall_status VARCHAR(50) DEFAULT 'draft',

    -- Stage completion tracking
    stages JSONB NOT NULL DEFAULT '[]',

    -- Verification tracking
    verification_checks JSONB DEFAULT '[]',
    all_verifications_passed BOOLEAN DEFAULT FALSE,

    -- Activation blockers
    blockers JSONB DEFAULT '[]',
    can_accept_appointments BOOLEAN DEFAULT FALSE,

    -- Ownership
    created_by UUID REFERENCES users(id),
    current_owner UUID REFERENCES users(id),
    approval_chain JSONB DEFAULT '[]',

    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    target_completion_date DATE,
    completed_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,

    UNIQUE(doctor_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_states_doctor ON doctor_onboarding_states(doctor_profile_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_status ON doctor_onboarding_states(overall_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_states_owner ON doctor_onboarding_states(current_owner) WHERE overall_status NOT IN ('completed', 'active');

-- =====================================================
-- DOCTOR SCHEDULES
-- =====================================================

CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),

    -- Day of week (0 = Sunday, 6 = Saturday)
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Time slots
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),

    -- Slot configuration
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    buffer_time_minutes INT DEFAULT 0,
    max_appointments_per_slot INT DEFAULT 1,

    -- Consultation mode
    consultation_mode consultation_mode DEFAULT 'in_person',

    -- Capacity limits
    max_in_person_capacity INT,
    max_tele_capacity INT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(doctor_profile_id, location_id, day_of_week, start_time, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_profile_id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_location ON doctor_schedules(location_id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week) WHERE deleted_at IS NULL AND is_active = TRUE;

-- =====================================================
-- SCHEDULE OVERRIDES
-- =====================================================

CREATE TABLE IF NOT EXISTS schedule_overrides (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id),

    override_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),

    slot_duration_minutes INT NOT NULL DEFAULT 30,
    buffer_time_minutes INT DEFAULT 0,
    max_appointments_per_slot INT DEFAULT 1,

    consultation_mode consultation_mode DEFAULT 'in_person',

    reason TEXT,
    created_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(doctor_profile_id, location_id, override_date, start_time, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_doctor ON schedule_overrides(doctor_profile_id, override_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_overrides_date ON schedule_overrides(override_date) WHERE deleted_at IS NULL;

-- =====================================================
-- LEAVE REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,

    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),

    -- Partial day support
    is_full_day BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,

    reason TEXT,
    status leave_status DEFAULT 'draft',

    -- Approval workflow
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Impact assessment
    affected_appointments_count INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_doctor ON leave_requests(doctor_profile_id, start_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_pending_approval ON leave_requests(doctor_profile_id, status) WHERE status = 'pending_approval' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range ON leave_requests(start_date, end_date) WHERE deleted_at IS NULL;

-- =====================================================
-- SCHEDULE EXCEPTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    doctor_profile_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id),

    exception_type schedule_source NOT NULL,
    exception_date DATE NOT NULL,

    -- Time range (NULL = full day)
    start_time TIME,
    end_time TIME,

    reason TEXT NOT NULL,
    is_hospital_wide BOOLEAN DEFAULT FALSE,

    -- Permissions
    created_by UUID REFERENCES users(id),
    can_be_overridden BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_doctor ON schedule_exceptions(doctor_profile_id, exception_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_hospital ON schedule_exceptions(hospital_id, exception_date) WHERE is_hospital_wide = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(exception_date) WHERE deleted_at IS NULL;

-- =====================================================
-- ROOMS
-- =====================================================

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    location_id UUID NOT NULL REFERENCES locations(id),

    room_number VARCHAR(50) NOT NULL,
    room_name VARCHAR(255),
    room_type VARCHAR(100),
    floor VARCHAR(20),

    capacity INT DEFAULT 1,
    equipment_available JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(hospital_id, location_id, room_number, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_rooms_hospital ON rooms(hospital_id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rooms_location ON rooms(location_id) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type) WHERE deleted_at IS NULL AND is_active = TRUE;

-- =====================================================
-- EQUIPMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    location_id UUID REFERENCES locations(id),

    equipment_code VARCHAR(50) NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type VARCHAR(100),

    is_available BOOLEAN DEFAULT TRUE,
    maintenance_schedule JSONB,
    last_maintenance_date DATE,
    next_maintenance_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(hospital_id, equipment_code, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_equipment_hospital ON equipment(hospital_id) WHERE deleted_at IS NULL AND is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_equipment_location ON equipment(location_id) WHERE deleted_at IS NULL AND is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_equipment_type ON equipment(equipment_type) WHERE deleted_at IS NULL;

-- =====================================================
-- APPOINTMENT SLOTS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_slots (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    doctor_profile_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id),

    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_datetime TIMESTAMPTZ NOT NULL,

    duration_minutes INT NOT NULL DEFAULT 30,

    -- Consultation mode
    consultation_mode consultation_mode NOT NULL,

    -- Capacity
    max_in_person_capacity INT DEFAULT 1,
    max_tele_capacity INT DEFAULT 0,
    current_in_person_bookings INT DEFAULT 0,
    current_tele_bookings INT DEFAULT 0,

    -- Status
    status slot_status DEFAULT 'available',

    -- Blocked slots
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT,
    blocked_by UUID REFERENCES users(id),
    blocked_at TIMESTAMPTZ,

    -- Room assignment
    room_id UUID REFERENCES rooms(id),
    room_assigned_at TIMESTAMPTZ,
    room_assignment_type VARCHAR(50),

    -- Equipment
    required_equipment_ids UUID[],

    -- Source schedule
    source_schedule_id UUID,
    source_type schedule_source,

    -- Generation metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_booking_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,

    UNIQUE(doctor_profile_id, location_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointment_slots_doctor_date ON appointment_slots(doctor_profile_id, slot_date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_location_date ON appointment_slots(location_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_available ON appointment_slots(doctor_profile_id, slot_date) WHERE status = 'available' AND is_blocked = FALSE;
CREATE INDEX IF NOT EXISTS idx_appointment_slots_datetime ON appointment_slots(slot_datetime);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_room ON appointment_slots(room_id, slot_date) WHERE room_id IS NOT NULL;

-- =====================================================
-- TENTATIVE HOLDS
-- =====================================================

CREATE TABLE IF NOT EXISTS tentative_holds (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    slot_id UUID NOT NULL REFERENCES appointment_slots(id) ON DELETE CASCADE,

    held_for_patient_id UUID REFERENCES patients(id),
    held_for_session_id VARCHAR(255),

    hold_type hold_type NOT NULL,
    consultation_mode consultation_mode NOT NULL,

    held_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_release_seconds INT NOT NULL,

    status VARCHAR(50) DEFAULT 'active',

    -- Confirmation
    confirmed_appointment_id UUID REFERENCES appointments(id),
    confirmed_at TIMESTAMPTZ,

    -- Expiry
    expired_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    release_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID
);

CREATE INDEX IF NOT EXISTS idx_tentative_holds_slot ON tentative_holds(slot_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tentative_holds_patient ON tentative_holds(held_for_patient_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tentative_holds_session ON tentative_holds(held_for_session_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_tentative_holds_expiry ON tentative_holds(expires_at) WHERE status = 'active';

-- =====================================================
-- APPOINTMENT ROOM ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_room_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES appointment_slots(id),
    room_id UUID NOT NULL REFERENCES rooms(id),

    assignment_type VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),

    -- Override tracking
    previous_room_id UUID REFERENCES rooms(id),
    override_reason TEXT,

    is_current BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_appt_room_assignments_appointment ON appointment_room_assignments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appt_room_assignments_room ON appointment_room_assignments(room_id, assigned_at);
CREATE INDEX IF NOT EXISTS idx_appt_room_assignments_current ON appointment_room_assignments(appointment_id, is_current) WHERE is_current = TRUE;
