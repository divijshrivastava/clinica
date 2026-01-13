# MyMedic — Onboarding Specification (Activation + Self-Serve + Sales-Assisted)

## 1. Purpose

Onboarding determines:

✔ product adoption  
✔ activation speed  
✔ revenue realization  
✔ churn risk  
✔ NPS outcomes  
✔ chain expansion potential  

OPD onboarding must support:

- **Independent doctors**
- **Small clinics**
- **Chains**
- **Hospitals (Phase 2 OPD)**

---

## 2. Onboarding Modes

MyMedic supports 3 onboarding modes:

### Mode A — Self-Serve (Independent + Small Clinics)

User signs up and configures:

✔ clinic info  
✔ doctors  
✔ schedule  
✔ pricing (optional later)  
✔ deposit rules  
✔ portal activation  

Goal: **first booking within <24 hours**

---

### Mode B — Assisted (Chains + Clinics)

Sales/Success teams create account and configure:

✔ clinic structure  
✔ branch mapping  
✔ doctor mapping  
✔ pricing  
✔ scheduling  
✔ deposits  
✔ portal  
✔ WhatsApp templates  
✔ payments  

Goal: **activation within <7–14 days**

---

### Mode C — Enterprise Managed (Hospital OPD)

Enterprise onboarding requires:

- procurement approval
- infosec review
- integration alignment (ADT/HIS)
- training
- SOP rollout

Goal: **activation within 60–120 days** (realistic for hospitals)

---

## 3. Onboarding Personas

Stakeholders vary by segment:

| Persona | Independent | Clinic | Chain | Hospital |
|---|---|---|---|---|
| Doctor | ✓ | ✓ | ✓ | ✓ |
| Owner/Director | ✕ | ✓ | ✓ | ✓ |
| Ops Manager | ✕ | ✓ | ✓ | ✓ |
| Reception | ✕ | ✓ | ✓ | ✓ |
| Finance | ✕ | ✕ | ✓ | ✓ |
| IT/Procurement | ✕ | ✕ | ✕ | ✓ |

Clinic onboarding becomes multi-stakeholder quickly.

---

## 4. Onboarding Goals

Primary activation goals differ by segment:

| Segment | Activation Definition |
|---|---|
| Independent Doctor | first consult booked |
| Clinic | first procedure deposit |
| Chain | multi-branch reconciliation |
| Hospital | OPD → IPD referral pathway |

This is critical — **activation ≠ signup**.

---

## 5. Onboarding Steps (System-Level)

### Step 1 — Account Creation
- via portal (self-serve)
- via onboarding console (assisted)

### Step 2 — Clinic Profile
- address
- specialties
- contact channels
- GST (optional)

### Step 3 — Doctor Setup
- doctors
- specialties
- branches
- schedules
- tele availability (optional)

### Step 4 — Pricing Setup
- consult fee
- tele fee
- procedure fee
- deposit rules
- refund rules

### Step 5 — Channel Activation
- WhatsApp templates
- Portal embed code
- QR posters (optional)
- website integration (optional)

### Step 6 — Payments Setup
- UPI gateway
- refund accounts
- branch accounts (chains)
- finance notifications

### Step 7 — Staff Access
- reception
- ops
- finance
- chain admin (chains)

### Step 8 — Go Live
- training (assisted)
- test bookings
- test refunds
- test tele join

---

## 6. Activation Milestones

Activation milestones are progressive:

| Stage | Milestone | Segment |
|---|---|---|
| M1 | scheduling enabled | all |
| M2 | portal booking enabled | clinic/chain |
| M3 | deposit capture | clinic/chain |
| M4 | reconciliation | chain |
| M5 | multi-branch | chain |
| M6 | OPD→IPD referral | hospital |
| M7 | TPA integration | hospital |

Independent doctors stop at M1–M2.

---

## 7. Time-to-Activation Targets

Targets based on real-world throughput:

| Segment | Target |
|---|---|
| Independent | < 1 day |
| Clinic | < 7 days |
| Chain | < 14–30 days |
| Hospital OPD | < 60–120 days |

Software should enforce **progressive disclosure** so clinics don’t get stuck.

---

## 8. Training Requirements

Training varies by persona:

✔ Reception → console flows  
✔ Ops → scheduling + pricing  
✔ Doctors → mobile + overrides  
✔ Finance → reconciliation  
✔ Chain Ops → analytics + variance  
✔ IT → integrations (hospital only)

Hospitals require certification workflows.

---

## 9. Migration Support

Migration paths vary by source system:

✔ spreadsheets → importer  
✔ legacy EMR → CSV importer  
✔ HIS → ADT integration (Phase 2)  
✔ OPD kiosks → queue mapping  

Migrated entities:

- patients
- appointments
- doctors
- pricing
- packages (Phase 2)

Migration must not block go-live.

---

## 10. Portal & Website Integration

Marketing surfaces:

✔ website embeds  
✔ QR posters  
✔ WhatsApp campaigns  
✔ referral codes  
✔ tele funnel links  

These drive portal adoption and reduce phone load.

---

## 11. WhatsApp Activation

WhatsApp activation requires:

✔ template approval  
✔ business verification  
✔ routing rules  
✔ finance binding  

Once activated, WhatsApp enables:

- confirmations
- reminders
- follow-ups
- deposit links
- tele join links
- refunds

This alone increases staff throughput.

---

## 12. Revenue Activation Playbook

Revenue activation focuses on:

✔ deposit for procedures  
✔ tele prepaid  
✔ follow-up adherence  
✔ reconciliation closure

These drive **MRR → NRR → Margin**

---

## 13. Enterprise Procurement (Hospital OPD)

Hospitals care about:

- infosec
- compliance
- patient safety
- auditability
- interoperability

Docs needed:

- product spec
- security whitepaper
- threat model
- integration spec (ADT/HIS)
- data retention policy
- SLA terms

Hospitals approve slowly — design onboarding accordingly.

---

## 14. Churn Prevention in Onboarding

Churn vectors appear in first 60–120 days:

- staff overwhelmed → stops usage
- doctor unhappy → vetoes system
- pricing misconfigured → revenue leakage
- deposits not enabled → no revenue uplift
- portal not activated → no demand uplift
- reconciliation not enabled → chain churn

Onboarding must address each.

---

## 15. Roles in Onboarding (Internal)

MyMedic onboarding roles:

| Role | Function |
|---|---|
| Product | activation metric |
| Success | configuration + training |
| Sales | procurement + commitment |
| Support | reactive fixes |
| Finance | billing |
| Integrations | hospital only |
| Migration | chain/hospital only |

---

## 16. KPIs for Onboarding

Onboarding measured by:

✔ time-to-first-booking  
✔ time-to-first-deposit  
✔ time-to-first-reconciliation  
✔ portal booking ratio  
✔ WhatsApp activation  
✔ follow-up adherence  
✔ branch activation count  
✔ chain activation count  

For investors:

✔ NRR → correlated with onboarding success

---

## 17. UX Principles

Onboarding UX principles:

✔ progressive disclosure  
✔ don’t block activation  
✔ allow partial configuration  
✔ allow staff overrides  
✔ support rescue workflows  
✔ support assisted modes  
✔ support enterprise validation  

---

## 18. Summary

Onboarding is not just signup.

Onboarding is how clinics:

✔ activate revenue  
✔ activate scheduling  
✔ activate portal  
✔ activate payments  
✔ activate reconciliation  
✔ activate chain governance  
✔ activate expansion

Good onboarding drives:

> ACV ↑ → NRR ↑ → churn ↓ → expansion ↑ → investor confidence ↑

