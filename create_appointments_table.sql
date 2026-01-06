-- Create appointments table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS appointments (
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
    deleted_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (drop first if exists)
DROP POLICY IF EXISTS hospital_isolation_policy ON appointments;
CREATE POLICY hospital_isolation_policy ON appointments
    FOR ALL
    USING (hospital_id = current_setting('app.current_hospital_id', true)::UUID);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointments_updated_at();

