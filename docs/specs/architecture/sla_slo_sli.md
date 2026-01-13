# MyMedic — SLA/SLO/SLI Architecture (Enterprise & Hospital Contracting Model)

## 1. Purpose

This document defines:

✔ SLIs — what we measure  
✔ SLOs — what we target  
✔ SLAs — what we contract  

This is required for:

- chain procurement
- hospital contracts
- insurance/TPA integrations
- payment settlement rails
- accreditation audits
- investor due diligence

---

## 2. Why This Matters

Healthcare differs from consumer apps because:

✔ workflows are operational  
✔ breakdowns have clinical impact  
✔ financial correctness affects margins  
✔ reconciliation impacts CFO outcomes  
✔ integration impacts hospital operations  
✔ insurance impacts claim cycles  

SLA architecture reflects these cross-system dependencies.

---

## 3. SLI Definitions (What we measure)

SLIs grouped by domain:

### **A. Availability SLIs**
- API availability
- Portal availability
- Doctor mobile availability

### **B. Performance SLIs**
- booking latency
- portal response latency
- refund end-to-end latency
- tele join latency (Phase 2)
- projection lag
- reconciliation lag

### **C. Correctness SLIs**
- cancellation correctness
- refund correctness
- reconciliation accuracy
- pricing/override policy correctness
- tenant isolation correctness

### **D. Integration SLIs**
- HIS/ADT delivery (Phase 2)
- claim adjudication pipeline (Phase 3)
- warehouse ingestion
- webhook delivery
- notification delivery

### **E. Compliance SLIs**
- audit completeness
- PHI access logging
- consent artifact completeness

These SLIs tie directly to revenue, compliance, and clinical workflow.

---

## 4. SLO Targets (What we internally aim for)

SLOs provide internal guardrails:

| SLI | Target |
|---|---|
| API Uptime | ≥ 99.5% MVP → 99.9% Chain → 99.99% Hospital |
| Portal Uptime | ≥ 99.5% |
| Doctor Mobile Uptime | ≥ 99.5% |
| Booking Latency | < 300ms p95 |
| Projection Lag | < 200ms p95 |
| Refund Latency | < 2 business days |
| Reconciliation Lag | < 24 hours |
| ADT Sync Lag | < 10s |
| Settlement Accuracy | 100% |
| Audit Completeness | 100% |
| Tenant Isolation | 100% |

Note that some SLOs are binary (100% or failure).

---

## 5. SLA Models (What we contractually guarantee)

SLA models differ by segment:

| Segment | SLA Model |
|---|---|
| Independent Clinic | no formal SLAs |
| Chain | operational SLA |
| Hospital OPD | enterprise SLA |
| Hospital + TPA | enterprise + financial SLA |
| Government | enterprise + compliance SLA |

SLA scope expands with ACV and risk.

---

## 6. SLA Dimensions

SLAs negotiated across:

✔ uptime  
✔ latency  
✔ reconciliation integrity  
✔ correctness  
✔ data retention  
✔ support responsiveness  
✔ escalation paths  
✔ maintenance windows  
✔ integration failure handling  
✔ DR/BCP  
✔ breach notifications  

Hospitals mandate DR/BCP minimums.

---

## 7. Financial SLA Elements (Chain + Insurance)

Financial SLAs cover:

✔ deposit settlement time  
✔ refund settlement time  
✔ reconciliation reports  
✔ variance tolerances  

TPA layer adds (Phase 3):

✔ claim cycle time  
✔ denial handling  
✔ remittance advice  
✔ transaction accuracy guarantees

Financial SLAs directly affect CFO office.

---

## 8. Clinical SLA Elements (Hospital)

Clinical SLAs cover:

✔ ADT delivery lag  
✔ encounter consistency  
✔ audit reconstruction  
✔ identity mapping correctness  
✔ discharge workflows  
✔ referral paths  

Incorrect clinical behavior leads to accreditation issues.

---

## 9. Compliance SLA Elements

Compliance-focused SLAs include:

✔ retention duration  
✔ redaction timeline  
✔ export completeness  
✔ audit accessibility  
✔ PHI residency compliance  
✔ authorized access logging  
✔ consent verification (Phase 2)  

These are essential for:

- HIPAA (international)
- GDPD (India future)
- GDPR (EU)
- NDHM (India ABDM)
- NABH (hospital accreditation)

---

## 10. Support & Escalation SLA

Support SLA tiers:

| Severity | Example | Response |
|---|---|---|
| Sev-0 | data loss, outage | immediate (24/7) |
| Sev-1 | hospital ops blocked | < 1 hour |
| Sev-2 | chain ops degraded | < 4 hours |
| Sev-3 | clinic issue | < 1 business day |
| Sev-4 | cosmetic | backlog |

Hospitals demand 24/7 coverage for Sev-0/Sev-1.

---

## 11. Business Continuity & DR

BCP defines:

✔ failover location  
✔ failover time  
✔ data integrity  
✔ PHI retention  
✔ replay capability  

DR Objectives:

| Metric | Target |
|---|---|
| RTO (Recovery Time) | < 1 hour |
| RPO (Recovery Point) | 0 via event log |

Event sourcing significantly improves RPO economics.

---

## 12. Penalties & Credits (Negotiated)

Enterprise SLAs may include:

✔ credits  
✔ penalties  
✔ rebates  
✔ clawbacks  

Penalty triggers typically tied to:

- uptime breaches
- reconciliation failures
- integration failure windows

Hospitals/insurers care about correctness, not just uptime.

---

## 13. Audit & Evidence Collection

For compliance, system must provide:

✔ audit log export  
✔ access log export  
✔ event replay export  
✔ reconciliation reports  
✔ retention policy disclosure  
✔ integration logs  
✔ consent artifacts (Phase 2)

This enables:

- medico-legal defense
- financial audits
- accreditation audits
- insurance adjudication
- government compliance

---

## 14. Summary

SLA strategy evolves:

> No-SLA (clinic) → Operational SLA (chain) → Enterprise SLA (hospital) → Financial SLA (insurance)

MyMedic supports this via:

✔ SLI observability  
✔ SLO enforcement  
✔ event-based replay  
✔ reconciliation correctness  
✔ retention + export + compliance  
✔ multi-tenant isolation  
✔ contractual flexibility  

This design enables MyMedic to graduate from SaaS → infrastructure layer in outpatient healthcare.

