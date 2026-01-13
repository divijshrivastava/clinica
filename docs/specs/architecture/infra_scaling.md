# MyMedic — Infrastructure Scaling Architecture (Throughput, Tenancy, Cost Efficiency)

## 1. Purpose

This document describes how MyMedic scales across:

✔ throughput (RPS)  
✔ tenants (clinics → chains → hospitals)  
✔ geographies (regional deployments)  
✔ data volumes (events + projections + warehouse)  
✔ pricing + reconciliation (chain-specific)  
✔ analytics & reporting (BI)  

Scaling is approached as:

> **Cost-Efficient First → Reliable Second → Elastic Third**

matching GTM sequencing.

---

## 2. Scaling Dimensions

MyMedic must scale along five distinct axes:

1. **Operational Throughput**
   bookings, payments, cancellations, reschedules

2. **Read Throughput**
   portal reads, doctor mobile, staff console, chain analytics

3. **Tenant Count**
   clinics → chain branches → hospitals

4. **Data Volume**
   event streams, projections, warehouse, logs, audit

5. **Compute Footprint**
   inference, projection workers, integration adapters

---

## 3. Throughput Analysis (By Operation)

Workload categories:

### **A. Write-Heavy Workloads (Event-Sourced)**

Examples:

✔ booking  
✔ cancellation  
✔ reschedule  
✔ deposit  
✔ balance  
✔ refund  
✔ follow-up  

Write pattern:

```
command → validation → event → projection
```

Write load scales with appointments:

| Segment | Load Profile |
|---|---|
| Clinic | low |
| Chain | medium |
| Hospital OPD | high |

---

### **B. Read-Heavy Workloads**

Read load dominated by:

✔ portal  
✔ doctor mobile  
✔ reception console  
✔ chain analytics  

Reads scale by:

```
patients × doctors × staff × portal users
```

Reads require:

✔ low latency  
✔ read-optimized projections  
✔ partitioning (branch/city)

---

## 4. Projection Scaling Strategy (CQRS)

Projections scale independently of write path:

```
Events → Projection Workers → Read DB
```

Scaling knobs:

✔ # of workers  
✔ partitioning by tenant  
✔ snapshotting  
✔ async lag tolerance  

Critical: **Projection lag must remain sub-second for UX surfaces**.

---

## 5. Multi-Tenant Scaling Strategy

MyMedic uses **tenant partitioning**:

| Level | Partitioning |
|---|---|
| tenant | chain/hospital |
| branch | physical location |
| provider | doctor |
| patient | PHI |

Multi-tenancy affects:

✔ routing  
✔ authorization  
✔ billing  
✔ analytics  
✔ reconciliation  
✔ export

---

## 6. Elasticity by Phase

Infrastructure elasticity roadmap:

| Phase | Elastic Targets |
|---|---|
| MVP | minimal elasticity |
| Chain | read elasticity + warehouse |
| Hospital | full elasticity + adapters |

Cost increases with capability.

---

## 7. Capacity Planning Model

Capacity is modeled based on:

```
Appointments per doctor per day
× doctors per branch
× branches per chain
× regions per chain
```

Typical numbers:

- independent: 1–5 doctors
- clinic: 5–15 doctors
- chain: 50–300 doctors
- hospital OPD: 200–2,000 doctors

---

## 8. Scaling By Component Class

### **(A) API Layer**

Scale strategy:
```
horizontal auto-scale
load balancer
tenant-aware routing
```

### **(B) Event Store**

Scale strategy by phase:

| Phase | Implementation |
|---|---|
| MVP | Postgres append-only |
| Chain | partitioned + WAL shipping |
| Hospital | Kafka/EventStoreDB + multi-zone |

### **(C) Projections**

Scale linearly with:

✔ # events  
✔ tenant count  
✔ branch count  

Partition recommendation:

```
tenant → branch → aggregate
```

### **(D) Cache Layer**

Caching reduces portal/doctor/console latency.

Cache keys:

- tenant_id
- branch_id
- doctor_id

### **(E) Warehouse**

Warehouse scaling needs:

✔ columnar storage  
✔ time-series partitioning  
✔ rollups  

Ideal engines:

- ClickHouse (best cost/performance)
- Snowflake (enterprise)
- BigQuery (GCP hospitals)
- Redshift (AWS alignment)

---

## 9. Reconciliation Scaling (Chain Critical)

Reconciliation load scales with:

✔ branches  
✔ payment volume  
✔ refund volume  
✔ variance analysis  

Warehouse computes:

- daily aggregates
- weekly branch reports
- monthly variance

These enrich NRR & margin performance.

---

## 10. Geographic Scaling (Phase 3)

International expansion requires:

✔ regional deployment  
✔ regional data compliance  
✔ latency-aware routing  
✔ residency rules  

Deployment options:

- India (primary)
- GCC (Phase 3)
- SEA (Phase 3)
- EU (Phase 3/4 if compliance)

---

## 11. Hospital Scaling Considerations

Hospitals add:

✔ ADT throughput  
✔ claims throughput (Phase 3)  
✔ TPA adjudication  
✔ radiology (imaging) volumes  
✔ PACS/HL7/EMR integration  

Hospitals require:

✔ dedicated integration nodes  
✔ data brokers  
✔ interface engines  
✔ message transformation  
✔ error queues  
✔ audit replay

These are standard for HIS integration.

---

## 12. Fault Domains & Blast Radius

Blast radius limited by:

| Domain | Isolation |
|---|---|
| tenant | chain/hospital boundary |
| branch | operational independence |
| provider | schedule subset |
| service | component fault domain |
| region | compliance boundary |

Hospitals demand explicitly documented fault domains.

---

## 13. Cost Scaling

Cost drivers:

✔ reads >> writes (portal + doctor)
✔ data retention
✔ warehouse compute
✔ projections
✔ reconciliation
✔ integration adapters (hospital)

Cost model must support:

- clinics: per-doctor SaaS
- chains: per-branch + usage
- hospitals: per-module + integration

---

## 14. Summary

Infra scaling strategy supports:

> **Clinic → Chain → Hospital → Multi-Region**

without architectural collapse.

Key guarantees preserved:

✔ PHI safety  
✔ audit integrity  
✔ reconciliation correctness  
✔ replay support  
✔ analytical scalability  
✔ hospital integration pathway  

