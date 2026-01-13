# MyMedic — Service Topology Specification (MVP → Chain → Hospital Scale-Out)

## 1. Purpose

This document defines MyMedic's service topology across three horizons:

✔ MVP (independent clinics)  
✔ Chain Scale (multi-branch, multi-city)  
✔ Hospital OPD (enterprise integrations)  

The topology must support:

- low-cost MVP deployment
- modularity for evolution
- compliance & multi-tenancy
- integration surfaces for hospitals
- replay & audit constraints
- offline doctor usage
- chain reconciliation
- portal + payments flow

---

## 2. Guiding Constraints

Topology is shaped by:

**(a) Business Constraints**
- clinics → chains → hospitals GTM ramp
- procurement cycles
- chain expansion economics
- hospital integration requirements

**(b) Technical Constraints**
- event-sourced write path
- projection-based read path
- multi-tenancy isolation
- audit/compliance enforcement

**(c) Cost Constraints**
- MVP must be low-cost
- scale-out must be horizontal
- hospital must be multi-zone

**(d) Operational Constraints**
- partial offline mobile
- replay requirements
- read-heavy portals
- refund & deposit correctness

---

## 3. MVP Topology (Phase 1)

For MVP (independent clinics), the optimal topology is:

```
[Monolith + Modular Boundaries + Event Store + Projections]
```

### Reasoning

✔ reduces deployment effort  
✔ reduces infra cost  
✔ reduces operational complexity  
✔ avoids premature microservices  
✔ enforces domain boundaries via modules  

### MVP Components Layout

```
mymedic-app (monolith)
 ├ domain modules
 ├ event store (PG append table)
 ├ projections (PG read tables)
 ├ REST APIs
 ├ portal backend
 └ doctor mobile backend
```

### MVP Infra

✔ 1 DB instance  
✔ 1 app instance  
✔ 1 object storage (optional)  
✔ no message broker required  
✔ cron for projections (optional)  

This supports:

✔ scheduling (S1)  
✔ PM3 payments  
✔ portal  
✔ doctor mobile  

Cost target:

→ <$200/month cloud or <$50/month on bare using Supabase/Fly.io

---

## 4. Chain Topology (Phase 2)

Chains introduce:

✔ reconciliation  
✔ multi-branch  
✔ pricing governance  
✔ analytics  
✔ multi-user ops  
✔ higher throughput  
✔ city expansion  

Topology upgrades to:

```
[Modular Monolith + Event Store + Projections + Message Bus + Warehouse]
```

### Phase 2 Service Layout

```
core-app (monolith, modular)
event-store
projection-workers
message-broker (Kafka/Rabbit/SQS)
warehouse-loader
warehouse (ClickHouse/Snowflake)
```

### Why Modular Monolith vs Microservices?

Healthcare chain data requires:

✔ strong consistency in domain boundaries  
✔ replay across domains  
✔ multi-tenant branch isolation  
✔ shared context for reconciliation  

Microservices too early would break:

✖ reconciliation correctness  
✖ pricing governance  
✖ replay semantics  
✖ hospital readiness  

Phase 2 satisfies investors & enterprise without microservice overhead.

---

## 5. Hospital OPD Topology (Phase 3)

Hospitals need:

✔ ADT integration  
✔ HIS interface engine  
✔ SSO/LDAP/SAML  
✔ department + provider model  
✔ TPA/insurance workflows  
✔ audit + compliance  
✔ multi-zone data boundaries  

Topology evolves to:

```
[Service Mesh + Warehouse + Integration Adapters + Redundancy]
```

Phase 3 introduces service decomposition for:

- integration adapters
- warehouse ETL
- reconciliation
- tele orchestration
- claims (optional)
- consent (NDHM)

### Phase 3 Topology

```
core-services (clustered)
integration-gateway
adt-interface-engine
tpa-gateway
tele-orchestrator
warehouse
event-bus
object-storage
auth-provider (SSO)
```

Microservices are now justified due to:

✔ SLA requirements  
✔ hospital procurement standards  
✔ interoperability needs  
✔ multi-zone data residency  
✔ security boundary constraints  

---

## 6. Topology Evolution Summary

| Horizon | Topology | Rationale |
|---|---|---|
| MVP | Modular Monolith | cheapest, fastest |
| Chain | Modular Monolith + Bus + Warehouse | reconciliation + analytics |
| Hospital | Service Mesh + Integrations | enterprise procurement |

No premature microservices.

---

## 7. Domain Boundary Decomposition (Event-Sourced)

Event sourcing defines decomposition candidates:

| Domain | Candidate Service |
|---|---|
| Scheduling | scheduling-service |
| Payments | payment-service |
| Pricing | pricing-service |
| Reconciliation | reconciliation-service |
| Patient Identity | identity-service |
| Portal | portal-service |
| Doctor Availability | provider-service |
| Integration | integration-gateway |
| Consent (Phase 2+) | consent-service |
| Claims (Phase 3+) | claims-service |
| Tele (Phase 2+) | tele-service |

These are queued for Phase 3+.

---

## 8. Cost-Aware Deployment

Cost considerations per phase:

### Phase 1 (MVP)
- 1 app
- 1 DB
- 1 optional object storage
→ goal: minimal infra cost

### Phase 2 (Chain)
- clusterized app
- broker + warehouse
→ goal: analytics + scale

### Phase 3 (Hospital)
- multi-zone
- HA pairs
- mesh + SSO + compliance
→ goal: enterprise SLA/Infosec

---

## 9. Multi-Tenant Isolation Strategy

Isolation is enforced via:

✔ logical separation first  
✔ physical separation when needed

| Layer | Isolation |
|---|---|
| DB | tenant_id |
| Warehouse | tenant schema (Phase 2) |
| Storage | tenant folder (Phase 3 optional) |
| Compute | tenant cluster (Phase 3 optional) |

Hospital may demand:

✔ hybrid on-prem  
✔ VPC peering  
✔ regional residency

We support that in Phase 3.

---

## 10. Observability & Operations Impact

Topology determines observability required:

| Phase | Observability Need |
|---|---|
| MVP | logs + metrics |
| Chain | logs + metrics + traces |
| Hospital | full SLO + SLA + audit |

---

## 11. Why Not Microservices From Day 1?

Healthcare startups that ship microservices too early incur:

❌ high infra cost  
❌ high operational burden  
❌ replay complexity  
❌ dev velocity collapse  
❌ premature integration boundaries  

MyMedic avoids this trap.

---

## 12. Summary

The topology strategy is:

> Monolith → Modular → Distributed → Enterprise Mesh

This supports:

✔ unit economics  
✔ procurement alignment  
✔ integration compatibility  
✔ replay integrity  
✔ audit correctness  
✔ hospital-grade SLAs  
✔ compliance growth path

Without sacrificing:

✔ cost-efficiency  
✔ developer velocity  
✔ activation speed

