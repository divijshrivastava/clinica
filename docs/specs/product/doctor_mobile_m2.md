# MyMedic — Doctor Mobile Specification (M2 Model)

## 1. Purpose

Doctors are the **financial bottleneck** and **clinical bottleneck** in outpatient clinics.

Doctor mobile solves:

- scheduling visibility
- time blocking
- overrides
- approvals
- tele consults
- follow-ups

Mobile is essential because doctors are:

✔ time-poor  
✔ impatient  
✔ mobile-first  
✔ decision-makers  

---

## 2. Model Chosen: M2 (Mobile-First + Calendar + Overrides)

M2 means:

- calendar-first UI
- approval workflows
- time blocking
- follow-ups
- notifications
- tele consult join

Doctors do **not** interact with deep billing or reconciliation in Phase 1.

---

## 3. Personas Supported

Doctor app supports:

✔ Surgeon / Specialist  
✔ Primary Consultant  
✔ Visiting Consultant  
✔ Chain-employed Consultant  

Different financial arrangements may exist (chain split, fixed, revenue-linked), but scheduling is identical.

---

## 4. Core Flows

Doctor app supports:

### **Flow 1: View Schedule**
- daily
- weekly
- branch filter
- visit details

### **Flow 2: Approve/Reject**
Used for:
- appointment requests (optional)
- reschedules
- cancellations (if clinical)

### **Flow 3: Override**
Doctors can override:
- slot type
- block time
- extend time

### **Flow 4: Tele Join**
Doctor can:
- join sessions
- mark completed

### **Flow 5: Follow-Up Scheduling**
Doctor can:
- trigger follow-ups
- attach recommended window

### **Flow 6: Notes Reminder**
Phase 1 notes are minimal:
- visit summary tags (optional)

Full EMR notes not in scope yet.

---

## 5. Information Density

Doctors need minimal info for decision-making:

Core fields shown:

✔ patient name  
✔ visit type  
✔ branch  
✔ payment status (deposit/tele)  
✔ time slot  
✔ reason (optional)  

Extended info (expandable):

- phone number
- previous visits
- allergies (optional)
- chronic conditions (optional)
- referral reason (optional)

---

## 6. Payment Visibility

Doctors see:

✔ deposit paid  
✔ tele prepaid  
✔ balance pending  

Doctors should **not** manage money.

Finance & staff handle money.

---

## 7. Calendar Views

Supported calendar views:

- day view (default)
- week scroll
- agenda list

Day view must show slot density by color.

Example:

Green = prepaid/confirmed  
Yellow = deposit pending (hold)  
Red outline = cancellation request  
Blue = tele  
Grey = follow-up

Colors convey financial & operational status.

---

## 8. Rescheduling Behavior

Doctors can trigger:

- reschedule suggestion
- staff completes the reschedule

Rationale:

> Doctors should not handle logistics.

---

## 9. Blocking Behavior

Doctors can block time with:

- reason
- scope (branch)
- duration

Block types:

- personal
- surgery (offsite)
- conference
- emergency
- travel

Blocking is core because:

- OPD scheduling competes with OT/surgery/rounds
- outpatient scheduling must reflect off-clinic realities

---

## 10. Teleconsult Behavior

Tele consult workflow:

```
Doctor → push notification → join → mark completed
```

Tele may then convert into:

- procedure
- in-clinic visit
- follow-up

Conversion is high in:

- dental
- derm
- oncology
- IVF

Portal & staff handle conversion scheduling.

---

## 11. Notifications

Doctor receives notifications for:

- new booking
- cancellation requests
- reschedule requests
- tele join
- follow-up due
- block conflicts
- branch scheduling conflicts

Notification surfaces:

✔ mobile push  
✔ WhatsApp (optional for tele join)  
✔ email (optional)

---

## 12. Exceptions Handling

Doctors trigger exceptions:

- "patient medically unfit"
- "contraindicated"
- "requires investigation"
- "upgrade to procedure"
- "requires referral"

Exceptions modify follow-up logic.

---

## 13. Follow-Up Logic

Doctors define follow-up:

- time window
- branch
- optional visit type

Example:

```
Follow-up in 7–10 days
```

Portal can auto-suggest slots within range.

High-value specialties use this heavily.

---

## 14. Chain Context Behavior

In chains, doctors may:

✔ work across branches  
✖ not know branch pricing  
✖ not know financial policy  

Staff & chain admin handle branch-specific rules.

---

## 15. Permissions on Mobile

Doctors can:

✔ view schedule  
✔ override blocks  
✔ approve/reschedule  
✔ trigger follow-ups  
✔ join tele  
✔ close visit  

Doctors cannot:

✖ waive deposits  
✖ waive balances  
✖ approve refunds  
✖ override pricing  
✖ create discounts  

Finance must retain control.

---

## 16. Analytics for Doctors

Doctors receive:

- utilization (weekly/monthly)
- procedure mix
- follow-up adherence
- cancellations
- no-shows

Analytics can influence behavior:

- if cancellations spike, adjust deposit rules
- if utilization low, adjust availability

---

## 17. Offline Constraint

Mobile app should be **offline tolerant** for:

- read-only schedule viewing
- tele join status
- block creation (queued)
- follow-up creation (queued)

Synchronization is required due to clinic network reliability variance.

---

## 18. Chain Expansion Leverage

Doctor app creates pull in chains:

- Doctors influence purchasing
- Doctors love mobile-first
- Hospitals follow doctor demand

This is the same pattern that scaled:

- NexHealth
- SimplePractice
- Halodoc
- Doctolib

---

## 19. Not in Scope (Phase 1)

Explicit exclusions:

✖ EMR/notes  
✖ imaging/PACS  
✖ e-prescription  
✖ lab orders  
✖ discharge summaries  
✖ billing  
✖ TPA  
✖ claims  

These belong to OPD/HIS phase.

---

## 20. Summary

Doctor mobile (M2) drives utilization, clinical integrity, and chain expansion.

It plays well with:

✔ PM3 → Payments  
✔ S1 → Scheduling  
✔ Hybrid Portal → Patient  
✔ Chain Analytics → Enterprise  

Doctors are kingmakers in healthcare — MyMedic aligns with that reality.

