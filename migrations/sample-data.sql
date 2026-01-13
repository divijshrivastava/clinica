-- Sample data for testing doctor scheduling system

-- Get the hospital_id from existing data
DO $$
DECLARE
    v_hospital_id UUID;
    v_admin_user_id UUID;
    v_location_id UUID;
    v_dept_id UUID;
BEGIN
    -- Get existing hospital and admin user
    SELECT id INTO v_hospital_id FROM hospitals LIMIT 1;
    SELECT id INTO v_admin_user_id FROM users WHERE role = 'admin' LIMIT 1;

    -- Create sample departments if they don't exist
    INSERT INTO departments (id, hospital_id, code, name, description, is_active)
    VALUES 
        (uuid_generate_v4(), v_hospital_id, 'CARDIO', 'Cardiology', 'Heart and cardiovascular care', true),
        (uuid_generate_v4(), v_hospital_id, 'ORTHO', 'Orthopedics', 'Bone and joint care', true),
        (uuid_generate_v4(), v_hospital_id, 'PEDIA', 'Pediatrics', 'Child healthcare', true),
        (uuid_generate_v4(), v_hospital_id, 'GENERAL', 'General Medicine', 'General healthcare services', true)
    ON CONFLICT (hospital_id, code) DO NOTHING;

    -- Create sample locations if they don't exist
    INSERT INTO locations (id, hospital_id, code, name, address, phone, is_primary, is_active, timezone)
    VALUES 
        (uuid_generate_v4(), v_hospital_id, 'MAIN', 'Main Hospital', 
         '{"street": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "zip": "400001"}'::jsonb,
         '+91-22-12345678', true, true, 'Asia/Kolkata'),
        (uuid_generate_v4(), v_hospital_id, 'BRANCH1', 'Branch Clinic - Andheri', 
         '{"street": "456 Andheri West", "city": "Mumbai", "state": "Maharashtra", "zip": "400053"}'::jsonb,
         '+91-22-87654321', false, true, 'Asia/Kolkata')
    ON CONFLICT (hospital_id, code) DO NOTHING;

    RAISE NOTICE 'Sample data created successfully';
END $$;
