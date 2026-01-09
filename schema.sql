-- MyMedic Patient Management Platform
-- Event-Sourced Database Schema v2.0
-- PostgreSQL 15+
--
-- ARCHITECTURE: Event Sourcing + CQRS
-- - All writes → immutable events in event_store
-- - All reads → materialized projections (read models)
-- - Audit trail = event store itself (no separate audit_logs)
-- - Offline sync = event versioning
--
-- CRITICAL REQUIREMENTS:
-- 1. Event store is append-only (immutable)
-- 2. Multi-tenant isolation via hospital_id in events
-- 3. Projections rebuilt from events (idempotent)
-- 4. Optimistic concurrency via expected_version
-- 5. Partition event store by month for performance

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

-- Aggregate types (domain entities that emit events)
CREATE TYPE aggregate_type AS ENUM (
    'patient',
    'visit',
    'medical_note',
    'document',
    'appointment',
    'prescription',
    'whatsapp_message',
    'hospital',
    'user',
    'migration',
    'invoice',
    'payment',
    'charge_code',
    'admission'
);

-- Event types (domain events)
CREATE TYPE event_type AS ENUM (
    -- Patient events
    'patient_registered',
    'patient_demographics_updated',
    'patient_contact_updated',
    'patient_consent_granted',
    'patient_consent_revoked',
    'patient_deleted',
    
    -- Visit events
    'visit_scheduled',
    'visit_started',
    'vitals_recorded',
    'examination_recorded',
    'diagnosis_recorded',
    'treatment_plan_recorded',
    'visit_completed',
    'visit_cancelled',
    
    -- Medical note events
    'note_created',
    'note_content_updated',
    'note_image_uploaded',
    'note_ocr_completed',
    'note_signed',
    
    -- Document events
    'document_uploaded',
    'document_categorized',
    'document_shared',
    'document_deleted',
    
    -- Appointment events
    'appointment_scheduled',
    'appointment_confirmed',
    'appointment_rescheduled',
    'appointment_reminder_sent',
    'appointment_completed',
    'appointment_no_show_recorded',
    'appointment_cancelled',
    
    -- Prescription events
    'prescription_issued',
    'prescription_signed',
    'prescription_dispensed',
    'prescription_cancelled',
    
    -- Communication events
    'whatsapp_message_queued',
    'whatsapp_message_sent',
    'whatsapp_message_delivered',
    'whatsapp_message_read',
    'whatsapp_message_failed',
    
    -- User/Hospital events
    'user_registered',
    'user_role_changed',
    'user_deactivated',
    'hospital_created',
    'hospital_settings_updated',

    -- Migration events
    'migration_started',
    'migration_file_uploaded',
    'migration_data_extracted',
    'migration_data_validated',
    'migration_error_fixed',
    'migration_completed',
    'migration_failed',
    'migration_rolled_back',

    -- Billing events
    'charge_code_created',
    'charge_code_updated',
    'charge_code_deactivated',
    'invoice_created',
    'invoice_item_added',
    'invoice_item_removed',
    'invoice_finalized',
    'invoice_cancelled',
    'invoice_voided',
    'payment_received',
    'payment_refunded',
    'payment_allocated',

    -- ADT events
    'patient_admitted',
    'patient_transferred',
    'patient_discharged',
    'room_assigned',
    'room_charge_added'
);

-- Existing enums (keep for projections)
CREATE TYPE user_role AS ENUM ('doctor', 'nurse', 'admin', 'receptionist', 'lab_technician');
CREATE TYPE visit_status AS ENUM ('scheduled', 'in_progress', 'completed', 'no_show', 'cancelled');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled');
CREATE TYPE note_type AS ENUM ('handwritten', 'typed', 'template', 'voice');
CREATE TYPE document_type AS ENUM ('lab_report', 'imaging', 'prescription', 'consent_form', 'insurance', 'other');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE report_frequency AS ENUM ('daily', 'weekly', 'monthly', 'on_demand');
CREATE TYPE report_category AS ENUM ('clinical', 'appointments', 'communication', 'revenue', 'operational');
CREATE TYPE prediction_type AS ENUM ('no_show_risk', 'follow_up_default', 'readmission_risk');
CREATE TYPE consent_type AS ENUM ('whatsapp', 'analytics', 'research', 'marketing');

-- =====================================================
-- EVENT STORE (SINGLE SOURCE OF TRUTH)
-- =====================================================

-- Immutable event store - ALL writes go here first
CREATE TABLE event_store (
    -- Event identity
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_number BIGSERIAL NOT NULL, -- Global ordering for replay
    
    -- Aggregate identity (which entity this event belongs to)
    aggregate_type aggregate_type NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version INT NOT NULL, -- Version of THIS aggregate after this event
    
    -- Event metadata
    event_type event_type NOT NULL,
    event_schema_version INT NOT NULL DEFAULT 1, -- Track schema evolution for upcasting
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Event payload (structured JSON)
    event_data JSONB NOT NULL,
    event_metadata JSONB DEFAULT '{}', -- Causation/correlation IDs, user context
    
    -- Multi-tenancy (denormalized for performance)
    hospital_id UUID NOT NULL,
    
    -- Audit context (who, when, where)
    caused_by_user_id UUID,
    caused_by_command TEXT, -- e.g., "CreatePatient", "UpdateVisit"
    correlation_id UUID, -- Track related events across aggregates
    causation_id UUID, -- Parent event that caused this one
    
    -- Client context (for debugging)
    client_ip INET,
    client_user_agent TEXT,
    device_id TEXT, -- For mobile offline sync tracking
    
    -- Idempotency (prevent duplicate event processing)
    idempotency_key TEXT, -- Client-provided key for exactly-once semantics
    
    -- Constraints
    UNIQUE(aggregate_id, aggregate_version), -- Optimistic concurrency
    UNIQUE(idempotency_key) WHERE idempotency_key IS NOT NULL,

    -- Validate event_type matches aggregate_type
    CONSTRAINT valid_event_aggregate_mapping CHECK (
        (event_type::text LIKE 'patient_%' AND aggregate_type = 'patient') OR
        (event_type::text LIKE 'visit_%' AND aggregate_type = 'visit') OR
        (event_type::text LIKE 'note_%' AND aggregate_type = 'medical_note') OR
        (event_type::text LIKE 'document_%' AND aggregate_type = 'document') OR
        (event_type::text LIKE 'appointment_%' AND aggregate_type = 'appointment') OR
        (event_type::text LIKE 'prescription_%' AND aggregate_type = 'prescription') OR
        (event_type::text LIKE 'whatsapp_%' AND aggregate_type = 'whatsapp_message') OR
        (event_type::text LIKE 'user_%' AND aggregate_type = 'user') OR
        (event_type::text LIKE 'hospital_%' AND aggregate_type = 'hospital') OR
        (event_type::text LIKE 'migration_%' AND aggregate_type = 'migration') OR
        (event_type::text LIKE 'charge_code_%' AND aggregate_type = 'charge_code') OR
        (event_type::text LIKE 'invoice_%' AND aggregate_type = 'invoice') OR
        (event_type::text LIKE 'payment_%' AND aggregate_type = 'payment') OR
        (event_type::text LIKE '%admitted' AND aggregate_type = 'admission') OR
        (event_type::text LIKE '%transferred' AND aggregate_type = 'admission') OR
        (event_type::text LIKE '%discharged' AND aggregate_type = 'admission') OR
        (event_type::text LIKE 'room_%' AND aggregate_type = 'admission')
    )

) PARTITION BY RANGE (event_timestamp);

-- Indexes for event store
CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_id, aggregate_version);
CREATE INDEX idx_event_store_type ON event_store(event_type, event_timestamp);
CREATE INDEX idx_event_store_hospital ON event_store(hospital_id, event_timestamp);
CREATE INDEX idx_event_store_number ON event_store(event_number); -- For sequential replay
CREATE INDEX idx_event_store_correlation ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_event_store_idempotency ON event_store(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_event_store_schema_version ON event_store(event_type, event_schema_version);

-- JSONB indexes for common event_data queries
CREATE INDEX idx_event_store_data_mrn ON event_store USING gin ((event_data->'mrn')) WHERE event_type = 'patient_registered';
CREATE INDEX idx_event_store_data_patient_id ON event_store USING gin ((event_data->'patient_id'));
CREATE INDEX idx_event_store_metadata ON event_store USING gin (event_metadata);

-- Partitions for event store (monthly)
CREATE TABLE event_store_2026_01 PARTITION OF event_store FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE event_store_2026_02 PARTITION OF event_store FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE event_store_2026_03 PARTITION OF event_store FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE event_store_2026_04 PARTITION OF event_store FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE event_store_2026_05 PARTITION OF event_store FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE event_store_2026_06 PARTITION OF event_store FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE event_store_2026_07 PARTITION OF event_store FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE event_store_2026_08 PARTITION OF event_store FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE event_store_2026_09 PARTITION OF event_store FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE event_store_2026_10 PARTITION OF event_store FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE event_store_2026_11 PARTITION OF event_store FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE event_store_2026_12 PARTITION OF event_store FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Comment on event store
COMMENT ON TABLE event_store IS 'Immutable event log - single source of truth for all domain events. Projections are derived from this.';
COMMENT ON COLUMN event_store.aggregate_version IS 'Enables optimistic concurrency control. Commands must specify expected_version.';
COMMENT ON COLUMN event_store.idempotency_key IS 'Client-provided key (e.g., UUID) to ensure exactly-once processing of commands.';

-- =====================================================
-- EVENT STORE FUNCTIONS
-- =====================================================

-- Function to get aggregate version (for optimistic concurrency)
CREATE OR REPLACE FUNCTION get_aggregate_version(
    p_aggregate_id UUID
)
RETURNS INT AS $$
DECLARE
    v_version INT;
BEGIN
    SELECT COALESCE(MAX(aggregate_version), 0)
    INTO v_version
    FROM event_store
    WHERE aggregate_id = p_aggregate_id;
    
    RETURN v_version;
END;
$$ LANGUAGE plpgsql;

-- Function to get aggregate events (for rebuilding state)
CREATE OR REPLACE FUNCTION get_aggregate_events(
    p_aggregate_id UUID,
    p_from_version INT DEFAULT 0
)
RETURNS TABLE (
    event_id UUID,
    event_type event_type,
    event_data JSONB,
    aggregate_version INT,
    event_timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.event_id,
        e.event_type,
        e.event_data,
        e.aggregate_version,
        e.event_timestamp
    FROM event_store e
    WHERE e.aggregate_id = p_aggregate_id
      AND e.aggregate_version > p_from_version
    ORDER BY e.aggregate_version ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION create_event_store_partition(
    p_year INT,
    p_month INT
)
RETURNS TEXT AS $$
DECLARE
    v_partition_name TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_create_sql TEXT;
BEGIN
    -- Calculate partition name and date range
    v_partition_name := 'event_store_' || p_year || '_' || LPAD(p_month::TEXT, 2, '0');
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := v_start_date + INTERVAL '1 month';

    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = v_partition_name
        AND n.nspname = 'public'
    ) THEN
        RETURN 'Partition ' || v_partition_name || ' already exists';
    END IF;

    -- Create partition
    v_create_sql := format(
        'CREATE TABLE %I PARTITION OF event_store FOR VALUES FROM (%L) TO (%L)',
        v_partition_name,
        v_start_date,
        v_end_date
    );

    EXECUTE v_create_sql;

    RETURN 'Created partition ' || v_partition_name || ' for range [' || v_start_date || ', ' || v_end_date || ')';
END;
$$ LANGUAGE plpgsql;

-- Function to ensure next 3 months of partitions exist (call from cron)
CREATE OR REPLACE FUNCTION ensure_event_store_partitions()
RETURNS TABLE (result TEXT) AS $$
DECLARE
    v_current_date DATE := CURRENT_DATE;
    v_month INT;
    v_year INT;
    v_result TEXT;
BEGIN
    -- Create partitions for current month + next 2 months
    FOR i IN 0..2 LOOP
        v_month := EXTRACT(MONTH FROM v_current_date + (i || ' months')::INTERVAL);
        v_year := EXTRACT(YEAR FROM v_current_date + (i || ' months')::INTERVAL);

        SELECT create_event_store_partition(v_year, v_month) INTO v_result;
        RETURN QUERY SELECT v_result;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce event store immutability
CREATE OR REPLACE FUNCTION reject_event_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Event store is immutable. UPDATE operations are not allowed on event_id: %', OLD.event_id
            USING ERRCODE = 'integrity_constraint_violation',
                  HINT = 'Events are append-only. Create a new compensating event instead.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Event store is immutable. DELETE operations are not allowed on event_id: %', OLD.event_id
            USING ERRCODE = 'integrity_constraint_violation',
                  HINT = 'Events are append-only and permanent. Create a compensating event instead.';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply immutability trigger to event store
CREATE TRIGGER prevent_event_modification
BEFORE UPDATE OR DELETE ON event_store
FOR EACH ROW EXECUTE FUNCTION reject_event_modification();

-- =====================================================
-- PROJECTION TRACKING (for rebuild/catch-up)
-- =====================================================

CREATE TABLE projection_state (
    projection_name TEXT PRIMARY KEY,
    last_processed_event_number BIGINT NOT NULL DEFAULT 0,
    last_processed_at TIMESTAMPTZ,
    is_rebuilding BOOLEAN DEFAULT FALSE,
    rebuild_started_at TIMESTAMPTZ,
    rebuild_progress_pct DECIMAL(5,2),
    error_count INT DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ
);

COMMENT ON TABLE projection_state IS 'Tracks which events each projection has processed. Enables catch-up and rebuild.';

-- Insert initial projection states
INSERT INTO projection_state (projection_name) VALUES
    ('patients_projection'),
    ('visits_projection'),
    ('medical_notes_projection'),
    ('documents_projection'),
    ('appointments_projection'),
    ('prescriptions_projection'),
    ('whatsapp_messages_projection'),
    ('timeline_events_projection'),
    ('migrations_projection'),
    ('invoices_projection'),
    ('payments_projection'),
    ('charge_codes_projection'),
    ('admissions_projection');

-- =====================================================
-- AGGREGATE SNAPSHOTS (Performance Optimization)
-- =====================================================

-- Store snapshots of aggregate state to avoid replaying thousands of events
CREATE TABLE aggregate_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type aggregate_type NOT NULL,
    aggregate_id UUID NOT NULL,
    aggregate_version INT NOT NULL, -- Snapshot taken at this version
    snapshot_data JSONB NOT NULL, -- Complete aggregate state
    event_number BIGINT NOT NULL, -- Last event_number included in snapshot
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT, -- System/manual indicator

    UNIQUE(aggregate_id, aggregate_version)
);

CREATE INDEX idx_snapshots_aggregate ON aggregate_snapshots(aggregate_id, aggregate_version DESC);
CREATE INDEX idx_snapshots_type ON aggregate_snapshots(aggregate_type, snapshot_timestamp DESC);

COMMENT ON TABLE aggregate_snapshots IS 'Periodic snapshots of aggregate state. Load snapshot + replay events since snapshot instead of all events.';
COMMENT ON COLUMN aggregate_snapshots.aggregate_version IS 'Version of aggregate when snapshot was taken. To rebuild: load snapshot, replay events > this version.';

-- =====================================================
-- PROJECTION ERROR LOGGING
-- =====================================================

-- Track errors that occur during projection updates
CREATE TABLE projection_errors (
    error_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    projection_name TEXT NOT NULL,
    event_id UUID, -- Event that caused the error
    event_number BIGINT,
    event_type event_type,
    error_message TEXT NOT NULL,
    error_details JSONB, -- Stack trace, context
    error_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT
);

CREATE INDEX idx_projection_errors_unresolved ON projection_errors(projection_name, error_timestamp DESC)
    WHERE resolved_at IS NULL;
CREATE INDEX idx_projection_errors_event ON projection_errors(event_id);

COMMENT ON TABLE projection_errors IS 'Log of errors during projection updates. Monitor for unresolved errors that block projection progress.';

-- =====================================================
-- EVENT SCHEMA REGISTRY
-- =====================================================

-- Track event schema versions for validation and upcasting
CREATE TABLE event_schemas (
    schema_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type event_type NOT NULL,
    schema_version INT NOT NULL,
    json_schema JSONB NOT NULL, -- JSON Schema specification
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    deprecated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    UNIQUE(event_type, schema_version)
);

CREATE INDEX idx_event_schemas_type_active ON event_schemas(event_type, schema_version DESC)
    WHERE is_active = TRUE;

COMMENT ON TABLE event_schemas IS 'Registry of event schema versions. Used for validation and upcasting old events to new schemas.';

-- =====================================================
-- IDEMPOTENCY TRACKING
-- =====================================================

-- Track idempotency key usage for debugging
CREATE TABLE idempotency_audit (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key TEXT NOT NULL,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_count INT DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    result_event_id UUID, -- Event created on first attempt
    client_ip INET,
    device_id TEXT,
    hospital_id UUID
);

CREATE INDEX idx_idempotency_audit_key ON idempotency_audit(idempotency_key);
CREATE INDEX idx_idempotency_audit_hospital ON idempotency_audit(hospital_id, first_attempt_at DESC);

COMMENT ON TABLE idempotency_audit IS 'Track duplicate command attempts via idempotency keys. Useful for debugging mobile offline sync.';

-- =====================================================
-- EVENT MIGRATION LOG
-- =====================================================

-- Track manual corrections to events (should be rare)
CREATE TABLE event_migrations (
    migration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_event_id UUID NOT NULL, -- Reference to event_store
    migration_type TEXT NOT NULL, -- 'schema_fix', 'data_correction', etc.
    old_event_data JSONB,
    new_event_data JSONB,
    migration_reason TEXT NOT NULL,
    compensation_event_id UUID, -- New event created to compensate
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    migrated_by UUID NOT NULL,
    approved_by UUID,
    rollback_event_id UUID -- Event created if migration is rolled back
);

CREATE INDEX idx_event_migrations_original ON event_migrations(original_event_id);
CREATE INDEX idx_event_migrations_timestamp ON event_migrations(migrated_at DESC);

COMMENT ON TABLE event_migrations IS 'Audit log of manual event corrections. Event store is immutable, so corrections create compensating events.';

-- =====================================================
-- READ MODELS (PROJECTIONS) - Derived from Events
-- =====================================================

-- NOTE: All tables below are READ MODELS (projections).
-- They are derived from event_store and can be rebuilt at any time.
-- DO NOT write to these tables directly - only via event handlers.

-- Hospitals (read model)
CREATE TABLE hospitals (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0, -- Track aggregate version
    
    -- Current state (projected from events)
    name TEXT NOT NULL,
    license_number TEXT UNIQUE,
    license_type TEXT,
    max_users INT DEFAULT 10,
    max_patients INT,
    address JSONB,
    phone TEXT,
    email TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Projection metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID, -- Last event that updated this projection
    
    -- Soft delete (via events)
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

CREATE INDEX idx_hospitals_active ON hospitals(is_active) WHERE deleted_at IS NULL;

-- Users (read model)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    
    email TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    registration_number TEXT,
    specialization TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT,
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    
    UNIQUE(hospital_id, email),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_hospital ON users(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(hospital_id, role) WHERE deleted_at IS NULL;

-- Patients (read model)
CREATE TABLE patients (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    
    mrn TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    date_of_birth DATE,
    gender TEXT,
    phone TEXT,
    email TEXT,
    whatsapp_phone TEXT,
    whatsapp_opted_in BOOLEAN DEFAULT FALSE,
    address JSONB,
    emergency_contact JSONB,
    blood_group TEXT,
    allergies TEXT[],
    chronic_conditions TEXT[],
    insurance_info JSONB,
    notes TEXT,
    referring_doctor TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    
    UNIQUE(hospital_id, mrn)
);

CREATE INDEX idx_patients_hospital ON patients(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_mrn ON patients(hospital_id, mrn) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_phone ON patients(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_name ON patients(hospital_id, first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_whatsapp ON patients(whatsapp_phone) WHERE deleted_at IS NULL AND whatsapp_opted_in = TRUE;
CREATE INDEX idx_patients_name_trgm ON patients USING gin(first_name gin_trgm_ops, last_name gin_trgm_ops);

-- Timeline Events (read model - projection of all patient-related events)
-- This is now a PROJECTION, not the source of truth
CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    -- Link to source event
    source_event_id UUID NOT NULL, -- References event_store.event_id
    source_event_number BIGINT NOT NULL,
    
    event_type TEXT NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    title TEXT,
    summary TEXT,
    metadata JSONB,
    related_user_id UUID REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_timeline_patient ON timeline_events(patient_id, event_timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_hospital ON timeline_events(hospital_id, event_timestamp DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_type ON timeline_events(patient_id, event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_pinned ON timeline_events(patient_id, is_pinned) WHERE deleted_at IS NULL AND is_pinned = TRUE;
CREATE INDEX idx_timeline_source_event ON timeline_events(source_event_id);

COMMENT ON TABLE timeline_events IS 'PROJECTION: Patient timeline derived from event_store. Rebuild by replaying patient-related events.';

-- Visits (read model)
CREATE TABLE visits (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    timeline_event_id UUID REFERENCES timeline_events(id),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    
    visit_number INT,
    visit_date DATE NOT NULL,
    visit_time TIME,
    visit_type TEXT,
    chief_complaint TEXT,
    status visit_status DEFAULT 'scheduled',
    examination_findings TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up_date DATE,
    follow_up_instructions TEXT,
    duration_minutes INT,
    vitals JSONB,
    notes TEXT,
    is_telemedicine BOOLEAN DEFAULT FALSE,
    billing_status TEXT,
    billing_amount DECIMAL(10,2),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_visits_hospital ON visits(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_visits_patient ON visits(patient_id, visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_visits_doctor ON visits(doctor_id, visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_visits_date ON visits(visit_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_visits_status ON visits(status) WHERE deleted_at IS NULL;

-- Medical Notes (read model)
CREATE TABLE medical_notes (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    timeline_event_id UUID REFERENCES timeline_events(id),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID REFERENCES visits(id),
    
    note_type note_type NOT NULL,
    title TEXT,
    content TEXT,
    image_urls TEXT[],
    audio_url TEXT,
    ocr_confidence DECIMAL(3,2),
    ocr_status TEXT,
    is_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES users(id),
    template_id UUID,
    search_vector tsvector,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_notes_hospital ON medical_notes(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_patient ON medical_notes(patient_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_visit ON medical_notes(visit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_search ON medical_notes USING gin(search_vector);

-- Auto-update search_vector
CREATE TRIGGER medical_notes_search_update
BEFORE INSERT OR UPDATE ON medical_notes
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', title, content);

-- Documents (read model)
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    timeline_event_id UUID REFERENCES timeline_events(id),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID REFERENCES visits(id),
    
    document_type document_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    thumbnail_url TEXT,
    page_count INT,
    tags TEXT[],
    is_sensitive BOOLEAN DEFAULT TRUE,
    shared_with UUID[],
    download_count INT DEFAULT 0,
    
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_documents_hospital ON documents(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_patient ON documents(patient_id, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_visit ON documents(visit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;

-- Appointments (read model)
CREATE TABLE appointments (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 30,
    appointment_type TEXT,
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    reason TEXT,
    reminder_sent_at TIMESTAMPTZ,
    reminder_status TEXT,
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    no_show_recorded_at TIMESTAMPTZ,
    visit_id UUID REFERENCES visits(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id),
    
    -- Prevent double-booking (using a computed column approach)
    -- Note: EXCLUDE constraint with computed intervals requires immutable functions
    -- We'll handle double-booking validation in application logic instead
);

CREATE INDEX idx_appointments_hospital ON appointments(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_patient ON appointments(patient_id, scheduled_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id, scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_date ON appointments(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_status ON appointments(status) WHERE deleted_at IS NULL;

-- WhatsApp Messages (read model)
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    
    phone_number TEXT NOT NULL,
    direction message_direction NOT NULL,
    message_type TEXT,
    content TEXT,
    template_name TEXT,
    template_params JSONB,
    media_url TEXT,
    whatsapp_message_id TEXT UNIQUE,
    status message_status DEFAULT 'queued',
    error_code TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    reply_to_message_id UUID REFERENCES whatsapp_messages(id),
    cost_credits DECIMAL(10,4),
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID
);

CREATE INDEX idx_whatsapp_hospital ON whatsapp_messages(hospital_id);
CREATE INDEX idx_whatsapp_patient ON whatsapp_messages(patient_id, created_at DESC);
CREATE INDEX idx_whatsapp_phone ON whatsapp_messages(phone_number, created_at DESC);
CREATE INDEX idx_whatsapp_status ON whatsapp_messages(status) WHERE status IN ('queued', 'failed');
CREATE INDEX idx_whatsapp_message_id ON whatsapp_messages(whatsapp_message_id);

-- Prescriptions (read model)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    timeline_event_id UUID REFERENCES timeline_events(id),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    visit_id UUID REFERENCES visits(id),
    doctor_id UUID NOT NULL REFERENCES users(id),
    
    prescription_number TEXT UNIQUE,
    medications JSONB NOT NULL,
    diagnosis TEXT,
    notes TEXT,
    is_digital_signature BOOLEAN DEFAULT FALSE,
    signature_url TEXT,
    valid_until DATE,
    is_dispensed BOOLEAN DEFAULT FALSE,
    dispensed_at TIMESTAMPTZ,
    dispensed_by TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_prescriptions_hospital ON prescriptions(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_prescriptions_visit ON prescriptions(visit_id) WHERE deleted_at IS NULL;

-- Note Templates (read model)
CREATE TABLE note_templates (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    template_content JSONB NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_templates_hospital ON note_templates(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_templates_category ON note_templates(category) WHERE deleted_at IS NULL;

-- Reports (read model)
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    
    report_type report_frequency NOT NULL,
    report_category report_category NOT NULL,
    report_name TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    data JSONB NOT NULL,
    pdf_url TEXT,
    csv_url TEXT,
    excel_url TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),
    generation_duration_ms INT,
    row_count INT,
    filters JSONB,
    is_scheduled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_hospital ON reports(hospital_id, created_at DESC);
CREATE INDEX idx_reports_type ON reports(report_type, report_category);
CREATE INDEX idx_reports_period ON reports(period_start, period_end);

-- Predictions (read model)
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    
    prediction_type prediction_type NOT NULL,
    risk_score DECIMAL(3,2) NOT NULL,
    risk_category TEXT,
    risk_factors JSONB,
    model_version TEXT,
    model_type TEXT,
    confidence DECIMAL(3,2),
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    prediction_date DATE,
    is_accurate BOOLEAN,
    actual_outcome TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_hospital ON predictions(hospital_id);
CREATE INDEX idx_predictions_patient ON predictions(patient_id, predicted_at DESC);
CREATE INDEX idx_predictions_appointment ON predictions(appointment_id);
CREATE INDEX idx_predictions_type ON predictions(prediction_type, prediction_date);
CREATE INDEX idx_predictions_accuracy ON predictions(is_accurate) WHERE is_accurate IS NOT NULL;

-- Patient Consents (read model)
CREATE TABLE patient_consents (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    
    consent_type consent_type NOT NULL,
    is_granted BOOLEAN NOT NULL,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    consent_text TEXT,
    consent_version TEXT,
    ip_address INET,
    user_agent TEXT,
    signature_url TEXT,
    witness_name TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID
);

CREATE INDEX idx_consents_patient ON patient_consents(patient_id, consent_type);
CREATE INDEX idx_consents_active ON patient_consents(patient_id, consent_type, is_granted) 
    WHERE is_granted = TRUE AND revoked_at IS NULL;

-- Data Deletion Requests (read model)
CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID REFERENCES patients(id),
    
    requested_via TEXT,
    requester_identity_verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    scheduled_deletion_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deletion_requests_status ON deletion_requests(status) WHERE status IN ('pending', 'approved', 'scheduled');

-- =====================================================
-- DATA MIGRATION SYSTEM (Read Models)
-- =====================================================

-- Main migrations table (read model)
CREATE TABLE migrations (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    initiated_by_user_id UUID NOT NULL REFERENCES users(id),

    migration_type VARCHAR(50) NOT NULL, -- csv, excel, api, database
    status VARCHAR(50) NOT NULL, -- pending, extracting, validating, importing, completed, failed, rolled_back
    entity_types TEXT[], -- ['patient', 'visit', 'prescription']
    source_config JSONB, -- { file_path, api_endpoint, db_connection, etc. }

    -- Progress tracking
    total_records INTEGER,
    processed_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,

    -- Column mapping
    column_mapping JSONB, -- { "source_column": "target_field" }

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID
);

CREATE INDEX idx_migrations_hospital ON migrations(hospital_id);
CREATE INDEX idx_migrations_status ON migrations(status);
CREATE INDEX idx_migrations_created ON migrations(created_at DESC);

-- Raw extracted data (temporary staging)
CREATE TABLE migration_raw_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    raw_data JSONB NOT NULL, -- Original data as extracted
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_raw_data_migration ON migration_raw_data(migration_id);

-- Transformed data (ready for validation)
CREATE TABLE migration_transformed_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
    raw_data_id UUID NOT NULL REFERENCES migration_raw_data(id),
    entity_type VARCHAR(50) NOT NULL, -- patient, visit, prescription
    transformed_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_transformed_migration ON migration_transformed_data(migration_id);

-- Validation errors and warnings
CREATE TABLE migration_validation_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
    transformed_data_id UUID NOT NULL REFERENCES migration_transformed_data(id),
    row_number INTEGER NOT NULL,
    field_name VARCHAR(255),
    severity VARCHAR(20) NOT NULL, -- error, warning
    error_code VARCHAR(100),
    error_message TEXT NOT NULL,
    suggested_fix TEXT,
    fixed_value TEXT,
    is_fixed BOOLEAN DEFAULT FALSE,
    fixed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_validation_migration ON migration_validation_errors(migration_id);
CREATE INDEX idx_migration_validation_severity ON migration_validation_errors(migration_id, severity);

-- Mapping of source records to generated events
CREATE TABLE migration_event_map (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id UUID NOT NULL REFERENCES migrations(id),
    source_record_id UUID NOT NULL, -- ID from migration_transformed_data
    event_id UUID NOT NULL, -- ID from event_store
    aggregate_type aggregate_type NOT NULL,
    aggregate_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_migration_event_map_migration ON migration_event_map(migration_id);
CREATE INDEX idx_migration_event_map_event ON migration_event_map(event_id);

-- Transformation rules
CREATE TABLE migration_transformation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id UUID REFERENCES migrations(id),
    entity_type VARCHAR(50) NOT NULL,
    source_field VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    transformation_type VARCHAR(50), -- map, normalize, calculate, enrich
    transformation_config JSONB, -- { "format": "YYYY-MM-DD", "default": null }
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transformation_rules_migration ON migration_transformation_rules(migration_id);

-- Validation rules
CREATE TABLE migration_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- patient, visit, prescription
    field_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- required, regex, range, unique, reference
    rule_config JSONB NOT NULL,
    severity VARCHAR(20) NOT NULL, -- error, warning
    error_message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validation_rules_entity ON migration_validation_rules(entity_type);

-- =====================================================
-- BILLING SYSTEM (Read Models)
-- =====================================================

-- Tenant billing configuration
CREATE TABLE tenant_billing_config (
    tenant_id UUID PRIMARY KEY REFERENCES hospitals(id),
    billing_enabled BOOLEAN DEFAULT FALSE,
    billing_mode VARCHAR(50) NOT NULL DEFAULT 'full',
        -- 'full': MyMedic handles all billing
        -- 'export_only': Generate invoices but export to HIS for payment
        -- 'coexist': Selective departments use MyMedic billing

    -- Feature Toggles
    enable_invoicing BOOLEAN DEFAULT TRUE,
    enable_payments BOOLEAN DEFAULT TRUE,
    enable_packages BOOLEAN DEFAULT FALSE,
    enable_tariffs BOOLEAN DEFAULT FALSE,
    enable_tax_calculation BOOLEAN DEFAULT FALSE,

    -- HIS Integration
    his_billing_system VARCHAR(100),
    export_to_his BOOLEAN DEFAULT FALSE,
    his_export_format VARCHAR(50), -- 'csv', 'hl7', 'fhir', 'api'
    his_api_endpoint VARCHAR(500),

    -- Workflow Settings
    auto_generate_invoice BOOLEAN DEFAULT FALSE,
    invoice_on_visit_complete BOOLEAN DEFAULT TRUE,
    require_settlement_before_checkout BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Charge Codes (Master Catalog) - read model
CREATE TABLE charge_codes (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),

    code VARCHAR(50) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,

    category VARCHAR(100) NOT NULL,
        -- 'consultation', 'procedure', 'lab', 'radiology',
        -- 'pharmacy', 'room', 'equipment', 'supplies'

    department_id UUID,
    service_type VARCHAR(50) NOT NULL DEFAULT 'BOTH',
        -- 'OPD', 'IPD', 'BOTH'

    -- Pricing
    base_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    unit VARCHAR(50) DEFAULT 'per_service',
        -- 'per_service', 'per_day', 'per_hour', 'per_unit'

    -- Tax Configuration
    is_taxable BOOLEAN DEFAULT FALSE,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE,
    effective_until DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,

    UNIQUE(hospital_id, code),
    CHECK (base_price >= 0),
    CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

CREATE INDEX idx_charge_codes_hospital_category ON charge_codes(hospital_id, category);
CREATE INDEX idx_charge_codes_active ON charge_codes(hospital_id, is_active) WHERE is_active = TRUE;

-- Tariff Tables (Differential Pricing)
CREATE TABLE tariff_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    tariff_name VARCHAR(100) NOT NULL,
    description TEXT,
    tariff_type VARCHAR(50) NOT NULL,
        -- 'general', 'insurance', 'corporate', 'employee', 'research'

    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(hospital_id, tariff_name)
);

CREATE TABLE tariff_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tariff_id UUID NOT NULL REFERENCES tariff_tables(id) ON DELETE CASCADE,
    charge_code_id UUID NOT NULL REFERENCES charge_codes(id) ON DELETE CASCADE,

    override_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,

    effective_from DATE,
    effective_until DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tariff_id, charge_code_id),
    CHECK (override_price >= 0),
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

CREATE INDEX idx_tariff_prices_tariff ON tariff_prices(tariff_id);

-- Package Pricing (Bundled Services)
CREATE TABLE billing_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    package_code VARCHAR(50) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    description TEXT,

    package_type VARCHAR(50) NOT NULL,
        -- 'maternity', 'surgery', 'health_checkup', 'chronic_care'

    total_price DECIMAL(12,2) NOT NULL,
    validity_days INTEGER DEFAULT 365,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(hospital_id, package_code),
    CHECK (total_price >= 0),
    CHECK (validity_days > 0)
);

CREATE TABLE package_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES billing_packages(id) ON DELETE CASCADE,
    charge_code_id UUID NOT NULL REFERENCES charge_codes(id) ON DELETE CASCADE,

    quantity INTEGER NOT NULL DEFAULT 1,
    included_price DECIMAL(12,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(package_id, charge_code_id),
    CHECK (quantity > 0)
);

-- Invoices (read model)
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),

    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Links
    visit_id UUID REFERENCES visits(id),
    admission_id UUID, -- References admissions table

    -- Pricing context
    tariff_id UUID REFERENCES tariff_tables(id),
    package_id UUID REFERENCES billing_packages(id),

    -- Amounts
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    discount_reason TEXT,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    outstanding_amount DECIMAL(12,2) DEFAULT 0.00,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
        -- 'draft', 'finalized', 'partially_paid', 'paid', 'overdue', 'cancelled', 'void'

    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES users(id),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,

    CHECK (subtotal >= 0),
    CHECK (discount_amount >= 0),
    CHECK (tax_amount >= 0),
    CHECK (total_amount >= 0),
    CHECK (paid_amount >= 0),
    CHECK (outstanding_amount >= 0)
);

CREATE INDEX idx_invoices_hospital ON invoices(hospital_id);
CREATE INDEX idx_invoices_patient ON invoices(patient_id, invoice_date DESC);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_outstanding ON invoices(hospital_id, status) WHERE outstanding_amount > 0;

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    charge_code_id UUID NOT NULL REFERENCES charge_codes(id),

    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL,

    service_date DATE,
    performed_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(invoice_id, line_number),
    CHECK (quantity > 0),
    CHECK (unit_price >= 0),
    CHECK (line_total >= 0)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_items_charge_code ON invoice_line_items(charge_code_id);

-- Payments (read model)
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),

    payment_number VARCHAR(50) NOT NULL UNIQUE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
        -- 'cash', 'card', 'upi', 'bank_transfer', 'cheque', 'insurance'

    -- Payment details
    reference_number TEXT,
    card_last_4 VARCHAR(4),
    upi_transaction_id TEXT,
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name TEXT,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'received',
        -- 'received', 'cleared', 'failed', 'refunded'

    notes TEXT,

    received_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,

    CHECK (amount > 0)
);

CREATE INDEX idx_payments_hospital ON payments(hospital_id);
CREATE INDEX idx_payments_patient ON payments(patient_id, payment_date DESC);
CREATE INDEX idx_payments_number ON payments(payment_number);
CREATE INDEX idx_payments_method ON payments(payment_method);

-- Payment Settlements (Allocation to Invoices)
CREATE TABLE payment_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    allocated_amount DECIMAL(12,2) NOT NULL,
    settlement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CHECK (allocated_amount > 0)
);

CREATE INDEX idx_settlements_payment ON payment_settlements(payment_id);
CREATE INDEX idx_settlements_invoice ON payment_settlements(invoice_id);

-- =====================================================
-- ADMISSION/DISCHARGE/TRANSFER (ADT) (Read Models)
-- =====================================================

-- Admissions (read model)
CREATE TABLE admissions (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    patient_id UUID NOT NULL REFERENCES patients(id),

    admission_number VARCHAR(50) NOT NULL UNIQUE,
    admission_date DATE NOT NULL,
    admission_time TIMESTAMPTZ NOT NULL,

    -- Current status
    status VARCHAR(50) NOT NULL DEFAULT 'admitted',
        -- 'admitted', 'discharged', 'transferred'

    -- Room/bed information
    current_ward TEXT,
    current_room TEXT,
    current_bed TEXT,

    -- Care details
    admitting_doctor_id UUID REFERENCES users(id),
    attending_doctor_id UUID REFERENCES users(id),
    admission_type VARCHAR(50), -- 'emergency', 'planned', 'transfer'
    admission_reason TEXT,

    -- Discharge information
    discharge_date DATE,
    discharge_time TIMESTAMPTZ,
    discharge_summary TEXT,
    discharge_instructions TEXT,
    discharged_by UUID REFERENCES users(id),

    -- Billing
    invoice_id UUID REFERENCES invoices(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID
);

CREATE INDEX idx_admissions_hospital ON admissions(hospital_id);
CREATE INDEX idx_admissions_patient ON admissions(patient_id, admission_date DESC);
CREATE INDEX idx_admissions_status ON admissions(status);
CREATE INDEX idx_admissions_number ON admissions(admission_number);

-- Room Assignments (history of room changes)
CREATE TABLE room_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),

    ward TEXT NOT NULL,
    room TEXT NOT NULL,
    bed TEXT,

    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    vacated_at TIMESTAMPTZ,

    charge_code_id UUID REFERENCES charge_codes(id),
    daily_rate DECIMAL(12,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_assignments_admission ON room_assignments(admission_id);
CREATE INDEX idx_room_assignments_current ON room_assignments(admission_id) WHERE vacated_at IS NULL;

-- ADT Integration Queue (for external HIS systems)
CREATE TABLE adt_integration_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),

    event_type VARCHAR(50) NOT NULL, -- 'A01', 'A02', 'A03' (HL7 ADT events)
    event_data JSONB NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'pending',
        -- 'pending', 'processing', 'completed', 'failed'

    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_adt_queue_status ON adt_integration_queue(status, created_at);
CREATE INDEX idx_adt_queue_hospital ON adt_integration_queue(hospital_id);

-- ADT Dead Letter Queue (failed messages)
CREATE TABLE adt_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    original_queue_id UUID REFERENCES adt_integration_queue(id),

    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    retry_count INTEGER NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT
);

CREATE INDEX idx_adt_dlq_unresolved ON adt_dead_letter_queue(hospital_id) WHERE resolved_at IS NULL;

-- =====================================================
-- SYSTEM TABLES (same as before)
-- =====================================================

-- Webhooks, API Tokens, Background Jobs, Notifications (unchanged from original)
-- ... (keeping these as-is since they're operational, not domain events)

CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    retry_attempts INT DEFAULT 3,
    timeout_seconds INT DEFAULT 30,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(id),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    status TEXT,
    response_code INT,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, next_attempt_at) 
    WHERE status IN ('pending', 'failed');

CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    token_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    scopes TEXT[],
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    usage_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id)
);

CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash) WHERE is_active = TRUE AND revoked_at IS NULL;

CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON background_jobs(status, scheduled_at) 
    WHERE status IN ('pending', 'failed');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id),
    user_id UUID REFERENCES users(id),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'normal',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- =====================================================
-- ROW-LEVEL SECURITY (Multi-tenant isolation)
-- =====================================================

-- Enable RLS on read models (projections)
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their hospital
CREATE POLICY hospital_isolation_policy ON event_store
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON users
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON patients
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON timeline_events
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON visits
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON medical_notes
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON documents
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON appointments
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON whatsapp_messages
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON prescriptions
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

CREATE POLICY hospital_isolation_policy ON reports
    USING (hospital_id = current_setting('app.current_hospital_id', TRUE)::UUID);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION (for projections)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to projection tables
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_notes_updated_at BEFORE UPDATE ON medical_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BI VIEWS (Materialized, refreshed from projections)
-- =====================================================

CREATE MATERIALIZED VIEW bi_patient_summary AS
SELECT 
    p.id,
    p.hospital_id,
    p.mrn,
    p.first_name,
    p.last_name,
    p.date_of_birth,
    EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
    p.gender,
    p.phone,
    p.whatsapp_opted_in,
    p.created_at as registration_date,
    COUNT(DISTINCT v.id) as total_visits,
    MAX(v.visit_date) as last_visit_date,
    MIN(v.visit_date) as first_visit_date,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'no_show') as no_show_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
    SUM(v.billing_amount) as total_billing_amount,
    COUNT(DISTINCT pr.id) as total_prescriptions,
    COUNT(DISTINCT d.id) as total_documents
FROM patients p
LEFT JOIN visits v ON v.patient_id = p.id AND v.deleted_at IS NULL
LEFT JOIN appointments a ON a.patient_id = p.id AND a.deleted_at IS NULL
LEFT JOIN prescriptions pr ON pr.patient_id = p.id AND pr.deleted_at IS NULL
LEFT JOIN documents d ON d.patient_id = p.id AND d.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.hospital_id, p.mrn, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.whatsapp_opted_in, p.created_at;

CREATE UNIQUE INDEX idx_bi_patient_summary_id ON bi_patient_summary(id);
CREATE INDEX idx_bi_patient_summary_hospital ON bi_patient_summary(hospital_id);

CREATE MATERIALIZED VIEW bi_daily_metrics AS
SELECT 
    hospital_id,
    visit_date,
    COUNT(DISTINCT id) as total_visits,
    COUNT(DISTINCT patient_id) as unique_patients,
    COUNT(DISTINCT doctor_id) as active_doctors,
    COUNT(*) FILTER (WHERE visit_type = 'new_patient') as new_patients,
    COUNT(*) FILTER (WHERE visit_type = 'follow_up') as follow_ups,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_visits,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
    AVG(duration_minutes) FILTER (WHERE duration_minutes IS NOT NULL) as avg_duration_minutes,
    SUM(billing_amount) FILTER (WHERE billing_amount IS NOT NULL) as total_revenue
FROM visits
WHERE deleted_at IS NULL
GROUP BY hospital_id, visit_date;

CREATE INDEX idx_bi_daily_metrics_hospital_date ON bi_daily_metrics(hospital_id, visit_date DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get patient timeline from projection
CREATE OR REPLACE FUNCTION get_patient_timeline(
    p_patient_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    event_id UUID,
    event_type TEXT,
    event_timestamp TIMESTAMPTZ,
    title TEXT,
    summary TEXT,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        te.id,
        te.event_type,
        te.event_timestamp,
        te.title,
        te.summary,
        te.metadata
    FROM timeline_events te
    WHERE te.patient_id = p_patient_id
      AND te.deleted_at IS NULL
    ORDER BY te.event_timestamp DESC, te.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Calculate no-show risk score (uses projection data)
CREATE OR REPLACE FUNCTION calculate_no_show_risk(
    p_appointment_id UUID
)
RETURNS TABLE (
    risk_score DECIMAL(3,2),
    risk_category TEXT,
    risk_factors JSONB
) AS $$
DECLARE
    v_score DECIMAL(3,2) := 0.0;
    v_factors JSONB := '[]'::JSONB;
    v_appointment RECORD;
    v_past_no_shows INT;
    v_past_appointments INT;
BEGIN
    -- Get appointment details from projection
    SELECT a.*, p.id as patient_id
    INTO v_appointment
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = p_appointment_id;

    -- Historical no-show rate (from projection)
    SELECT 
        COUNT(*) FILTER (WHERE status = 'no_show'),
        COUNT(*)
    INTO v_past_no_shows, v_past_appointments
    FROM appointments
    WHERE patient_id = v_appointment.patient_id
      AND id != p_appointment_id
      AND deleted_at IS NULL;

    IF v_past_appointments > 0 THEN
        v_score := v_score + (v_past_no_shows::DECIMAL / v_past_appointments) * 0.4;
        v_factors := v_factors || jsonb_build_object(
            'factor', 'historical_no_show_rate',
            'value', ROUND((v_past_no_shows::DECIMAL / v_past_appointments) * 100, 1) || '%',
            'weight', 0.4
        );
    END IF;

    IF v_past_appointments = 0 THEN
        v_score := v_score + 0.2;
        v_factors := v_factors || jsonb_build_object('factor', 'first_time_patient', 'weight', 0.2);
    END IF;

    IF v_appointment.reminder_sent_at IS NULL AND v_appointment.scheduled_at > NOW() THEN
        v_score := v_score + 0.2;
        v_factors := v_factors || jsonb_build_object('factor', 'no_reminder_sent', 'weight', 0.2);
    END IF;

    IF EXTRACT(DOW FROM v_appointment.scheduled_at) = 1 THEN
        v_score := v_score + 0.1;
        v_factors := v_factors || jsonb_build_object('factor', 'monday_appointment', 'weight', 0.1);
    END IF;

    v_score := LEAST(v_score, 1.0);

    RETURN QUERY SELECT
        v_score,
        CASE
            WHEN v_score < 0.3 THEN 'low'
            WHEN v_score < 0.6 THEN 'medium'
            ELSE 'high'
        END,
        v_factors;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SNAPSHOT & REBUILD HELPER FUNCTIONS
-- =====================================================

-- Create a snapshot of an aggregate at current version
CREATE OR REPLACE FUNCTION create_aggregate_snapshot(
    p_aggregate_id UUID,
    p_snapshot_data JSONB
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_current_version INT;
    v_event_number BIGINT;
    v_aggregate_type aggregate_type;
BEGIN
    -- Get current aggregate version and type
    SELECT
        aggregate_version,
        event_number,
        aggregate_type
    INTO v_current_version, v_event_number, v_aggregate_type
    FROM event_store
    WHERE aggregate_id = p_aggregate_id
    ORDER BY aggregate_version DESC
    LIMIT 1;

    IF v_current_version IS NULL THEN
        RAISE EXCEPTION 'Aggregate % not found', p_aggregate_id;
    END IF;

    -- Insert snapshot
    INSERT INTO aggregate_snapshots (
        aggregate_type,
        aggregate_id,
        aggregate_version,
        snapshot_data,
        event_number,
        created_by
    ) VALUES (
        v_aggregate_type,
        p_aggregate_id,
        v_current_version,
        p_snapshot_data,
        v_event_number,
        'system'
    )
    RETURNING snapshot_id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Load aggregate from snapshot + events since snapshot
CREATE OR REPLACE FUNCTION get_aggregate_with_snapshot(
    p_aggregate_id UUID
)
RETURNS TABLE (
    snapshot_data JSONB,
    snapshot_version INT,
    events JSONB -- Array of events since snapshot
) AS $$
DECLARE
    v_snapshot RECORD;
BEGIN
    -- Get latest snapshot
    SELECT
        s.snapshot_data,
        s.aggregate_version,
        s.event_number
    INTO v_snapshot
    FROM aggregate_snapshots s
    WHERE s.aggregate_id = p_aggregate_id
    ORDER BY s.aggregate_version DESC
    LIMIT 1;

    IF v_snapshot.snapshot_data IS NULL THEN
        -- No snapshot exists, return empty
        RETURN QUERY SELECT NULL::JSONB, 0, '[]'::JSONB;
        RETURN;
    END IF;

    -- Return snapshot + events since snapshot
    RETURN QUERY
    SELECT
        v_snapshot.snapshot_data,
        v_snapshot.aggregate_version,
        jsonb_agg(
            jsonb_build_object(
                'event_id', e.event_id,
                'event_type', e.event_type,
                'event_data', e.event_data,
                'aggregate_version', e.aggregate_version,
                'event_timestamp', e.event_timestamp
            ) ORDER BY e.aggregate_version
        )
    FROM event_store e
    WHERE e.aggregate_id = p_aggregate_id
      AND e.aggregate_version > v_snapshot.aggregate_version;
END;
$$ LANGUAGE plpgsql;

-- Reset projection state (for rebuilding)
CREATE OR REPLACE FUNCTION reset_projection(
    p_projection_name TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE projection_state
    SET
        last_processed_event_number = 0,
        last_processed_at = NULL,
        is_rebuilding = TRUE,
        rebuild_started_at = NOW(),
        rebuild_progress_pct = 0,
        error_count = 0,
        last_error = NULL
    WHERE projection_name = p_projection_name;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Projection % not found in projection_state', p_projection_name;
    END IF;

    RAISE NOTICE 'Reset projection: %. Ready for rebuild.', p_projection_name;
END;
$$ LANGUAGE plpgsql;

-- Get events for projection catch-up
CREATE OR REPLACE FUNCTION get_projection_catchup_events(
    p_projection_name TEXT,
    p_batch_size INT DEFAULT 1000
)
RETURNS TABLE (
    event_id UUID,
    event_number BIGINT,
    event_type event_type,
    aggregate_type aggregate_type,
    aggregate_id UUID,
    aggregate_version INT,
    event_data JSONB,
    event_timestamp TIMESTAMPTZ
) AS $$
DECLARE
    v_last_processed BIGINT;
BEGIN
    -- Get last processed event number
    SELECT last_processed_event_number
    INTO v_last_processed
    FROM projection_state
    WHERE projection_name = p_projection_name;

    IF v_last_processed IS NULL THEN
        RAISE EXCEPTION 'Projection % not found', p_projection_name;
    END IF;

    -- Return next batch of events
    RETURN QUERY
    SELECT
        e.event_id,
        e.event_number,
        e.event_type,
        e.aggregate_type,
        e.aggregate_id,
        e.aggregate_version,
        e.event_data,
        e.event_timestamp
    FROM event_store e
    WHERE e.event_number > v_last_processed
    ORDER BY e.event_number ASC
    LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql;

-- Mark events as processed by projection
CREATE OR REPLACE FUNCTION mark_events_processed(
    p_projection_name TEXT,
    p_event_number BIGINT
)
RETURNS void AS $$
BEGIN
    UPDATE projection_state
    SET
        last_processed_event_number = p_event_number,
        last_processed_at = NOW()
    WHERE projection_name = p_projection_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING & DIAGNOSTICS
-- =====================================================

-- Check projection lag
CREATE OR REPLACE FUNCTION check_projection_lag()
RETURNS TABLE (
    projection_name TEXT,
    last_processed_event_number BIGINT,
    latest_event_number BIGINT,
    lag_events BIGINT,
    lag_seconds DECIMAL,
    is_rebuilding BOOLEAN,
    error_count INT
) AS $$
DECLARE
    v_latest_event_number BIGINT;
BEGIN
    -- Get latest event number
    SELECT COALESCE(MAX(event_number), 0)
    INTO v_latest_event_number
    FROM event_store;

    RETURN QUERY
    SELECT
        ps.projection_name,
        ps.last_processed_event_number,
        v_latest_event_number,
        v_latest_event_number - ps.last_processed_event_number AS lag_events,
        EXTRACT(EPOCH FROM (NOW() - ps.last_processed_at))::DECIMAL AS lag_seconds,
        ps.is_rebuilding,
        ps.error_count
    FROM projection_state ps
    ORDER BY lag_events DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS (Data Dictionary)
-- =====================================================

COMMENT ON COLUMN patients.current_version IS 'Aggregate version for optimistic concurrency. Check before issuing commands.';
COMMENT ON COLUMN visits.last_event_id IS 'Last event_store.event_id that updated this projection. For debugging/replay.';

COMMENT ON TABLE timeline_events IS 'PROJECTION: Derived from event_store. Rebuild by replaying patient-related events ordered by event_number.';
COMMENT ON TABLE patients IS 'PROJECTION: Current state derived from patient_* events. Do not write directly.';
COMMENT ON TABLE visits IS 'PROJECTION: Current state derived from visit_* events. Do not write directly.';

COMMENT ON FUNCTION ensure_event_store_partitions() IS 'Creates partitions for next 3 months. Run monthly via cron: SELECT ensure_event_store_partitions();';
COMMENT ON FUNCTION create_aggregate_snapshot(UUID, JSONB) IS 'Create performance snapshot of aggregate state. Recommended for aggregates with >100 events.';
COMMENT ON FUNCTION check_projection_lag() IS 'Monitor projection health. Alert if lag > 1000 events or > 60 seconds.';

-- =====================================================
-- END OF EVENT-SOURCED SCHEMA
-- =====================================================

