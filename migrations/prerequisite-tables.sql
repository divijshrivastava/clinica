-- Prerequisite tables for doctor scheduling system

-- =====================================================
-- DEPARTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_doctor_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(hospital_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_hospital ON departments(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(hospital_id, is_active) WHERE is_active = TRUE AND deleted_at IS NULL;

-- =====================================================
-- LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY,
    current_version INT NOT NULL DEFAULT 0,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address JSONB,
    phone TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_event_id UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(hospital_id, code)
);

CREATE INDEX IF NOT EXISTS idx_locations_hospital ON locations(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(hospital_id, is_active) WHERE is_active = TRUE AND deleted_at IS NULL;
