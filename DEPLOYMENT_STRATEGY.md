# MyMedic Deployment Strategy
**Healthcare SaaS Platform - Cloud Architecture & Scaling Roadmap**

---

## Executive Summary

MyMedic is an event-sourced healthcare platform designed for three distinct market segments in India. The deployment strategy prioritizes **progressive enhancement** - starting with near-zero infrastructure costs for solo practitioners while maintaining architectural compatibility for enterprise hospitals requiring on-premise deployment, HL7/FHIR integrations, and audit compliance.

**Core Architectural Principles:**
- Event sourcing enables complete audit trails without additional compliance infrastructure
- Multi-tenant from day one, isolated at database row-level via `hospital_id`
- PostgreSQL-first approach avoids vendor lock-in and enables on-premise deployment
- Service boundaries designed for future extraction, not immediate microservices
- Storage layer abstraction allows migration from S3-compatible → hospital NAS without code changes

**Key Differentiators:**
- **Phase 1 (MVP)**: $0-10/month using free tiers, targets solo doctors and 2-3 doctor clinics
- **Phase 2 (Chains)**: $50-300/month, adds multi-location routing and chain-level analytics
- **Phase 3 (Hospitals)**: $300-2000+/month, supports on-prem/hybrid, ADT integration, and procurement requirements

**Migration Path:** Each phase is an infrastructure upgrade, not a rewrite. Event store compatibility and projection rebuild capabilities ensure zero data loss during transitions.

---

## Phase Comparison Table

| Capability | Phase 1: MVP | Phase 2: Chains | Phase 3: Hospitals |
|-----------|--------------|-----------------|-------------------|
| **Target Customers** | Solo doctors, 2-5 person clinics | Multi-location specialty chains (5-50 locations) | 100+ bed hospitals, medical colleges |
| **Patient Volume** | 50-500 patients | 5K-50K patients | 50K-500K+ patients |
| **Concurrent Users** | 1-5 | 10-100 | 50-1000 |
| **Deployment Model** | Shared SaaS | Shared SaaS + isolated DB option | Hybrid cloud or on-premise |
| **Database** | Supabase Free (500MB) | Supabase Pro or Railway | Self-hosted Postgres cluster or RDS |
| **File Storage** | Supabase Storage (1GB) | R2/B2 (50GB-500GB) | MinIO on-prem or S3-compatible |
| **Backend Hosting** | Fly.io free tier | Fly.io paid (2-4 instances) | Kubernetes on-prem or ECS |
| **Frontend** | Vercel free tier | Vercel Pro or Cloudflare Pages | Self-hosted or Vercel Enterprise |
| **Realtime** | Supabase Realtime (polling fallback) | Supabase Realtime or self-hosted | Redis Pub/Sub or NATS |
| **Queue/Workers** | In-process or pg_notify | BullMQ + Redis | Kafka or RabbitMQ |
| **Monitoring** | Built-in platform tools | Better Stack or Sentry | Prometheus + Grafana + ELK |
| **Backup** | Platform automatic (Supabase) | Platform + S3 exports | PITR + multi-region replication |
| **Compliance** | None (trust-based) | SOC2 attestation | HIPAA-ready, on-prem audit trails |
| **Integrations** | None | WhatsApp API, payment gateways | HL7, FHIR, ADT, PACS, HIS |
| **Cost (Monthly)** | $0-10 | $50-300 | $300-2000+ |

---

## Phase 1: MVP Deployment Architecture

### Target: Solo Doctors & Small Clinics
**Goal:** Launch with zero infrastructure cost, scale to 500 patients and 5 concurrent users before paying.

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Phase 1: MVP Stack                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Doctors    │ ──HTTPS──> Vercel Edge Network (Free Tier)
│   Browser    │            ├─ React SPA (SSG)
└──────────────┘            ├─ Geo-routed CDN
                            └─ Auto SSL

                 ↓ API Calls

┌──────────────────────────────────────────┐
│  Fly.io Free Tier (256MB RAM, 1 region) │
│  ├─ Node.js/Express backend              │
│  ├─ Event sourcing command handlers      │
│  ├─ Projection updaters (in-process)     │
│  └─ JWT authentication                   │
└──────────────────────────────────────────┘

                 ↓

┌──────────────────────────────────────────┐
│  Supabase Free Tier                      │
│  ├─ PostgreSQL 15 (500MB storage)        │
│  │  ├─ event_store (partitioned)         │
│  │  ├─ projections (patients, visits)    │
│  │  └─ Row-level security enabled        │
│  ├─ Realtime (WebSocket, 200 connections)│
│  ├─ Storage (1GB for documents/images)   │
│  └─ Automatic backups (7 days)           │
└──────────────────────────────────────────┘

                 ↓ (Future: WhatsApp)

┌──────────────────────────────────────────┐
│  External Services (Optional)            │
│  ├─ Twilio/MSG91 (WhatsApp - pay-as-go) │
│  ├─ Cloudflare Email Routing (Free)      │
│  └─ Better Uptime (Free monitoring)      │
└──────────────────────────────────────────┘
```

### Detailed Component Specifications

#### Frontend: Vercel Free Tier
- **Hosting:** 100GB bandwidth/month (sufficient for 500-1000 users)
- **Deployments:** Git-based, automatic SSL, global CDN
- **Build:** Vite SPA, static asset optimization
- **Environment:** `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Cost:** $0/month (Free tier covers up to ~2K monthly users)

#### Backend: Fly.io Free Tier
- **Tier:** 3 shared-cpu-1x VMs @ 256MB RAM (free)
- **Region:** Single region (choose closest to target market, e.g., Mumbai/Singapore)
- **Auto-scaling:** Disabled (single instance)
- **Features:**
  - Built-in health checks
  - Zero-downtime deploys (even on free tier)
  - Private networking (for future service extraction)

**Limits:**
- 160GB outbound transfer/month
- 3GB persistent volume (not needed - stateless backend)

**Cost:** $0/month (within free tier)

#### Database: Supabase Free Tier
- **Postgres Version:** 15.x (same as production schema)
- **Storage:** 500MB database + 1GB file storage
- **Connections:** 50 direct, 200 via pgBouncer
- **Backups:** Daily automatic, 7-day retention
- **Extensions:** uuid-ossp, pgcrypto, pg_trgm (all supported)

**Configuration:**
```sql
-- Enable at Supabase project creation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Row-level security policies
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;
-- Apply hospital_id isolation policies from schema.sql
```

**Partition Management:**
- Event store partitions created manually via Supabase SQL Editor
- Monthly cron: Use Supabase Edge Functions (free) to call `ensure_event_store_partitions()`

**Cost:** $0/month (Free tier sufficient for <500 patients, <10K events/month)

#### Realtime: Supabase Realtime
- **Technology:** WebSocket subscriptions via Supabase client
- **Use Cases:**
  - Appointment calendar live updates
  - Visit status changes (waiting → in-progress → completed)
  - Notification toasts

**Implementation:**
```typescript
// Frontend: Subscribe to appointment changes
const subscription = supabase
  .channel('appointments')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'appointments',
    filter: `hospital_id=eq.${hospitalId}`
  }, (payload) => {
    // Update local state
  })
  .subscribe()
```

**Fallback:** If realtime quota exceeded (200 concurrent), degrade to 30-second polling.

**Cost:** $0/month (200 concurrent connections sufficient for Phase 1)

#### File Storage: Supabase Storage
- **Capacity:** 1GB (free tier)
- **Use Cases:**
  - Patient profile photos (50KB each → 20K photos)
  - Document scans (500KB each → 2K documents)
  - Prescription images (200KB each → 5K prescriptions)

**Storage Structure:**
```
mymedic-bucket/
├── hospitals/{hospital_id}/
│   ├── patients/{patient_id}/
│   │   ├── profile.jpg
│   │   ├── documents/{document_id}.pdf
│   │   └── prescriptions/{prescription_id}.jpg
│   └── templates/{template_id}.json
```

**Security:** Row-level security policies enforce `hospital_id` isolation.

**Cost:** $0/month (1GB sufficient for 100-200 patients with documents)

**Upgrade Trigger:** When storage exceeds 800MB, migrate to Cloudflare R2 or Backblaze B2.

#### Authentication: JWT (Self-Managed)
- **Strategy:** JWT tokens issued by backend, stored in httpOnly cookies
- **Why not Supabase Auth:** Avoid vendor lock-in, support custom user roles (doctor, nurse, admin, receptionist)
- **Session Management:** 24-hour tokens, refresh on API calls
- **Password Hashing:** bcrypt (already in codebase)

#### Background Jobs: In-Process (Phase 1 Only)
- **Implementation:** `setInterval` for periodic tasks
- **Tasks:**
  - Appointment reminder checks (every 15 minutes)
  - Projection lag monitoring (every 5 minutes)
  - Partition creation (daily)

**Why Not BullMQ Yet:**
- Adds Redis dependency ($5/month minimum)
- Overkill for <10 hospitals with <20 appointments/day each
- pg_notify can handle async event projection if needed

**Upgrade Trigger:** When processing >100 appointments/day, introduce Redis + BullMQ.

#### Monitoring: Platform Built-In + Sentry
- **Uptime:** Better Uptime free tier (1 monitor, 60s checks)
- **Errors:** Sentry free tier (5K events/month)
- **Logs:** Fly.io built-in logs (24-hour retention)
- **Metrics:** Supabase dashboard (DB performance, API usage)

**Alerts:**
- Email on downtime (Better Uptime)
- Slack webhook on errors (Sentry)

**Cost:** $0/month (free tiers)

### Network Topology

**Public Internet:**
- Frontend: Vercel global CDN → Edge compute
- Backend: Fly.io → Single region VM → Public IPv6 + Anycast IPv4
- Database: Supabase → Pooler → Private VPC (not exposed)

**No VPN/VPC Required:** All services communicate over HTTPS with API keys.

### Tenant Isolation Model

**Strategy:** Shared database, row-level isolation via `hospital_id`.

**Enforcement:**
1. **Application Layer:**
   ```typescript
   // Middleware: Inject hospital_id from JWT
   req.hospitalId = req.user.hospital_id;

   // All queries auto-filter:
   const patients = await db.query(
     'SELECT * FROM patients WHERE hospital_id = $1',
     [req.hospitalId]
   );
   ```

2. **Database Layer:**
   ```sql
   -- RLS policies (Supabase enforces these)
   CREATE POLICY hospital_isolation ON patients
     USING (hospital_id = current_setting('app.hospital_id')::uuid);
   ```

**Why Shared Database:**
- Cost: Free tier supports 50 hospitals easily
- Simplicity: No DB provisioning per tenant
- Performance: Supabase pooler handles connection multiplexing

**When to Isolate:** If a single hospital exceeds 50K patients or requests dedicated instance (Chain/Hospital phase).

### Backup Strategy

**Automated (Supabase):**
- Daily snapshots, 7-day retention
- Point-in-time recovery available (paid tier only)

**Manual (Weekly Export):**
```bash
# Cron job: Export event store to S3-compatible storage
pg_dump $SUPABASE_DB_URL \
  --table=event_store \
  --format=custom \
  | gzip > backup-$(date +%Y%m%d).dump.gz

# Upload to Cloudflare R2 (free egress)
rclone copy backup-*.dump.gz r2:mymedic-backups/
```

**Cost:** $0/month (R2 free tier: 10GB storage)

**Recovery SLA:** Best-effort, 24-48 hours (acceptable for MVP).

### Failover Expectations

**Phase 1 SLA:** 99% uptime (7 hours downtime/month acceptable)

**Single Points of Failure:**
- Fly.io region outage → 30-60 minute recovery (redeploy to different region)
- Supabase outage → Wait for provider recovery (rare, <99.9% SLA)

**Mitigation:**
- Keep event store export script ready
- Document manual Supabase project restoration process

**No Multi-Region:** Cost-prohibitive for MVP, acceptable downtime for small clinics.

### Realtime Requirements

**Use Cases:**
1. **Appointment Calendar:** Show live bookings to avoid double-booking
2. **Visit Queue:** Update "Now Serving: Patient #5" dashboard
3. **Notifications:** New patient registration, appointment confirmations

**Implementation:** Supabase Realtime subscriptions (WebSocket).

**Degradation:** If realtime fails, fall back to 30-second HTTP polling.

**Performance Target:** <500ms latency for realtime updates (acceptable for scheduling).

### APIs and Integration Surfaces

**Phase 1 Integrations:**
- **WhatsApp (Optional):** Twilio API or MSG91 (India-specific)
  - Use case: Appointment reminders
  - Cost: Pay-as-go (~₹0.25/message)
- **Payment Gateway (Optional):** Razorpay, PhonePe
  - Use case: Online bill payment
  - Cost: 2% transaction fee

**API Design:**
- RESTful HTTPS endpoints
- JWT bearer token authentication
- Webhook support for async notifications (appointment reminders, payment confirmations)

**Future Integration Readiness:**
- `/webhooks/whatsapp` endpoint for message delivery status
- `/webhooks/payment` for payment confirmation callbacks

### Cost Breakdown: Phase 1

| Component | Provider | Tier | Cost/Month |
|-----------|----------|------|------------|
| Frontend Hosting | Vercel | Free | $0 |
| Backend Compute | Fly.io | Free (3 VMs) | $0 |
| Database | Supabase | Free (500MB) | $0 |
| File Storage | Supabase | Free (1GB) | $0 |
| Realtime | Supabase | Free (200 concurrent) | $0 |
| Monitoring | Better Uptime + Sentry | Free | $0 |
| Domain | Namecheap | .com | $1 |
| **Total** | | | **$1/month** |

**Optional Add-Ons:**
- WhatsApp (MSG91): ₹0.25/message × 100 messages = ₹25 (~$0.30)
- Email (SendGrid): Free tier (100 emails/day)

**Realistic Total:** $1-5/month for solo doctor, $5-10/month for 3-5 doctor clinic with WhatsApp.

### Upgrade Triggers to Phase 2

**Automatic Triggers:**
- Database exceeds 400MB (80% of 500MB free tier)
- File storage exceeds 800MB
- Realtime connections exceed 150 (75% of 200 limit)
- More than 10 hospitals on platform (multi-tenant overhead)

**Business Triggers:**
- Customer requests dedicated database instance
- Chain opens 3+ locations (needs multi-location analytics)
- Monthly revenue >$500 (can afford $50-100/month infrastructure)

---

