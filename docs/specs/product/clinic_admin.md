# MyMedic — Clinic Admin & Staff Console Specification

## 1. Purpose

The Clinic Admin console is the **operational command surface** for outpatient clinics.  
It handles:

- booking
- scheduling
- deposit flows
- cancellations
- refunds
- reschedules
- follow-ups
- reconciliation
- branch settings
- pricing configuration (Phase 2)

Reception + Ops use it heavily during peak hours.

---

## 2. Primary Personas Supported

Clinic Admin console is used by:

✔ Reception  
✔ Ops Manager  
✔ Finance  
✔ Clinic Admin  
✔ Chain Ops (Phase 2)

Patients & doctors do **not** use this surface.

---

## 3. Operational Constraints (Real World)

Clinic floors have constraints:

- simultaneous phone calls
- walk-ins queuing
- WhatsApp buzzing
- doctor shift changes
- pricing questions
- payment issues
- cancellations handling

Console UX must support **split attention & rapid switching**.

---

## 4. Core Tabs / Modules (Phase 1)

Console includes:

1. **Booking Console**
2. **Calendar View**
3. **Payments**
4. **Refunds**
5. **Reschedule**
6. **Cancellation**
7. **Patient Profile**
8. **Follow-Ups**
9. **Receipts**
10. **Reports (basic)**

Phase 2 adds:

11. Chain Pricing
12. Chain Analytics
13. Staff Permissions
14. Multi-Branch Reconciliation

Phase 3 adds:

15. OPD admission referral
16. TPA/Insurance

---

## 5. Booking Console UI

Booking console supports:

**Inputs:**
- patient phone
- patient name
- visit type
- doctor
- branch
- date/time

**System auto detects:**
- returning patient
- pending balances
- follow-up eligibility
- pricing
- deposit rules

**Staff can override:**
- branch selection
- doctor selection
- deposit rules (permission)
- pricing (permission)

---

## 6. Calendar View

Calendar view is optimized for:

- density
- conflict resolution
- branch visibility
- doctor rotation

Filters:

- visit type
- doctor
- branch
- payment status
- follow-up
- tele vs in-clinic

Color coding communicates state:

| Status | Color |
|---|---|
| booked | green |
| deposit pending | yellow |
| tele | blue |
| cancelled | red |
| arrived | teal |
| completed | grey |
| follow-up due | purple |

---

## 7. Phone & Walk-in Workflow

Phone + walk-in represent 70–90% of clinic bookings.

Flow:

```
phone/walk-in → search patient → book → send payment link (optional) → confirm
```

Staff must be able to book without waiting for patient portal UX.

Payment link channel options:

✔ WhatsApp  
✔ SMS  
✔ None (in-clinic balance)

---

## 8. Payment Handling (PM3 Integration)

Staff console must support:

✔ add deposit  
✔ apply deposit  
✔ collect balance  
✔ refund deposit  
✔ waive (permissioned)  
✔ mark cash (optional)  
✔ mark UPI/card (POS)

Balance settlement triggers receipt issuance.

---

## 9. Cancellations & Refunds

Cancellation reasons:

- patient-driven
- doctor-driven
- clinic-driven
- branch-level
- contraindicated (doctor)
- equipment failure
- scheduling conflict

Refund behavior depends on:

- policies
- deposit state
- time windows

Policies are programmable at clinic/chain level.

---

## 10. Reschedule Logic

Reschedules require:

- permission to reschedule
- payment status validation
- policy adherence

Examples:

> <24h reschedule not allowed  
> deposit may be carried forward  
> new slot may require new deposit  

System proposes:

- next available slots
- doctor alternatives
- branch alternatives (chain only)

---

## 11. No-Show Handling

No-show classification:

```
no_show_patient
no_show_doctor
no_show_clinic
```

Annotation matters for analytics.

---

## 12. Follow-Up Management

Console supports:

- scheduling follow-ups
- marking follow-ups as completed
- triggering reminders
- viewing upcoming follow-ups

Follow-ups significantly increase LTV.

---

## 13. Patient Profile

Patient profile surfaces:

✔ demographics  
✔ past visits  
✔ payment history  
✔ follow-ups  
✔ notes (light, Phase 1)  
✔ referral source (optional)  
✔ allergies (Phase 2)  
✔ chronic conditions (Phase 2)  

Portal shows subset.

---

## 14. Receipts & Invoices

Receipts may include:

- consult
- procedure
- tele
- packages
- consumables (optional)

Receipts show:

✔ GST (optional)
✔ UPI reference
✔ card ref
✔ cash indication
✔ refund indication

Export:

✔ PDF download
✔ email
✔ WhatsApp

---

## 15. Reports & Reconciliation (Phase 1)

Basic reporting includes:

- daily collections
- payment mode mix
- deposit vs balance split
- refund log
- visit volume
- follow-ups due

Reconciliation across:

- UPI
- cash
- card

No insurance/TPA yet.

---

## 16. Chain Extensions (Phase 2)

Chain admin enables:

✔ multi-branch reconciliation  
✔ cross-branch doctor utilization  
✔ pricing control  
✔ dashboard & benchmarking  
✔ staff permissioning  
✔ branch performance variance  

Chains care deeply about variance:

```
Branch A yield: 81%
Branch B yield: 49%
```

Variance drives staffing and pricing decisions.

---

## 17. Permissions Model (Hybrid RBAC + ABAC)

Permissions apply across:

- role
- branch
- payment actions
- financial overrides

Examples:

```
reception: collect payment
ops: approve cancellation
finance: refund
chain_ops: override pricing
```

ABAC attributes include:

- branch_id
- clinic_id
- doctor_id
- city
- price_band
- visit_type

---

## 18. Multi-Channel Intake Handling

Console absorbs:

✔ phone intake  
✔ walk-in intake  
✔ portal handoffs  
✔ tele follow-ups  
✔ referral tickets  

Handoff from portal:

```
portal request → staff completes → confirm to patient
```

---

## 19. UX Constraints (India Outpatient)

Design characteristics:

✔ fast action buttons  
✔ forgiving error handling  
✔ no hard blockers  
✔ instant slot visibility  
✔ rapid policy override  
✔ fat-finger safe  
✔ high-contrast themes  
✔ large tap zones  
✔ low cognitive load  

Reception frequently multitasks with:

- WhatsApp
- phone
- walk-ins
- doctor queries

---

## 20. Not in Scope (Phase 1)

Explicitly excluded:

✖ clinical notes  
✖ prescriptions  
✖ lab orders  
✖ imaging  
✖ OPD admission  
✖ TPA insurance  
✖ materials mgmt  
✖ claim status  

These come in OPD/HIS phases.

---

## 21. Summary

The Clinic Admin console is the operational nerve layer for clinics and chains.

It unifies:

✔ scheduling  
✔ payments  
✔ follow-ups  
✔ patient identity  
✔ reconciliation

into a single staff surface.

This is where clinics **feel** the product working.

