# MyMedic — Payments Specification (PM3 Hybrid Model)

## 1. Purpose

Outpatient clinics lose money through:

- cancellations
- no-shows
- deferred balances
- leakage at front desk
- broken reconciliation
- refunds chaos

Payments are therefore a **clinical + operational + financial** problem, not just checkout.

PM3 hybrid introduces discipline & predictability.

---

## 2. PM3 — The Hybrid Model

MyMedic uses a **three-part payment structure**:

```
PM3 = Prepaid + Deposit + Balance
```

Mapped to visit types:

| Visit Type | Payment |
|---|---|
| Teleconsult | **Prepaid** |
| Procedure | **Deposit + Balance** |
| Consultation | **Balance** |
| Follow-Up | Fee/Discount/Free (configurable) |
| Post-Op | Free |
| Emergency | In-clinic |

This matches India outpatient patterns.

---

## 3. Payment Surfaces

Clinics receive payments via:

| Surface | Use Case |
|---|---|
| WhatsApp | deposit, balance, refund |
| Portal | prepaid tele, deposit |
| In-clinic | cash, card, UPI |
| Staff POS | optional |
| Chain-level | reconciliation |
| TPA | later (hospital) |

UPI-first mobile environment in India makes this seamless.

---

## 4. Payment States (State Machine)

Payment transitions:

```
UNPAID → HELD → PAID → SETTLED → RECONCILED
```

For refunds:

```
PAID → REFUND_REQUESTED → REFUNDED → RECONCILED
```

Deposits have unique states:

```
deposit_paid → deposit_forfeited | deposit_refunded | deposit_applied
```

These distinctions are mission-critical.

---

## 5. Deposits (Procedures)

Deposits reduce cancellations & no-shows.

Deposit rules include:

- amount (fixed or %)
- window (time before procedure)
- forfeiture rules
- refund eligibility
- expiry rules

Example configs:

```
50% deposit, forfeiture <24h before
₹2,500 deposit, refundable if cancelled >48h
```

Deposits apply to visit type, not doctor.

---

## 6. Balance (In-Clinic)

Balances typically cover:

- procedure cost minus deposit
- consumables (optional)
- upsells (packages, add-ons)
- medication/aftercare (optional)

Balance is collected **in-clinic** to avoid last-mile leakage.

Outcomes:

- balance paid (ideal)
- balance unpaid (leakage risk)
- balance partial (rare)
- balance waived (permission required)

Staff permissions enforce the last case.

---

## 7. Prepaid (Teleconsult)

Tele consult must be prepaid to commit the slot.

Flow:

```
portal → pay → book slot → join link → completion
```

Teleconsult prepaid:

- improves show-up rate massively
- avoids invoicing friction
- works globally for cross-border cases

---

## 8. Refunds (Business Logic)

Refund logic varies by clinic chain.

Refund triggers:

- cancellation
- doctor unavailability
- branch equipment failure
- procedure contraindication
- mispricing

Refund methods:

- original method (UPI/card)
- wallet (later phase)
- cash (discouraged for chains)

Refunds require:

```
authorization + documentation
```

Chains require multi-person authorization.

---

## 9. Reconciliation (Chain Level)

Chains care deeply about reconciliation.

Sources:

- UPI gateway
- cash drawer
- card POS
- refunds
- chargebacks
- reversals

Chains require reconciliation across:

- branch
- doctor
- visit type
- payment channel

This is where **MyMedic becomes hard to rip out**.

---

## 10. Transfer of Deposit (Applicability)

Deposits may transfer across:

| Scenario | Allowed? |
|---|---|
| Procedure → Procedure | Chain-configurable |
| Procedure → Consult | Rare |
| Consult → Procedure | Not needed |
| Branch → Branch | Chains only |
| Doctor → Doctor | Optional |
| Patient → Family | Rare (family linking) |

(Value retention is powerful for LTV.)

---

## 11. Payment & Slot Linking

Payment is linked to visit state machine.

Example for procedure:

```
slot_held → deposit_paid → booked
```

For tele:

```
slot_held → prepaid → booked
```

For walk-in consult:

```
slot_held → booked → arrived → balance_paid → completed
```

State machine integrity ensures analytics accuracy.

---

## 12. Staff Flows

Reception flows include:

- send payment link
- collect in-clinic payment
- refund payments
- settle balances
- override deposits (permission-gated)

Permissions vary by role:

```
reception: collect
ops: approve refunds
finance: reconcile
chain: override policies
```

---

## 13. Doctor Flows

Doctors have limited financial authority but important clinical authority:

Doctors can:

- approve cancellation classification (clinical vs patient-driven)
- trigger follow-ups
- classify no-shows
- tag exceptions

Doctors cannot:

- waive balances (chain decision)
- approve refunds (finance decision)

This prevents abuse.

---

## 14. Patient Flows

Patient flows are primarily:

- pay deposit (WhatsApp/Portal)
- pay teleconsult prepaid
- receive refund
- receive receipts
- view follow-up invoices (optional)

Patients do not need to install an app.

---

## 15. Pricing Framework

Pricing in outpatient care is multidimensional:

```
base_price
+ branch_modifier
+ doctor_modifier
+ chain_override
+ package_discount
```

Modifiers enable chain-level rollouts.

---

## 16. Analytics Outputs

Key financial KPIs:

- deposit capture rate
- prepaid rate
- balance collection rate
- refund rate
- leakage rate
- settlement time
- days-to-reconcile

Chains track:

```
branch_variance
doctor_variance
city_variance
specialty_variance
```

Variance unlocks operational optimization.

---

## 17. Why PM3 is a Wedge

PM3 affects:

✔ show-up rate  
✔ utilization  
✔ yield per slot  
✔ leakage  
✔ chain-level visibility  
✔ reconciliation  

Competitors often:

- charge subscriptions only
- ignore deposit flows
- ignore reconciliation
- do not link scheduling + payments
- do not separate consumables
- do not support chain finance roles

MyMedic specializes here.

---

## 18. Notes for Phase 2+

Hospital OPD/TPA will add:

- claims
- preauth
- deductions
- co-pay
- TPA SLAs

But PM3 remains valid for OPD.

