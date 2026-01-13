# MyMedic — Event Sourcing Architecture (Audit + Replay + Compliance)

## 1. Purpose

Event Sourcing is the backbone of MyMedic. It is the source of:

✔ immutable audit trail  
✔ reconstructable states  
✔ deterministic compliance  
✔ forensic correctness  
✔ multi-tenant history  
✔ hospital chain trust  
✔ analytics replay  
✔ time-based BI  

This document defines how events are designed, stored, replayed, and projected.

---

## 2. Why Event Sourcing for Healthcare?

Healthcare workflows require:

✔ legal auditability  
✔ clinical traceability  
✔ financial settlement consistency  
✔ dispute resolution  
✔ compliance with future regulations  

Event sourcing provides:

| Requirement | Event Sourcing Benefit |
|---|---|
| Audit | immutable append-only log |
| Compliance | time-ordered correctness |
| Forensics | replayable models |
| BI | historical queries |
| Chains | variance analytics |
| Hospitals | admission/ADT correctness |
| Insurance | claim reconstruction |

Relational CRUD cannot satisfy these without bolting on audit trails.

---

## 3. Domain Events vs Technical Events

We distinguish:

✔ **Domain Events**  
Semantic, business-level, meaningful to clinic operations.  
Example: `procedure.scheduled`

✖ **Technical Events**  
Low-level system noise. Not stored in domain log.

MyMedic only stores **domain events** in Event Store.

---

## 4. Event Categories (Domain-Level)

We categorize MyMedic domain events as:

### A. Scheduling Events
```
booking.created
booking.updated
booking.cancelled
reschedule.requested
reschedule.completed
doctor.availability.updated
doctor.block.added
```

### B. Visit Lifecycle Events
```
visit.arrived
visit.started
visit.completed
followup.scheduled
followup.completed
```

### C. Payment Events (PM3)
```
payment.deposit.paid
payment.deposit.forfeited
payment.balance.paid
payment.refund.requested
payment.refund.issued
payment.dispute.opened
payment.dispute.resolved
```

### D. Portal & Patient Events
```
portal.booking.requested
portal.reschedule.requested
portal.cancellation.requested
```

### E. Chain Governance Events
```
pricing.rule.changed
branch.added
branch.removed
doctor.branch.assigned
```

### F. Clinical Signals (Phase 2+)
```
treatment.plan.started
carepath.updated
referral.outbound
adt.order.submitted
```

### G. Insurance/TPA (Phase 3+)
```
claim.created
claim.submitted
claim.settled
claim.denied
```

---

## 5. Event Envelope Schema

Event envelope is uniform across domains:

```
event_id
event_type
tenant_id
branch_id (optional)
aggregate_id
aggregate_type
timestamp
causation_id (optional)
correlation_id (optional)
version
payload (JSON)
```

This allows replay, correlation, and deterministic ordering.

---

## 6. Aggregate Strategy

Aggregates define event streams (per entity):

| Aggregate | Key |
|---|---|
| Booking | booking_id |
| Visit | visit_id |
| Patient | patient_id |
| Doctor | doctor_id |
| Branch | branch_id |
| Pricing Policy | policy_id |
| Payment | payment_id |
| Reconciliation | reconciliation_id |
| Claim (Phase 3) | claim_id |

For hospital OPD expand:

| Aggregate | Key |
|---|---|
| Admission | admission_id |
| Encounter | encounter_id |

---

## 7. Versioning & Concurrency

We use **optimistic concurrency**:

```
expected_version = current_version
```

If mismatch → conflict callback.

This avoids race conditions in:

- portal double booking
- staff booking
- tele prepay
- chain overrides

Doctor mobile uses “last-write-wins” only for view models.

---

## 8. Projections (CQRS Read Models)

Read models support UX surfaces:

| Surface | Projection |
|---|---|
| Doctor Mobile | doctor_schedule_view |
| Portal | portal_slots_view |
| Staff Console | clinic_calendar_view |
| Chain Analytics | reconciliation_view |
| Finance | payments_view |
| BI | warehouse_projections |

Projections are **idempotent** and **replayable**.

---

## 9. Replay Semantics

Replay enables:

✔ correction  
✔ migration  
✔ new projections  
✔ backfill  
✔ analytics retrofits  
✔ compliance evidence  
✔ litigation forensics  

Replay rules:

- chronological
- per-tenant or global
- partial or full

Hospitals care about partial replay for ADT/insurance disputes.

---

## 10. Event Store Implementation Options

Event Store can be implemented via:

| Option | Pros | Cons |
|---|---|---|
| Postgres append table | cheapest | manual archive |
| Kafka log | scalable | needs projections |
| EventStoreDB | native | infra complexity |
| DynamoDB streams | elastic | AWS-bound |
| FoundationDB | global tx | cluster complexity |

Phase 1 uses:

→ **Postgres append-only** (MVP, low-cost)

Phase 2 moves to:

→ **Kafka+Projections** (Chain scale)

Phase 3 optional:

→ **EventStoreDB** or **Dynamo global**

---

## 11. Ordering Guarantees

Ordering needed per:

✔ aggregate  
✔ branch  
✔ tenant  

Global ordering is NOT required for OPD.

Per-tenant guarantees required for:

- reconciliation
- pricing policy updates
- ADT in hospital context

---

## 12. Query Layer for Analytics

Event streams support BI queries like:

- cancellation leakage
- deposit capture
- no-show rate by doctor
- branch variance
- tele conversion
- follow-up adherence

Event time-series unlock **variance analysis**, the most powerful chain sales feature.

---

## 13. Forensic Guarantees

Event sourcing enables:

✔ “what actually happened”  
✔ “in what order”  
✔ “who triggered what”  
✔ “how much was paid/refunded”  
✔ “what policies applied”  

Hospitals and insurers call this **forensic compliance**.

---

## 14. Audit & Compliance Alignment

Event sourcing aligns with:

✔ NABH OPD audits  
✔ NDHM consent logs (Phase 2)  
✔ HIPAA audit (if international)  
✔ medico-legal reconstruction  
✔ TPA dispute resolution  
✔ revenue cycle reporting  
✔ pharmacy chain reconciliation  
✔ GST audit trails

Traditional CRUD systems fail here.

---

## 15. Warehouse Integration (Phase 2)

Warehouse gets:

✔ event streams (immutable)  
✔ projections (structured)  
✔ dimensional models

Warehouse supports:

- Snowflake
- BigQuery
- Redshift
- ClickHouse (cost-efficient)

---

## 16. Multi-Tenant Partitioning

Partitioning strategies:

| Level | Partition Key |
|---|---|
| Tier 1 | tenant_id |
| Tier 2 | branch_id |
| Tier 3 | aggregate_id |

Partitioning enables:

✔ chain isolation  
✔ hospital isolation  
✔ export for procurement  
✔ archival for compliance  

---

## 17. Event Retention Policies

Retention needed for:

- medico-legal (7+ years)
- financial (5+ years)
- clinical (10+ years in hospitals)

MyMedic supports:

✔ cold archive tier  
✔ GDPR-like destructive export (if required)  
✔ partial patient redaction (hospital requirement)  

---

## 18. Summary

Event sourcing gives MyMedic:

✔ audit → compliance advantage  
✔ replay → engineering advantage  
✔ BI → commercial advantage  
✔ insurance → future enterprise advantage  
✔ chain → reconciliation advantage  
✔ hospital → forensic advantage  

This is a strategic architectural moat.

