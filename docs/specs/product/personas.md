# MyMedic — Product Personas

## 1. Overview

Healthcare software fails when it treats all end-users as "clinic staff".  
MyMedic instead optimizes for **five distinct personas** with competing motivations:

- business owners
- doctors
- operations managers
- reception/staff
- patients

These personas drive design & GTM decisions.

---

## 2. Persona A — Business Owner (Director)

**Goals**
- maximize revenue per branch
- expand to new locations
- reduce cancellation leakage
- increase procedure conversion
- monitor performance (doctor + branch)

**KPIs**
- revenue per doctor
- revenue per branch
- utilization variance
- pricing compliance
- follow-up adherence

**Fears**
- wasted capacity
- bad patient experience
- unmonitored leakage
- churn to competitors
- chain inconsistency

**Constraints**
- time-poor
- delegated operations
- makes final purchasing decision

**Primary Modules Used**
- chain dashboards
- reconciliation
- pricing + catalog
- performance analytics

---

## 3. Persona B — Doctor (Medical Director + Consultant)

Doctors monetize **time + expertise**.

**Goals**
- fill calendar
- reduce no-shows
- manage procedures efficiently
- maintain clinical quality
- minimize administrative friction

**KPIs**
- utilization
- procedure conversion
- follow-ups completed
- patient NPS (soft)
- appointment punctuality

**Fears**
- schedule chaos
- double-booked rooms
- patients waiting excessively
- staff errors
- poor follow-up adherence

**Constraints**
- mobile-first
- impatient UX expectation
- hates admin work

**Primary Modules Used**
- doctor mobile calendar
- block/reschedule flows
- tele consult join
- follow-up scheduling
- overrides

---

## 4. Persona C — Ops / Branch Manager

Runs the day-to-day clinic logistics.

**Goals**
- maintain smooth throughput
- manage staff + rooms
- optimize doctor schedules
- ensure pricing compliance
- ensure patient experience

**KPIs**
- show-up rate
- wait times
- follow-ups capture
- scheduling conflicts
- overtime events

**Fears**
- doctor idle time
- bottlenecks + queues
- angry patients
- messy handovers
- mismatch between consult + procedure slots

**Constraints**
- multi-channel workflows (phone + walk-in + portal)
- moderate computer literacy

**Primary Modules Used**
- scheduling console
- portal override
- pricing
- packages
- reporting
- staff permissions

---

## 5. Persona D — Reception / Front Desk Staff

Handles most operational interactions with patients.

**Goals**
- book patients fast
- collect payments
- confirm appointments
- communicate changes
- handle refunds & balances

**KPIs**
- throughput per hour
- booking accuracy
- refund completion time
- cancellation capture
- payment collection rate

**Fears**
- slow systems
- long queues
- errors in scheduling
- angry patients at front desk

**Constraints**
- high switch cost
- often works across WhatsApp, phone, EMR, POS
- training must be minimal

**Primary Modules Used**
- booking console
- payment links
- refunds
- reschedule
- reconciliation
- WhatsApp triggered flows

---

## 6. Persona E — Patient

Patients have asymmetric information and high emotional load.

**Goals**
- easy booking
- clarity on price
- confirmation
- reminders
- follow-ups
- receipts

**KPIs**
- booking conversion
- follow-up adherence
- referral rate
- NPS

**Fears**
- price opacity
- no confirmation
- long wait times
- complex billing

**Constraints**
- WhatsApp-first
- mobile-first
- hates apps unless needed

**Primary Modules Used**
- patient portal
- payment flows
- receipts
- follow-up scheduling

---

## 7. Persona Hierarchy (Influence on Purchase)

Influence on purchase decision (clinic context):

```
Business Owner (Decider)
↑
Ops Manager (Evaluator)
↑
Doctor (Champion)
↑
Reception (User)
↑
Patient (Beneficiary)
```

Patients rarely choose software, but they **drive retention** and **word-of-mouth**.

---

## 8. Persona Hierarchy (Influence on Retention)

Retention hierarchy reverses:

```
Reception (Execution)
↑
Ops (Workflow)
↑
Doctor (Utilization)
↑
Patient (Experience)
↑
Owner (Financial)
```

If reception fails → doctors struggle → patients complain → revenue drops → owners churn.

MyMedic optimizes for all layers.

