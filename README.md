# MyMedic - Doctor-First Patient Management Platform

<div align="center">

![MyMedic](https://img.shields.io/badge/MyMedic-v1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-blue)

**A modern, event-sourced patient management system designed for clinics and hospitals**

[Features](#features) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Documentation](#documentation) • [API Reference](#api-reference)

</div>

---

## Overview

MyMedic is a comprehensive patient management platform built with event sourcing and CQRS architecture. It provides healthcare providers with a robust, scalable solution for managing patients, appointments, medical records, prescriptions, and clinical workflows.

### Why MyMedic?

- **Event-Sourced Architecture**: Complete audit trail of all medical data changes
- **Multi-Tenant**: Support for independent doctors, clinics, and hospitals
- **Real-Time Updates**: Live data synchronization across all connected clients
- **Offline-First**: Designed for resilience and eventual consistency
- **Doctor-Centric**: Streamlined workflows optimized for clinical practice
- **Compliance Ready**: Built with HIPAA compliance considerations

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Functionality

#### Patient Management
- **Patient Registration**: Complete demographic and contact information
- **Medical History**: Comprehensive health records and visit history
- **Document Management**: Upload and categorize medical documents
- **Patient Search**: Fast, fuzzy search across patient records
- **Consent Management**: Track patient consents for data sharing

#### Appointment System
- **Scheduling**: Flexible appointment booking with conflict detection
- **Reminders**: Automated WhatsApp/email appointment reminders
- **Calendar View**: Visual calendar with appointment management
- **Visit Types**: Support for consultations, follow-ups, emergencies, etc.
- **No-Show Tracking**: Record and analyze patient attendance

#### Clinical Workflow
- **Visit Management**: Track patient visits from check-in to completion
- **Medical Notes**: Create, edit, and sign clinical notes
- **Prescriptions**: Digital prescription management with e-signatures
- **Vitals Recording**: Track patient vital signs over time
- **Diagnosis & Treatment Plans**: Structured clinical documentation

#### Multi-Tenant Support
- **Hospital Management**: Support for independent doctors, clinics, and hospitals
- **Team Collaboration**: Role-based access control (Admin, Doctor, Nurse, Receptionist)
- **Multi-Location**: Manage multiple clinic locations
- **Custom Workflows**: Configurable settings per organization

#### Communication
- **WhatsApp Integration**: Send appointment reminders and notifications
- **Patient Portal**: Secure patient access to their records
- **Team Notifications**: Internal messaging and alerts

### Technical Features

- **Event Sourcing**: Immutable event log with complete audit trail
- **CQRS**: Separate read and write models for optimal performance
- **Real-Time Projections**: Materialized views updated from event stream
- **Optimistic Concurrency**: Prevent lost updates with version checking
- **Idempotency**: Safe retry logic for all operations
- **Partitioned Storage**: Month-based event store partitioning for scalability
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API throttling for security
- **Comprehensive Logging**: Structured logging with Winston

---

## Architecture

MyMedic follows a modern event-sourced CQRS architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  - React Router for navigation                              │
│  - Zustand for state management                             │
│  - TailwindCSS for styling                                  │
│  - React Hook Form for forms                                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Express)                       │
│  - JWT Authentication                                        │
│  - Rate Limiting                                             │
│  - Request Validation                                        │
│  - Error Handling                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
┌──────────────┐          ┌────────────────┐
│   Commands   │          │    Queries     │
│  (Write Side)│          │  (Read Side)   │
└──────┬───────┘          └────────┬───────┘
       │                           │
       ▼                           │
┌──────────────┐                   │
│ Event Store  │                   │
│  (Append-Only│                   │
│   Immutable) │                   │
└──────┬───────┘                   │
       │                           │
       │ Events                    │
       ▼                           │
┌──────────────┐                   │
│  Projections │◄──────────────────┘
│  (Read Models)
│  - Patients
│  - Visits
│  - Appointments
│  - etc.
└──────────────┘
       │
       ▼
┌──────────────┐
│  PostgreSQL  │
│   Database   │
└──────────────┘
```

### Key Architectural Patterns

1. **Event Sourcing**
   - All state changes are stored as immutable events
   - Current state derived by replaying events
   - Complete audit trail built-in
   - Time travel debugging possible

2. **CQRS (Command Query Responsibility Segregation)**
   - Commands: Validate and emit events
   - Queries: Read from optimized projections
   - Separate models for reading and writing

3. **Projections**
   - Materialized views built from event stream
   - Optimized for read queries
   - Can be rebuilt from events at any time
   - Support for multiple projections from same events

4. **Optimistic Concurrency**
   - Version-based conflict detection
   - Prevents lost updates in concurrent scenarios
   - Graceful conflict resolution

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Logging**: Winston
- **Validation**: AJV (JSON Schema)
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Styling**: TailwindCSS
- **Icons**: React Icons (Feather Icons, Bootstrap Icons)
- **HTTP Client**: Axios
- **Notifications**: React Toastify
- **Date Handling**: date-fns

### Database Features
- **Extensions**: uuid-ossp, pgcrypto, pg_trgm, btree_gist
- **Partitioning**: Monthly partitions for event store
- **Indexes**: Optimized for common query patterns
- **Full-Text Search**: PostgreSQL text search for patients

---

## Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **PostgreSQL** 15 or higher
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medico-manager
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up the database**
   ```bash
   # Create database
   createdb clinica_dev

   # Run schema migration
   psql -d clinica_dev -f ../schema.sql
   ```

5. **Configure environment variables**

   Create `.env` file in the `backend` directory:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   LOG_LEVEL=debug

   # Database Configuration
   DATABASE_URL=postgresql://username@localhost:5432/clinica_dev
   DATABASE_POOL_MIN=10
   DATABASE_POOL_MAX=50
   DATABASE_IDLE_TIMEOUT=30000

   # Security
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h

   # Event Sourcing
   SNAPSHOT_FREQUENCY=100
   PROJECTION_BATCH_SIZE=1000

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=100

   # Monitoring
   ENABLE_METRICS=false
   METRICS_PORT=9090
   ```

6. **Start the development servers**

   In one terminal (backend):
   ```bash
   cd backend
   npm run dev
   ```

   In another terminal (frontend):
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### First Login

Use the test credentials:
- **Email**: `test.doctor@example.com`
- **Password**: `password123`

---

## Project Structure

```
medico-manager/
├── backend/                    # Backend server
│   ├── src/
│   │   ├── commands/          # Command handlers (write side)
│   │   │   ├── create-user.ts
│   │   │   ├── register-hospital.ts
│   │   │   ├── register-patient.ts
│   │   │   └── ...
│   │   ├── config/            # Configuration files
│   │   │   └── index.ts
│   │   ├── database/          # Database connection pool
│   │   │   └── pool.ts
│   │   ├── event-sourcing/    # Event sourcing infrastructure
│   │   │   ├── event-store.ts
│   │   │   ├── types.ts
│   │   │   └── validators.ts
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── error-handler.ts
│   │   │   └── rate-limiter.ts
│   │   ├── projections/       # Read model projections
│   │   │   └── handlers/
│   │   │       ├── patient-projection.ts
│   │   │       ├── user-projection.ts
│   │   │       ├── hospital-projection.ts
│   │   │       └── ...
│   │   ├── routes/            # API routes
│   │   │   ├── auth.ts
│   │   │   ├── patients.ts
│   │   │   ├── appointments.ts
│   │   │   ├── visits.ts
│   │   │   ├── prescriptions.ts
│   │   │   └── ...
│   │   ├── utils/             # Utility functions
│   │   │   └── logger.ts
│   │   └── index.ts           # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/               # API client functions
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   └── ...
│   │   ├── components/        # Reusable components
│   │   │   ├── Layout.tsx
│   │   │   └── SearchablePatientSelect.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── useAuthHydration.ts
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   ├── AppointmentsPage.tsx
│   │   │   ├── VisitsPage.tsx
│   │   │   ├── onboarding/
│   │   │   │   ├── ClinicOnboarding.tsx
│   │   │   │   ├── DoctorOnboarding.tsx
│   │   │   │   └── HospitalOnboarding.tsx
│   │   │   └── ...
│   │   ├── services/          # Business logic services
│   │   │   └── api.ts
│   │   ├── store/             # Zustand state management
│   │   │   └── authStore.ts
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # Application entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docs/                       # Documentation
│   ├── ONBOARDING_IMPLEMENTATION.md
│   ├── ONBOARDING_PRODUCT_SPEC.md
│   └── ONBOARDING_STRATEGY.md
│
├── schema.sql                  # Database schema
└── README.md                   # This file
```

---

## Database Schema

### Core Tables

#### Event Store
```sql
event_store (partitioned by month)
  - event_id (UUID, PK)
  - aggregate_type (enum)
  - aggregate_id (UUID)
  - event_type (enum)
  - event_data (JSONB)
  - metadata (JSONB)
  - version (integer)
  - hospital_id (UUID)
  - user_id (UUID)
  - timestamp (timestamptz)
```

#### Projections (Read Models)
- **hospitals**: Organization details and settings
- **users**: User accounts and authentication
- **patients**: Patient demographics and records
- **visits**: Patient visit records
- **appointments**: Scheduled appointments
- **prescriptions**: Medication prescriptions
- **medical_notes**: Clinical notes and documentation
- **documents**: Uploaded documents and files
- **whatsapp_messages**: Communication logs

#### Supporting Tables
- **projection_checkpoints**: Track projection processing
- **projection_state**: Projection status and metadata
- **projection_errors**: Error logging for projections
- **idempotency_keys**: Prevent duplicate operations
- **aggregate_snapshots**: Performance optimization

### Key Features

1. **Partitioning**: Event store partitioned monthly for performance
2. **Indexes**: Optimized for common query patterns
3. **Full-Text Search**: `pg_trgm` for fuzzy patient search
4. **Multi-Tenancy**: Hospital ID on all relevant tables
5. **Soft Deletes**: Track deletions without data loss

---

## API Reference

### Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "password123"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "uuid",
    "hospital_id": "uuid",
    "email": "doctor@example.com",
    "full_name": "Dr. John Smith",
    "role": "doctor"
  }
}
```

### Patients

#### Register Patient
```http
POST /commands/register-patient
Authorization: Bearer <token>
Content-Type: application/json

{
  "payload": {
    "mrn": "MRN-2026-000001",
    "full_name": "John Doe",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "phone": "+1234567890",
    "email": "john.doe@example.com",
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001"
    }
  }
}

Response: 200 OK
{
  "success": true,
  "aggregate_id": "uuid",
  "version": 1
}
```

#### List Patients
```http
GET /patients?limit=20&offset=0
Authorization: Bearer <token>

Response: 200 OK
{
  "patients": [
    {
      "id": "uuid",
      "mrn": "MRN-2026-000001",
      "full_name": "John Doe",
      "date_of_birth": "1990-01-15",
      "gender": "male",
      "phone": "+1234567890",
      "email": "john.doe@example.com",
      "created_at": "2026-01-09T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### Search Patients
```http
GET /patients/search?q=john
Authorization: Bearer <token>

Response: 200 OK
{
  "results": [
    {
      "id": "uuid",
      "mrn": "MRN-2026-000001",
      "full_name": "John Doe",
      "phone": "+1234567890"
    }
  ]
}
```

### Appointments

#### Schedule Appointment
```http
POST /commands/schedule-appointment
Authorization: Bearer <token>
Content-Type: application/json

{
  "payload": {
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "appointment_datetime": "2026-01-10T14:00:00Z",
    "duration_minutes": 30,
    "visit_type": "consultation",
    "reason": "Annual checkup"
  }
}

Response: 200 OK
{
  "success": true,
  "aggregate_id": "uuid",
  "version": 1
}
```

#### List Appointments
```http
GET /appointments?date=2026-01-10
Authorization: Bearer <token>

Response: 200 OK
{
  "appointments": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "patient_name": "John Doe",
      "doctor_id": "uuid",
      "doctor_name": "Dr. Smith",
      "appointment_datetime": "2026-01-10T14:00:00Z",
      "duration_minutes": 30,
      "visit_type": "consultation",
      "status": "scheduled"
    }
  ]
}
```

### Prescriptions

#### Issue Prescription
```http
POST /commands/issue-prescription
Authorization: Bearer <token>
Content-Type: application/json

{
  "payload": {
    "patient_id": "uuid",
    "visit_id": "uuid",
    "medications": [
      {
        "name": "Amoxicillin",
        "dosage": "500mg",
        "frequency": "Three times daily",
        "duration": "7 days",
        "quantity": 21,
        "instructions": "Take with food"
      }
    ],
    "diagnosis": "Bacterial infection"
  }
}
```

### Health Check
```http
GET /health

Response: 200 OK
{
  "status": "healthy",
  "timestamp": "2026-01-09T10:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

For complete API documentation, see the individual route files in `backend/src/routes/`.

---

## Development

### Running in Development Mode

1. **Backend with hot reload**
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend with Vite HMR**
   ```bash
   cd frontend
   npm run dev
   ```

### Database Management

**Run migrations**
```bash
cd backend
npm run db:migrate
```

**Seed test data**
```bash
cd backend
npm run db:seed
```

**Rebuild projections**
```bash
cd backend
npm run rebuild-projection
```

**Check projection lag**
```bash
cd backend
npm run check-projection-lag
```

**Create snapshots**
```bash
cd backend
npm run create-snapshots
```

### Code Quality

**Lint backend code**
```bash
cd backend
npm run lint
```

**Format code**
```bash
cd backend
npm run format
```

**Lint frontend code**
```bash
cd frontend
npm run lint
```

### Debugging

1. **Enable debug logging**
   Set `LOG_LEVEL=debug` in `.env`

2. **View backend logs**
   Logs include request ID, duration, and structured data

3. **Check projection errors**
   ```sql
   SELECT * FROM projection_errors ORDER BY created_at DESC LIMIT 10;
   ```

4. **View event stream**
   ```sql
   SELECT * FROM event_store
   WHERE aggregate_id = 'your-aggregate-id'
   ORDER BY version ASC;
   ```

---

## Testing

### Backend Tests
```bash
cd backend
npm test                # Run all tests
npm run test:watch      # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Manual Testing

Use the test credentials:
- Email: `test.doctor@example.com`
- Password: `password123`

---

## Deployment

### Production Build

**Backend**
```bash
cd backend
npm run build
npm start
```

**Frontend**
```bash
cd frontend
npm run build
npm run preview  # Preview production build
```

### Environment Variables (Production)

Ensure these are set in production:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=<strong-random-secret>
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Database Setup (Production)

1. Create production database
2. Run schema migration
3. Set up automated backups
4. Configure connection pooling
5. Enable SSL connections

### Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting
- [ ] Enable security headers (Helmet)
- [ ] Regular security audits
- [ ] Database backup strategy
- [ ] Monitor for suspicious activity

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation
- Follow existing code style

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Support

For questions, issues, or feature requests:

- **Email**: support@mymedic.com
- **Issues**: GitHub Issues
- **Documentation**: `/docs` folder

---

## Acknowledgments

- Event Sourcing patterns inspired by Martin Fowler and Greg Young
- Built with modern web technologies
- Designed for healthcare professionals

---

**Made with ❤️ for healthcare providers**
