# Troubleshooting Guide - MyMedic Doctor Scheduling

## Common Issues and Solutions

### 1. "Failed to load doctors" Error in Frontend

**Symptoms:**
- Frontend shows "An unexpected error occurred"
- Network tab shows 401 Unauthorized or connection errors
- Doctor Profiles page shows no data

**Causes and Solutions:**

#### A. Database Tables Not Created
**Error:** `relation "doctor_profiles" does not exist`

**Solution:**
```bash
# Run the migrations to create all required tables
cd /Users/divij/code/ai/medico-manager

# Create prerequisite tables (departments, locations)
psql -h localhost -U divij -d mymedic_dev -f migrations/prerequisite-tables.sql

# Create doctor scheduling tables
psql -h localhost -U divij -d mymedic_dev -f migrations/doctor-scheduling-tables.sql

# Add sample data (optional but recommended)
psql -h localhost -U divij -d mymedic_dev -f migrations/sample-data.sql
```

#### B. User Not Logged In
**Error:** 401 Unauthorized

**Solution:**
1. Open the frontend at http://localhost:5173
2. Navigate to the Login page
3. Use one of these test credentials:
   - Email: `divij.shrivastava@gmail.com` (admin)
   - Email: `test.doctor@example.com` (doctor)
4. If you don't know the password, generate a test token:

```bash
# Generate a test token for admin user
curl -X POST http://localhost:3000/auth/generate-test-token \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "d9896cf6-1711-46bf-a3a8-9abaa51a4364",
    "hospital_id": "9c034596-3f7e-4538-87ee-b9ac271aa34c",
    "role": "admin",
    "email": "divij.shrivastava@gmail.com"
  }'
```

Then use the returned token in the browser console:
```javascript
// In browser console
localStorage.setItem('mymedic-auth', JSON.stringify({
  state: {
    token: "YOUR_TOKEN_HERE",
    user: {
      user_id: "d9896cf6-1711-46bf-a3a8-9abaa51a4364",
      hospital_id: "9c034596-3f7e-4538-87ee-b9ac271aa34c",
      role: "admin",
      email: "divij.shrivastava@gmail.com"
    },
    isAuthenticated: true,
    _hasHydrated: true
  },
  version: 0
}));
// Refresh the page
location.reload();
```

#### C. Backend Not Running
**Error:** Failed to connect to localhost:3000

**Solution:**
```bash
# Check if backend is running
curl http://localhost:3000/health

# If not running, start the services
cd /Users/divij/code/ai/medico-manager
./dev.sh
```

### 2. Backend Crashes on Startup

**Symptoms:**
- Backend logs show TypeScript errors
- Server fails to start
- Port 3000 is not responding

**Common Errors and Solutions:**

#### A. TypeScript Compilation Errors
**Error:** `Property 'execute' does not exist on type 'CommandBus'`

**Solution:** The method is `handle`, not `execute`. This has been fixed in the codebase.

#### B. Missing Event Store Method
**Error:** `Property 'getEvents' does not exist on type 'EventStore'`

**Solution:** The method is `getAggregateEvents`, not `getEvents`. This has been fixed in the codebase.

#### C. Database Connection Issues
**Error:** `connection to server at "localhost", port 5432 failed`

**Solution:**
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running, start PostgreSQL
# macOS (Homebrew):
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql
```

### 3. No Doctors Showing Up (After Login)

**Symptoms:**
- Successfully logged in
- API returns empty array: `{"data": [], "pagination": {...}}`
- No errors in console

**Cause:** No doctor profiles have been created yet.

**Solution:**
Create a doctor profile using the API:

```bash
# Get a token first
TOKEN=$(curl -s -X POST http://localhost:3000/auth/generate-test-token \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "d9896cf6-1711-46bf-a3a8-9abaa51a4364",
    "hospital_id": "9c034596-3f7e-4538-87ee-b9ac271aa34c",
    "role": "admin",
    "email": "divij.shrivastava@gmail.com"
  }' | jq -r '.token')

# Create a doctor profile
curl -X POST http://localhost:3000/doctor-profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000002",
    "displayName": "Dr. Test User",
    "salutation": "Dr.",
    "bio": "Experienced cardiologist with 10 years of practice",
    "specialties": ["Cardiology"],
    "qualifications": [
      {"degree": "MBBS", "institution": "Medical College", "year": 2010},
      {"degree": "MD", "institution": "Cardiology Institute", "year": 2014}
    ],
    "languages": ["English", "Hindi"],
    "consultationModes": ["in_person", "tele_consultation"],
    "registrationNumber": "MCI-12345",
    "licenseNumber": "LIC-67890",
    "yearsOfExperience": 10
  }'
```

Or use the "Add Doctor" button in the frontend after logging in.

### 4. Appointment Slots Not Showing

**Symptoms:**
- Doctor profiles exist
- Slot Availability page shows no slots

**Cause:** No schedules have been configured for the doctor.

**Solution:**
1. Navigate to Doctor Profiles page
2. Click on a doctor's profile
3. Click "Edit Schedule"
4. Add base schedules (e.g., Monday-Friday, 9 AM - 5 PM)
5. Slots will be automatically generated based on the schedule

### 5. Port Already in Use

**Symptoms:**
- `./dev.sh` shows "Port 3000 (backend) is already in use"
- Or "Port 5173 (frontend) is already in use"

**Solution:**
The script will prompt you to kill existing processes. Type `y` to proceed.

Or manually kill the processes:
```bash
# Kill backend
lsof -ti:3000 | xargs kill -9

# Kill frontend
lsof -ti:5173 | xargs kill -9

# Then restart
./dev.sh
```

## Verification Steps

After applying fixes, verify the system is working:

### 1. Check Backend Health
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","service":"mymedic-backend"}
```

### 2. Check Database Tables
```bash
psql -h localhost -U divij -d mymedic_dev -c "\dt doctor_profiles"
# Should show the table structure
```

### 3. Check API with Authentication
```bash
# Generate token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/generate-test-token \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "d9896cf6-1711-46bf-a3a8-9abaa51a4364",
    "hospital_id": "9c034596-3f7e-4538-87ee-b9ac271aa34c",
    "role": "admin",
    "email": "divij.shrivastava@gmail.com"
  }' | jq -r '.token')

# Test doctor-profiles endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/doctor-profiles?limit=20&offset=0" | jq .
```

### 4. Check Frontend
1. Open http://localhost:5173
2. Login with test credentials
3. Navigate to "Doctors" in the sidebar
4. Should see the doctor profiles page (may be empty if no doctors created yet)

## Getting Help

If you're still experiencing issues:

1. Check the logs:
   ```bash
   # Backend logs
   tail -f logs/backend.log
   
   # Frontend logs
   tail -f logs/frontend.log
   ```

2. Check for TypeScript compilation errors:
   ```bash
   cd backend
   npm run build
   ```

3. Verify all dependencies are installed:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Known Limitations

1. **Authentication:** The system requires login before accessing any doctor scheduling features. This is by design for security.

2. **Empty State:** If no doctors have been created, the system will show an empty state with an "Add Doctor" button. This is expected behavior.

3. **Slot Generation:** Appointment slots are generated based on doctor schedules. If no schedule exists, no slots will be available.

4. **Test Token Endpoint:** The `/auth/generate-test-token` endpoint should be disabled in production environments.
