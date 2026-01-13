# MyMedic — Architecture Overview (Hybrid Architecture Specification)

## 1. Purpose

This document provides a high-level overview of the system architecture used by MyMedic.  
It is designed for:

✔ engineering (build + maintain)  
✔ procurement (evaluate feasibility)  
✔ enterprise IT (integration + governance)  
✔ infosec (boundary + attack surface)  
✔ investors (scalability + defensibility)

---

## 2. System Context

MyMedic is an **OPD-first, event-sourced clinic platform** optimized for outpatient scheduling, payments, and workflows with future path to:

- chains (multi-branch)
- enterprise OPD
- hospital integrations (ADT/HIS)
- insurance/TPA (Phase 3)

The stack supports:

✔ multi-tenant  
✔ chain governance  
✔ mobile-first doctor UX  
✔ portal-first patient UX  
✔ PM3 hybrid payments model  
✔ event-sourced audit trail  

---

## 3. Architectural Paradigms Used

MyMedic uses four architectural paradigms:

### **(a) Event Sourcing**
→ Immutable events become the source of truth  
→ Enables audit, reconstruction, compliance, BI

### **(b) CQRS**
→ Commands & Queries separated  
→ Enables specialized read models for UI

### **(c) Multi-Tenant Isolation**
→ Tenants = clinic → chain → hospital (nested)  
→ Supports branch-level partitioning

### **(d) Domain-Driven Design (Lightweight)**
→ Domains aligned to business workflows:

- Scheduling
- Payments
- Portal
- Doctor Mobile
- Chain Admin
- Analytics

---

## 4. Core Domain Boundaries (DDD Context Map)

Domain boundaries are structured as:

```
Clinic Domain
 ├ Scheduling (S1)
 ├ Payments (PM3)
 ├ Patient Identity
 └ Follow-Up

Chain Domain
 ├ Pricing
 ├ Reconciliation
 ├ Multi-Branch Routing
 └ Analytics

Enterprise Domain (Phase 2+)
 ├ ADT (Admission/Discharge/Transfer)
 ├ HIS Interfaces
 └ TPA/Insurance (Phase 3)

Platform Domain
 ├ AuthN/AuthZ
 ├ Notifications
 ├ Messaging (WhatsApp/SMS/Email)
 ├ Integrations
 ├ Audit/Event Store
 └ Observability
```

This separation allows phased rollout to hospital OPD without re-architecture.

---

## 5. Tenancy Model

MyMedic uses a multi-layer tenancy model:

```
Tenant Level 1: Organization (Clinic/Chain/Hospital)
Tenant Level 2: Branch
Tenant Level 3: Doctor
Tenant Level 4: Patient
```

Multi-tenancy requirements:

✔ data isolation  
✔ permissions delegation  
✔ chain-level overrides  
✔ pricing & policy inheritance  
✔ reconciliation across branches  

---

## 6. Communication Patterns

Communication uses:

✔ synchronous APIs (REST/gRPC) for requests  
✔ asynchronous events for state propagation  
✔ message bus for domain integration  

Choice for MVP:

- REST → external surfaces
- gRPC → internal services (optional Phase 2)
- Kafka/Rabbit/SQS → event backbone

---

## 7. Persistence Model

MyMedic uses layered persistence:

| Layer | Purpose |
|---|---|
| Event Store (append-only) | write path |
| Projection DBs | read path |
| Cache | low-latency reads |
| Blob Storage | documents (Phase 2) |
| Warehouse | analytics (Phase 2) |

Projection DBs include:

- schedules
- payments
- reconciliation
- pricing
- follow-ups

---

## 8. Messaging & Events

Events emitted include:

- booking.created
- booking.updated
- payment.deposit.paid
- payment.balance.paid
- procedure.scheduled
- followup.scheduled
- cancellation.requested
- refund.issued

Phase 2 introduces:

- tpa.claim.submitted
- opd.referral.created
- admission.ordered

---

## 9. Scaling Strategy

Scaling roadmap matches go-to-market:

| Phase | Segment | Scaling Pattern |
|---|---|---|
| MVP | independent clinics | vertical scale |
| Phase 2 | chains | horizontal scaling of read models |
| Phase 3 | hospitals | infra partitioning + compliance zones |

---

## 10. Integration Surfaces

Integration points include:

✔ Payments (UPI/Card/Wallet)  
✔ WhatsApp (patient communication)  
✔ Website Portal Embed  
✔ ADT (hospital Phase 2)  
✔ HIS/EMR (Phase 2/3)  
✔ Insurance/TPA (Phase 3)  

---

## 11. Security & Compliance Context

Security priorities:

✔ PHI/data isolation  
✔ audit log integrity  
✔ access control (RBAC + ABAC hybrid)  
✔ encrypted in transit + at rest  
✔ least privilege  
✔ multi-region (Phase 3)  

Compliance targets:

- India OPD compliance (Phase 1)
- NABH alignment (Phase 2)
- NDHM interoperability (Phase 2)
- ABHA/Consent (optional Phase 2)
- HIPAA-lite alignment (internal standard)
- full HIPAA (optional for GCC/Singapore scale)

---

## 12. Resilience & Disaster Model

Resilience strategy includes:

✔ blue/green deploys  
✔ replayable projections  
✔ multi-zone deployment (Phase 2)  
✔ backup + snapshot strategy  
✔ failure domain isolation  
✔ degraded-mode operation for clinics  

Doctor mobile supports offline read.

---

## 13. Summary

MyMedic architecture is designed to:

✔ support clinics today  
✔ scale to chains  
✔ interoperate with hospitals  
✔ integrate payments  
✔ comply with audit requirements  
✔ support expansion across India & GCC  

while preserving:

✔ low onboarding friction  
✔ predictable activation  
✔ financial integrity  
✔ clinic workflow compatibility

---

End of `overview.md`
