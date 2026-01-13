# MyMedic — Devices & Channels Specification

## 1. Why Channels Matter
Outpatient clinics are multi-channel environments. Patient intent arrives via:

- phone
- walk-ins
- WhatsApp
- portal
- referrals
- marketing funnels

Software must absorb these channels without creating fragmentation.

MyMedic unifies these into a **single scheduling + payment surface**.

---

## 2. Device Matrix (Clinic-Side)

| Persona | Device | Usage Pattern |
|---|---|---|
| Business Owner | laptop/mobile | review dashboards, finance |
| Doctor | mobile | calendar, tele, overrides |
| Ops Manager | desktop/laptop | scheduling, analytics, pricing |
| Reception | desktop + phone | bookings, payments, refunds |
| Finance | desktop | reconciliation, export |
| Staff | desktop | confirmations, reschedules |

Notes:

- **Reception** almost always has a desktop + phone combo.
- **Doctors** are overwhelmingly mobile-first (especially specialists).
- **Finance** requires export capability (XLS, CSV, PDF).

---

## 3. Device Matrix (Patient-Side)

| Patient Segment | Device | Behavior |
|---|---|---|
| Urban | mobile | WhatsApp + portal |
| Tier-2/3 | mobile | WhatsApp-first |
| Corporate | mobile + desktop | portal + email |
| Senior | mobile | phone-based + family booking |
| Overseas | mobile | tele + prepaid |

India-specific insight:

> **Patients hate apps unless forced**  
Portal + WhatsApp is optimal.

---

## 4. Channel Surfaces (Booking Entry Points)

MyMedic supports 5 booking channels:

### **Channel 1 — Phone**
- dominant channel today
- reception books directly in console
- payment links can be sent via WhatsApp/SMS

### **Channel 2 — Walk-In**
- booked in console at front desk
- no digital friction
- still captured for analytics + follow-ups

### **Channel 3 — WhatsApp**
- inbound message → trigger portal
- outbound confirmations
- reminders + links

### **Channel 4 — Patient Portal**
- self-serve
- shows real availability + pricing
- clinic branding
- supports prepaid + deposit flows

### **Channel 5 — Referral**
- internal (doctor → doctor)
- external (partner clinics/hospitals)
- tracked for analytics (relatively rare elsewhere)

---

## 5. Channel Surfaces (Communication)

Communication channels differ from booking channels:

| Surface | Function |
|---|---|
| WhatsApp | confirmations, reminders, receipts |
| SMS | fallback |
| Email | invoices, summaries |
| Push | doctor mobile notifications |
| IVR (optional) | missed call → callback queue |
| Call | direct throughput |
| Portal | async interactions |

India-specific dependency:

> **WhatsApp is the clinic operating channel**

SMS is too transactional, email too “formal”.

---

## 6. Channel Surfaces (Payments)

Payments are multi-context:

| Channel | Use Case |
|---|---|
| WhatsApp | deposits, balances, refunds |
| Portal | prepaid teleconsults |
| In-Clinic | cash/card/UPI |
| IVR (optional) | not needed yet |

Payment mix (PM3 Hybrid):

```
prepaid (tele) + deposit (procedures) + balance (in-clinic)
```

---

## 7. Channel Surfaces (Follow-Ups)

Follow-up capture is critical for LTV.

Follow-ups triggered via:

- Doctor mobile app (M2)
- Portal reminders
- WhatsApp nudges
- Staff callbacks
- CRM (later if needed)

Follow-ups convert especially well in:

- dental
- derm
- oncology follow-up
- ortho rehab
- IVF cycles

---

## 8. Channel Surfaces (Teleconsult)

MyMedic does not include built-in tele infra in Phase 1.

Instead:

> **T2 — External Tele Join**

Patients receive:

```
WhatsApp link → Join in browser/app
```

Doctors receive:

```
Mobile notification → Join
```

This reduces build complexity.

---

## 9. Multi-Channel Coherence

All channels must converge into a single scheduling state machine:

> Slots have states: open → held → booked → arrived → completed → closed

This prevents:
- double booking
- overbooking
- ghost bookings
- staff confusion

---

## 10. Patient Identity Across Channels

Patients often move between channels:

Phone → Portal → Walk-In → Follow-Up → Tele → Referral

MyMedic maintains a unified identity via:

- phone number (primary key)
- optional email
- optional MRN
- optional NDHM/ABHA (later)
- optional family linking

---

## 11. Staff Identity Across Channels

Reception uses **desktop → phone** dual modality:

Desktop:
- scheduling
- payments
- refunds

Phone:
- WhatsApp interactions
- outbound links
- confirmations

---

## 12. Branch Context Across Channels

Chains introduce branch routing.

Portal must:

- detect nearby branches
- show availability by branch
- handle branch-specific pricing
- support branch override by staff

Branch routing rules vary:

- geo proximity
- specialty
- doctor
- patient preference

---

## 13. Mobile-First Doctor Constraint

Doctors require:

- push notifications
- reschedule controls
- override authority
- tele join links
- block time
- room/time exceptions (Phase 2+)

Doctor mobile becomes the **source of truth** for schedule integrity.

---

## 14. Mapping Channels to Personas

| Channel | Owner | Staff | Doctor | Patient |
|---|---|---|---|---|
| Phone | ✓ | ✓ | ✕ | ✓ |
| Portal | ✓ | ✓ | ✕ | ✓ |
| WhatsApp | ✓ | ✓ | ✓ | ✓ |
| Walk-In | ✓ | ✓ | ✕ | ✓ |
| Tele | ✓ | ✕ | ✓ | ✓ |
| In-Clinic Payment | ✓ | ✓ | ✕ | ✓ |

---

## 15. India-Specific Insights

Critical local insights:

1. **WhatsApp is OS for clinics**
2. **Desktop still dominant at reception**
3. **Doctors are impatient mobile users**
4. **Patients avoid app installation**
5. **UPI is default payment mental model**
6. **Reception must handle peak hour queues**
7. **Clinic chains are in growth mode**
8. **Cash-pay elective segments are booming**

MyMedic is designed around these realities.

