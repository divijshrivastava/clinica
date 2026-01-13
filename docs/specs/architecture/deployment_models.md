# MyMedic — Deployment Models (Cloud → Hybrid → Enterprise On-Prem)

## 1. Purpose

This document describes deployment models supported by MyMedic across target segments:

✔ Independent Doctors  
✔ Clinics  
✔ Chains  
✔ Hospitals (OPD)  
✔ Hospitals (Enterprise/TPA, Phase 3+)  

Deployment requirements differ substantially between these segments due to:

- procurement policies
- compliance requirements
- data governance
- infosec posture
- integration requirements
- network constraints
- uptime expectations

---

## 2. Deployment Drivers

MyMedic deployment is shaped by:

### (a) Commercial Drivers
- ACV (annual contract value)
- procurement friction
- sales cycle length

### (b) Technical Drivers
- low latency for patient/doctor UX
- hospital network segmentation
- integration surfaces (ADT/HIS)
- payments connectivity

### (c) Compliance Drivers
- PHI residency
- audit accessibility
- medico-legal retention
- TPA claim forensic traceability

### (d) Operational Drivers
- offline capability
- mobility
- multi-branch coordination
- reconciliation workflows

---

## 3. Supported Deployment Models

We define deployments across three horizons:

### **Model 1 — SaaS Cloud (Default for MVP/Chains)**

Runs fully managed in cloud.

Target segments:

✔ Independent doctors  
✔ Clinics  
✔ Chains  

Advantages:

- zero infra management
- fastest onboarding
- lowest TCO
- highest iteration velocity

Multi-tenancy is logical with:

✔ tenant  
✔ branch  
✔ doctor  
✔ patient  

**Cloud Residency (Default):**

- India (primary)
- GCC (Phase 3)
- SEA (Phase 3)

---

### **Model 2 — Hybrid Deployment (Hospital OPD Phase 2)**

Hybrid model splits:

```
OPD workflows → Cloud
ADT/HIS + financial systems → Hospital Network
```

Data bridges use:

✔ REST  
✔ Webhooks  
✔ Interface Engine (Phase 2)  
✔ HL7/FHIR (Phase 3)  

Hybrid satisfies hospital needs:

✔ OPD can be SaaS  
✔ PHI not necessarily exported  
✔ ADT not duplicated  
✔ TPA/Insurance attached later

Hybrid reduces procurement friction dramatically.

---

### **Model 3 — On-Premises / VPC (Enterprise Phase 3+)**

Required for:

✔ Hospitals with compliance constraints  
✔ Government hospitals  
✔ Defense/PSU hospitals  
✔ Chains with data sovereignty requirements  

Supports:

- VPC deployment
- VPC peering
- Single-tenant clusters

Control surfaces:

✔ database  
✔ event store  
✔ warehouse  
✔ storage

Still requires cloud elements for:

✔ tele (unless custom)
✔ messaging (WhatsApp gateway)
✔ UPI (payment gateway)

---

## 4. Deployment View by Segment

| Segment | Deployment Model |
|---|---|
| Independent Doctor | SaaS (Model 1) |
| Clinic (Multi-Doctor) | SaaS (Model 1) |
| Multi-Branch Chain | SaaS + Warehouse (Model 1+) |
| Hospital OPD | Hybrid (Model 2) |
| Hospital + TPA | Hybrid + Interface Engine (Model 2+) |
| Government Hospital | On-Prem (Model 3) |
| GCC/Intl Hospitals | Regional SaaS or VPC (Model 3) |

---

## 5. Data Residency & Sovereignty

Residency matters for:

✔ GCC  
✔ EU  
✔ SEA  
✔ Government contracts  

MyMedic supports:

- regional deployment
- tenant-level region mapping (Phase 3)
- DR zones (Phase 3)
- S3-compatible object stores (Phase 3)

Hospitals may require:

✔ PHI storage inside country  
✔ metadata export outside allowed zone  

---

## 6. Connectivity Requirements

Different deployment models rely on different connectivity layers:

| Layer | SaaS | Hybrid | On-Prem |
|---|---|---|---|
| Internet | required | required | optional |
| Hospital LAN | optional | required | required |
| VPN/VPC Peering | optional | optional | required (for remote messaging) |
| Interface Engine | optional | required | required |
| SSO/LDAP | optional | optional | required |
| Tele Infra | SaaS | SaaS | optional |

For hospitals, **Interface Engine** becomes mandatory.

---

## 7. Multi-Zone + Multi-Region (Phase 3)

Enterprise-grade hospitals require:

✔ zone resilience  
✔ region-level failover  
✔ replication policies  

Phase 3 introduces:

- multi-zone deployments
- HA clusters for core services
- DR region for warehouse + event store

---

## 8. Cost Modeling (TCO)

| Segment | TCO Pressure | Deployment |
|---|---|---|
| Independent | high | SaaS |
| Clinic | high | SaaS |
| Chain | medium | SaaS + Warehouse |
| Hospital | low | Hybrid |
| Government | low | On-Prem |

Hospitals pay for compliance; clinics do not.

---

## 9. SaaS Billing Implications

Deployment model affects billing:

✔ SaaS → subscription per doctor/branch  
✔ Hybrid → subscription + integration + training  
✔ On-Prem → license + support + maintenance  

TPA flows introduce transaction fees (Phase 3).

---

## 10. Integration Surface Compatibility

| Integration | Model 1 | Model 2 | Model 3 |
|---|---|---|---|
| Website Portal | ✓ | ✓ | ✓ |
| WhatsApp | ✓ | ✓ | ✓ |
| UPI | ✓ | ✓ | ✓ |
| HIS/ADT | ✕ | ✓ | ✓ |
| SSO/LDAP | ✕ | ✓ | ✓ |
| Insurance/TPA | ✕ | ✓ | ✓ |
| Government Systems | ✕ | ✓ | ✓ |

This aligns with GTM sequencing.

---

## 11. Tenant Isolation Strategies

Isolation moves from logical → physical:

| Model | Isolation |
|---|---|
| SaaS | logical |
| Hybrid | logical + network |
| On-Prem | physical + network |

This satisfies procurement tiers.

---

## 12. Security Boundary Impact

Security boundaries are shaped by deployment:

✔ SaaS → shared boundary with tenant-aware policies  
✔ Hybrid → split boundary + controlled ingress/egress  
✔ On-Prem → hospital boundary + external gateways

Hospital networks typically demand:

- egress restrictions
- ingress allowlist
- certificate pinning
- VPN tunnels
- audit reports

---

## 13. Summary

Deployment strategy supports scaling from:

> Clinic → Chain → Hospital → Government

without architecture rework.

Key properties preserved:

✔ low-cost MVP  
✔ chain analytics  
✔ hospital integration  
✔ compliance alignment  
✔ procurement-friendly  
✔ region-compatible  
✔ future insurance workflows

