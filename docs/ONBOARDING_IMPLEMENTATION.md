# Onboarding Implementation Guide

## Overview
This document describes the technical implementation of the onboarding system for MyMedic.

## Backend Components

### Commands

#### 1. `register-hospital` Command
**File**: `backend/src/commands/register-hospital.ts`

Creates a new hospital/organization aggregate.

**Payload**:
```typescript
{
  name: string;
  license_number?: string;
  license_type?: string;
  provider_type: 'independent_doctor' | 'small_clinic' | 'medium_clinic' | 'large_hospital';
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
  };
  phone?: string;
  email: string;
  timezone?: string;
  subscription_tier?: 'starter' | 'professional' | 'enterprise';
}
```

**Subscription Tiers** (auto-assigned if not provided):
- `independent_doctor` → `starter` (2 users, 100 patients)
- `small_clinic` → `professional` (10 users, 1,000 patients)
- `medium_clinic` / `large_hospital` → `enterprise` (unlimited)

**Event Emitted**: `hospital_created`

#### 2. `create-user` Command
**File**: `backend/src/commands/create-user.ts`

Creates a new user account for a hospital.

**Payload**:
```typescript
{
  hospital_id: string;
  email: string;
  password: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'receptionist' | 'lab_technician';
  phone?: string;
  registration_number?: string;
  specialization?: string;
  department?: string;
  invited_by?: string;
}
```

**Event Emitted**: `user_registered`

### Projection Handlers

#### 1. Hospital Projection Handler
**File**: `backend/src/projections/handlers/hospital-projection.ts`

Handles:
- `hospital_created` - Creates hospital record
- `hospital_settings_updated` - Updates hospital settings

#### 2. User Projection Handler
**File**: `backend/src/projections/handlers/user-projection.ts`

Handles:
- `user_registered` - Creates user record
- `user_updated` - Updates user information
- `user_deactivated` - Deactivates user
- `user_activated` - Activates user

### API Routes

#### Onboarding Routes
**File**: `backend/src/routes/onboarding.ts`

**Endpoints**:
- `POST /onboarding/register-hospital` - Register new hospital (public)
- `POST /onboarding/create-user` - Create user account (public, for onboarding)

These endpoints are **public** (no authentication required) as they're used during initial setup.

## Frontend Components

### Onboarding Page
**File**: `frontend/src/pages/OnboardingPage.tsx`

Multi-step wizard with 5 steps:

1. **Provider Type Selection**
   - Independent Doctor
   - Small Clinic
   - Medium Clinic
   - Large Hospital

2. **Organization Details**
   - Name
   - Email
   - Phone
   - License number/type

3. **Address**
   - Full address with city, state, postal code

4. **Admin Account**
   - Full name
   - Email
   - Password
   - Phone

5. **Final Settings**
   - Timezone selection

**Route**: `/onboarding`

## Database Schema

### Hospitals Table
```sql
CREATE TABLE hospitals (
    id UUID PRIMARY KEY,
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
    ...
);
```

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    ...
);
```

## Onboarding Flow

1. User visits `/onboarding`
2. Completes 5-step wizard
3. Frontend calls `/onboarding/register-hospital`
4. Backend creates hospital aggregate and emits `hospital_created` event
5. Frontend calls `/onboarding/create-user` with hospital_id
6. Backend creates user aggregate and emits `user_registered` event
7. Projection handlers update read models
8. User is redirected to `/login`
9. User logs in with admin credentials

## Dependencies

### Backend
- `bcrypt` - Password hashing
- `@types/bcrypt` - TypeScript types

### Frontend
- `react-hook-form` - Form management
- `react-router-dom` - Routing
- `react-icons` - Icons

## Testing

### Manual Testing Steps

1. **Test Hospital Registration**:
   ```bash
   curl -X POST http://localhost:3000/onboarding/register-hospital \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Hospital",
       "provider_type": "independent_doctor",
       "email": "test@example.com"
     }'
   ```

2. **Test User Creation**:
   ```bash
   curl -X POST http://localhost:3000/onboarding/create-user \
     -H "Content-Type: application/json" \
     -d '{
       "hospital_id": "<hospital_id_from_step_1>",
       "email": "admin@example.com",
       "password": "password123",
       "full_name": "Admin User",
       "role": "admin"
     }'
   ```

3. **Test Frontend Flow**:
   - Navigate to `http://localhost:5173/onboarding`
   - Complete all 5 steps
   - Verify hospital and user are created
   - Log in with admin credentials

## Next Steps

1. **Email Verification**: Add email verification for hospital registration
2. **Invitation System**: Build team member invitation flow
3. **Onboarding Progress Tracking**: Track onboarding completion status
4. **Data Import**: Add CSV/Excel import for existing patient data
5. **Training Resources**: Integrate training materials into onboarding
6. **Welcome Dashboard**: Create post-onboarding welcome screen with checklist

## Security Considerations

1. **Rate Limiting**: Onboarding endpoints should have rate limiting
2. **Email Validation**: Verify email addresses before account creation
3. **Password Strength**: Enforce strong password requirements
4. **License Verification**: Optional verification of medical licenses
5. **Audit Trail**: All onboarding actions are logged via event sourcing

## Error Handling

- Validation errors are returned with specific field errors
- Database constraint violations are caught and returned as user-friendly errors
- Network errors are handled gracefully in the frontend
- Failed steps can be retried

