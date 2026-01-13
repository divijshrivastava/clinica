# MyMedic — Observability & Audit Architecture

## 1. Purpose

This document defines the observability, audit, and operational introspection model of MyMedic.  
It connects:

✔ Logs (what happened)  
✔ Metrics (health/state)  
✔ Traces (timing/flow)  
✔ Audit (forensic)  
✔ Replay (verification)  
✔ SLO/SLA compliance  

Hospitals and chains require all five.

---

## 2. Observability Pillars

MyMedic implements 5 layers:

| Layer | Purpose |
|---|---|
| Logs | debugging/ops |
| Metrics | health/perf |
| Traces | request chains |
| Audit | compliance/forensic |
| Replay | deterministic reconstruction |

Most SaaS systems only ship 2–3.  
Healthcare requires all 5.

---

## 3. Logging Architecture

Logs include:

✔ application logs  
✔ domain logs  
✔ access logs  
✔ error logs  
✔ integration logs  
✔ reconciliation logs  

Logs are:

✔ tenant-aware  
✔ branch-aware  
✔ timestamped  
✔ trace-correlated  

Log schema fields:

```
timestamp
level
tenant_id
branch_id
service
component
operation
trace_id
span_id
message
payload (optional)
```

Logs are structured (JSON) for searchability.

---

## 4. Metrics Architecture

Metrics measure:

✔ saturation  
✔ throughput  
✔ latency  
✔ error rates  
✔ retries  
✔ queue depth  
✔ projection lag  
✔ reconciliation lag  

Critical healthcare metrics include:

- **booking latency**
- **projection lag**
- **portal load latency**
- **refund latency**
- **tele join latency**
- **warehouse ingestion lag**

Metrics enable SLO-based error budgets.

---

## 5. Tracing Architecture

Distributed tracing answers:

> “How did a request flow through the system?”

Traces track:

✔ portal calls  
✔ doctor mobile calls  
✔ payment flows  
✔ refund flows  
✔ reschedule flows  

Trace spans reveal:

- contention
- hotspots
- delays
- integration stalls

Tracing uses:

- OpenTelemetry (recommended)
- Jaeger/Tempo/Zipkin (compatible)

---

## 6. Audit Layer (Forensic)

Audit layer differs from logs.

Audit answers:

> “What changed in business terms?”

Audit objects are stored as events:

✔ booking.created  
✔ payment.deposit.paid  
✔ refund.issued  
✔ doctor.availability.updated  

Audit is:

✔ immutable  
✔ append-only  
✔ versioned  
✔ signed (optional Phase 3)  
✔ replayable  

Hospitals treat audit as medico-legal evidence.

---

## 7. Replay Layer (Verification)

Replay enforces:

✔ reproducibility  
✔ correctness  
✔ determinism

Replay is used for:

✔ dispute resolution  
✔ insurance claim adjudication  
✔ medico-legal defense  
✔ reconciliation validation  
✔ warehouse backfill  
✔ migration fixes

Replay proves compliance in a way CRUD cannot.

---

## 8. Tenant-Aware Observability

Observability is partitioned by:

✔ tenant (clinic/chain/hospital)  
✔ branch (chain/node)  
✔ provider (doctor)  

Hospital infosec requires:

✔ per-tenant visibility scope  
✔ restricted dashboards  
✔ tenant-scoped alerts  
✔ shared infrastructure view (provider’s choice)

---

## 9. Integration Observability

Integration surfaces need specialized signals:

**Payments:**
- initiation latency
- success rate
- refund latency
- reconciliation failure counts

**Messaging:**
- template delivery rate
- conversion rate
- fallback SMS triggers

**HIS/ADT (hospital):**
- ack failure
- duplicate admission
- mapping conflicts
- message schema errors

Integration observability is required for enterprise contracts.

---

## 10. SRE Operational Signals

Operations require:

✔ golden signals (RED/USE)
✔ queue depth monitoring
✔ backpressure triggers
✔ failover indication

Golden signals for MyMedic:

- Rate (RPS)
- Errors (4xx/5xx)
- Duration (latency)
- Saturation (resource capacity)

---

## 11. Hospital SLO/SLI Model

Hospitals evaluate:

✔ availability  
✔ correctness  
✔ freshness  
✔ latency  
✔ reconciliation accuracy  

SLIs for hospitals include:

| SLI | Description |
|---|---|
| **slot freshness** | schedule updates reflect within X seconds |
| **projection lag** | read views updated within X seconds |
| **reconciliation accuracy** | financial totals reconcile to 100% |
| **refund accuracy** | refunds match deposit rules |
| **ADT sync lag** | ADT messages within X seconds |
| **portal uptime** | portal accessible |
| **tele join uptime** | tele sessions connect without failure |

These become contract parameters in SLAs.

---

## 12. Alerting & Incident Response

Alerting triggers on:

✔ SLO breaches  
✔ projection lag  
✔ queue overload  
✔ reconciliation mismatch  
✔ refund stuck states  
✔ integration failures  
✔ payment reconciliation errors  

Incidents require:

✔ tenant identification  
✔ blast radius assessment  
✔ rollback or replay  
✔ post-mortem with event timelines  

Hospitals demand formal incident history.

---

## 13. Compliance Logging

Compliance logs capture:

✔ access events  
✔ PHI access  
✔ patient modifications  
✔ administrative overrides  
✔ pricing overrides  
✔ consent actions (Phase 2)  
✔ insurance claim actions (Phase 3)

Compliance logs satisfy:

- NABH
- NDHM
- HIPAA (if Intl expansion)
- medico-legal defense
- GST/Audit
- TPA adjudication

---

## 14. Business Telemetry (Chain-Level)

Chain observability tracks:

✔ yield per doctor  
✔ revenue per branch  
✔ refund leakage  
✔ cancellation leakage  
✔ deposit capture rate  
✔ follow-up adherence  
✔ tele conversion rate  
✔ city-level variance

This allows chains to optimize margins.

---

## 15. Summary

Observability in MyMedic is a **multi-layer architecture**:

```
Logs → Metrics → Traces → Audit → Replay
```

This stack enables:

✔ debugging (ops)
✔ compliance (audit)
✔ forensics (replay)
✔ procurement (trust)
✔ insurance (adjudication)
✔ hospital SLAs (enterprise contracts)

MyMedic meets the highest bar for:

> Clinic → Chain → Hospital → Insurance (Future)

