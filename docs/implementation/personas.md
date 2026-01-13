# Personas

This document defines the primary and secondary personas for MyMedic Part 1 (Clinic + Chain Scheduling), including behavior, goals, tasks, and pain points.

---

## Persona 1: Receptionist (Front Desk)

**Environment**
- Desktop/Laptop (Web)
- Clinic/Chain front desk environment
- Often noisy + high footfall
- High time pressure

**Primary Goals**
- Find available slots
- Schedule/reschedule patients quickly
- Reduce waiting room congestion
- Keep doctors' calendars full
- Manage follow-ups
- Check patients in/out

**Secondary Goals**
- Reduce no-shows
- Reduce phone scheduling load
- Handle walk-ins efficiently

**Key Tasks**
- Book appointments (phone + walk-in)
- Reschedule appointments
- Cancel appointments
- Check-in patients
- Collect payment (Pay at Clinic mode)
- Trigger follow-up reminders

**Pain Points**
- Scheduling conflicts
- Doctor delays
- Walk-in surges
- Patient dissatisfaction
- Manual follow-ups
- Billing confusion

---

## Persona 2: Doctor

**Platforms**
- Mobile (Primary)
- Web (Secondary)

**Primary Goals**
- Know schedule for the day
- Minimize idle time
- Handle reschedules/no-shows gracefully
- Manage breaks/emergencies
- Ensure workload is manageable

**Secondary Goals**
- Control calendar availability
- Set follow-ups
- Mark completion states

**Key Tasks**
- View today's list
- Mark no-show
- Mark completed
- Block time (breaks, emergencies)
- Approve or request reschedule (optional)
- Request follow-up booking

**Pain Points**
- Overbooking
- Poor scheduling coordination
- No-shows without compensation
- Last minute changes
- Unpredictable queues

---

## Persona 3: Patient

**Platforms**
- Mobile (Primary)
- Web (Secondary)
- WhatsApp (Notifications)

**Primary Goals**
- Book appointment easily
- Avoid waiting
- Understand doctor availability
- Reschedule when needed
- Avoid unnecessary calls

**Secondary Goals**
- Compare times across locations
- Pay online when required
- Receive reminders

**Key Tasks**
- Search doctor/location
- Select slot
- Book appointment
- Pay (when applicable)
- Reschedule/cancel
- Receive reminders/updates

**Pain Points**
- Long queues
- Phone-only scheduling
- Lack of transparency
- No payment options
- Unclear cancellation policies

---

## Persona 4: Clinic Admin

**Platform**
- Web (Desktop)

**Primary Goals**
- Configure doctors + availability
- Enforce operational policies
- Drive utilization metrics
- Manage payments/refunds
- Audit logs

**Secondary Goals**
- Reduce no-show rate
- Optimize clinic revenue

**Key Tasks**
- Set doctor schedules
- Approve leave/overrides
- Configure payment policies (PM3)
- Manage deposits/refunds
- Review daily reconciliation
- View utilization metrics

---

## Persona 5: Chain Ops Manager

**Platform**
- Web (Desktop)

**Primary Goals**
- Standardize operations across clinics
- Drive performance improvements
- Configure global policies
- Centralize reporting

**Key Tasks**
- View cross-location analytics
- Configure telemedicine rules
- Configure deposit policies
- Configure cancellation/no-show rules

---

## Persona 6: System Admin (Internal)

**Platform**
- Web (Admin Panel)

**Goals**
- Manage tenants (clinics)
- Manage licenses
- Manage data isolation
- Audit logs
- Support onboarding

**Future Expansion**
This persona becomes important in Part 2–4 when:
- Hospitals demand VPN/VPC
- HIS integration starts
- ADT/OT scheduling begins

---

# Persona Summary Table

| Persona | Platform | Interaction Level | Scheduling Role |
|---|---|---|---|
| Receptionist | Web | High | Books |
| Doctor | Mobile/Web | Medium | Consumes + Modifies |
| Patient | Mobile/Web | Medium | Books (Self-Service) |
| Clinic Admin | Web | Medium | Configures |
| Chain Ops | Web | Low | Governs |
| System Admin | Web | Low | Supports |

---