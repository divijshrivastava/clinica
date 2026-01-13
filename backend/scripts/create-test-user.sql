-- Create Test Hospital and User for Development
-- Run this script to set up a test account

-- Generate UUIDs for test data
DO $$
DECLARE
    test_hospital_id UUID := '00000000-0000-0000-0000-000000000001';
    test_user_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
    -- Insert test hospital if it doesn't exist
    INSERT INTO hospitals (
        id,
        current_version,
        name,
        license_number,
        license_type,
        email,
        phone,
        timezone,
        subscription_tier,
        is_active,
        settings,
        created_at,
        updated_at
    ) VALUES (
        test_hospital_id,
        1,
        'Test Medical Center',
        'TEST-12345',
        'Medical License',
        'admin@testmedical.com',
        '+1234567890',
        'America/New_York',
        'starter',
        true,
        '{"whatsapp_enabled": false}'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert test user if it doesn't exist
    -- Password: password123 (bcrypt hash)
    INSERT INTO users (
        id,
        current_version,
        hospital_id,
        email,
        phone,
        password_hash,
        role,
        full_name,
        registration_number,
        specialization,
        department,
        is_active,
        settings,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        1,
        test_hospital_id,
        'test.doctor@example.com',
        '+1234567890',
        '$2b$10$rKvVPZqGvVZv3qVZvVZvVeJ3YqVZvVZvVZvVZvVZvVZvVZvVZvVZu', -- password123
        'doctor',
        'Dr. Test User',
        'DOC-001',
        'General Practice',
        'General Medicine',
        true,
        '{}'::jsonb,
        NOW(),
        NOW()
    )
    ON CONFLICT (hospital_id, email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

    RAISE NOTICE 'Test user created successfully!';
    RAISE NOTICE 'Email: test.doctor@example.com';
    RAISE NOTICE 'Password: password123';
    RAISE NOTICE 'Hospital ID: %', test_hospital_id;
    RAISE NOTICE 'User ID: %', test_user_id;
END $$;
