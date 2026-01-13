# MyMedic — Scheduling Specification (S1 Model)

## 1. Purpose

Scheduling is the primary clinical & financial primitive in outpatient care.

Scheduling must solve for:

- utilization (doctor time)
- throughput (patients/hour)
- yield (revenue per slot)
- clinical flow (consult → procedure)
- staff coordination
- cancellations/no-shows
- branch variation
- chain standardization

Scheduling is the **wedge** for MyMedic because it impacts revenue directly.

---

## 2. Scheduling Model

MyMedic uses **S1 — Time Slot Model**.

Slots represent:

- start/end time
- doctor availability
- branch location
- procedure duration
- room (optional, Phase 2+)

Slots are the core monetizable unit.

---

## 3. Slot States (State Machine)

Slots move through well-defined states:

```
OPEN → HELD → BOOKED → ARRIVED → COMPLETED → CLOSED
```

Additional transitions:

```
BOOKED → CANCELLED
BOOKED → RESCHEDULED
BOOKED → NO_SHOW
```

This ensures data integrity and analytics accuracy.

---

## 4. Slot Locking

Slot locking prevents double-booking.

When a slot is taken:

```
OPEN → HELD (soft lock, e.g. 5 min)
```

If payment required (deposit/prepay), then:

```
HELD → BOOKED on payment confirm
```

If no payment required (walk-in/phone):

```
HELD → BOOKED on staff confirmation
```

If hold expires:

```
HELD → OPEN
```

Portal shows **countdown timer** to avoid confusion.

---

## 5. Visit Types

MyMedic supports visit types:

| Type | Duration | Payment | Channel |
|---|---|---|---|
| Consultation | short | balance after | phone, portal, walk-in |
| Procedure | long | deposit/prepay | phone, portal, referral |
| Teleconsult | short | prepaid | portal |
| Follow-Up | short | no-fee or discounted | portal, phone, doctor |
| Post-Op | variable | no-fee | doctor, portal |
| Review | short | no-fee | doctor, ops |
| Emergency | variable | in-clinic | walk-in |

Duration is configurable per clinic/chain.

---

## 6. Doctor Availability

Doctors define **availability windows**:

```
weekly_hours = [
  { day: Mon, start: 10:00, end: 14:00 },
  { day: Mon, start: 17:00, end: 20:00 },
  ...
]
```

Overrides:

- vacations
- conferences
- surgeries
- emergencies

---

## 7. Branch Assignment

Doctors map to branches:

```
doctor_id → [branch_id_1, branch_id_2]
```

Branch variations matter due to:

- pricing
- equipment
- brand hierarchy
- staff availability

Example:

Derm doctor works at:
- Koramangala branch Mon
- Indiranagar Wed/Fri

---

## 8. Procedure Duration & Equipment

Procedures require **longer slots** and sometimes equipment.

Examples:

- dental implants (90m)
- laser hair removal (30–60m)
- botox (15m)
- IVF consult (30–60m)
- oncology follow-up (30–45m)

Duration must be configurable per clinic:

```
procedure.duration = 45min
```

Phase 2 introduces:

```
procedure.requires_room
procedure.requires_equipment
```

---

## 9. Pricing Integration (Chain Context)

Pricing often varies by:

- branch
- doctor seniority
- specialty
- city
- package

Model:

```
base_price
+ branch_modifier
+ doctor_modifier
+ chain_override
```

MyMedic supports:

- transparent pricing (portal)
- internal pricing (staff)
- package pricing (optional)

---

## 10. Staff Reservation Flows

Reception/ops can:

- book directly
- override portal settings
- apply discounts (if permitted)
- apply courtesy holds (e.g., VIPs)
- apply staff holds (pre-arrival)

Courtesy holds:

```
OPEN → HELD (staff-tagged)
```

Staff holds expire if not confirmed.

---

## 11. Channel Behavior Differences

### Phone Booking
- reception confirms slot
- deposit/payment link optional
- fastest throughput

### Portal Booking
- patient self-selects
- deposit enforced for procedures
- tele prepaid enforced

### Walk-In
- uses nearest open slot
- no portal friction
- no deposit unless procedure same day

### Doctor Block
- doctor may block time
- overrides staff
- reason captured

---

## 12. Follow-Up Scheduling

Follow-ups depend on specialty:

Dental:
- multiple follow-ups per procedure
- tied to package

Derm:
- laser-based multi-session protocols

Oncology:
- chronic follow-ups

IVF:
- complex sequencing

MyMedic supports follow-up rules:

```
followup_count
followup_interval
followup_validity
```

Example:

```
4 follow-ups over 60 days
```

Follow-ups auto-inserted into scheduling queue.

---

## 13. Rescheduling & Cancellation Rules

Clinics define policies:

- cancellation window
- reschedule window
- deposit forfeiture rules
- refund eligibility

Examples:

> cancellations <24h lose deposit  
> reschedules <12h require re-approval  
> procedures require 50% deposit  

These policies are attached to visit types.

---

## 14. No-Show Handling

No-show outcomes:

- deposit forfeited
- slot recorded as NS
- follow-up eligibility recalculated
- analytics updated

No-show is not cancellation.

---

## 15. Teleconsult Scheduling

Tele consult requires:

- prepaid
- join link
- time window

Flow:

```
portal → prepaid → slot booked → join link → completion
```

Doctor views in mobile calendar.

---

## 16. Multi-Branch Chains (Complexity)

Chains introduce new scheduling needs:

- doctor rotates across branches
- pricing varies
- equipment varies
- room availability varies
- marketing is centralized

Portal must:

- show nearest branch
- show availability by branch
- support cross-branch booking
- support branch override by staff

---

## 17. Resource Extensions (Phase 2+)

Future resource types:

```
rooms
chairs
lasers
labs
equipment
```

Resource locking example:

```
Implant procedure → 90m → surgical chair + equipment
```

---

## 18. Analytics Outputs

Scheduling feeds dashboards:

- utilization
- slot fill rate
- no-show rate
- cancellation rate
- doctor yield
- branch yield
- city yield
- channel mix
- reschedule % per visit type

Chains rely on variance:

```
branch A utilization: 82%
branch B utilization: 49%
```

Variance drives staffing decisions.

---

## 19. Constraints & Edge Cases

Real clinic edge cases:

✔ late arrivals  
✔ overlapping consult + procedure slots  
✔ doctor leaves early  
✔ doctor added mid-day  
✔ power outages  
✔ refund after balance paid  
✔ expiring deposits  
✔ patient switched specialty  
✔ group booking (rare but exists)  
✔ child/family linking  

Scheduling must gracefully degrade, not block.

---

## 20. Summary

Scheduling is not a calendar.  
Scheduling is a **financially sensitive, clinically constrained coordination system**.

MyMedic implements:

> **S1 — Time Slot Scheduling + PM3 Payments + Chain Overrides**

This is the wedge layer for outpatient digitization.

