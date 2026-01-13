# Device & Platform Matrix

This document defines how each persona interacts with MyMedic across device types for Part 1 (Clinic + Chain Scheduling).

---

## Supported Devices & Platforms

| Platform | Types | Notes |
|---|---|---|
| Web | Desktop, Laptop | Primary for Reception/Admin/Chain Ops |
| Mobile Web | Mobile Browser | Patient portal fallback |
| Mobile App | iOS, Android | Primary for Doctors |
| WhatsApp | Messaging | Notifications, reminders, confirmations |

---

## Persona x Platform Matrix

| Persona | Web (Desktop) | Web (Mobile) | Native Mobile | WhatsApp | Notes |
|---|---|---|---|---|---|
| Receptionist | ✔ Required | ✖ | ✖ | ✖ | High-volume scheduling |
| Doctor | ✔ Optional | ✔ Optional | ✔ Primary | ✔ Optional | Day schedule + status mgmt |
| Patient | ✔ Optional | ✔ Primary | ✖ (Phase 1) | ✔ Primary | Booking + reminders |
| Clinic Admin | ✔ Required | ✖ | ✖ | ✖ | Configuration-heavy tasks |
| Chain Ops | ✔ Required | ✖ | ✖ | ✖ | Reporting + policy mgmt |
| System Admin | ✔ Required | ✖ | ✖ | ✖ | Internal admin panel |

---

## UX Responsibilities per Device

### **Desktop/Web**
Ideal for:
- multi-doctor calendars
- multi-location views
- drag-and-drop scheduling
- billing/reconciliation
- configuration
- reporting

Used by:
- Reception
- Admin
- Chain Ops

---

### **Mobile App (Native)**
Ideal for:
- today view
- mobile workflows
- quick actions
- status updates
- follow-ups
- self-blocking
- limited scheduling adjustments

Used by:
- Doctors

---

### **Mobile Web**
Ideal fallback for:
- patients booking self-service
- confirmations
- payments (UPI/Card)

Fallback for:
- patients without app installed

---

### **WhatsApp**
Ideal for:
- reminders
- confirmations
- cancellations
- no-show follow-ups
- telemedicine coordination
- payment links (optional)
- rebooking links

Used by:
- Patients
- Doctors (optional in future)
- Reception (internal alerts optional later)

---

## Operational Decision Matrix

| Operation | Reception (Web) | Doctor (Mobile) | Patient (Portal) | Notes |
|---|---|---|---|---|
| Book Appointment | ✔ | ✖ | ✔ | PM3 rules apply |
| Reschedule | ✔ | ✖ | ✔ | Clinic can override |
| Cancel | ✔ | ✔ | ✔ | Refund policy applies |
| Check-In | ✔ | ✔ | ✖ | Clinic control |
| Mark No-Show | ✔ | ✔ | ✖ | Clinic policy |
| Mark Complete | ✖ | ✔ | ✖ | Doctor control |
| Collect Payment | ✔ | ✖ | ✔ | Based on PM3 rules |
| Configure Schedule | ✖ | ✔ | ✖ | Admin/Doctor workflow |
| Override Schedule | ✖ | ✔ | ✖ | Future chain override support |
| Leave Requests | ✖ | ✔ | ✖ | Admin approves |
| View Timeline | ✖ | ✔ | ✖ | Light view in Part 1 |

---

## Device Complexity by Persona

| Persona | Device Complexity | Reason |
|---|---|---|
| Reception | High | Drag-drop, multi-doc, billing |
| Doctor | Medium | Schedule consumption, status control |
| Patient | Low | Self booking, payments, reminders |
| Admin | Medium | Configuration-heavy |
| Chain Ops | Medium | Cross-location visibility |
| System Admin | Low | Internal tooling |

---

## Future Expansion Notes (Part 2–4)

To support hospitals, additional devices will be introduced:

- Tablet for wards
- Stationary kiosk for triage
- Workstation for OT scheduling
- SFTP/HL7 endpoints for ADT
- On-prem appliances (optional)
- Offline modes for IPD wards

These are outside Part 1 scope and documented in future layers.