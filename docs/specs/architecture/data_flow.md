# MyMedic — Data Flow Architecture (Operational + Analytical + Integration)

## 1. Purpose

This document describes how data flows through the MyMedic platform including:

✔ operational data flows (OLTP)  
✔ event flows (ES/CQRS)  
✔ analytical flows (OLAP)  
✔ integration flows (external)  
✔ compliance flows (audit & retention)  

---

## 2. Flow Types

MyMedic supports five major data flow types:

1. **Command Flow** — write path
2. **Projection Flow** — read path
3. **Event Flow** — asynchronous backbone
4. **Analytical Flow** — BI & warehouse
5. **Integration Flow** — external systems

---

## 3. Command Flow (Write Path)

Command flow applies to:

- bookings
- cancellations
- reschedules
- payments
- follow-ups
- pricing updates

Write path sequence:

```
API → Command Handler → Validation → Event Store → Ack
```

Key properties:

✔ synchronous  
✔ transactional (per aggregate)  
✔ predictable latency  
✔ tenant-aware  
✔ audit-enriched  

---

## 4. Event Flow (Backbone)

Events emitted on write:

```
Event Store → Event Bus → Projections → Integrations → Warehouse
```

Key properties:

✔ asynchronous  
✔ fault-tolerant  
✔ idempotent  
✔ replayable  

Events carry:

- tenant_id
- branch_id (optional)
- causation_id
- correlation_id (optional)
- timestamp
- version

---

## 5. Projection Flow (Read Path)

Projections build read models optimized for UX:

- portal slots
- doctor schedules
- clinic calendar
- payments summary
- reconciliation tables
- follow-up queues

Flow:

```
Event Bus → Projection Workers → Read DB → UI/Console
```

Projections must be:

✔ fast to query  
✔ cheap to compute  
✔ replayable  
✔ tenant-partitioned  

---

## 6. Analytical Flow (Warehouse)

Warehouse receives:

✔ events  
✔ projections  
✔ Dimensions  
✔ Facts  

Supports BI queries such as:

- cancellation leakage
- procedure conversion
- follow-up adherence
- no-show patterns by specialty
- chain variance (branch-level)
- yield per provider
- city-level pricing sensitivity

Warehouse flow:

```
Event Store → ETL/ELT → Warehouse → BI Tools
```

Warehouse options (Phase 2):

- Snowflake
- BigQuery
- ClickHouse (cost-optimal)
- Redshift

---

## 7. Integration Flow (External Systems)

External integrations communicate via:

✔ REST  
✔ gRPC  
✔ Webhooks  
✔ HL7/FHIR (Phase 3 for hospitals)

Integration includes:

| Domain | Integration |
|---|---|
| Payments | UPI/Card Gateway |
| Messaging | WhatsApp/SMS |
| Websites | Portal embed |
| HIS/ADT (hospital) | Interface Engine |
| Insurance | TPA Gateway (Phase 3) |

ADT (Admission/Discharge/Transfer) flow (Phase 2):

```
OPD Visit → Admission Request → HIS → Bed Assignment → Discharge → Billing
```

---

## 8. Multi-Tenant Data Flow

Tenancy constraints apply to data flows:

```
Commands → tenant_id required
Events → tenant_id + branch_id
Projections → tenant-partitioned tables
Warehouse → tenant-partitioned schema
Exports → tenant-scoped
```

Chains require cross-branch queries, so projections allow:

✔ branch_id filters  
✔ doctor_id filters  
✔ city filters

Hospitals add:

✔ department_id  
✔ specialty_id  

---

## 9. Reconciliation Flow (Chain Critical)

Reconciliation is the most important chain workflow:

```
Payment Events → Reconciliation Engine → Finance Console → Export/Settlement
```

Inputs:

- deposits
- balances
- refunds
- reversals
- payment modes (UPI/card/cash)

Outputs:

✔ settlement reports  
✔ branch variance  
✔ leakage metrics  
✔ chain-wide financial view  

This makes MyMedic financially sticky.

---

## 10. Portal Flow (Patient)

Portal reads:

✔ schedules → projection DB  
✔ pricing → pricing service  
✔ tele availability → doctor service  
✔ deposits → payment service  

Portal writes:

✔ booking command  
✔ reschedule command  
✔ cancellation command  
✔ payment initiation  

Payments execute via:

```
Portal → Payment Gateway → Payment Events → Projection
```

---

## 11. Doctor Mobile Flow

Doctor mobile is **read-dominant**:

- low-latency projections
- push notifications
- selective commands (override/block/follow-up)

Flow:

```
Projections → Mobile → Commands → Events → Projections
```

Supports offline read mode.

---

## 12. Staff Console Flow

Console is **read/write hybrid**:

✔ scheduling writes  
✔ payment writes  
✔ refund writes  
✔ reconciliation reads  
✔ pricing reads  
✔ phone booking writes  

Console flows are high-throughput and synchronous for UX.

---

## 13. Chain Analytics Flow (Phase 2)

Chain consoles require:

✔ cross-branch
✔ cross-city
✔ cross-doctor

Analytics require:

```
Projections → Warehouse → BI
```

Variance analysis supports:

- pricing decisions
- staffing optimization
- branch expansion

---

## 14. Compliance & Audit Flow

Critical for hospital & chain contracts:

Audit = **Events**  
Compliance = **Policies**  
Billing = **Reconciliation**  

Audit queries:

- what happened?
- in what order?
- who initiated?
- what changed?
- what policy applied?
- what payment applied?
- what was refunded?
- what was forfeited?

CRUD cannot answer these correctly.

---

## 15. Historiography & Replay Flow

Replay enables:

✔ restoring state after bug  
✔ rebuilding projections  
✔ data model migration  
✔ forensic reconstruction  
✔ insurance/TPA adjudication  
✔ medico-legal defense  

Replay flow:

```
Event Store → Replay Engine → Projections
```

Hospitals require partial replay:

```
[patient_id, admission_id, claim_id]
```

---

## 16. Data Export Flow (Enterprise/Hospital)

Hospitals require export formats:

✔ CSV  
✔ XLSX  
✔ HL7 (Phase 3)  
✔ FHIR (Phase 3)  

Export surfaces:

- census
- visit history
- provider schedule
- billing/export
- insurance claims

---

## 17. Retention & Destruction Flow

Healthcare retention cycles:

- medico-legal: 7+ years
- financial/GST: 5 years
- hospital: 10+ years
- insurance: claim-dependent

Destruction flow required for GDPR-like compliance:

✔ redaction  
✔ pseudonymization  
✔ selective deletion  

Hospitals will ask for this explicitly.

---

## 18. Summary

MyMedic supports:

✔ real-time operational data (OLTP)  
✔ replayable event streams (ES)  
✔ analytical warehouse (OLAP)  
✔ chain reconciliation (financial)  
✔ hospital integrations (ADT/HIS)  
✔ compliance & audit (forensic)

Flow unification enables:

> Clinic → Chain → Hospital → Insurance (future)

