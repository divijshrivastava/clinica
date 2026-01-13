# MyMedic — Patient Portal Specification (Hybrid Model)

## 1. Purpose

The patient portal enables **self-serve scheduling & payments** without forcing app installation.

The portal improves:

- booking conversion
- cancellation discipline
- follow-up adherence
- patient communication
- prepayment capture
- experience
- NPS

Portal is not just UX — it is a **revenue engine** for clinics & chains.

---

## 2. Model Chosen: Hybrid Portal

The hybrid model combines:

```
Portal + WhatsApp + Staff Overrides
```

Why hybrid matters:

- WhatsApp → communication + payments
- Portal → structured booking & follow-ups
- Staff → override & rescue operations

This matches India outpatient workflows.

---

## 3. Portal Entry Points

Patients enter portal via:

✔ WhatsApp link  
✔ SMS link (fallback)  
✔ website embed  
✔ QR posters at clinic  
✔ tele follow-up link  
✔ referral link  
✔ marketing campaigns  
✔ family booking link  

Family booking is important for:

- pediatrics
- oncology
- IVF
- dental
- seniors

---

## 4. Portal Functions (Phase 1)

Portal supports:

✔ browse availability  
✔ schedule appointments  
✔ tele consult scheduling  
✔ pay deposits  
✔ pay prepaid tele  
✔ receive receipts  
✔ follow-up rebooking  
✔ reschedule/cancel (policy-controlled)  

Portal does NOT support:

✖ upload medical docs  
✖ full EMR  
✖ tele chat  
✖ consultation notes  
✖ discharge summaries  

These are Phase 2–3.

---

## 5. Portal Constraints

Portal is not allowed to:

- override deposit rules
- override pricing
- override cancellation policies
- override branch selection (unless chain allows)

Staff can override these.

---

## 6. Portal Booking Flow

Portal booking flow:

```
select type → select branch → select doctor → select slot → payment → confirmation
```

Better UX variation for chains:

```
select reason → auto-map to doctor → slot → payment → confirmation
```

Example “reasons”:

- Consultation
- Crown
- Root canal
- Botox
- Chemical peel
- LASIK evaluation
- IVF consult
- Oncology review

Reason mapping is Phase 2 optimization.

---

## 7. Portal Pricing Behavior

Portal shows pricing for:

✔ consult  
✔ tele consult  
✔ procedures (optional transparent)  

Pricing transparency depends on clinic’s strategy:

- aesthetic clinics often transparent
- dental often transparent
- IVF rarely transparent
- oncology rarely transparent

Portal must support **partial transparency**:

```
price visible? [yes/no]
deposit visible? [yes/no]
deposit required? [yes/no]
```

---

## 8. Payment Integration (Portal Context)

Portal handles:

✔ tele prepaid  
✔ procedure deposit  
✔ follow-up prepaid (optional)  

In-clinic balances are not paid through portal in Phase 1.

---

## 9. Cancellation & Reschedule via Portal

Portal must respect policy:

- cancellation window
- reschedule window
- forfeiture rules
- limit reschedules
- no-show handling

Example:

```
Cancellations <24h → deposit forfeited
Reschedules <12h → not permitted
```

Portal enforces, staff override allowed.

---

## 10. Follow-Up Capture (High Yield)

Portal can schedule follow-ups with:

- recommended time windows
- auto-suggest slots
- doctor availability
- patient reminders

Follow-up capture increases:

✔ LTV  
✔ clinical adherence  
✔ chain revenue  

---

## 11. Notifications

Portal triggers notifications:

- booking confirmation
- deposit confirmation
- tele join link
- reminder
- cancellation
- reschedule
- balance due (staff-triggered)
- refund confirmation

WhatsApp is primary, email optional, SMS fallback.

---

## 12. Identity Model

Portal uses:

```
phone number → OTP identity
```

Optional add-ons:

- email link login
- family accounts
- corporate accounts

Future (optional):

- ABHA/NDHM linking
- Aadhaar eKYC (only if needed for insurance)

---

## 13. Branch Selection Logic (Chains)

For chains, branch selection flows:

```
auto-detect city → show branches → show doctors → show slots
```

Optional enhancements:

- nearest branch via location
- branch rating
- doctor rating
- procedure availability by branch

---

## 14. Doctor Selection Logic

Portal supports:

3 modes:

**Mode A — Patient selects doctor**  
Used in specialist clinics.

**Mode B — Patient selects reason**  
Clinic maps reason → doctor pool.

**Mode C — Ops assigns doctor (staff)**  
Portal creates request → staff schedules (rare).

Default for Phase 1: **Mode A + staff override**

---

## 15. Teleconsult Flow

Portal tele workflow:

```
select tele → pay prepaid → join link delivered
```

Doctor workflow:

```
receive push → click join → conduct consult → mark completed
```

Tele can be upgraded to:

- procedure
- clinic follow-up

Upgrade triggers staff workflow.

---

## 16. Portal Analytics Outputs

Portal drives:

- booking conversion rate
- no-show rate
- prepaid rate
- deposit capture rate
- cancellation rate
- branch-level conversion
- marketing attribution
- follow-up adherence

Portal also reveals:

```
source channel mix
```

Sources include:

- organic
- referral
- social
- website
- WhatsApp campaigns
- SEM/FB ads (chains)

---

## 17. Patient UX Constraints (India)

Portal assumptions for India:

✔ no app download  
✔ mobile-first  
✔ WhatsApp-first  
✔ low friction  
✔ price sensitivity  
✔ time sensitivity  

Patients won’t read manuals, won’t create accounts willingly, and won’t tolerate slow OTP flows.

---

## 18. Portal → Staff Handoffs

Failsafe paths:

If portal fails to book (edge cases), staff gets:

```
incomplete request → staff completes booking → confirms to patient
```

Examples:

- doctor unavailable
- slot conflict
- payment not completed
- portal timeout

Staff override ensures revenue is not lost.

---

## 19. Anti-Churn Impact

Portal reduces churn by:

✔ creating reactivation loops (follow-ups)  
✔ enabling patient self-service  
✔ reducing staff friction  
✔ standardizing experience across branches  

Portal → Follow-ups → Chain reporting is a retention flywheel.

---

## 20. Not in Scope (Phase 1)

Explicit exclusions (for clarity):

✖ clinical notes  
✖ medical docs upload  
✖ PACS/RIS  
✖ insurance claims  
✖ discharge summaries  
✖ NDHM integration

These belong to Phase 2/3 OPD expansion.

