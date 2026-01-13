# MyMedic — Operational Workflows Specification

## 1. Purpose

Outpatient clinics are workflow-driven.  
Workflows connect:

- patient behavior
- doctor availability
- staff actions
- payment rules
- chain governance

MyMedic's wedge is strongest when workflows are complete and profitable.

---

## 2. Workflow Taxonomy

We define 8 primary workflows:

1. Booking
2. Arrival
3. Consult
4. Procedure
5. Follow-Up
6. Teleconsult
7. Cancellation
8. Refund

We also define 4 support workflows:

9. Reschedule
10. Payment
11. Reconciliation
12. Reporting

These together form the outpatient lifecycle.

---

## 3. Workflow 1 — Booking

### Channels:
- Phone (reception)
- Walk-in
- Portal
- WhatsApp
- Referral (doctor/clinic)

### Slot state transitions:

```
OPEN → HELD → BOOKED
```

### Payment behavior by visit type:

| Visit | Payment |
|---|---|
| Consult | Balance (in-clinic) |
| Procedure | Deposit + Balance |
| Tele | Prepaid |
| Follow-up | Discount/Free config |
| Post-op | Free |
| Emergency | In-clinic |

### Success criteria:
✔ slot booked  
✔ confirmation sent  
✔ optional payment collected  
✔ doctor mobile updated  

---

## 4. Workflow 2 — Arrival (Clinic)

Arrival triggers queue logic:

```
BOOKED → ARRIVED
```

Arrival outcomes:

✔ check-in  
✔ update doctor queue  
✔ staff link patient to room (Phase 2)  

Arrival is critical for:

- wait time metrics
- throughput metrics
- no-show classification

Arrival is staff-driven, not portal-driven.

---

## 5. Workflow 3 — Consultation

Consultation workflow involves:

✔ doctor  
✔ patient  
✔ staff sequencing

Consult outcomes:

- follow-up required
- procedure scheduled
- tele scheduled
- referral out
- no further action

Consult → Procedure conversion is the big revenue driver in specialties like dental, derm, ortho, IVF, oncology.

---

## 6. Workflow 4 — Procedure

Procedures have:

- longer slot duration
- deposit requirements
- consumables (optional Phase 2)
- post-op follow-ups

Procedure sequence:

```
BOOKED → ARRIVED → COMPLETED → BALANCE PAYMENT
```

Procedures may trigger:

- post-op consult
- follow-up sessions
- package accounting (Phase 2)

---

## 7. Workflow 5 — Follow-Up

Follow-ups are the **highest retention & LTV engine**.

Follow-up creation sources:

- doctor mobile
- consult outcome
- procedure outcome
- oncology care plan
- IVF cycle plan

Follow-up path:

```
SCHEDULED → ARRIVED → COMPLETED
```

Revenue depends on specialty:

- oncology: high
- IVF: very high
- dental: moderate + packages
- derm: aesthetic cycles
- ortho: rehab cycles

---

## 8. Workflow 6 — Teleconsult

Teleconsult path:

```
PORTAL → PREPAID → BOOKED → JOIN → COMPLETED
```

Tele is a conversion engine for:

- cross-city patients
- second opinions
- out-of-country families
- IVF funnels
- oncology follow-up

Post-tele outcomes:

- schedule procedure
- schedule in-clinic consult
- schedule follow-up
- discharge

---

## 9. Workflow 7 — Cancellation

Cancellation sources:

✔ patient
✔ doctor
✔ clinic
✔ branch equipment failure
✔ chain scheduling optimization

Cancellation policy must encode:

- time windows
- fees
- deposit forfeiture
- refund eligibility

Cancellation path:

```
BOOKED → CANCELLED → (forfeit | refund)
```

Chains need cancellation reason coding.

---

## 10. Workflow 8 — Refund

Refund triggers:

✔ cancellation before window  
✔ equipment failure  
✔ doctor unavailable  
✔ branch redirected  
✔ contraindicated  
✔ pricing error  

Refund path:

```
PAID → REFUND_REQUESTED → REFUND_APPROVED → REFUNDED
```

Refund permissions:

- reception: request
- ops: approve
- finance: execute
- chain: override

Refund surfaces:

✔ UPI push  
✔ card reversal  
✔ wallet (Phase 2)  

---

## 11. Support Workflow — Reschedule

Reschedule path:

```
BOOKED → RESCHEDULED → BOOKED
```

Payment rules:

- deposits carry forward (config)
- tele prepaid → carry forward (default)
- balances unaffected

Reschedule is extremely common in dentistry, IVF, oncology.

Portal allows reschedule only within policy.

---

## 12. Support Workflow — Payment

Payment flows vary by visit type.

### Consult
Balance after consult

### Procedure
```
deposit → execution → balance
```

### Tele
```
prepaid → join → complete
```

Staff console supports:

✔ link payment  
✔ in-clinic payment  
✔ POS marking  
✔ refunding  
✔ partial payment (optional Phase 2)  

---

## 13. Support Workflow — Reconciliation

Reconciliation is chain's favorite feature.

Recon must break down by:

✔ branch  
✔ doctor  
✔ visit type  
✔ payment channel  
✔ UPI/card/cash  
✔ refunds  
✔ reversals  

Chains optimize:

- settlement times
- leakage
- branch variance
- doctor performance

Without reconciliation, chains don't adopt.

---

## 14. Support Workflow — Reporting

Reporting surfaces include:

**Operational**
- no-shows
- cancellations
- arrival vs booking

**Financial**
- deposit capture
- prepaid capture
- balance collection
- refunds
- reconciliation

**Clinical**
- follow-ups scheduled
- follow-ups completed

**Chain**
- branch variance
- doctor variance
- city variance

Variance is the money layer for chains.

---

## 15. Lifecycle Summary (Full OPD Flow)

Full standard outpatient lifecycle:

```
Lead → Booking → Payment (optional) → Arrival → Consult → Procedure → Follow-Up → Tele/Review → Discharge/Retention
```

Most clinics currently lose money between:

Booking → Arrival  
and  
Consult → Procedure  
and  
Procedure → Follow-Up  

MyMedic closes leakage in all 3.

---

## 16. Yield Extension Path

Yield grows when:

✔ deposits reduce cancellations  
✔ prepaid reduces no-shows  
✔ follow-ups increase LTV  
✔ tele expands geography  
✔ reconciliation reduces leakage  
✔ reporting optimizes pricing  

This creates clinical + financial network effects.

---

## 17. No-Shows & Cancellation Leakage

Leakage is a huge problem in India outpatient clinics.

Leakage can exceed:

- 15–35% in dental
- 20–40% in derm
- 30–60% in IVF funnels
- 50%+ in oncology second opinions

PM3 + portal reduces leakage significantly.

---

## 18. Chain-Specific Extensions (Phase 2)

Chain-additional workflows:

✔ multi-branch doctor rotation  
✔ branch referral routing  
✔ centralized pricing  
✔ centralized reconciliation  
✔ multi-branch procurement  
✔ performance benchmarking  
✔ city-level optimization  
✔ RM (relationship manager) assignment  

This is where expansion + ACV grows.

---

## 19. OPD/Hospital Extensions (Phase 3+)

Hospitals add workflows:

✔ triage  
✔ OPD queue  
✔ ADT referral  
✔ TPA preauth  
✔ OPD billing → IPD billing  
✔ discharge  
✔ claims & post-discharge  

But lifecycle structure remains similar.

---

## 20. Summary

Workflows are where MyMedic delivers its wedge:

> Scheduling → Payments → Portal → Follow-Up → Chain Reporting

Clinics grow revenue.  
Chains scale.  
Patients get continuity.  
Doctors get utilization.  
Investors get NRR.  

This flywheel is the foundation of MyMedic.

