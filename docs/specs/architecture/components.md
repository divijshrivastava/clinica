# MyMedic — Component Architecture Specification

## 1. Purpose

This document defines the logical components that make up MyMedic, grouped by domain boundaries, deployment surfaces, and trust/security zones.

---

## 2. High-Level Logical Architecture

MyMedic consists of six logical layers:

```
[Frontends]
[Edge Services]
[Core Domain Services]
[Support Services]
[Data Services]
[External Integrations]
```

---

## 3. Component Breakdown

### **A. Frontend Components**

These surfaces are how humans interact with the system:

| Component | Persona | Device |
|---|---|---|
| Patient Portal | Patient | mobile web |
| Doctor Mobile App | Doctor | iOS & Android |
| Clinic Console | Reception/Ops/Admin | desktop web |
| Chain Admin Console | Chain Ops/Finance/IT | desktop web |
| Finance Console | Finance/Ops | desktop web |

All are backed by read models for low latency.

---

### **B. Edge/API Components**

Edge services expose public interfaces:

| Service | Protocol |
|---|---|
| Public API Gateway | REST |
| Patient Portal API | REST |
| Doctor API | REST/gRPC |
| Staff Console API | REST |
| Chain Admin API | REST |
| Webhooks Interface | REST |
| Integration Gateway | REST/gRPC (Phase 2) |

Edge layer enforces:

✔ auth  
✔ rate limiting  
✔ request validation  
✔ tenant detection  
✔ audit enrichment  

---

### **C. Core Domain Services**

Domain services encapsulate business rules:

| Domain Service | Purpose |
|---|---|
| Scheduling Service | S1 time-slot logic |
| Payments Service | PM3 hybrid payments |
| Patient Identity Service | patient entity + linking |
| Visit Lifecycle Service | arrival → consult → follow-up |
| Pricing Service | pricing governance |
| Follow-Up Service | adherence & recall |
| Reconciliation Service | financial integrity |
| Portal Routing Service | portal channel flows |
| Doctor Availability Service | rotation, blocks, overrides |
| Chain Policy Service | multi-branch governance |
| Notification Orchestrator | WhatsApp/SMS/email |
| Tele Orchestrator (Phase 2) | join/upgrade flows |

These are designed as **CQRS command handlers** backed by events.

---

### **D. Support Services**

Infrastructure-facing services include:

| Service | Role |
|---|---|
| AuthN Service | authentication |
| AuthZ Service | RBAC + ABAC |
| Audit Log Service | compliance audit |
| Consent Service (Phase 2) | hospital/NDHM |
| Template Service | WhatsApp/SMS/email templates |
| File Storage Service | documents (Phase 2) |
| Integration Adapter Service | HIS/ADT/TPA |
| Rate Limiting Service | security & QoS |
| Billing Service | SaaS billing (Phase 2) |

---

## 4. Messaging & Events Layer

MyMedic relies on an event backbone to coordinate domains:

📌 **Internal Events**

Examples:

```
booking.created
booking.updated
payment.deposit.paid
payment.balance.paid
visit.completed
followup.scheduled
refund.issued
doctor.block.updated
```

📌 **External Webhooks**

For integration with:

- HIS (hospital)
- CRM (chains)
- BI/reporting tools

---

## 5. Data & Storage Components

MyMedic uses a multi-storage model:

| Storage | Purpose |
|---|---|
| Event Store | immutable write log |
| Projection DBs | read models |
| Relational DB | referential data |
| Cache | low latency reads |
| Object Store | docs/images (Phase 2) |
| Warehouse | BI/analytics (Phase 2) |
| Search Index | patient/doctors/slots (Phase 2) |

Event store feeds projections (CQRS read side).

---

## 6. External Integrations

External systems include:

✔ Payments (UPI/card)  
✔ WhatsApp Business API  
✔ SMS Gateway  
✔ Email Provider  
✔ Tele (external infra Phase 1–2)  
✔ Hospital HIS/ADT (Phase 2)  
✔ Insurance/TPA (Phase 3)

Integration modes:

```
polling (Phase 2)
push (webhooks)
direct (API)
broker-based (Phase 3)
```

---

## 7. Security & Trust Zones

Security zoning:

```
[Public Zone]
  → Patient Portal
  → External Webhooks

[Clinic Zone]
  → Staff Console
  → Doctor Mobile

[Core Zone]
  → Domain Services
  → AuthN/AuthZ
  → Event Store

[Data Zone]
  → DBs
  → Object Storage
  → Warehouse

[Integration Zone]
  → HIS/ADT/TPA
  → Payments
  → WhatsApp
```

Hospitals require zoning clarity for procurement.

---

## 8. Deployment Surfaces

Surfaces per persona:

| Persona | Surface |
|---|---|
| Patient | portal |
| Doctor | mobile |
| Reception | console |
| Ops | console |
| Finance | reconciliation |
| Chain Admin | analytics/permissions |
| Integration | API/Webhooks |

Surfaces do not overlap identities.

---

## 9. Multi-Tenancy Model

Tenancy is enforced via:

✔ tenant_id (organization)  
✔ branch_id (sub-tenant)  
✔ doctor_id (resource)  
✔ patient_id (PHI)  

Hospital OPD uses:

✔ department_id  
✔ specialty_id  
✔ provider_id  

PHI isolation is enforced at:

- data layer (row-level)
- envelope (encryption)
- projection partitions (Phase 2)
- warehouse partitions (Phase 2)

---

## 10. Component Interaction Diagram (Textual)

Textual representation for procurement docs:

```
Patient Portal → Public API → Scheduling Service → Event Store → Projections → Portal Views
                                                  ↘ Payments Service → UPI Gateway
Doctor Mobile → Doctor API → Scheduling Service → Event Store
Staff Console → Staff API → Scheduling + Payments + Pricing → Event Store
                                                ↘ Reconciliation Service → Finance Console
Chain Console → Chain API → Pricing + Reconciliation + Analytics → Warehouse
```

---

## 11. Component Evolution Roadmap

| Phase | Components Added |
|---|---|
| MVP | Scheduling + PM3 + Portal + Doctor Mobile |
| Chain | Reconciliation + Pricing + Multi-Branch + Analytics |
| Hospital | ADT + HIS interfaces + TPA + Dept/Provider Model |
| Enterprise | Multi-region + Compliance + SSO + SLA |

Modules grow with GTM maturity.

---

## 12. Summary

This component architecture enables:

✔ outpatient scheduling (S1)  
✔ hybrid payments (PM3)  
✔ chain governance  
✔ portal activation  
✔ doctor mobile utilization  
✔ financial reconciliation  
✔ future hospital extension  

while remaining:

- multi-tenant
- event-oriented
- compliance-friendly
- integrable
- horizontally scalable

