# MyMedic — Integration Surfaces Architecture

## 1. Purpose

This document defines how MyMedic integrates with external systems across four categories:

1. Demand & Patient Interfaces (portal, WhatsApp, web)
2. Financial Interfaces (payments, reconciliation, refunds)
3. Clinical/Operational Interfaces (HIS/ADT, SSO, directories)
4. Analytical/Data Interfaces (warehouse, BI, exports)
5. Regulatory/Insurance Interfaces (TPA, NDHM, PHI exchange)

Integration strategy supports the roadmap:

> Clinic → Chain → Hospital → Insurance/TPA → Government

---

## 2. Integration Categories & Surfaces

### **A. Patient & Demand Interfaces**

These handle inbound demand:

✔ Portal
✔ WhatsApp
✔ Tele links
✔ Referral links
✔ Website embed
✔ QR posters
✔ SMS

Portal functions:

- browse doctors
- view pricing (configurable)
- book appointments
- pay deposits/tele fees
- manage cancellations/reschedules

Portal is REST-powered with tenant context.

---

### **B. Payment Interfaces**

Payments integrate via:

✔ UPI (primary)
✔ Card (secondary)
✔ Wallet (Phase 2 optional)
✔ Netbanking (optional)
✔ Refund rails (linked to original method)

Events emitted:

```
payment.initiated
payment.deposit.paid
payment.balance.paid
payment.refund.initiated
payment.refund.issued
```

Reconciliation requires:

✔ payment gateway API  
✔ settlement reports  
✔ refund status retrieval  

UPI is the key GTM wedge in India for OPD clinics.

---

### **C. Messaging Interfaces**

Messaging connects with:

✔ WhatsApp Business API
✔ SMS Gateways
✔ Email Providers

Use cases:

- confirmations
- reminders
- follow-up recall
- tele join links
- refund confirmations
- marketing (optional Phase 2)
- TPA claim updates (Phase 3)

WhatsApp elevates staff throughput & reduces no-shows.

---

### **D. Telemedicine Interfaces (Phase 2+)**

Tele workflows use:

- meeting provider (Jitsi/WebRTC/partner)
- token generation
- join links
- prepay enforcement

Tele signals:

```
tele.room.created
tele.session.started
tele.session.completed
tele.session.failed
```

Tele integrates with:

✔ portal  
✔ doctor mobile  
✔ payments (prepay)  
✔ follow-ups  

---

### **E. Website Integration (Demand GTM)**

Clinics/chains often want embedded booking widgets.

Supported surfaces:

- embed iframe
- JS widget
- redirect link
- QR code
- deep links (mobile-first)

Hospital OPD later may require:

- SSO-enabled patient portal
- integration with HIS/portal

---

### **F. Chain/Enterprise Analytics Interfaces**

Chains require BI integrations:

✔ warehouse exports
✔ OLAP connectors
✔ API for branch-level metrics
✔ data dictionary
✔ variance metrics
✔ reconciliation extracts

Warehouse engines supported:

- ClickHouse (default Phase 2)
- Snowflake/BigQuery/Redshift (phase-dependent)

BI tools supported:

- Tableau
- PowerBI
- Metabase
- Superset
- Looker (Phase 3)

---

### **G. HIS/ADT Interfaces (Hospital Phase)**

Hospital interoperability requires:

✔ patient identity mapping
✔ provider mapping
✔ department mapping
✔ service catalog mapping
✔ admission/discharge/transfer (ADT)
✔ billing handoff

ADT messages model OPD/clinic → IPD referral:

```
OPD Visit → Admission Order → Bed Assignment → Discharge → Billing → TPA/Claims
```

Interface engines handle:

✔ HL7 v2 (India hospitals mostly)
✔ FHIR (future adoption)
✔ CSV (still common in low-maturity IT hospitals)
✔ REST APIs (for modern HIS vendors)

---

### **H. Insurance/TPA Interfaces (Phase 3)**

TPA integrations require:

✔ preauth submission
✔ claim submission
✔ document bundles
✔ denial management
✔ payment settlement
✔ remittance advice

Events emitted:

```
claim.created
claim.submitted
claim.approved
claim.denied
claim.settled
```

These require replay for disputes.

---

### **I. NDHM/ABHA Interfaces (India Phase 2/3)**

Indian ABDM rails include:

✔ ABHA number linking
✔ consent artifacts
✔ FHIR exchange
✔ HIE submission
✔ facility/provider registry

Integration optional but strategic for:

- insurance
- government schemes
- patient portability
- national registries

---

### **J. SSO/Identity Interfaces**

Enterprise identity providers include:

✔ SAML
✔ LDAP
✔ OAuth2/OIDC
✔ Hospital AD/ADFS

Phase 2:

- SSO for hospital staff

Phase 3:

- federation for patient portals (optional)

---

### **K. Export Interfaces**

Exports required for:

✔ compliance
✔ billing
✔ finance
✔ clinical continuity
✔ insurance claims
✔ medico-legal requests

Formats supported:

✔ CSV
✔ XLSX
✔ PDF bundles
✔ FHIR resources (Phase 3)

---

## 3. Integration Timeline by Segment

| Segment | Integrations Required |
|---|---|
| Doctor | payments + WhatsApp + portal |
| Clinic | + reconciliation + BI exports |
| Chain | + warehouse + SSO + variance BI |
| Hospital OPD | + ADT + HIS + SSO |
| Hospital + Insurance | + TPA + claims |
| Government | + NDHM/ABHA |

This maps to GTM growth.

---

## 4. Integration Security

Integration security includes:

✔ signed webhooks  
✔ mTLS (Phase 3)  
✔ IP allowlisting (hospital)  
✔ replay protection  
✔ idempotency keys  
✔ payload validation  
✔ audit events  

Hospitals/TPAs require strict auditing.

---

## 5. Integration Observability

Integration metrics exposed:

✔ latency  
✔ retries  
✔ failures  
✔ delivery rate  
✔ settlement delay  
✔ refund time  
✔ claim adjudication time

Observability drives enterprise SLAs.

---

## 6. Integration Failure Handling

Failure modes use:

✔ dead-letter queues (DLQ)  
✔ retry with backoff  
✔ operator intervention dashboard  
✔ reconciliation workflows  

Healthcare cannot tolerate silent data loss.

---

## 7. Summary

Integration surfaces are critical for:

✔ GTM (portal, WhatsApp)
✔ Revenue (payments, reconciliation)
✔ Retention (follow-ups, tele)
✔ Enterprise (HIS/ADT/SSO)
✔ Insurance (TPA/Claims)
✔ Government (NDHM/ABHA)
✔ Analytics (Warehouse/BI)

Integration strategy enables MyMedic to scale:

> Clinic → Chain → Hospital → Insurance → Government

