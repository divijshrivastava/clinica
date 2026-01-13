# Workflows — Scheduling (Clinic + Chain)

This document defines the core workflows in both narrative form and diagrammatic flow. All flows assume PM3 Hybrid Payment Model and M2 Intermediate Doctor Mobile behavior.

---

# 1. Booking Workflow (Reception → Doctor)

## Primary Persona
Reception (Web)

## Secondary Persona
Patient (optional portal)
Doctor (calendar consumer)

## Preconditions
- Clinic is active
- Doctor is active
- Doctor has availability or override slot
- Patient exists or can be created ad-hoc

## Narrative Flow

1. Reception opens the Clinic Calendar (multi-doctor or single-doctor view)
2. Reception selects a time slot
3. System checks availability & conflicts
4. Reception searches for patient or creates a new profile
5. If PM3 requires online payment:
   - For Telemedicine → Mandatory prepay
   - For Procedures → Deposit mandatory
   - For First Consult → Pay at Clinic
6. System creates appointment in `Tentative` state if payment pending
7. After payment (if required) appointment becomes `Confirmed`
8. System sends confirmation via WhatsApp
9. Slot becomes visible in doctor's calendar

## States (Part 1)

Tentative → Confirmed → Completed
↘ Cancelled / No-Show

## Clinic Variants

- Walk-in bookings skip payment intention
- Doctor-initiated follow-ups bypass front desk
- Chain admins may override local policies

## Edge Cases

- Slot conflict
- Doctor on leave
- Doctor override block
- Double booking
- Patient late
- Payment failure
- Refund triggers

## SysML Flow Diagram (Mermaid)

```mermaid
flowchart TD
    A[Start Booking] --> B[Select Slot]
    B --> C[Lookup/Create Patient]
    C --> D{Payment Required?}
    D -->|Yes| E[Create Payment Intent]
    E --> F{Payment Success?}
    F -->|Yes| G[Create Confirmed Appointment]
    F -->|No| H[Cancel Tentative]
    D -->|No| G[Create Confirmed Appointment]
    G --> I[Notify Patient (WhatsApp)]
    I --> J[Display in Calendars]
    J --> K[End]


flowchart TD
    A[Start Portal] --> B[Select Doctor/Clinic]
    B --> C[View Availability]
    C --> D[Select Slot]
    D --> E{Payment Required?}
    E -->|Yes| F[Collect Payment]
    F --> G[Confirm Appointment]
    E -->|No| G[Confirm Appointment]
    G --> H[Notify via WhatsApp]


flowchart LR
    A[Drag Appointment] --> B[Target Slot]
    B --> C{Conflict?}
    C -->|Yes| D[Resolve Conflict]
    C -->|No| E[Apply Move]
    D --> E
    E --> F[Notify Patient]
    F --> G[Update Doctor Calendar]

flowchart TD
    A[Cancel Request] --> B[Check PM3 Rules]
    B --> C{Refund?}
    C -->|Yes| D[Trigger Refund]
    C -->|No| E[No Refund]
    D --> F[Notify Parties]
    E --> F
    F --> G[Free Slot]