# Data Migration System - Complete Specification

**Version:** 1.0
**Date:** 2026-01-08
**Author:** Principal Product Engineer + UX Architect
**System:** Clinica Medical Management Platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Migration UX Design](#migration-ux-design)
3. [Pipeline Architecture](#pipeline-architecture)
4. [Assisted Migration Tools](#assisted-migration-tools)
5. [Data Validation Rules](#data-validation-rules)
6. [Coexistence Strategies](#coexistence-strategies)
7. [Security & Compliance](#security--compliance)
8. [Failure Modes & Recovery](#failure-modes--recovery)
9. [Phased Rollout Plan](#phased-rollout-plan)
10. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

### Problem Statement

New users of Clinica face a critical adoption barrier: they have existing patient data in various formats (Excel, CSV, legacy EMR/HIS systems) that must be migrated to continue operations. Without a robust migration system, users face:

- **Data loss risk**: Manual data entry errors and incomplete transfers
- **Downtime**: Cannot operate during migration period
- **Adoption friction**: Too complex to switch from existing systems
- **Compliance issues**: Patient data not properly validated or secured during transfer

### Solution Overview

A comprehensive, phased data migration system that supports:

1. **Self-service migration** (Independent Doctors): Upload Excel/CSV, validate, import
2. **Assisted migration** (Clinics): Guided wizard + validation assistance
3. **Enterprise migration** (Hospitals): Dedicated migration team + API integration + zero-downtime cutover

All migrations flow through an **event-sourced ingestion pipeline** that ensures:
- Data validation before commit
- Audit trail of all changes
- Rollback capability
- Coexistence with existing systems during transition
- HIPAA/GDPR compliance

### Key Principles

1. **Progressive Disclosure**: Show complexity only when needed for each persona
2. **Validate Early**: Catch errors before data enters the event store
3. **Zero Downtime**: Support parallel operation of old and new systems
4. **Audit Everything**: Every data change creates traceable events
5. **Fail Safely**: Errors stop the process, never corrupt data

---

## Migration UX Design

### Persona-Specific Flows

#### Persona 1: Independent Doctor (Self-Service)

**Context**: Solo practitioner, 50-500 patients, data in Excel/CSV, limited technical expertise

**Entry Points**:
1. Dashboard onboarding checklist: "Import Your Patients" (prominent if patients count = 0)
2. Navigation: Patients → "Import Data" button
3. Post-signup email: "Get Started: Import Your Patient List"

**Flow: Simple 4-Step Wizard**

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Choose Data Source                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📁 Upload Excel/CSV File                               │
│     ├─ Drag & drop or click to browse                   │
│     ├─ Supported: .xlsx, .csv (max 10 MB)              │
│     └─ Sample template: [Download]                      │
│                                                          │
│  🔗 Connect Google Sheets (Coming Soon)                │
│                                                          │
│  [Continue] (disabled until file uploaded)              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 2: Map Your Columns                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  We detected 250 rows in "patients.xlsx"                │
│                                                          │
│  Map your columns to Clinica fields:                    │
│                                                          │
│  Your Column          →  Clinica Field                  │
│  ────────────────────────────────────────               │
│  [Patient Name     ▼] →  Full Name (Required)          │
│  [Phone Number     ▼] →  Phone (Required)              │
│  [DOB              ▼] →  Date of Birth (Optional)      │
│  [Blood Group      ▼] →  Blood Type (Optional)         │
│  [Last Visit       ▼] →  (Not mapped)                  │
│                                                          │
│  + Add custom field mapping                             │
│                                                          │
│  [Back]  [Continue]                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 3: Review & Fix Issues                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Validation Results:                                     │
│                                                          │
│  ✅ 245 patients valid                                  │
│  ⚠️  3 warnings (missing optional data)                 │
│  ❌ 2 errors (must fix before import)                   │
│                                                          │
│  ──────────────────────────────────────────────────     │
│  ❌ Row 12: Invalid phone number "+91-XXXXXX"          │
│     [Edit: +91-                          ] [Fix]        │
│                                                          │
│  ❌ Row 47: Missing required field "Full Name"         │
│     [Name: _________________________ ] [Fix]            │
│                                                          │
│  ⚠️  Row 89: Date format unusual "15/13/2025"          │
│     Interpreted as: 2025-01-15  [Correct] [Change]     │
│                                                          │
│  [Download Error Report (.csv)]                         │
│  [Fix in File & Re-upload]  [Fix Here & Continue]      │
│                                                          │
│  [Back]  [Continue] (disabled until errors fixed)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 4: Confirm & Import                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Ready to import 247 patients                           │
│                                                          │
│  What will happen:                                       │
│  ✓ Patients will appear in your patient list            │
│  ✓ You can search and book appointments immediately     │
│  ✓ All data is encrypted and HIPAA-compliant           │
│  ✓ You can undo this import within 24 hours            │
│                                                          │
│  [☐] Send welcome SMS to all patients                  │
│      (Optional, costs ₹0.50 per SMS)                   │
│                                                          │
│  [Back]  [Start Import]                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Import In Progress...                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [████████████████░░░░░░░░] 187/247 (76%)              │
│                                                          │
│  Importing patient records...                           │
│  Estimated time remaining: 45 seconds                   │
│                                                          │
│  You can safely leave this page.                        │
│  We'll email you when import completes.                 │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ✅ Import Complete!                                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Successfully imported 247 patients                     │
│                                                          │
│  Next steps:                                             │
│  • [View Patients] to see your imported data            │
│  • [Book Appointment] to schedule visits                │
│  • [Send Broadcast] to announce your new system         │
│                                                          │
│  Need help? [Chat with Support]                         │
│                                                          │
│  [Go to Patients]  [Import More Data]                   │
└─────────────────────────────────────────────────────────┘
```

**Key UX Features**:
- **Instant validation**: Show errors before import starts
- **Smart defaults**: Auto-detect column mappings (90% accuracy expected)
- **In-line fixing**: Fix errors without re-uploading entire file
- **Progress visibility**: Real-time progress bar with time estimate
- **Safety net**: 24-hour undo period (soft delete + restore capability)

---

#### Persona 2: Small/Medium Clinic (Assisted Migration)

**Context**: 3-10 staff, 1,000-5,000 patients, some visit history needed, may have legacy software

**Entry Points**:
1. Post-signup: Assigned migration specialist schedules onboarding call
2. Dashboard: "Complete Your Migration" banner with call-to-action
3. Email sequence: Day 1, Day 3, Day 7 reminders with scheduler link

**Flow: 6-Step Guided Wizard with Support**

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Migration Planning                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Let's plan your data migration                         │
│                                                          │
│  What data do you want to migrate?                      │
│  [✓] Patient demographics (Required)                    │
│  [✓] Medical history & prescriptions                    │
│  [✓] Past visit records                                 │
│  [ ] Billing & payment history                          │
│  [ ] Lab reports & documents                            │
│                                                          │
│  Current system:                                         │
│  ( ) Excel/CSV files                                    │
│  (•) Legacy EMR software: [Practo         ▼]           │
│  ( ) Other: ___________________________                 │
│                                                          │
│  Timeline:                                               │
│  When do you want to go live?                           │
│  [Select Date: Jan 20, 2026 ▼]                         │
│                                                          │
│  💬 Your migration specialist: Priya Sharma             │
│     [Schedule Call] [Chat Now]                          │
│                                                          │
│  [Continue]                                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 2: Data Export Assistance                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Exporting from Practo                                   │
│                                                          │
│  Follow these steps to export your data:                │
│                                                          │
│  📹 [Watch Video Tutorial: 3:24]                        │
│                                                          │
│  Written Instructions:                                   │
│  1. Log in to Practo admin panel                        │
│  2. Go to Settings → Data Export                        │
│  3. Select "Patient List" and "Visit History"           │
│  4. Click "Generate Export" (may take 10-15 minutes)    │
│  5. Download the ZIP file when ready                    │
│                                                          │
│  Need help? Our team can:                               │
│  • [Request Data Export] - We'll contact Practo         │
│  • [Remote Support] - Screen share assistance           │
│                                                          │
│  Once you have the files:                               │
│  [Upload Files] (drag & drop or browse)                 │
│                                                          │
│  [Back]  [Continue]                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 3: Data Transformation                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  We're analyzing your files...                          │
│                                                          │
│  Files uploaded:                                         │
│  ✅ patients.csv (3,247 rows)                           │
│  ✅ visits.csv (18,392 rows)                            │
│  ✅ prescriptions.csv (12,104 rows)                     │
│                                                          │
│  Detected format: Practo Export v2.1                    │
│                                                          │
│  [████████████████████████] 100%                        │
│                                                          │
│  Analysis complete:                                      │
│  • 3,247 unique patients identified                     │
│  • 142 patients with duplicate phone numbers            │
│  • 18 patients have incomplete records                  │
│  • Date format: DD/MM/YYYY (will be converted)          │
│                                                          │
│  [View Detailed Analysis Report]                        │
│                                                          │
│  [Back]  [Continue to Validation]                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 4: Validation & Cleanup (Assisted)                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Data Quality Review                                     │
│                                                          │
│  🔴 Critical Issues (must fix): 18                      │
│  🟡 Warnings (recommended): 142                         │
│  🟢 Valid records: 3,087                                │
│                                                          │
│  ──────────────────────────────────────────────────     │
│  🔴 Missing Required Data                               │
│  18 patients missing phone numbers                       │
│  [View List] [Bulk Edit] [Request Specialist Help]     │
│                                                          │
│  🟡 Duplicate Phone Numbers                             │
│  142 phone numbers used by multiple patients             │
│  [Auto-Merge Similar Names]                             │
│  [Mark as Family Members]                               │
│  [Review Manually]                                       │
│                                                          │
│  🟡 Unusual Data Patterns                               │
│  23 patients over 100 years old (may be data errors)    │
│  [Review List] [Accept All]                             │
│                                                          │
│  ──────────────────────────────────────────────────     │
│                                                          │
│  💬 Priya Sharma recommends:                            │
│     "I can help clean up duplicates via call.           │
│      [Schedule 30-min Cleanup Session]"                 │
│                                                          │
│  [Download Issues Report]                               │
│  [Fix Automatically Where Possible] [Continue]          │
│                                                          │
│  [Back]  [Continue] (enabled once critical issues = 0)  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 5: Test Import (Sandbox)                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Before importing to your live system, let's test       │
│  with a small sample.                                    │
│                                                          │
│  Test Import Settings:                                   │
│  • Importing 50 random patients to sandbox              │
│  • Including 5 recent visits per patient                │
│  • No SMS/email notifications will be sent              │
│                                                          │
│  [Start Test Import]                                     │
│                                                          │
│  ──────────────────────────────────────────────────     │
│  After test import completes:                            │
│                                                          │
│  Tasks to verify:                                        │
│  [ ] Patient names and contact info are correct         │
│  [ ] Visit history displays properly                    │
│  [ ] Prescriptions linked to correct patients           │
│  [ ] Can book new appointment successfully              │
│  [ ] Can create new prescription for test patient       │
│                                                          │
│  [View Sandbox Dashboard]                               │
│                                                          │
│  Issues found?                                           │
│  [Report Problem] → Specialist will review & fix        │
│                                                          │
│  Everything looks good?                                  │
│  [Back]  [Approve & Go Live]                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 6: Production Import                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Ready to import 3,229 patients to production           │
│                                                          │
│  Migration Schedule:                                     │
│  Start time: [Jan 15, 2026 11:00 PM ▼]                 │
│  (Recommended: After clinic hours)                       │
│                                                          │
│  Estimated duration: 45-60 minutes                       │
│  Your clinic will remain accessible during import.       │
│                                                          │
│  Rollback Plan:                                          │
│  • Full backup created before import                    │
│  • Can rollback within 48 hours if issues found         │
│  • Old system data NOT deleted (you decide later)       │
│                                                          │
│  Support During Migration:                               │
│  [✓] Priya Sharma will monitor import                   │
│  [✓] 24/7 tech support available                        │
│  [✓] Emergency hotline: +91-XXXX-XXXXXX                │
│                                                          │
│  Post-Import:                                            │
│  [ ] Send welcome SMS to all patients                   │
│  [ ] Schedule staff training session                    │
│                                                          │
│  [Back]  [Schedule Import]                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Migration In Progress                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Import started at 11:03 PM                             │
│                                                          │
│  [████████████░░░░░░░░░░░░] 1,847/3,229 (57%)          │
│                                                          │
│  Current stage: Importing visit records                 │
│  Estimated completion: 11:42 PM                          │
│                                                          │
│  Status:                                                 │
│  ✅ Patient demographics imported                       │
│  ⏳ Visit history in progress...                        │
│  ⏸  Prescriptions (pending)                             │
│                                                          │
│  💬 Priya Sharma is monitoring this import              │
│                                                          │
│  [Pause Import] [View Logs] [Emergency Stop]            │
└─────────────────────────────────────────────────────────┘
```

**Key UX Features**:
- **Human support**: Migration specialist assigned at signup
- **Format detection**: Auto-detect Practo, Lybrate, other common EMR exports
- **Sandbox testing**: Test with sample data before production import
- **Scheduled import**: Run during off-hours to minimize disruption
- **Assisted cleanup**: Specialist helps resolve duplicates and data issues
- **Rollback safety**: 48-hour rollback window for assisted migrations

---

#### Persona 3: Large Hospital/Enterprise (Dedicated Migration)

**Context**: 50+ staff, 10,000+ patients, complex legacy HIS integration, compliance requirements

**Entry Points**:
1. Sales process: Migration plan included in SOW (Statement of Work)
2. Dedicated project manager + technical team assigned
3. Custom integration development if needed

**Flow: Enterprise Migration Portal**

```
┌─────────────────────────────────────────────────────────┐
│ Enterprise Migration Dashboard                          │
├─────────────────────────────────────────────────────────┤
│  Hospital: Apollo Chennai Central                       │
│  Project Manager: Rajesh Kumar (Clinica)                │
│  Client Lead: Dr. Venkat (CTO, Apollo Chennai)          │
│  Go-Live Date: March 1, 2026                            │
│                                                          │
│  Migration Progress: [████░░░░░░░░░░░░] 25% (Phase 1)  │
│                                                          │
│  ──────────────────────────────────────────────────     │
│  Phases:                                                 │
│                                                          │
│  ✅ Phase 0: Discovery & Planning (Completed)           │
│     - Legacy system audit completed                     │
│     - Data mapping finalized                            │
│     - API integration designed                          │
│                                                          │
│  ⏳ Phase 1: Development & Testing (In Progress)        │
│     [████████████░░░░] 75%                              │
│     • Custom HIS connector: 90% complete                │
│     • Data transformation pipelines: 85% complete       │
│     • Validation rules: 60% complete                    │
│     [View Technical Details]                            │
│                                                          │
│  ⏸  Phase 2: Pilot Migration (Cardiology Dept)         │
│     Scheduled: Feb 1, 2026                              │
│     500 patients, 2 weeks parallel operation             │
│                                                          │
│  ⏸  Phase 3: Phased Rollout (5 departments)            │
│     Scheduled: Feb 15 - Feb 28, 2026                    │
│                                                          │
│  ⏸  Phase 4: Full Production Cutover                   │
│     Scheduled: March 1, 2026                             │
│                                                          │
│  ──────────────────────────────────────────────────     │
│  Actions:                                                │
│  [Upload Documents] [Schedule Meeting] [View Reports]   │
│  [Access Sandbox] [Review SLA] [Contact Team]           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Phase 1: Custom Integration Development                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Legacy System: Cerner Millennium (v2018.01)            │
│                                                          │
│  Integration Method:                                     │
│  (•) Direct Database Access (Read-only)                 │
│  ( ) HL7 v2.x Message Interface                         │
│  ( ) FHIR API                                            │
│  ( ) CSV Export/Import                                   │
│                                                          │
│  Database Credentials (Encrypted):                       │
│  Host: [cerner-prod-db.apollo.local]                    │
│  Port: [1433]                                            │
│  Database: [APOLLO_EMR]                                  │
│  Read-Only User: [clinica_readonly]                     │
│  [Test Connection] ✅ Connected                          │
│                                                          │
│  Data Scope:                                             │
│  [✓] Patient demographics (PATIENT table)               │
│  [✓] Encounter/Visit data (ENCOUNTER table)             │
│  [✓] Diagnoses (DIAGNOSIS table)                        │
│  [✓] Medications (MEDICATION_ORDER table)               │
│  [✓] Lab results (LAB_RESULT table)                     │
│  [ ] Imaging/DICOM (Not in scope)                       │
│                                                          │
│  Extraction Schedule:                                    │
│  ( ) One-time bulk extraction                           │
│  (•) Continuous sync (CDC - Change Data Capture)        │
│      Frequency: [Every 15 minutes ▼]                    │
│                                                          │
│  [Save Configuration] [Run Test Extract]                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Data Transformation Pipeline Builder                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Pipeline: Patient Demographics                          │
│                                                          │
│  Source: Cerner PATIENT table                           │
│  Destination: Clinica patients aggregate                 │
│                                                          │
│  Transformations:                                        │
│                                                          │
│  1. [Extract] → SELECT * FROM PATIENT WHERE             │
│                 LAST_UPDATED > :last_sync_time          │
│                                                          │
│  2. [Transform] → Apply mapping rules:                  │
│     Cerner.PAT_NAME → Clinica.full_name                 │
│     Cerner.PAT_DOB → Clinica.date_of_birth              │
│     Cerner.PAT_MRN → Clinica.medical_record_number      │
│     [Edit Mapping Rules]                                 │
│                                                          │
│  3. [Validate] → Check required fields:                 │
│     • full_name not null                                │
│     • phone matches +91-XXXXXXXXXX pattern              │
│     • date_of_birth < today                             │
│     [Edit Validation Rules]                              │
│                                                          │
│  4. [Generate Event] → patient_created or               │
│                        patient_updated                   │
│                                                          │
│  5. [Project] → Update patients read model              │
│                                                          │
│  Test Run:                                               │
│  [Extract 100 Samples] [Run Full Pipeline] [View Logs]  │
│                                                          │
│  [Save Pipeline] [Deploy to Staging]                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Pilot Migration: Cardiology Department                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Pilot Scope:                                            │
│  • 500 patients from cardiology department              │
│  • 2 doctors: Dr. Reddy, Dr. Malhotra                   │
│  • 3 nurses: Staff IDs 1023, 1045, 1089                 │
│  • Duration: 2 weeks (Feb 1-14)                         │
│                                                          │
│  Coexistence Strategy:                                   │
│  ┌──────────────┐         ┌──────────────┐             │
│  │ Cerner (OLD) │◄────────┤  Sync Layer  │             │
│  │  Read/Write  │         │  (Real-time) │             │
│  └──────────────┘         └───────┬──────┘             │
│         │                          │                     │
│         │                          ▼                     │
│         │                  ┌──────────────┐             │
│         └─────────────────►│ Clinica (NEW)│             │
│                             │  Read/Write  │             │
│                             └──────────────┘             │
│                                                          │
│  How it works:                                           │
│  • Doctors use ONLY Clinica for these patients          │
│  • Changes in Clinica sync back to Cerner (1-way)       │
│  • If sync fails, Clinica queues changes                │
│  • Old workflows fallback to Cerner if needed           │
│                                                          │
│  Success Criteria:                                       │
│  [ ] All 500 patients migrated successfully             │
│  [ ] Zero data loss (verified via checksum)             │
│  [ ] < 5 sync failures per day                          │
│  [ ] Doctor satisfaction score > 4/5                    │
│  [ ] <2 second page load times                          │
│                                                          │
│  [Start Pilot] [View Monitoring Dashboard]              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Monitoring Dashboard (Real-Time)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  System Health: 🟢 All Systems Operational              │
│                                                          │
│  Migration Metrics (Last 24h):                           │
│  ┌────────────────────────────────────────────────┐    │
│  │ Patients Synced:     487 / 500 (97.4%)        │    │
│  │ Events Generated:    3,245                     │    │
│  │ Sync Failures:       2 (0.06%)                 │    │
│  │ Avg Sync Latency:    1.3 seconds               │    │
│  │ Data Discrepancies:  0                         │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  Active Alerts:                                          │
│  🟡 Warning: Sync queue backing up (47 pending)         │
│     Likely cause: Cerner DB slow response               │
│     [View Details] [Auto-Resolve] [Escalate]            │
│                                                          │
│  Recent Activity:                                        │
│  • 11:34 AM - Patient P-4521 updated (Dr. Reddy)       │
│  • 11:32 AM - Visit V-9923 created (Cardiology OPD)    │
│  • 11:29 AM - Sync completed: Batch #447 (50 records)  │
│  [View Full Activity Log]                               │
│                                                          │
│  Data Quality Checks:                                    │
│  ✅ All patients have valid MRNs                        │
│  ✅ No duplicate phone numbers                          │
│  ✅ 100% of prescriptions linked to valid visits        │
│  [Run Full Audit]                                        │
│                                                          │
│  [Download Daily Report] [Schedule Review Call]         │
└─────────────────────────────────────────────────────────┘
```

**Key UX Features**:
- **Dedicated portal**: Separate enterprise migration dashboard
- **Custom integration**: Build connectors for any legacy system
- **Pilot testing**: Start with one department, validate before expanding
- **Coexistence mode**: Both systems run in parallel during transition
- **Real-time monitoring**: 24/7 dashboard showing sync status and data quality
- **SLA guarantees**: Contractual uptime and data accuracy commitments

---

## Pipeline Architecture

### Overview: Extract → Transform → Validate → Event → Projection

All migrations flow through a unified pipeline that ensures data quality and auditability.

```
┌───────────────────────────────────────────────────────────────┐
│                    MIGRATION PIPELINE                          │
└───────────────────────────────────────────────────────────────┘

   ┌──────────┐
   │  SOURCE  │
   │  ▪ CSV   │
   │  ▪ Excel │
   │  ▪ API   │
   │  ▪ DB    │
   └────┬─────┘
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │ STAGE 1: EXTRACT                                  │
   ├──────────────────────────────────────────────────┤
   │ • Parse file format (CSV, XLSX, JSON)            │
   │ • Connect to external system (API/DB)            │
   │ • Stream data in batches (1000 records/batch)    │
   │ • Store in staging table: migration_raw_data     │
   │ • Create extraction audit log                    │
   └────┬────────────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │ STAGE 2: TRANSFORM                                │
   ├──────────────────────────────────────────────────┤
   │ • Apply column mapping rules                      │
   │ • Normalize data formats:                         │
   │   - Dates: YYYY-MM-DD                            │
   │   - Phones: E.164 format (+91XXXXXXXXXX)         │
   │   - Names: Title case, trim whitespace           │
   │ • Enrich data (e.g., infer gender from name)     │
   │ • De-duplicate using fuzzy matching              │
   │ • Store in: migration_transformed_data           │
   └────┬────────────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │ STAGE 3: VALIDATE                                 │
   ├──────────────────────────────────────────────────┤
   │ • Required field checks                           │
   │ • Format validation (regex, date ranges)         │
   │ • Business rule validation                        │
   │ • Cross-reference checks (e.g., doctor exists)   │
   │ • Flag warnings vs errors                         │
   │ • Store results in: migration_validation_errors  │
   │                                                   │
   │ IF ERRORS: STOP PIPELINE → User fixes issues    │
   │ IF WARNINGS ONLY: Continue (optional approval)   │
   └────┬────────────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │ STAGE 4: GENERATE EVENTS                          │
   ├──────────────────────────────────────────────────┤
   │ For each valid record:                            │
   │ • Generate command (create-patient, etc.)        │
   │ • Call command bus → Command handler             │
   │ • Command handler emits event(s)                 │
   │ • Events stored in: event_store                  │
   │ • Link migration_id to events for traceability   │
   │ • Batch commits (100 events/transaction)         │
   └────┬────────────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │ STAGE 5: PROJECT TO READ MODELS                   │
   ├──────────────────────────────────────────────────┤
   │ • Projection workers consume events              │
   │ • Update read models (patients, visits tables)   │
   │ • Update search indexes (Elasticsearch)          │
   │ • Eventual consistency: 1-3 second lag           │
   │ • Monitor projection lag via metrics             │
   └────┬────────────────────────────────────────────┘
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │ STAGE 6: POST-IMPORT VERIFICATION                │
   ├──────────────────────────────────────────────────┤
   │ • Compare source row count vs events generated   │
   │ • Run data quality checks                        │
   │ • Generate migration report                      │
   │ • Send notification to user                      │
   │ • Mark migration as: completed / failed          │
   └──────────────────────────────────────────────────┘
```

### Technical Components

#### 1. Migration Service

**Location**: `/backend/src/services/MigrationService.ts`

**Responsibilities**:
- Orchestrate the 6-stage pipeline
- Manage migration jobs (create, pause, resume, cancel)
- Track progress and emit status updates via WebSocket
- Handle errors and retries

**Key Methods**:
```typescript
class MigrationService {
  async startMigration(migrationId: string): Promise<void>
  async pauseMigration(migrationId: string): Promise<void>
  async resumeMigration(migrationId: string): Promise<void>
  async cancelMigration(migrationId: string): Promise<void>
  async rollbackMigration(migrationId: string): Promise<void>
  async getMigrationStatus(migrationId: string): Promise<MigrationStatus>
}
```

#### 2. Extractors (Pluggable)

Each source type has a dedicated extractor:

- `CSVExtractor`: Parse CSV files (handles encoding, delimiters)
- `ExcelExtractor`: Parse XLSX files (multiple sheets supported)
- `APIExtractor`: Pull data from REST APIs (OAuth, pagination)
- `DatabaseExtractor`: Direct DB access (read-only, streaming queries)
- `HL7Extractor`: Parse HL7 v2.x messages (for hospital integrations)

**Interface**:
```typescript
interface Extractor {
  extract(source: Source, batchSize: number): AsyncGenerator<Record[]>
  validate(source: Source): Promise<ValidationResult>
  getEstimatedRowCount(source: Source): Promise<number>
}
```

#### 3. Transformers (Rule-Based)

**Transformation Rules** stored in database:

```sql
CREATE TABLE migration_transformation_rules (
  id UUID PRIMARY KEY,
  migration_id UUID NOT NULL,
  source_field VARCHAR(255) NOT NULL,
  target_field VARCHAR(255) NOT NULL,
  transformation_type VARCHAR(50), -- map, normalize, calculate, enrich
  transformation_config JSONB, -- { "format": "YYYY-MM-DD", "default": null }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Built-in Transformations**:
- `DateNormalizer`: Convert any date format to ISO-8601
- `PhoneNormalizer`: Convert to E.164 format
- `NameNormalizer`: Title case, remove extra spaces
- `GenderInferrer`: Infer gender from first name (Indian names)
- `BloodGroupMapper`: Map variations ("O+ve" → "O+")

#### 4. Validators (Configurable)

**Validation Rules** stored in database:

```sql
CREATE TABLE migration_validation_rules (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50), -- patient, visit, prescription
  field_name VARCHAR(255),
  rule_type VARCHAR(50), -- required, regex, range, unique, reference
  rule_config JSONB,
  severity VARCHAR(20), -- error, warning
  error_message TEXT
);
```

**Example Rules**:
```sql
-- Patient phone must be valid Indian number
INSERT INTO migration_validation_rules VALUES (
  gen_random_uuid(),
  'patient',
  'phone',
  'regex',
  '{"pattern": "^\\+91[6-9]\\d{9}$"}',
  'error',
  'Phone number must be a valid Indian mobile number'
);

-- Patient age should be reasonable
INSERT INTO migration_validation_rules VALUES (
  gen_random_uuid(),
  'patient',
  'date_of_birth',
  'range',
  '{"min_date": "1900-01-01", "max_date": "today"}',
  'warning',
  'Date of birth seems unusual - please verify'
);
```

#### 5. Event Generator

Converts validated records into commands:

```typescript
class MigrationEventGenerator {
  async generateEventsForPatient(
    patientData: TransformedPatient,
    migrationContext: MigrationContext
  ): Promise<Command[]> {
    const commands: Command[] = [];

    // Create patient
    commands.push({
      command_type: 'create-patient',
      aggregate_type: 'patient',
      aggregate_id: patientData.id || uuidv4(),
      payload: {
        hospital_id: migrationContext.hospital_id,
        full_name: patientData.full_name,
        phone: patientData.phone,
        date_of_birth: patientData.date_of_birth,
        // ... other fields
      },
      metadata: {
        caused_by: 'migration',
        migration_id: migrationContext.migration_id,
        source_record_id: patientData.source_id,
        user_id: migrationContext.initiated_by_user_id,
      },
    });

    // If patient has past visits, create those too
    if (patientData.visits && patientData.visits.length > 0) {
      patientData.visits.forEach((visit) => {
        commands.push({
          command_type: 'create-visit',
          aggregate_type: 'visit',
          // ...
        });
      });
    }

    return commands;
  }
}
```

**Key Feature**: All events have `migration_id` in metadata for traceability

#### 6. Progress Tracker

Real-time progress updates via WebSocket:

```typescript
interface MigrationProgress {
  migration_id: string;
  status: 'pending' | 'extracting' | 'transforming' | 'validating' | 'importing' | 'completed' | 'failed';
  current_stage: string;
  total_records: number;
  processed_records: number;
  success_count: number;
  error_count: number;
  warning_count: number;
  estimated_completion_time: Date | null;
  errors: ValidationError[];
}

// Emit progress every 100 records
io.to(`migration-${migrationId}`).emit('progress', progress);
```

### Database Schema for Migrations

```sql
-- Main migrations table
CREATE TABLE migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  initiated_by_user_id UUID NOT NULL REFERENCES users(id),
  migration_type VARCHAR(50) NOT NULL, -- csv, excel, api, database
  status VARCHAR(50) NOT NULL, -- pending, in_progress, completed, failed, rolled_back
  entity_types TEXT[], -- ['patient', 'visit', 'prescription']
  source_config JSONB, -- { file_path, api_endpoint, db_connection, etc. }
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Raw extracted data (temporary staging)
CREATE TABLE migration_raw_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL, -- Original data as extracted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transformed data (ready for validation)
CREATE TABLE migration_transformed_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
  raw_data_id UUID NOT NULL REFERENCES migration_raw_data(id),
  entity_type VARCHAR(50) NOT NULL, -- patient, visit, prescription
  transformed_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation errors and warnings
CREATE TABLE migration_validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
  transformed_data_id UUID NOT NULL REFERENCES migration_transformed_data(id),
  row_number INTEGER NOT NULL,
  field_name VARCHAR(255),
  severity VARCHAR(20) NOT NULL, -- error, warning
  error_code VARCHAR(100),
  error_message TEXT NOT NULL,
  suggested_fix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping of source records to generated events
CREATE TABLE migration_event_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES migrations(id),
  source_record_id UUID NOT NULL, -- ID from migration_transformed_data
  event_id UUID NOT NULL, -- ID from event_store
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_migrations_hospital ON migrations(hospital_id);
CREATE INDEX idx_migrations_status ON migrations(status);
CREATE INDEX idx_migration_raw_data_migration ON migration_raw_data(migration_id);
CREATE INDEX idx_migration_transformed_migration ON migration_transformed_data(migration_id);
CREATE INDEX idx_migration_validation_migration ON migration_validation_errors(migration_id);
CREATE INDEX idx_migration_event_map_migration ON migration_event_map(migration_id);
```

### API Endpoints

```typescript
// Start new migration
POST /api/migrations
Body: {
  migration_type: 'csv' | 'excel' | 'api' | 'database',
  source_config: { /* varies by type */ },
  entity_types: ['patient', 'visit'],
  transformation_rules: [ /* optional custom rules */ ]
}
Response: { migration_id: UUID }

// Upload file for migration
POST /api/migrations/:id/upload
Content-Type: multipart/form-data
Body: file=@patients.csv

// Get migration status
GET /api/migrations/:id

// Get validation errors
GET /api/migrations/:id/errors?severity=error

// Fix validation error
PATCH /api/migrations/:id/errors/:error_id
Body: { corrected_value: "new value" }

// Start import (after validation passes)
POST /api/migrations/:id/import

// Pause migration
POST /api/migrations/:id/pause

// Resume migration
POST /api/migrations/:id/resume

// Rollback migration (within rollback window)
POST /api/migrations/:id/rollback

// Get migration report
GET /api/migrations/:id/report
```

---

## Assisted Migration Tools

For enterprise customers, we provide assisted tools to simplify complex migrations.

### 1. Legacy System Connectors (Pre-Built)

**Supported Systems**:
- Practo (India's most popular clinic management software)
- Lybrate
- Cerner Millennium
- Epic (HL7 interface)
- Custom: Build connector for any system

**Connector Package Structure**:
```
/backend/src/migration/connectors/
  /practo/
    - PractoExtractor.ts
    - PractoTransformer.ts
    - mapping-config.json
    - README.md (setup instructions)
  /cerner/
    - CernerExtractor.ts
    - CernerHL7Parser.ts
    - mapping-config.json
```

**Example: Practo Connector**

```typescript
// /backend/src/migration/connectors/practo/PractoExtractor.ts

export class PractoExtractor implements Extractor {
  async extract(source: PractoSource, batchSize: number) {
    // Practo export is ZIP file with multiple CSVs
    const zipPath = source.file_path;
    const zip = new StreamZip.async({ file: zipPath });

    // Extract patients.csv
    const patientsCSV = await zip.entryData('patients.csv');
    const patients = await this.parseCSV(patientsCSV);

    // Extract visits.csv
    const visitsCSV = await zip.entryData('visits.csv');
    const visits = await this.parseCSV(visitsCSV);

    // Merge patients with their visits
    const merged = this.mergePatientVisits(patients, visits);

    // Yield in batches
    for (let i = 0; i < merged.length; i += batchSize) {
      yield merged.slice(i, i + batchSize);
    }
  }

  private mergePatientVisits(patients: any[], visits: any[]) {
    // Group visits by patient_id
    const visitsByPatient = _.groupBy(visits, 'patient_id');

    return patients.map(patient => ({
      ...patient,
      visits: visitsByPatient[patient.id] || [],
    }));
  }
}
```

### 2. Smart De-duplication Engine

**Problem**: Legacy systems often have duplicate patient records (same person, multiple IDs)

**Solution**: Fuzzy matching algorithm to detect and merge duplicates

```typescript
interface DuplicateCandidate {
  record_id_1: string;
  record_id_2: string;
  match_score: number; // 0-100
  matching_fields: string[];
  suggested_action: 'auto_merge' | 'review' | 'ignore';
}

class DeduplicationEngine {
  async findDuplicates(records: Patient[]): Promise<DuplicateCandidate[]> {
    const candidates: DuplicateCandidate[] = [];

    // Strategy 1: Exact phone match
    const byPhone = _.groupBy(records, 'phone');
    Object.values(byPhone).forEach(group => {
      if (group.length > 1) {
        // Check if names are similar
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const similarity = this.nameSimilarity(
              group[i].full_name,
              group[j].full_name
            );

            if (similarity > 0.85) {
              candidates.push({
                record_id_1: group[i].id,
                record_id_2: group[j].id,
                match_score: similarity * 100,
                matching_fields: ['phone', 'name'],
                suggested_action: similarity > 0.95 ? 'auto_merge' : 'review',
              });
            }
          }
        }
      }
    });

    // Strategy 2: Fuzzy name match with similar DOB
    // (Levenshtein distance, phonetic matching)
    // ... implementation

    return candidates;
  }

  private nameSimilarity(name1: string, name2: string): number {
    // Use Jaro-Winkler distance for name comparison
    return jaroWinkler(name1.toLowerCase(), name2.toLowerCase());
  }
}
```

**UX**: Show duplicates in a review interface

```
┌─────────────────────────────────────────────────────────┐
│ Potential Duplicates Found: 47                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Duplicate #1 (Match: 94%)                               │
│                                                          │
│ Record A (Row 23)          Record B (Row 156)           │
│ ──────────────────────    ────────────────────────      │
│ Name: Rajesh Kumar         Name: Rajesh Kumarr          │
│ Phone: +91-9876543210      Phone: +91-9876543210        │
│ DOB: 1985-03-15            DOB: 1985-03-15              │
│ Address: HSR Layout        Address: (not provided)      │
│                                                          │
│ Suggested Action: Merge (keep Record A, discard B)      │
│                                                          │
│ [✓ Auto-Merge] [Review Manually] [Keep Both]            │
│                                                          │
│ ────────────────────────────────────────────────────    │
│                                                          │
│ Duplicate #2 (Match: 87%)                               │
│ ...                                                      │
│                                                          │
│ [Process All Auto-Merges (34)] [Review All (13)]        │
└─────────────────────────────────────────────────────────┘
```

### 3. Data Enrichment Services

Automatically enhance incomplete data:

**A. Phone Number Validation & Formatting**
- Use libphonenumber library to validate and format
- Detect country code
- Mark invalid numbers as warnings

**B. Address Standardization**
- Use Google Maps Geocoding API to standardize addresses
- Extract: street, city, state, postal code, country
- Store latitude/longitude for mapping features

**C. Gender Inference**
- For Indian names, use name-to-gender mapping database
- Accuracy: ~85% for common names
- Mark as "inferred" in metadata

**D. Medical Code Mapping**
- If legacy system uses ICD-9, convert to ICD-10
- If diagnoses are free-text, suggest ICD-10 codes using NLP

```typescript
class DataEnrichmentService {
  async enrichPatient(patient: Partial<Patient>): Promise<EnrichedPatient> {
    const enriched: EnrichedPatient = { ...patient };

    // Enrich phone
    if (patient.phone) {
      const phoneUtil = PhoneNumberUtil.getInstance();
      try {
        const parsed = phoneUtil.parse(patient.phone, 'IN');
        enriched.phone = phoneUtil.format(parsed, PhoneNumberFormat.E164);
        enriched.phone_valid = phoneUtil.isValidNumber(parsed);
      } catch (e) {
        enriched.phone_valid = false;
      }
    }

    // Enrich address
    if (patient.address) {
      const geocoded = await this.geocodingService.geocode(patient.address);
      if (geocoded) {
        enriched.address_structured = geocoded.address_components;
        enriched.latitude = geocoded.geometry.location.lat;
        enriched.longitude = geocoded.geometry.location.lng;
      }
    }

    // Infer gender from name
    if (!patient.gender && patient.full_name) {
      const firstName = patient.full_name.split(' ')[0];
      enriched.gender = this.genderInferrer.infer(firstName);
      enriched.gender_inferred = true;
    }

    return enriched;
  }
}
```

### 4. Sandbox Environment

Every assisted migration gets a sandbox environment for testing:

**Features**:
- Full copy of Clinica application
- Pre-loaded with test data from migration
- Isolated database (does not affect production)
- Auto-deleted after 30 days

**Provisioning**:
```typescript
class SandboxService {
  async createSandbox(migrationId: string): Promise<SandboxEnvironment> {
    // Create isolated database schema
    const sandboxDb = `sandbox_${migrationId}`;
    await db.query(`CREATE DATABASE ${sandboxDb}`);

    // Copy application tables
    await this.cloneSchema('clinica_template', sandboxDb);

    // Import sample data from migration (first 100 records)
    await this.importSampleData(migrationId, sandboxDb, limit: 100);

    // Generate sandbox URL
    const sandboxUrl = `https://sandbox-${migrationId}.clinica.com`;

    // Deploy sandbox instance (Docker container)
    await this.deploySandboxInstance(sandboxDb, sandboxUrl);

    return {
      sandbox_id: migrationId,
      url: sandboxUrl,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      credentials: {
        email: 'admin@sandbox.local',
        password: 'sandbox123',
      },
    };
  }
}
```

---

## Data Validation Rules

Comprehensive validation ensures data quality before it enters the event store.

### Validation Rule Categories

#### 1. Required Field Validation

Ensures critical fields are present:

```typescript
const requiredFieldRules: ValidationRule[] = [
  {
    entity: 'patient',
    field: 'full_name',
    rule: 'required',
    severity: 'error',
    message: 'Patient name is required',
  },
  {
    entity: 'patient',
    field: 'phone',
    rule: 'required',
    severity: 'error',
    message: 'Phone number is required',
  },
  {
    entity: 'patient',
    field: 'date_of_birth',
    rule: 'required',
    severity: 'warning', // Optional but recommended
    message: 'Date of birth is recommended for age-based features',
  },
  {
    entity: 'visit',
    field: 'patient_id',
    rule: 'required',
    severity: 'error',
    message: 'Visit must be linked to a patient',
  },
  {
    entity: 'visit',
    field: 'visit_date',
    rule: 'required',
    severity: 'error',
    message: 'Visit date is required',
  },
];
```

#### 2. Format Validation

Ensures data matches expected patterns:

```typescript
const formatRules: ValidationRule[] = [
  {
    entity: 'patient',
    field: 'phone',
    rule: 'regex',
    pattern: '^\\+91[6-9]\\d{9}$',
    severity: 'error',
    message: 'Phone must be valid Indian mobile number (+91XXXXXXXXXX)',
  },
  {
    entity: 'patient',
    field: 'email',
    rule: 'regex',
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
    severity: 'warning',
    message: 'Email format appears invalid',
  },
  {
    entity: 'patient',
    field: 'blood_type',
    rule: 'enum',
    allowed_values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    severity: 'warning',
    message: 'Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-',
  },
];
```

#### 3. Range Validation

Ensures values are within reasonable bounds:

```typescript
const rangeRules: ValidationRule[] = [
  {
    entity: 'patient',
    field: 'date_of_birth',
    rule: 'date_range',
    min_date: '1900-01-01',
    max_date: 'today',
    severity: 'warning',
    message: 'Date of birth seems unusual (before 1900 or in future)',
  },
  {
    entity: 'patient',
    field: 'age',
    rule: 'number_range',
    min: 0,
    max: 120,
    severity: 'warning',
    message: 'Age should be between 0 and 120',
  },
  {
    entity: 'visit',
    field: 'visit_date',
    rule: 'date_range',
    min_date: '2000-01-01', // No visits before system existed
    max_date: 'today',
    severity: 'error',
    message: 'Visit date cannot be in the future or before 2000',
  },
];
```

#### 4. Business Logic Validation

Ensures data follows business rules:

```typescript
const businessRules: ValidationRule[] = [
  {
    entity: 'visit',
    field: 'visit_date',
    rule: 'custom',
    validator: async (visit) => {
      // Visit date cannot be before patient's date of birth
      const patient = await db.query(
        'SELECT date_of_birth FROM patients WHERE id = $1',
        [visit.patient_id]
      );

      if (patient.rows[0]?.date_of_birth) {
        const visitDate = new Date(visit.visit_date);
        const dobDate = new Date(patient.rows[0].date_of_birth);

        if (visitDate < dobDate) {
          return {
            valid: false,
            message: 'Visit date cannot be before patient\'s date of birth',
          };
        }
      }

      return { valid: true };
    },
    severity: 'error',
  },
  {
    entity: 'prescription',
    field: 'dosage',
    rule: 'custom',
    validator: (prescription) => {
      // Dosage should be reasonable (e.g., not "1000 tablets")
      const dosageMatch = prescription.dosage.match(/(\d+)/);
      if (dosageMatch) {
        const quantity = parseInt(dosageMatch[1], 10);
        if (quantity > 100) {
          return {
            valid: false,
            message: 'Dosage quantity seems unusually high - please verify',
            severity: 'warning',
          };
        }
      }
      return { valid: true };
    },
  },
];
```

#### 5. Referential Integrity Validation

Ensures foreign keys reference valid records:

```typescript
const referentialRules: ValidationRule[] = [
  {
    entity: 'visit',
    field: 'patient_id',
    rule: 'foreign_key',
    references: {
      table: 'patients',
      column: 'id',
    },
    severity: 'error',
    message: 'Patient ID does not exist in system',
  },
  {
    entity: 'visit',
    field: 'doctor_id',
    rule: 'foreign_key',
    references: {
      table: 'users',
      column: 'id',
      where: "role = 'doctor'",
    },
    severity: 'error',
    message: 'Doctor ID must reference a valid doctor user',
  },
  {
    entity: 'prescription',
    field: 'visit_id',
    rule: 'foreign_key',
    references: {
      table: 'visits',
      column: 'id',
    },
    severity: 'error',
    message: 'Prescription must be linked to a valid visit',
  },
];
```

### Validation Engine Implementation

```typescript
class ValidationEngine {
  async validateRecord(
    entity: string,
    record: any,
    rules: ValidationRule[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const rule of rules) {
      if (rule.entity !== entity) continue;

      const value = record[rule.field];

      // Apply validation based on rule type
      switch (rule.rule) {
        case 'required':
          if (!value || value === '') {
            this.addError(errors, warnings, rule, 'Value is required');
          }
          break;

        case 'regex':
          if (value && !new RegExp(rule.pattern!).test(value)) {
            this.addError(errors, warnings, rule, rule.message);
          }
          break;

        case 'enum':
          if (value && !rule.allowed_values!.includes(value)) {
            this.addError(
              errors,
              warnings,
              rule,
              `Value must be one of: ${rule.allowed_values!.join(', ')}`
            );
          }
          break;

        case 'date_range':
          if (value) {
            const date = new Date(value);
            const minDate = rule.min_date === 'today' ? new Date() : new Date(rule.min_date!);
            const maxDate = rule.max_date === 'today' ? new Date() : new Date(rule.max_date!);

            if (date < minDate || date > maxDate) {
              this.addError(errors, warnings, rule, rule.message);
            }
          }
          break;

        case 'number_range':
          if (value !== null && value !== undefined) {
            if (value < rule.min! || value > rule.max!) {
              this.addError(
                errors,
                warnings,
                rule,
                `Value must be between ${rule.min} and ${rule.max}`
              );
            }
          }
          break;

        case 'foreign_key':
          if (value) {
            const exists = await this.checkForeignKey(rule.references!, value);
            if (!exists) {
              this.addError(errors, warnings, rule, rule.message);
            }
          }
          break;

        case 'custom':
          if (rule.validator) {
            const result = await rule.validator(record);
            if (!result.valid) {
              this.addError(errors, warnings, rule, result.message!);
            }
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private addError(
    errors: ValidationError[],
    warnings: ValidationError[],
    rule: ValidationRule,
    message: string
  ) {
    const error: ValidationError = {
      field: rule.field,
      severity: rule.severity,
      message,
      rule_type: rule.rule,
    };

    if (rule.severity === 'error') {
      errors.push(error);
    } else {
      warnings.push(error);
    }
  }

  private async checkForeignKey(ref: ForeignKeyReference, value: any): Promise<boolean> {
    const whereClause = ref.where ? `AND ${ref.where}` : '';
    const query = `SELECT 1 FROM ${ref.table} WHERE ${ref.column} = $1 ${whereClause} LIMIT 1`;
    const result = await db.query(query, [value]);
    return result.rows.length > 0;
  }
}
```

### Validation Configuration API

Allow users to customize validation rules:

```typescript
// GET /api/validation-rules?entity=patient
// Returns all validation rules for patient entity

// POST /api/validation-rules
// Create custom validation rule
Body: {
  entity: 'patient',
  field: 'medical_record_number',
  rule: 'regex',
  pattern: '^MRN-\\d{6}$',
  severity: 'error',
  message: 'Medical record number must match format: MRN-XXXXXX'
}

// PATCH /api/validation-rules/:id
// Update existing rule (e.g., change severity from error to warning)

// DELETE /api/validation-rules/:id
// Delete custom rule (built-in rules cannot be deleted)
```

---

## Coexistence Strategies

During migration, both old and new systems may need to run in parallel. This section defines strategies for coexistence.

### Strategy 1: Read-Only Coexistence (Simplest)

**Use Case**: Independent doctors, small clinics during trial period

**How It Works**:
- Old system: Continue using for day-to-day work
- Clinica: Import historical data, read-only mode
- User can browse imported data but cannot edit or create new records in Clinica

**Timeline**: 1-2 weeks evaluation period

**UX**:
```
┌─────────────────────────────────────────────────────────┐
│ ℹ️  You're in Read-Only Mode                            │
├─────────────────────────────────────────────────────────┤
│  Your data has been imported successfully!              │
│                                                          │
│  Browse patients and past visits to verify data quality.│
│  You cannot create new appointments yet.                │
│                                                          │
│  When you're ready to go live:                          │
│  [Switch to Full Mode]                                   │
└─────────────────────────────────────────────────────────┘
```

---

### Strategy 2: One-Way Sync (Old → New)

**Use Case**: Clinics with 2-4 week migration period

**How It Works**:
- Old system: Primary system (read/write)
- Clinica: Secondary system (read/write)
- Sync direction: Old → New (nightly batch sync)
- Data created in Clinica does NOT sync back to old system

**Timeline**: 2-4 weeks parallel operation, then cutover

**Architecture**:
```
┌──────────────┐      Nightly Sync       ┌──────────────┐
│ Old System   │ ───────────────────────► │   Clinica    │
│  (Primary)   │       (Read-Only)        │ (Secondary)  │
│              │                           │              │
│ Read/Write   │                           │ Read/Write   │
└──────────────┘                           └──────────────┘
       ▲                                          │
       │                                          │
       └──────── User Input ─────────────────────┘
            (Mostly in Old System)
```

**Sync Implementation**:
```typescript
class OneWaySyncService {
  async syncFromLegacySystem() {
    // Run nightly at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting nightly sync from legacy system...');

      // Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp();

      // Extract changed records since last sync
      const extractor = new LegacySystemExtractor();
      const changes = await extractor.extractChanges(lastSync);

      // Process changes (upsert)
      for (const record of changes) {
        await this.upsertRecord(record);
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp(new Date());

      console.log(`Sync complete: ${changes.length} records processed`);
    });
  }

  private async upsertRecord(record: any) {
    // Check if record already exists in Clinica
    const existing = await db.query(
      'SELECT id FROM patients WHERE legacy_system_id = $1',
      [record.id]
    );

    if (existing.rows.length > 0) {
      // Update existing record
      await commandBus.handle({
        command_type: 'update-patient',
        aggregate_id: existing.rows[0].id,
        payload: this.transformRecord(record),
        metadata: { caused_by: 'legacy_sync' },
      });
    } else {
      // Create new record
      await commandBus.handle({
        command_type: 'create-patient',
        payload: {
          ...this.transformRecord(record),
          legacy_system_id: record.id, // Store for future syncs
        },
        metadata: { caused_by: 'legacy_sync' },
      });
    }
  }
}
```

**Schema Addition**:
```sql
-- Add legacy_system_id to track records from old system
ALTER TABLE patients ADD COLUMN legacy_system_id VARCHAR(255);
CREATE INDEX idx_patients_legacy_id ON patients(legacy_system_id);
```

**UX**:
```
┌─────────────────────────────────────────────────────────┐
│ ℹ️  Nightly Sync Active                                 │
├─────────────────────────────────────────────────────────┤
│  Data syncs from [Old System] every night at 2 AM.      │
│                                                          │
│  Last sync: Today at 2:15 AM                            │
│  Records updated: 23 patients, 47 visits                │
│                                                          │
│  You can use both systems during this transition period.│
│  [View Sync Log] [Disable Sync]                         │
└─────────────────────────────────────────────────────────┘
```

---

### Strategy 3: Two-Way Sync (Old ↔ New)

**Use Case**: Hospitals with long migration period (3-6 months), phased departmental rollout

**How It Works**:
- Both systems are primary
- Changes in either system sync to the other (near real-time)
- Conflict resolution rules applied

**Architecture**:
```
┌──────────────┐   Real-Time Sync    ┌──────────────┐
│ Legacy HIS   │ ◄────────────────►  │   Clinica    │
│              │   (Both Ways)        │              │
│ Read/Write   │                      │ Read/Write   │
└──────────────┘                      └──────────────┘
       ▲                                     ▲
       │                                     │
       └────── Dept A, B, C      Dept D, E ─┘
```

**Conflict Resolution**:
```typescript
interface ConflictResolutionRule {
  field: string;
  strategy: 'last_write_wins' | 'clinica_wins' | 'legacy_wins' | 'manual';
}

const conflictRules: ConflictResolutionRule[] = [
  { field: 'phone', strategy: 'last_write_wins' },
  { field: 'address', strategy: 'last_write_wins' },
  { field: 'medical_history', strategy: 'manual' }, // Too critical for auto-merge
  { field: 'prescription', strategy: 'clinica_wins' }, // If Clinica is used by doctors
];

class TwoWaySyncService {
  async handleConflict(
    clinicaRecord: any,
    legacyRecord: any,
    field: string
  ): Promise<any> {
    const rule = conflictRules.find(r => r.field === field);

    if (!rule || rule.strategy === 'last_write_wins') {
      // Compare timestamps
      return clinicaRecord.updated_at > legacyRecord.updated_at
        ? clinicaRecord[field]
        : legacyRecord[field];
    }

    if (rule.strategy === 'clinica_wins') {
      return clinicaRecord[field];
    }

    if (rule.strategy === 'legacy_wins') {
      return legacyRecord[field];
    }

    if (rule.strategy === 'manual') {
      // Create conflict record for manual resolution
      await db.query(
        `INSERT INTO sync_conflicts (field, clinica_value, legacy_value, resolved)
         VALUES ($1, $2, $3, false)`,
        [field, clinicaRecord[field], legacyRecord[field]]
      );

      // Keep clinica value for now, flag for review
      return clinicaRecord[field];
    }
  }
}
```

**Conflict Resolution UI**:
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  3 Sync Conflicts Need Review                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Conflict #1: Patient P-4521 Medical History             │
│                                                          │
│ Clinica Value:              Legacy HIS Value:            │
│ "Diabetes Type 2,           "Diabetes Type 2,            │
│  Hypertension,               Hypertension"               │
│  Asthma (2024)"                                          │
│                                                          │
│ Last updated:                Last updated:               │
│ Today, 10:30 AM              Today, 10:25 AM             │
│ by Dr. Reddy                 by Dr. Malhotra             │
│                                                          │
│ [Keep Clinica] [Keep Legacy] [Merge Both]               │
│                                                          │
│ ────────────────────────────────────────────────────    │
│ Conflict #2: ...                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Strategy 4: Gradual Cutover (Department by Department)

**Use Case**: Large hospitals, minimize risk

**How It Works**:
- Phase 1: Dept A fully migrates to Clinica (2 weeks)
- Phase 2: Dept B migrates (2 weeks)
- Phase 3: Dept C, D, E migrate (4 weeks)
- Phase 4: Full hospital on Clinica

**Implementation**:
```sql
-- Add department_id to users and visits
ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id);

-- Create migration status tracking
CREATE TABLE department_migration_status (
  department_id UUID PRIMARY KEY REFERENCES departments(id),
  status VARCHAR(50) NOT NULL, -- pending, in_progress, completed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rollback_deadline TIMESTAMPTZ
);
```

**Routing Logic**:
```typescript
class SystemRouter {
  async routeRequest(userId: string, action: string): Promise<'clinica' | 'legacy'> {
    // Get user's department
    const user = await db.query(
      'SELECT department_id FROM users WHERE id = $1',
      [userId]
    );

    // Check migration status
    const migrationStatus = await db.query(
      'SELECT status FROM department_migration_status WHERE department_id = $1',
      [user.rows[0].department_id]
    );

    if (migrationStatus.rows[0]?.status === 'completed') {
      return 'clinica'; // Fully migrated, use Clinica
    } else if (migrationStatus.rows[0]?.status === 'in_progress') {
      // During migration, route reads to Clinica, writes to both
      if (action === 'read') {
        return 'clinica';
      } else {
        // Write to both systems
        await this.dualWrite(action);
        return 'clinica';
      }
    } else {
      return 'legacy'; // Not migrated yet
    }
  }
}
```

---

## Security & Compliance

### HIPAA Compliance

**Requirement**: All patient data must be protected according to HIPAA regulations.

**Implementation**:

1. **Encryption at Rest**:
   ```sql
   -- Enable PostgreSQL encryption
   ALTER SYSTEM SET ssl = on;

   -- Encrypt sensitive columns
   CREATE EXTENSION IF NOT EXISTS pgcrypto;

   -- Store encrypted data
   CREATE TABLE patients_secure (
     id UUID PRIMARY KEY,
     full_name TEXT, -- Encrypted at application layer
     ssn_encrypted BYTEA, -- PGP encrypted
     medical_history_encrypted BYTEA
   );
   ```

2. **Encryption in Transit**:
   - All API calls over HTTPS (TLS 1.3)
   - Database connections over SSL
   - File uploads encrypted during transfer

3. **Access Controls**:
   ```typescript
   // Role-based access control for migrations
   const migrationPermissions = {
     admin: ['create', 'read', 'update', 'delete', 'rollback'],
     doctor: ['read'], // Can view migration status only
     migration_specialist: ['create', 'read', 'update', 'pause', 'resume'],
   };

   function checkPermission(userRole: string, action: string): boolean {
     return migrationPermissions[userRole]?.includes(action) || false;
   }
   ```

4. **Audit Logging**:
   ```sql
   CREATE TABLE migration_audit_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     migration_id UUID NOT NULL,
     user_id UUID NOT NULL,
     action VARCHAR(100) NOT NULL, -- upload, validate, import, rollback, view
     ip_address INET,
     user_agent TEXT,
     details JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Log every action
   INSERT INTO migration_audit_log (migration_id, user_id, action, ip_address, details)
   VALUES ($1, $2, 'import_started', $3, '{"record_count": 3247}');
   ```

### GDPR Compliance

**Requirement**: Support data portability, right to be forgotten, consent tracking.

**Implementation**:

1. **Data Portability**:
   ```typescript
   // Export patient data in machine-readable format
   async exportPatientData(patientId: string): Promise<GDPRExport> {
     const patient = await db.query('SELECT * FROM patients WHERE id = $1', [patientId]);
     const visits = await db.query('SELECT * FROM visits WHERE patient_id = $1', [patientId]);
     const prescriptions = await db.query(
       'SELECT p.* FROM prescriptions p JOIN visits v ON p.visit_id = v.id WHERE v.patient_id = $1',
       [patientId]
     );

     return {
       format: 'JSON',
       version: '1.0',
       exported_at: new Date().toISOString(),
       data: {
         personal_info: patient.rows[0],
         medical_history: visits.rows,
         prescriptions: prescriptions.rows,
       },
     };
   }
   ```

2. **Right to be Forgotten** (Soft Delete):
   ```typescript
   async deletePatient(patientId: string, requestedBy: string) {
     // Soft delete: Mark as deleted but retain for audit
     await commandBus.handle({
       command_type: 'delete-patient',
       aggregate_id: patientId,
       payload: { deletion_reason: 'gdpr_request' },
       metadata: { requested_by: requestedBy },
     });

     // Emit patient_deleted event
     // Projection worker will:
     // - Mark patient.is_deleted = true
     // - Anonymize PII (name → "DELETED", phone → null)
     // - Retain medical data for legal compliance (anonymized)
   }
   ```

3. **Consent Tracking**:
   ```sql
   CREATE TABLE patient_consent (
     patient_id UUID REFERENCES patients(id),
     consent_type VARCHAR(100), -- data_processing, marketing, research
     granted BOOLEAN NOT NULL,
     granted_at TIMESTAMPTZ,
     revoked_at TIMESTAMPTZ,
     ip_address INET,
     PRIMARY KEY (patient_id, consent_type)
   );
   ```

### Data Retention Policies

**Policy**: Migrated data files deleted after import completes.

```typescript
class DataRetentionService {
  async scheduleCleanup(migrationId: string) {
    // Schedule file deletion 48 hours after successful import
    const job = await queue.add('cleanup-migration-files', {
      migrationId,
      deleteAfter: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    });
  }

  async cleanupMigrationFiles(migrationId: string) {
    // Delete uploaded files from S3/filesystem
    await s3.deleteObject({
      Bucket: 'clinica-migrations',
      Key: `migrations/${migrationId}/source-file.csv`,
    });

    // Delete staging tables
    await db.query('DELETE FROM migration_raw_data WHERE migration_id = $1', [migrationId]);
    await db.query('DELETE FROM migration_transformed_data WHERE migration_id = $1', [migrationId]);

    // Keep migration metadata and audit logs (permanent)
    // Keep validation errors (30 days)
  }
}
```

---

## Failure Modes & Recovery

### Failure Mode 1: Validation Fails

**Scenario**: User uploads file, 50% of records have errors

**Impact**: Migration cannot proceed

**Recovery**:
1. Show detailed error report
2. User can:
   - Fix in-line (for small number of errors)
   - Download error report, fix in Excel, re-upload
   - Request specialist help (assisted migrations)

**Prevention**:
- Provide sample templates with correct format
- Validate on upload (before processing)

---

### Failure Mode 2: Import Partially Completes

**Scenario**: Import starts, but server crashes after 60% complete

**Impact**: Some records imported, some not

**Recovery**:
```typescript
class MigrationRecoveryService {
  async resumeMigration(migrationId: string) {
    // Check which records already imported
    const imported = await db.query(
      `SELECT source_record_id FROM migration_event_map WHERE migration_id = $1`,
      [migrationId]
    );

    const importedIds = imported.rows.map(r => r.source_record_id);

    // Get remaining records to import
    const remaining = await db.query(
      `SELECT * FROM migration_transformed_data
       WHERE migration_id = $1 AND id NOT IN (${importedIds.join(',')})`,
      [migrationId]
    );

    // Resume import from where it left off
    console.log(`Resuming migration: ${remaining.rows.length} records left`);
    await this.importRecords(remaining.rows, migrationId);
  }
}
```

**Prevention**:
- Transaction batching (commit every 100 records)
- Idempotency: Re-running import should not duplicate data

---

### Failure Mode 3: Rollback Needed

**Scenario**: User imports data, but realizes it's wrong (e.g., test data imported to production)

**Impact**: Incorrect data in production

**Recovery**:
```typescript
async rollbackMigration(migrationId: string) {
  // Get all events generated by this migration
  const events = await db.query(
    `SELECT event_id, aggregate_type, aggregate_id FROM migration_event_map
     WHERE migration_id = $1`,
    [migrationId]
  );

  // For each event, emit compensating event
  for (const event of events.rows) {
    if (event.aggregate_type === 'patient') {
      await commandBus.handle({
        command_type: 'delete-patient',
        aggregate_id: event.aggregate_id,
        metadata: { caused_by: 'migration_rollback', migration_id: migrationId },
      });
    }
    // Handle other entity types...
  }

  // Mark migration as rolled back
  await db.query(
    `UPDATE migrations SET status = 'rolled_back', completed_at = NOW()
     WHERE id = $1`,
    [migrationId]
  );
}
```

**Limitation**: Rollback only works within 48-hour window (configurable)

---

### Failure Mode 4: Sync Conflicts (Two-Way Sync)

**Scenario**: Same patient record updated in both Clinica and legacy system

**Impact**: Data inconsistency

**Recovery**:
- Automatic resolution based on conflict rules (see Coexistence section)
- Manual review for critical fields
- Alert admin via dashboard

**Prevention**:
- Clear user training: Use only ONE system per department during transition
- Dashboard warnings if users access both systems

---

### Failure Mode 5: Data Corruption

**Scenario**: Bug in transformation logic corrupts data (e.g., swaps first/last name)

**Impact**: All imported data incorrect

**Recovery**:
1. Rollback migration
2. Fix bug in transformation logic
3. Re-run migration

**Prevention**:
- Extensive testing with sample data before production import
- Sandbox environment for validation
- Code review for all transformation logic

---

## Phased Rollout Plan

### Phase 0: Foundation (Weeks 1-2)

**Goals**:
- Build core migration pipeline (Extract → Transform → Validate → Event → Project)
- Implement CSV/Excel extractors
- Create validation engine
- Build migration dashboard UI

**Deliverables**:
- Migration service API endpoints
- Basic wizard UI for independent doctors
- Validation rule engine
- Database schema for migrations

**Success Criteria**:
- Can import sample CSV file end-to-end
- All 6 pipeline stages functional
- Validation detects common errors

---

### Phase 1: Pilot with Independent Doctors (Weeks 3-4)

**Goals**:
- Test with 10 beta users (independent doctors)
- Gather feedback on UX
- Fix bugs and edge cases

**Deliverables**:
- Complete 4-step wizard for doctors
- Sample template downloads
- In-line error fixing
- Email notifications

**Success Criteria**:
- 8/10 doctors successfully import their data
- Average time to complete: < 15 minutes
- User satisfaction score: > 4/5

**Metrics to Track**:
- Upload success rate
- Validation error rate
- Time to complete migration
- Support tickets raised

---

### Phase 2: Clinics with Assisted Migration (Weeks 5-8)

**Goals**:
- Launch assisted migration for clinics
- Train migration specialists
- Build Practo/Lybrate connectors

**Deliverables**:
- 6-step assisted wizard
- Practo and Lybrate extractors
- Sandbox environment provisioning
- Specialist dashboard (for internal team)

**Success Criteria**:
- 20 clinics migrated successfully
- < 5% data quality issues post-migration
- Specialist workload: 4 hours per clinic average

---

### Phase 3: Enterprise Hospitals (Weeks 9-16)

**Goals**:
- Launch enterprise migration portal
- Build custom HIS connectors
- Implement two-way sync
- Support phased departmental rollout

**Deliverables**:
- Enterprise migration dashboard
- Cerner/Epic connectors
- Real-time sync engine
- Conflict resolution UI
- SLA monitoring

**Success Criteria**:
- 2 pilot hospitals fully migrated
- Zero downtime during cutover
- < 0.1% data discrepancy rate
- 99.9% sync uptime

---

### Phase 4: Self-Service at Scale (Weeks 17-20)

**Goals**:
- Optimize for scale (1000s of migrations/month)
- Add advanced features (Google Sheets integration, API imports)
- Build migration marketplace (3rd-party connectors)

**Deliverables**:
- Google Sheets connector
- Public API for custom integrations
- Connector marketplace (partners can build connectors)
- Advanced analytics dashboard

**Success Criteria**:
- 100+ migrations per week
- 95% success rate (no manual intervention)
- < 1 hour average migration time

---

## Implementation Roadmap

### Backend Components

| Component | Priority | Effort | Dependencies |
|-----------|----------|--------|--------------|
| Migration Service Core | P0 | 2 weeks | None |
| CSV/Excel Extractors | P0 | 1 week | None |
| Validation Engine | P0 | 1 week | None |
| Event Generator | P0 | 1 week | Command Bus |
| Migration Dashboard API | P0 | 1 week | Migration Service |
| Practo Connector | P1 | 1 week | Extractors |
| Cerner Connector | P1 | 2 weeks | Enterprise features |
| Two-Way Sync Service | P2 | 2 weeks | Real-time pipeline |
| Conflict Resolution Engine | P2 | 1 week | Two-Way Sync |
| Sandbox Provisioning | P1 | 1 week | Docker infra |

### Frontend Components

| Component | Priority | Effort | Dependencies |
|-----------|----------|--------|--------------|
| Doctor Migration Wizard | P0 | 1 week | Migration API |
| Clinic Assisted Wizard | P1 | 1 week | Migration API |
| Enterprise Portal | P1 | 2 weeks | Migration API |
| Validation Error UI | P0 | 1 week | Wizard |
| Progress Tracking (WebSocket) | P0 | 3 days | Migration API |
| Conflict Resolution UI | P2 | 1 week | Two-Way Sync API |
| Sandbox Environment Link | P1 | 2 days | Sandbox API |

### Infrastructure

| Component | Priority | Effort | Dependencies |
|-----------|----------|--------|--------------|
| File Storage (S3) | P0 | 2 days | AWS setup |
| Queue System (Bull/Redis) | P0 | 2 days | Job processing |
| WebSocket Server (Socket.io) | P0 | 3 days | Real-time updates |
| Sandbox Docker Containers | P1 | 1 week | Docker registry |
| Monitoring & Alerting | P1 | 3 days | Grafana/DataDog |

### Total Estimated Effort

- **Phase 0 (Foundation)**: 5 weeks (backend) + 3 weeks (frontend) = **8 weeks**
- **Phase 1 (Pilot)**: 2 weeks
- **Phase 2 (Assisted)**: 4 weeks
- **Phase 3 (Enterprise)**: 8 weeks
- **Phase 4 (Scale)**: 4 weeks

**Total**: **26 weeks** (6.5 months) for complete migration system

---

## Enterprise-Specific Migration Features

### Overview

Large hospital deployments require additional considerations beyond basic data migration. This section addresses enterprise-grade requirements including financial systems, medical imaging, complex org structures, regulatory compliance, and business continuity.

---

### Billing & Financial Data Migration

**Challenge**: Hospital billing systems are complex, regulated, and often deeply integrated with revenue cycle management, insurance claims, and accounting systems.

**Clinica Stance**: **Billing data is NOT migrated** in Phase 1 (initial deployment). Here's why:

#### Rationale for No Billing Migration

1. **Regulatory Complexity**:
   - Billing data has 7-10 year retention requirements (varies by jurisdiction)
   - Audit trails must remain intact in source system
   - Insurance claim references cannot be broken
   - Tax compliance requires original system records

2. **Technical Complexity**:
   - Billing codes (ICD-10, CPT, DRG) change over time
   - Historical billing rates must match original transaction dates
   - Payment reconciliation depends on original system logic
   - Refunds and adjustments create complex dependencies

3. **Business Risk**:
   - Revenue cycle disruption is unacceptable
   - Billing errors can result in claim denials ($$$ loss)
   - Audit failures can trigger regulatory penalties
   - Historical disputes require original system evidence

#### Recommended Approach: Dual-System Strategy

**Phase 1 (Months 1-6): Parallel Systems**
```
┌────────────────────────────────────────────────────┐
│ Clinical Operations:  CLINICA                      │
│ • Patient demographics                             │
│ • Appointments & visits                            │
│ • Clinical documentation                           │
│ • Prescriptions                                    │
│ • Lab orders                                       │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Billing Operations:  LEGACY HIS (Read-Only)        │
│ • Historical billing data (query only)             │
│ • Old claims & payments                            │
│ • Aging reports                                    │
│ • Historical statements                            │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ New Billing:  CLINICA BILLING MODULE (if enabled)  │
│ • New visits billed in Clinica                     │
│ • Forward-looking revenue cycle                    │
│ • Clean data foundation                            │
└────────────────────────────────────────────────────┘
```

**Integration Points**:
```typescript
// Clinical visits in Clinica can reference legacy billing IDs
interface Visit {
  id: string;
  patient_id: string;
  visit_date: Date;
  // ...
  legacy_billing_reference?: {
    system: 'cerner' | 'epic' | 'other';
    bill_id: string;
    claim_number?: string;
    url?: string; // Deep link to legacy system
  };
}

// API endpoint to fetch legacy billing data
GET /api/legacy-billing/:patient_id
Response: {
  patient_mrn: "MRN-123456",
  legacy_system_url: "https://legacy-his.hospital.com/billing/patient/123456",
  outstanding_balance: 45000.00,
  last_bill_date: "2025-12-15",
  aging_summary: {
    current: 15000,
    "30_days": 20000,
    "60_days": 10000,
    "90_plus_days": 0
  }
}
```

#### Alternative: Summary Migration (High-Level Only)

For hospitals that MUST show historical financial data in Clinica:

**What to Migrate**:
- Patient-level balance summary (total outstanding)
- Visit-level charge summary (no line items)
- Payment history (date, amount, method)
- Insurance coverage summary

**What NOT to Migrate**:
- Detailed charge master line items
- Claim adjudication details
- Remittance advice
- Contractual adjustments

```sql
-- Summary billing data structure
CREATE TABLE patient_billing_summary (
  patient_id UUID REFERENCES patients(id),
  legacy_system_id VARCHAR(255) NOT NULL,
  total_charges DECIMAL(12,2),
  total_payments DECIMAL(12,2),
  total_adjustments DECIMAL(12,2),
  outstanding_balance DECIMAL(12,2),
  last_visit_date DATE,
  last_payment_date DATE,
  legacy_system_url TEXT, -- Deep link to full billing history
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (patient_id)
);

CREATE TABLE visit_billing_summary (
  visit_id UUID REFERENCES visits(id),
  legacy_bill_id VARCHAR(255),
  charge_date DATE NOT NULL,
  total_charges DECIMAL(10,2),
  insurance_payments DECIMAL(10,2),
  patient_payments DECIMAL(10,2),
  adjustments DECIMAL(10,2),
  balance DECIMAL(10,2),
  claim_status VARCHAR(50), -- submitted, paid, denied, pending
  legacy_system_url TEXT,
  PRIMARY KEY (visit_id)
);
```

#### Billing Migration Decision Matrix

| Hospital Size | Billing Complexity | Recommended Approach |
|---------------|-------------------|----------------------|
| Small (<100 beds) | Simple fee-for-service | Migrate summary, new billing in Clinica |
| Medium (100-500 beds) | Mixed payer model | Dual system, legacy read-only |
| Large (500+ beds) | Complex RCM, multiple facilities | Keep legacy indefinitely, API integration |
| Enterprise (Multi-hospital) | Enterprise RCM system | Do NOT migrate, build integration layer |

#### Procurement Consideration

**Important for RFP Responses**:
> "Clinica's migration approach preserves the integrity of historical billing data by maintaining it in the legacy system while providing seamless clinical workflow integration. This eliminates migration risk to revenue cycle operations and ensures compliance with financial audit requirements."

---

### Imaging & PACS Strategy

**Challenge**: Medical imaging (X-rays, CT, MRI, ultrasound) is stored in PACS (Picture Archiving and Communication System) and represents 80-90% of hospital data volume.

#### Clinica Approach: Integration, Not Migration

**Core Principle**: **Do NOT migrate imaging files. Integrate with existing PACS.**

**Rationale**:
1. **Data Volume**: Imaging can be 10-50 TB per hospital
2. **Cost**: Migrating PACS data is extremely expensive ($50K-$500K)
3. **Risk**: DICOM data corruption can impact patient safety
4. **Standards Compliance**: Radiology workflow has specific DICOM/HL7 requirements
5. **Legal**: Original diagnostic images must remain in certified PACS for medico-legal compliance

#### Integration Architecture

```
┌──────────────────────────────────────────────────────┐
│ CLINICA (EMR)                                        │
│ • Patient demographics                               │
│ • Imaging orders (HL7 ORM messages)                  │
│ • Radiology reports (text/PDF)                       │
│ • Thumbnail preview                                  │
│ • Link to full study                                 │
└─────────┬────────────────────────────────────────────┘
          │
          │ HL7 / DICOM Integration
          │
          ▼
┌──────────────────────────────────────────────────────┐
│ PACS (Picture Archiving System)                      │
│ • DICOM image storage                                │
│ • DICOM viewer                                       │
│ • Image processing                                   │
│ • Archive management                                 │
└──────────────────────────────────────────────────────┘
```

#### Integration Methods

**Method 1: DICOM Worklist (Modality Worklist)**

```typescript
// Clinica sends imaging order to PACS via HL7 ORM
class ImagingOrderService {
  async createImagingOrder(order: ImagingOrder): Promise<void> {
    // 1. Create order in Clinica
    await commandBus.handle({
      command_type: 'create-imaging-order',
      payload: order,
    });

    // 2. Send HL7 ORM message to PACS
    const hl7Message = this.buildHL7_ORM(order);
    await this.hl7Client.sendMessage('PACS_SERVER', hl7Message);

    // HL7 ORM Message Structure:
    // MSH|^~\&|CLINICA|HOSPITAL|PACS|RADIOLOGY|20260108120000||ORM^O01|MSG123|P|2.5
    // PID|1||MRN-123456||Kumar^Rajesh||19850315|M
    // ORC|NW|ORD-789|||SC||^^^20260108120000
    // OBR|1|ORD-789||CT-CHEST^CT Chest with Contrast^LOCAL|||20260108120000
  }

  // 3. Receive HL7 ORU (result) when radiologist completes study
  async receiveResult(hl7ORU: string): Promise<void> {
    const parsed = this.parseHL7_ORU(hl7ORU);

    await commandBus.handle({
      command_type: 'attach-imaging-result',
      payload: {
        order_id: parsed.orderId,
        result_status: parsed.status, // preliminary, final
        report_text: parsed.reportText,
        report_pdf_url: parsed.pdfUrl,
        dicom_study_uid: parsed.studyInstanceUID, // For launching viewer
        impressions: parsed.impressions,
        radiologist_id: parsed.radiologistId,
      },
    });
  }
}
```

**Method 2: DICOM Query/Retrieve (C-FIND, C-MOVE)**

```typescript
// Query PACS for patient's imaging history
class PACSIntegrationService {
  async queryPatientStudies(patientMRN: string): Promise<DicomStudy[]> {
    // DICOM C-FIND query
    const studies = await this.dicomClient.findStudies({
      PatientID: patientMRN,
      StudyDate: '', // All dates
      Modality: '', // All modalities (CT, MR, XR, US)
    });

    return studies.map(study => ({
      study_instance_uid: study.StudyInstanceUID,
      study_date: study.StudyDate,
      modality: study.Modality,
      study_description: study.StudyDescription,
      accession_number: study.AccessionNumber,
      number_of_images: study.NumberOfStudyRelatedInstances,
      pacs_viewer_url: this.buildPACSViewerURL(study.StudyInstanceUID),
    }));
  }

  private buildPACSViewerURL(studyUID: string): string {
    // Deep link to PACS web viewer
    return `https://pacs.hospital.com/viewer?studyUID=${studyUID}`;
  }
}
```

**Method 3: Web-Based Viewer Integration (Zero-Footprint)**

```typescript
// Embed PACS viewer in Clinica UI
interface PACSViewerConfig {
  vendor: 'horos' | 'osirix' | 'synapse' | 'carestream' | 'other';
  viewer_base_url: string;
  authentication_method: 'saml' | 'oauth' | 'apikey';
}

// Frontend component
const ImagingViewer: React.FC<{ studyUID: string }> = ({ studyUID }) => {
  const pacsConfig = usePACSConfig();

  const viewerURL = `${pacsConfig.viewer_base_url}/viewer` +
    `?studyUID=${studyUID}` +
    `&token=${getAuthToken()}` +
    `&returnURL=${window.location.href}`;

  return (
    <div className="imaging-viewer">
      <iframe
        src={viewerURL}
        width="100%"
        height="800px"
        allow="fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms"
      />
    </div>
  );
};
```

#### Migration of Imaging Metadata (Not Images)

**What to Migrate**:
- Imaging order history (order date, modality, indication)
- Report text (impressions, findings)
- Report PDFs
- Study metadata (study UID, accession number, date)
- Links to PACS studies

```sql
CREATE TABLE imaging_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  visit_id UUID REFERENCES visits(id),
  order_date TIMESTAMPTZ NOT NULL,
  modality VARCHAR(10) NOT NULL, -- CT, MR, XR, US, NM, PT
  body_part VARCHAR(100),
  indication TEXT,
  urgency VARCHAR(20), -- routine, urgent, stat
  ordering_physician_id UUID REFERENCES users(id),
  status VARCHAR(50), -- ordered, scheduled, completed, cancelled
  legacy_order_id VARCHAR(255), -- For reference
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE imaging_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imaging_order_id UUID NOT NULL REFERENCES imaging_orders(id),
  study_instance_uid VARCHAR(255) NOT NULL, -- DICOM Study UID
  accession_number VARCHAR(100),
  study_date DATE NOT NULL,
  report_text TEXT,
  report_pdf_url TEXT, -- S3 URL or PACS URL
  impressions TEXT,
  radiologist_id UUID REFERENCES users(id),
  report_status VARCHAR(50), -- preliminary, final, amended
  pacs_viewer_url TEXT, -- Deep link to PACS viewer
  migrated_from_legacy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_imaging_results_study_uid ON imaging_results(study_instance_uid);
CREATE INDEX idx_imaging_results_accession ON imaging_results(accession_number);
```

#### PACS Vendor Support Matrix

| PACS Vendor | HL7 Support | DICOM C-FIND | Web Viewer | Integration Complexity |
|-------------|-------------|--------------|------------|----------------------|
| GE Centricity | ✅ Yes | ✅ Yes | ✅ Yes | Low |
| Philips iSite | ✅ Yes | ✅ Yes | ✅ Yes | Low |
| Agfa Enterprise Imaging | ✅ Yes | ✅ Yes | ✅ Yes | Medium |
| Carestream Vue | ✅ Yes | ✅ Yes | ✅ Yes | Low |
| Horos (Open Source) | ✅ Yes | ✅ Yes | ⚠️ Limited | Medium |
| Legacy PACS (>10 years old) | ⚠️ HL7 v2.3 | ✅ Yes | ❌ No | High |

#### Imaging Migration Decision Tree

```
Start: Does hospital have existing PACS?
│
├─ YES (95% of hospitals)
│  │
│  ├─ Is PACS <5 years old?
│  │  ├─ YES → Integrate via HL7 + DICOM, embed viewer ✅
│  │  └─ NO → Assess upgrade vs replace (consult PACS vendor)
│  │
│  └─ Does PACS have web viewer?
│     ├─ YES → Zero-footprint integration ✅
│     └─ NO → Use DICOM desktop viewer (Horos, OsiriX)
│
└─ NO (5% - small clinics)
   │
   ├─ Does clinic perform on-site imaging?
   │  ├─ YES → Deploy cloud PACS (Ambra, Purview, PostDICOM)
   │  └─ NO → Radiology orders sent to external facility
   │
   └─ Budget for PACS?
      ├─ YES → Include PACS in SOW (add $30K-$100K)
      └─ NO → Store images as PDFs in Clinica (NOT DICOM-compliant)
```

#### Procurement Language for RFPs

**For hospitals WITH existing PACS**:
> "Clinica integrates with your existing PACS infrastructure via industry-standard HL7 and DICOM protocols. No imaging data migration is required, preserving your investment in PACS while providing seamless clinical workflow integration. Supported PACS vendors include GE, Philips, Agfa, Carestream, and others."

**For hospitals considering PACS upgrade**:
> "Clinica partners with leading cloud PACS providers (Ambra, Purview) to offer integrated EMR+PACS solutions. We can coordinate PACS migration as part of the overall project, with a unified vendor relationship."

---

### User & Role Mapping

**Challenge**: Hospitals have complex organizational hierarchies with hundreds of users across multiple departments, roles, specializations, and access levels.

#### User Migration Complexity

**Data to Migrate**:
```typescript
interface LegacyUser {
  // Identity
  user_id: string;
  employee_id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;

  // Clinical Identity
  npi_number?: string; // National Provider Identifier (US)
  medical_license_number?: string;
  dea_number?: string; // Drug Enforcement Administration (for prescribing)
  specialization?: string;

  // Organizational
  department_id: string;
  title: string;
  supervisor_id?: string;

  // Access Control
  roles: string[]; // May be multiple
  permissions: string[];
  facility_access: string[]; // Multi-facility hospitals

  // Operational
  schedule?: WorkSchedule;
  is_active: boolean;
  last_login: Date;
}
```

#### Challenge 1: Role Mapping

Legacy systems often have custom role definitions that don't map 1:1 to Clinica roles.

**Example: Legacy System Roles (Epic)**
```
- Physician
- Physician - Attending
- Physician - Resident
- Physician - Fellow
- Physician - Specialist
- Nurse - RN
- Nurse - LPN
- Nurse - NP (Nurse Practitioner)
- Pharmacist
- Lab Technician
- Radiology Technician
- Admin - Billing
- Admin - Registration
- Admin - IT
```

**Clinica Standard Roles**:
```typescript
enum ClinicaRole {
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  ADMIN = 'admin',
  RECEPTIONIST = 'receptionist',
  PHARMACIST = 'pharmacist',
  LAB_TECHNICIAN = 'lab_technician',
  RADIOLOGIST = 'radiologist',
  SUPER_ADMIN = 'super_admin',
}
```

**Role Mapping Strategy**:

```typescript
// Role mapping configuration (per hospital)
interface RoleMapping {
  legacy_role: string;
  clinica_role: ClinicaRole;
  additional_permissions?: string[];
  notes?: string;
}

const epicToClinicaRoleMapping: RoleMapping[] = [
  {
    legacy_role: 'Physician',
    clinica_role: ClinicaRole.DOCTOR,
    additional_permissions: ['prescribe_medications', 'view_all_patient_data'],
  },
  {
    legacy_role: 'Physician - Resident',
    clinica_role: ClinicaRole.DOCTOR,
    additional_permissions: ['prescribe_medications_supervised'],
    notes: 'Requires attending physician co-signature',
  },
  {
    legacy_role: 'Nurse - NP',
    clinica_role: ClinicaRole.NURSE,
    additional_permissions: ['prescribe_medications', 'order_labs'],
    notes: 'Nurse Practitioner with expanded scope',
  },
  {
    legacy_role: 'Admin - Billing',
    clinica_role: ClinicaRole.ADMIN,
    additional_permissions: ['view_billing_data', 'generate_reports'],
  },
];

class UserMigrationService {
  async mapLegacyRole(legacyRole: string, hospitalId: string): Promise<{
    clinica_role: ClinicaRole;
    permissions: string[];
  }> {
    // Get hospital-specific role mapping
    const mapping = await db.query(
      'SELECT * FROM role_mappings WHERE hospital_id = $1 AND legacy_role = $2',
      [hospitalId, legacyRole]
    );

    if (mapping.rows.length === 0) {
      // Throw error - require manual mapping for unknown roles
      throw new Error(
        `Unknown legacy role: "${legacyRole}". Please configure role mapping.`
      );
    }

    return {
      clinica_role: mapping.rows[0].clinica_role,
      permissions: mapping.rows[0].additional_permissions || [],
    };
  }
}
```

**Role Mapping UI** (Enterprise Portal):

```
┌─────────────────────────────────────────────────────────┐
│ User Role Mapping Configuration                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ We detected 24 unique user roles in your legacy system. │
│ Please map each role to a Clinica role.                 │
│                                                          │
│ Legacy Role               → Clinica Role                │
│ ────────────────────────────────────────────────────    │
│ Physician                 → [Doctor         ▼] ✅      │
│ Physician - Attending     → [Doctor         ▼] ✅      │
│ Physician - Resident      → [Doctor         ▼] ⚠️      │
│    ⚠️ Note: Limited prescribing rights                  │
│    [Configure Permissions]                              │
│                                                          │
│ Nurse - RN                → [Nurse          ▼] ✅      │
│ Nurse - LPN               → [Nurse          ▼] ✅      │
│ Nurse - NP                → [Nurse          ▼] ⚠️      │
│    ⚠️ Note: Expanded scope - can prescribe              │
│    [Configure Permissions]                              │
│                                                          │
│ Admin - Billing           → [Admin          ▼] ✅      │
│ Admin - Registration      → [Receptionist   ▼] ✅      │
│                                                          │
│ Custom Role: "NICU Specialist" → [Not Mapped   ▼] ❌  │
│    ❌ Please select a Clinica role                      │
│                                                          │
│ [Save Mappings]  [Import Users with These Mappings]    │
└─────────────────────────────────────────────────────────┘
```

#### Challenge 2: Permission Granularity

Legacy systems may have hundreds of granular permissions:

**Strategy**: Map legacy permissions to Clinica permission groups

```sql
-- Permission groups in Clinica
CREATE TABLE permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL -- Array of permission strings
);

-- Example permission groups
INSERT INTO permission_groups (name, permissions) VALUES
  ('Full Clinical Access', '["view_patient", "edit_patient", "prescribe", "order_labs", "view_all_notes"]'),
  ('Limited Clinical Access', '["view_patient", "edit_patient_demographics", "view_own_notes"]'),
  ('Billing Access', '["view_patient_demographics", "view_billing", "edit_billing", "generate_invoices"]'),
  ('Read-Only Access', '["view_patient_demographics", "view_appointments"]');

-- User-to-permission-group mapping
CREATE TABLE user_permission_groups (
  user_id UUID REFERENCES users(id),
  permission_group_id UUID REFERENCES permission_groups(id),
  granted_by_user_id UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_group_id)
);
```

#### Challenge 3: Department & Facility Mapping

Multi-facility hospitals have complex access rules:

```typescript
interface FacilityAccess {
  user_id: string;
  facilities: {
    facility_id: string;
    facility_name: string;
    departments: string[]; // Which departments within this facility
    is_primary_facility: boolean;
  }[];
}

// Example: Dr. Reddy works at 3 facilities
const drReddyAccess: FacilityAccess = {
  user_id: 'user-123',
  facilities: [
    {
      facility_id: 'facility-A',
      facility_name: 'Apollo Main Campus',
      departments: ['Cardiology', 'ICU'],
      is_primary_facility: true,
    },
    {
      facility_id: 'facility-B',
      facility_name: 'Apollo Satellite Clinic - Whitefield',
      departments: ['Cardiology'],
      is_primary_facility: false,
    },
    {
      facility_id: 'facility-C',
      facility_name: 'Apollo Satellite Clinic - Electronic City',
      departments: ['Cardiology'],
      is_primary_facility: false,
    },
  ],
};

// Data access control based on facility
class DataAccessController {
  async getUserPatients(userId: string, facilityId?: string): Promise<Patient[]> {
    // Get user's facility access
    const access = await this.getUserFacilityAccess(userId);

    // Filter patients by facilities user has access to
    const allowedFacilityIds = facilityId
      ? [facilityId] // Specific facility requested
      : access.facilities.map(f => f.facility_id); // All facilities

    return db.query(
      'SELECT * FROM patients WHERE facility_id = ANY($1)',
      [allowedFacilityIds]
    );
  }
}
```

#### User Migration Validation

Before importing users, validate critical data:

```typescript
interface UserValidationError {
  user_id: string;
  full_name: string;
  errors: {
    field: string;
    error: string;
    severity: 'error' | 'warning';
  }[];
}

class UserValidationService {
  async validateUsers(users: LegacyUser[]): Promise<UserValidationError[]> {
    const errors: UserValidationError[] = [];

    for (const user of users) {
      const userErrors: any[] = [];

      // 1. Email validation
      if (!user.email || !this.isValidEmail(user.email)) {
        userErrors.push({
          field: 'email',
          error: 'Invalid or missing email address',
          severity: 'error',
        });
      }

      // 2. Duplicate email check
      const duplicate = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      if (duplicate.rows.length > 0) {
        userErrors.push({
          field: 'email',
          error: `Email already exists: ${user.email}`,
          severity: 'error',
        });
      }

      // 3. NPI validation (for doctors in US)
      if (user.roles.includes('Physician') && !user.npi_number) {
        userErrors.push({
          field: 'npi_number',
          error: 'NPI number required for physicians',
          severity: 'warning',
        });
      }

      // 4. License validation
      if (user.roles.includes('Physician') && !user.medical_license_number) {
        userErrors.push({
          field: 'medical_license_number',
          error: 'Medical license number required',
          severity: 'error',
        });
      }

      // 5. Department exists
      const deptExists = await db.query(
        'SELECT id FROM departments WHERE legacy_id = $1',
        [user.department_id]
      );
      if (deptExists.rows.length === 0) {
        userErrors.push({
          field: 'department_id',
          error: `Department not found: ${user.department_id}`,
          severity: 'error',
        });
      }

      // 6. Inactive users warning
      if (!user.is_active || this.isInactive(user.last_login)) {
        userErrors.push({
          field: 'is_active',
          error: 'User has not logged in for >6 months',
          severity: 'warning',
        });
      }

      if (userErrors.length > 0) {
        errors.push({
          user_id: user.user_id,
          full_name: user.full_name,
          errors: userErrors,
        });
      }
    }

    return errors;
  }

  private isInactive(lastLogin: Date): boolean {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return lastLogin < sixMonthsAgo;
  }
}
```

#### Password Migration Strategy

**Security Requirement**: Cannot migrate passwords in plain text.

**Options**:

**Option 1: Force Password Reset (Recommended)**
```typescript
// All migrated users must reset password on first login
await commandBus.handle({
  command_type: 'create-user',
  payload: {
    email: user.email,
    full_name: user.full_name,
    // No password provided
    password_reset_required: true,
    password_reset_token: generateSecureToken(),
  },
});

// Send email: "Welcome to Clinica - Set Your Password"
```

**Option 2: Temporary Password**
```typescript
// Generate temporary password, email to user
const tempPassword = generateSecurePassword(); // e.g., "Temp2026!kJ8x"
await sendEmail(user.email, {
  subject: 'Your Clinica Temporary Password',
  body: `Your temporary password is: ${tempPassword}\nYou will be required to change it on first login.`,
});
```

**Option 3: SSO/SAML Integration (Enterprise)**
```typescript
// Skip password migration entirely, use hospital's existing SSO
const ssoConfig: SAMLConfig = {
  hospital_id: hospitalId,
  idp_entity_id: 'https://hospital.okta.com',
  idp_sso_url: 'https://hospital.okta.com/app/clinica/sso/saml',
  idp_cert: '...', // X509 certificate
  attribute_mapping: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    full_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    role: 'http://schemas.hospital.com/claims/role',
  },
};
```

#### User Migration Phased Approach

**Phase 1: Core Clinical Staff (Week 1)**
- Doctors
- Nurses
- Department heads

**Phase 2: Support Staff (Week 2)**
- Lab technicians
- Pharmacists
- Radiologists

**Phase 3: Administrative Staff (Week 3)**
- Receptionists
- Billing staff
- IT admins

**Phase 4: Read-Only Users (Week 4)**
- Managers
- Compliance officers
- Report viewers

**Rationale**: Phased approach allows:
- Early testing with clinical users
- Iterative permission refinement
- Reduced helpdesk load (not all users at once)

---

### Chain-of-Custody & Compliance

**Requirement**: Healthcare data requires complete audit trail for regulatory compliance, legal disputes, and quality assurance.

#### What is Chain-of-Custody?

**Definition**: Documented trail showing who accessed, viewed, modified, or transmitted patient data, when, where, and why.

**Regulatory Drivers**:
- **HIPAA** (US): Audit logs required for all access to PHI (Protected Health Information)
- **GDPR** (EU): Right to know who accessed personal data
- **21 CFR Part 11** (FDA): Electronic records must have audit trails
- **State Medical Boards**: Prescriptions require documented authorization chain

#### Chain-of-Custody Requirements

**1. Data Access Logging**

Every access to patient data must be logged:

```sql
CREATE TABLE data_access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id),
  user_role VARCHAR(50) NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id),
  data_type VARCHAR(100) NOT NULL, -- demographics, vitals, prescriptions, lab_results
  action VARCHAR(50) NOT NULL, -- view, edit, create, delete, export, print
  access_reason VARCHAR(255), -- "Patient appointment", "Emergency care", "Audit review"
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  facility_id UUID REFERENCES facilities(id),
  department VARCHAR(100),
  -- Compliance fields
  was_emergency_access BOOLEAN DEFAULT false,
  requires_justification BOOLEAN DEFAULT false,
  justification_provided TEXT,
  justification_approved_by UUID REFERENCES users(id),
  -- Data snapshot (for forensics)
  data_before JSONB, -- State before modification
  data_after JSONB, -- State after modification
  -- Retention
  retention_until DATE, -- Auto-delete after X years (configurable)
  INDEX idx_access_log_user_date (user_id, accessed_at DESC),
  INDEX idx_access_log_patient_date (patient_id, accessed_at DESC),
  INDEX idx_access_log_session (session_id)
);
```

**2. Modification Tracking (Event Sourcing)**

All data modifications already tracked via event store:

```typescript
// Every command creates an auditable event
interface Event {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  event_data: any;
  metadata: {
    caused_by_user_id: string;
    caused_by_user_role: string;
    caused_by_username: string;
    ip_address: string;
    user_agent: string;
    timestamp: Date;
    facility_id: string;
    department: string;
    // Chain of custody specific
    supervision_required: boolean;
    supervised_by_user_id?: string; // For residents/students
    clinical_context?: string; // "emergency", "scheduled_visit", "follow_up"
  };
}

// Example: Prescription creation
{
  event_type: 'prescription_created',
  aggregate_type: 'prescription',
  aggregate_id: 'rx-12345',
  event_data: {
    patient_id: 'patient-789',
    medication: 'Amoxicillin 500mg',
    dosage: '1 tablet TID',
    duration_days: 7,
    // ...
  },
  metadata: {
    caused_by_user_id: 'doctor-456',
    caused_by_user_role: 'doctor',
    caused_by_username: 'dr.reddy@hospital.com',
    ip_address: '192.168.1.105',
    timestamp: '2026-01-08T14:30:00Z',
    // Compliance: Resident prescription requires attending co-signature
    supervision_required: true,
    supervised_by_user_id: 'attending-doctor-123',
    clinical_context: 'scheduled_visit',
  }
}
```

**3. Break-the-Glass Access**

Emergency access to restricted patient data:

```typescript
interface EmergencyAccess {
  patient_id: string;
  requesting_user_id: string;
  emergency_reason: string;
  access_granted_at: Date;
  access_expires_at: Date; // Auto-revoke after X hours
  requires_post_access_justification: boolean;
}

class EmergencyAccessService {
  async requestEmergencyAccess(
    patientId: string,
    userId: string,
    reason: string
  ): Promise<EmergencyAccessGrant> {
    // Log the break-glass event
    await db.query(
      `INSERT INTO data_access_audit_log (
        user_id, patient_id, action, access_reason,
        was_emergency_access, requires_justification
      ) VALUES ($1, $2, 'emergency_access_granted', $3, true, true)`,
      [userId, patientId, reason]
    );

    // Grant temporary access (8 hours)
    const grant: EmergencyAccessGrant = {
      patient_id: patientId,
      user_id: userId,
      access_token: generateSecureToken(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    };

    await redis.setex(
      `emergency_access:${grant.access_token}`,
      8 * 60 * 60, // TTL: 8 hours
      JSON.stringify(grant)
    );

    // Notify privacy officer
    await this.notifyPrivacyOfficer({
      type: 'emergency_access_granted',
      user_id: userId,
      patient_id: patientId,
      reason,
    });

    return grant;
  }

  async requirePostAccessJustification(userId: string, patientId: string) {
    // Send notification to user: "You accessed patient X in emergency mode. Please provide justification."
    await this.sendJustificationRequest(userId, patientId);

    // If no justification within 24 hours, escalate to supervisor
    setTimeout(async () => {
      const justified = await this.checkJustificationProvided(userId, patientId);
      if (!justified) {
        await this.escalateToSupervisor(userId, patientId);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}
```

**4. Data Export Tracking**

Strict logging of data leaving the system:

```sql
CREATE TABLE data_export_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id),
  export_type VARCHAR(50) NOT NULL, -- csv, pdf, hl7, fhir, print, email
  entity_type VARCHAR(50) NOT NULL, -- patient_list, visit_report, prescription_history
  record_count INTEGER,
  patient_ids UUID[], -- Array of affected patients
  export_reason VARCHAR(255),
  approval_required BOOLEAN DEFAULT false,
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  destination VARCHAR(255), -- email address, printer name, external system
  file_hash VARCHAR(64), -- SHA-256 hash of exported file
  encryption_used BOOLEAN DEFAULT false,
  ip_address INET,
  INDEX idx_export_log_user_date (user_id, exported_at DESC)
);
```

**5. Migration-Specific Custody Chain**

During migration, maintain chain from legacy system:

```sql
CREATE TABLE migration_custody_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES migrations(id),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL, -- extracted, transformed, validated, imported
  affected_entity_type VARCHAR(50), -- patient, visit, prescription
  affected_entity_ids UUID[],
  record_count INTEGER,
  performed_by_user_id UUID REFERENCES users(id),
  -- Data integrity
  source_checksum VARCHAR(64), -- Hash of source data
  destination_checksum VARCHAR(64), -- Hash of migrated data
  integrity_verified BOOLEAN,
  -- Traceability
  legacy_system_export_id VARCHAR(255), -- Export batch ID from legacy system
  legacy_system_export_timestamp TIMESTAMPTZ,
  legacy_system_export_user VARCHAR(255),
  -- Compliance attestation
  data_handling_compliance_confirmed BOOLEAN DEFAULT false,
  compliance_confirmed_by UUID REFERENCES users(id),
  compliance_confirmation_timestamp TIMESTAMPTZ
);
```

#### Compliance Reporting

**Generate Audit Reports for Regulators**:

```typescript
class ComplianceReportingService {
  // HIPAA-required: "Who accessed this patient's data?"
  async generatePatientAccessReport(
    patientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AccessReport> {
    const accesses = await db.query(
      `SELECT
        accessed_at,
        u.full_name as user_name,
        u.role as user_role,
        dal.action,
        dal.data_type,
        dal.access_reason,
        dal.was_emergency_access
       FROM data_access_audit_log dal
       JOIN users u ON dal.user_id = u.id
       WHERE dal.patient_id = $1
         AND dal.accessed_at BETWEEN $2 AND $3
       ORDER BY dal.accessed_at DESC`,
      [patientId, startDate, endDate]
    );

    return {
      patient_id: patientId,
      report_period: { start: startDate, end: endDate },
      total_accesses: accesses.rows.length,
      unique_users: [...new Set(accesses.rows.map(r => r.user_name))].length,
      emergency_accesses: accesses.rows.filter(r => r.was_emergency_access).length,
      accesses: accesses.rows,
    };
  }

  // Required for: Medical board investigations, malpractice cases
  async generateClinicalDecisionAuditTrail(
    patientId: string,
    visitId: string
  ): Promise<ClinicalAuditTrail> {
    // Get all events related to this visit
    const events = await db.query(
      `SELECT
        e.event_type,
        e.event_data,
        e.metadata,
        e.created_at,
        u.full_name as performed_by
       FROM event_store e
       JOIN users u ON e.metadata->>'caused_by_user_id' = u.id::text
       WHERE e.aggregate_type = 'visit'
         AND e.aggregate_id = $1
       ORDER BY e.created_at ASC`,
      [visitId]
    );

    // Reconstruct the clinical timeline
    return {
      patient_id: patientId,
      visit_id: visitId,
      timeline: events.rows.map(e => ({
        timestamp: e.created_at,
        action: e.event_type,
        performed_by: e.performed_by,
        details: e.event_data,
        ip_address: e.metadata.ip_address,
        facility: e.metadata.facility_id,
      })),
    };
  }

  // Required for: Compliance audits, SOC 2, HITRUST certification
  async generateSystemAccessReport(
    startDate: Date,
    endDate: Date
  ): Promise<SystemAccessReport> {
    // Aggregate access statistics
    const stats = await db.query(
      `SELECT
        DATE(accessed_at) as access_date,
        user_role,
        COUNT(*) as access_count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE was_emergency_access = true) as emergency_accesses,
        COUNT(*) FILTER (WHERE action = 'export') as data_exports
       FROM data_access_audit_log
       WHERE accessed_at BETWEEN $1 AND $2
       GROUP BY DATE(accessed_at), user_role
       ORDER BY access_date DESC, user_role`,
      [startDate, endDate]
    );

    return {
      report_period: { start: startDate, end: endDate },
      daily_statistics: stats.rows,
      anomalies: await this.detectAccessAnomalies(startDate, endDate),
    };
  }

  private async detectAccessAnomalies(startDate: Date, endDate: Date) {
    // Detect unusual access patterns (potential security incidents)
    return db.query(
      `SELECT
        user_id,
        COUNT(*) as access_count,
        COUNT(DISTINCT patient_id) as unique_patients_accessed,
        COUNT(*) FILTER (WHERE action = 'export') as exports
       FROM data_access_audit_log
       WHERE accessed_at BETWEEN $1 AND $2
       GROUP BY user_id
       HAVING
         COUNT(DISTINCT patient_id) > 100 -- Accessed >100 patients in period
         OR COUNT(*) FILTER (WHERE action = 'export') > 10 -- >10 exports
       ORDER BY access_count DESC`,
      [startDate, endDate]
    );
  }
}
```

#### Data Retention & Purging

**Requirement**: Audit logs must be retained for minimum periods (often 7-10 years), then securely destroyed.

```typescript
class DataRetentionService {
  async applyRetentionPolicies() {
    // Retention policies by log type
    const policies = [
      {
        table: 'data_access_audit_log',
        retention_years: 7,
        description: 'HIPAA requires 6 years minimum',
      },
      {
        table: 'migration_custody_log',
        retention_years: 10,
        description: 'Permanent retention for compliance',
      },
      {
        table: 'data_export_log',
        retention_years: 7,
        description: 'Match access log retention',
      },
    ];

    for (const policy of policies) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retention_years);

      // Soft delete (mark for archival)
      await db.query(
        `UPDATE ${policy.table}
         SET archived = true, archived_at = NOW()
         WHERE created_at < $1 AND archived = false`,
        [cutoffDate]
      );

      // After soft delete grace period (30 days), move to cold storage
      const archivalCutoff = new Date();
      archivalCutoff.setDate(archivalCutoff.getDate() - 30);

      const toArchive = await db.query(
        `SELECT * FROM ${policy.table}
         WHERE archived = true AND archived_at < $1`,
        [archivalCutoff]
      );

      if (to Archiverows.length > 0) {
        // Export to S3 Glacier (cheap long-term storage)
        await this.archiveToGlacier(policy.table, toArchive.rows);

        // Delete from hot database
        await db.query(
          `DELETE FROM ${policy.table}
           WHERE archived = true AND archived_at < $1`,
          [archivalCutoff]
        );
      }
    }
  }

  private async archiveToGlacier(table: string, records: any[]) {
    // Compress and encrypt before archival
    const compressed = await gzip(JSON.stringify(records));
    const encrypted = await this.encrypt(compressed);

    // Upload to S3 Glacier
    const key = `audit-logs/${table}/${new Date().toISOString()}.json.gz.enc`;
    await s3.putObject({
      Bucket: 'clinica-audit-archive',
      Key: key,
      Body: encrypted,
      StorageClass: 'GLACIER', // Cheapest storage, slow retrieval
    });

    // Log the archival
    await db.query(
      `INSERT INTO archival_log (table_name, record_count, s3_key, archived_at)
       VALUES ($1, $2, $3, NOW())`,
      [table, records.length, key]
    );
  }
}
```

#### Migration Chain-of-Custody Checklist

**Before Migration**:
- [ ] Document migration plan with compliance officer
- [ ] Obtain authorization from hospital leadership
- [ ] Configure audit logging (ensure enabled)
- [ ] Verify backup system operational

**During Migration**:
- [ ] Log all data extraction from legacy system
- [ ] Record checksums of extracted data
- [ ] Document any data transformations applied
- [ ] Track validation errors and resolutions
- [ ] Log all imported records with timestamps

**After Migration**:
- [ ] Verify data integrity (checksum validation)
- [ ] Generate migration custody report
- [ ] Obtain compliance officer sign-off
- [ ] Archive migration logs (permanent retention)
- [ ] Document any data discrepancies

---

### Service Level Agreements (SLAs)

**Purpose**: Define contractual guarantees for enterprise customers regarding system availability, data recovery, and support response times.

#### Migration-Specific SLAs

**1. Migration Timeline SLA**

| Hospital Size | Data Volume | Guaranteed Timeline | Penalty if Exceeded |
|---------------|-------------|---------------------|---------------------|
| Small (<100 beds) | <10K patients | 4 weeks | 10% refund per week delay |
| Medium (100-500 beds) | 10K-50K patients | 8 weeks | 10% refund per week delay |
| Large (500+ beds) | 50K-250K patients | 12 weeks | 5% refund per week delay |
| Enterprise (Multi-site) | >250K patients | 16-20 weeks | Custom penalty terms |

**2. Data Accuracy SLA**

```
Guaranteed Accuracy Rates (Post-Migration Validation):

✅ Patient Demographics: 99.9% accuracy
   - Name, DOB, Gender, Contact Info

✅ Clinical Data: 99.5% accuracy
   - Diagnoses, Medications, Allergies, Vitals

✅ Visit History: 99.0% accuracy
   - Visit dates, providers, chief complaints

✅ Medications/Prescriptions: 99.9% accuracy
   - Drug names, dosages, frequencies (critical for patient safety)

Measurement Method:
- Random sampling of 1,000 records post-migration
- Manual comparison against legacy system
- Discrepancies categorized as: Critical, Major, Minor
```

**3. Data Integrity SLA**

```
Zero Data Loss Guarantee:

• Cryptographic checksums on all extracted data
• Row-level verification (source count = destination count)
• Referential integrity validation (all foreign keys valid)
• Audit trail completeness (all events have corresponding source records)

Penalty if violated: Full refund + restoration costs
```

**4. Migration Downtime SLA**

```
Phased Migration (Zero Downtime):
- Legacy system remains operational: 100% uptime during migration
- Clinica availability during migration: 99.5% uptime
- Cutover window: <4 hours of dual-system read-only mode

Emergency Migration (Rare):
- Maximum downtime: 8 hours for cutover weekend
- Rollback capability: Within 2 hours if issues detected
```

#### Operational SLAs (Post-Migration)

**1. System Availability SLA**

| Tier | Uptime Guarantee | Max Monthly Downtime | Penalty |
|------|------------------|----------------------|---------|
| Standard | 99.5% | 3.6 hours | 10% credit |
| Professional | 99.9% | 43 minutes | 25% credit |
| Enterprise | 99.95% | 21 minutes | 50% credit |
| Mission-Critical | 99.99% | 4 minutes | 100% credit |

**Exclusions** (Planned Maintenance):
- Scheduled maintenance windows: Sunday 2-4 AM local time
- Maximum 2 planned maintenance windows per month
- Advance notice: 7 days for Standard, 14 days for Enterprise

**Measurement**:
```typescript
// Uptime calculation
const calculateUptime = (period: { start: Date; end: Date }) => {
  const totalMinutes = (period.end.getTime() - period.start.getTime()) / 60000;

  // Get all incidents in period
  const incidents = await db.query(
    `SELECT start_time, end_time FROM incidents
     WHERE start_time BETWEEN $1 AND $2
       AND incident_type IN ('outage', 'degraded_performance')
       AND was_planned_maintenance = false`,
    [period.start, period.end]
  );

  const downtimeMinutes = incidents.rows.reduce((sum, incident) => {
    return sum + (incident.end_time.getTime() - incident.start_time.getTime()) / 60000;
  }, 0);

  const uptime = ((totalMinutes - downtimeMinutes) / totalMinutes) * 100;
  return uptime.toFixed(4); // e.g., 99.9523%
};
```

**2. Performance SLA**

```
Response Time Guarantees (95th percentile):

• Page Load Time: <2 seconds
• API Response Time: <500ms (read operations)
• API Response Time: <1000ms (write operations)
• Search Results: <1 second
• Report Generation: <30 seconds (standard reports)

Database Query Performance:
• Patient search: <200ms
• Visit history load: <500ms
• Prescription lookup: <100ms

If violated for >10 minutes: 5% monthly credit
```

**3. Data Backup & Recovery SLA**

**Recovery Point Objective (RPO)**: Maximum data loss in disaster

| Tier | RPO | Data Loss Tolerance |
|------|-----|---------------------|
| Standard | 24 hours | Last backup |
| Professional | 4 hours | Last backup |
| Enterprise | 1 hour | Continuous replication |
| Mission-Critical | 5 minutes | Real-time replication |

**Recovery Time Objective (RTO)**: Maximum downtime in disaster

| Tier | RTO | System Restoration |
|------|-----|---------------------|
| Standard | 24 hours | Restore from backup |
| Professional | 4 hours | Restore from backup |
| Enterprise | 1 hour | Failover to hot standby |
| Mission-Critical | 15 minutes | Auto-failover |

**Implementation**:
```typescript
// Continuous backup strategy (Enterprise tier)
class BackupService {
  async setupContinuousBackup(hospitalId: string, tier: 'enterprise' | 'mission-critical') {
    if (tier === 'enterprise') {
      // Hourly incremental backups
      cron.schedule('0 * * * *', async () => {
        await this.performIncrementalBackup(hospitalId);
      });

      // Daily full backups
      cron.schedule('0 2 * * *', async () => {
        await this.performFullBackup(hospitalId);
      });
    }

    if (tier === 'mission-critical') {
      // Continuous replication to standby region
      await this.enablePostgreSQLReplication({
        primary: 'us-east-1',
        standby: 'us-west-2',
        replication_mode: 'synchronous', // Zero data loss
      });

      // Enable auto-failover
      await this.configureAutoFailover({
        health_check_interval: 30, // seconds
        failover_threshold: 3, // failed checks before failover
        automatic_failback: false, // Manual failback required
      });
    }
  }

  async testDisasterRecovery(hospitalId: string): Promise<DRTestReport> {
    // Quarterly DR testing required for Enterprise tier
    const startTime = new Date();

    // 1. Simulate primary region failure
    await this.simulateRegionFailure('us-east-1');

    // 2. Trigger failover
    await this.triggerFailover(hospitalId, 'us-west-2');

    // 3. Verify data integrity
    const integrityCheck = await this.verifyDataIntegrity(hospitalId);

    // 4. Measure RTO
    const rto = (new Date().getTime() - startTime.getTime()) / 1000; // seconds

    // 5. Restore primary region
    await this.failbackToPrimary(hospitalId);

    return {
      test_date: startTime,
      rto_achieved: rto,
      rto_target: this.getRTOTarget(hospitalId),
      data_integrity_verified: integrityCheck.passed,
      issues_found: integrityCheck.issues,
    };
  }
}
```

**4. Support Response Time SLA**

See detailed Support Tiers section below.

---

### Commercial Models & Pricing

**Purpose**: Transparent pricing structure for migration services and ongoing usage.

#### Migration Pricing Models

**Model 1: Fixed-Price Migration (Small-Medium Hospitals)**

```
Base Migration Fee:
├─ Small Hospital (<10K patients): $25,000 - $50,000
├─ Medium Hospital (10K-50K patients): $50,000 - $150,000
└─ Large Hospital (50K-250K patients): $150,000 - $500,000

Included Services:
✅ Data extraction & transformation
✅ Data validation & cleanup
✅ User role mapping
✅ 2 rounds of pilot testing (sandbox)
✅ Production cutover
✅ 30-day post-migration support
✅ Staff training (up to 50 users)

Additional Services (À La Carte):
• Custom connector development: $15K - $50K per system
• Extended sandbox testing (>2 rounds): $5K per round
• Additional training sessions: $2K per session (up to 25 users)
• Dedicated migration PM: $10K/month
• 24/7 migration support: $5K/week
```

**Model 2: Time & Materials (Enterprise/Complex Migrations)**

```
Hourly Rates:
├─ Migration Architect (Planning, Design): $250/hour
├─ Integration Engineer (Connector Development): $200/hour
├─ Data Engineer (ETL, Validation): $175/hour
├─ Migration Specialist (Execution, Support): $150/hour
└─ Project Manager: $175/hour

Typical Enterprise Migration Budget:
• Discovery & Planning (2-4 weeks): 80-160 hours = $20K-$40K
• Custom Development (4-8 weeks): 320-640 hours = $64K-$128K
• Testing & Validation (2-4 weeks): 160-320 hours = $28K-$56K
• Cutover & Stabilization (2-3 weeks): 160-240 hours = $24K-$36K

Total Range: $136K - $260K (for complex multi-system migrations)

Risk Mitigation:
• Not-to-exceed clause: Maximum 20% over estimate
• Monthly billing caps available
• Fixed-price pilot phase option
```

**Model 3: Success-Based Pricing (Performance Incentive)**

```
Base Fee: 70% of fixed price
Success Bonuses:
• Migration completed on-time: +10%
• Data accuracy >99.9%: +10%
• Zero critical incidents during cutover: +5%
• User satisfaction score >4.5/5: +5%

Maximum Total: 100% of original fixed price

Penalties (Deducted from Base):
• >2 weeks late: -10% per week
• Data accuracy <99%: -15%
• Critical incident during cutover: -10%
• Failed go-live (rollback required): -30%

Minimum Payment: 50% of base (even if migration fails)
```

#### Ongoing Subscription Pricing

**User-Based Pricing (Standard)**

| Tier | Users | Price/User/Month | Annual (15% discount) |
|------|-------|------------------|-----------------------|
| Starter | 1-10 | $50 | $510/user/year |
| Professional | 11-50 | $40 | $408/user/year |
| Enterprise | 51-250 | $30 | $306/user/year |
| Large Enterprise | 251-1000 | $25 | $255/user/year |
| Enterprise Plus | 1000+ | Custom | Negotiated |

**Included Features by Tier**:

```
Starter ($50/user/month):
- Core EMR features (patients, visits, prescriptions)
- 5 GB storage per user
- 99.5% uptime SLA
- Email support (24-hour response)
- Basic reporting

Professional ($40/user/month):
- Everything in Starter, plus:
- Advanced reporting & analytics
- API access (1000 calls/day)
- 99.9% uptime SLA
- Phone support (4-hour response)
- Custom forms & templates
- 10 GB storage per user

Enterprise ($30/user/month):
- Everything in Professional, plus:
- Multi-facility support
- SSO/SAML integration
- 99.95% uptime SLA
- Priority support (1-hour response)
- Dedicated success manager
- Custom integrations (up to 5)
- 25 GB storage per user
- Audit & compliance reporting

Enterprise Plus (Custom pricing):
- Everything in Enterprise, plus:
- 99.99% uptime SLA
- White-label branding
- Dedicated infrastructure
- Unlimited integrations
- 24/7 phone support
- On-site training & support
- Regulatory compliance assistance
- Unlimited storage
```

**Facility-Based Pricing (Alternative for Large Hospitals)**

```
Per Facility Licensing:
├─ Satellite Clinic (<20 beds): $3,000/month
├─ Small Hospital (20-100 beds): $8,000/month
├─ Medium Hospital (100-300 beds): $20,000/month
├─ Large Hospital (300-500 beds): $40,000/month
└─ Major Medical Center (>500 beds): $75,000/month

Includes: Unlimited users within facility

Multi-Facility Discounts:
• 2-5 facilities: 10% discount
• 6-10 facilities: 20% discount
• 11+ facilities: 25% discount + custom terms
```

**Add-On Modules (Optional)**

```
Billing & Revenue Cycle Module:
- Claims management: +$15/user/month
- Payment processing: +$0.50/transaction
- Insurance verification: +$0.25/verification

Laboratory Information System (LIS):
- Lab order management: +$10/user/month
- Result reporting: Included
- Interface to lab instruments: +$500/month per interface

Radiology Information System (RIS):
- PACS integration: +$5,000/month (flat fee)
- Radiology reporting: +$8/user/month
- DICOM storage: +$0.10/GB/month

Telemedicine Module:
- Video consultations: +$20/provider/month
- Unlimited patient participants
- Recording & storage: +$0.05/minute

Mobile App:
- Patient mobile app: +$2/active patient/month
- Provider mobile app: Included in Professional tier+
```

#### Payment Terms

**Standard Terms**:
```
Migration Services:
• 30% deposit upon signing SOW
• 40% upon completion of pilot testing
• 30% upon successful production cutover

Subscription Services:
• Monthly in advance (month-to-month)
• Annual prepayment (15% discount)
• 3-year commitment (25% discount + price lock)

Payment Methods:
• Wire transfer (preferred)
• ACH (US only)
• Credit card (up to $25K, 3% processing fee)
• Purchase Order (Net 30 for qualified hospitals)
```

**Enterprise Financing Options**:
```
• Multi-year contracts: Spread migration cost over 3 years
• CapEx model: One-time purchase + annual maintenance (20%)
• Revenue share: % of collection improvement (value-based pricing)
```

#### Procurement Language for RFPs

**Pricing Summary Statement**:
> "Clinica offers transparent, predictable pricing with no hidden fees. Migration services range from $25,000 for small clinics to $500,000 for large multi-system hospitals, with success-based incentives available. Ongoing subscription pricing starts at $30/user/month for enterprise customers with annual commitment discounts up to 25%. All prices include standard support, training, and regular product updates."

**Total Cost of Ownership (TCO) Comparison**:
```
5-Year TCO Example (200-bed hospital, 150 users):

Migration (Year 1):
- Fixed-price migration: $150,000
- Staff training (6 sessions): $12,000
- Subtotal: $162,000

Subscription (Years 1-5):
- 150 users × $30/user/month × 12 months × 5 years = $270,000
- Less: 3-year prepay discount (25%) = -$67,500
- Subtotal: $202,500

Add-Ons (Years 1-5):
- Billing module: 150 users × $15 × 12 × 5 = $135,000
- PACS integration: $5,000 × 12 × 5 = $300,000
- Subtotal: $435,000

Total 5-Year TCO: $799,500
Average Annual Cost: $159,900

vs. Legacy System TCO:
- Annual license & maintenance: $250,000/year × 5 = $1,250,000
- On-premise hardware: $100,000 (Year 1) + $20K/year maint = $180,000
- IT staff (2 FTEs): $150K/year × 5 = $750,000
- Total Legacy TCO: $2,180,000

Savings with Clinica: $1,380,500 (63% reduction)
```

---

### Cutover & Fallback Procedures

**Purpose**: Define precise procedures for switching from legacy system to Clinica, with detailed rollback plans if issues arise.

#### Cutover Planning

**Pre-Cutover Checklist (T-2 Weeks)**

```
Data Preparation:
[ ] Final data extraction from legacy system
[ ] Data validation (accuracy >99.5%)
[ ] User acceptance testing completed
[ ] Performance testing passed (load test with 2x expected traffic)
[ ] All critical defects resolved (P0, P1)

Infrastructure:
[ ] Production environment provisioned
[ ] Load balancers configured
[ ] SSL certificates installed
[ ] Backup systems tested
[ ] Monitoring & alerting configured

Security:
[ ] Penetration testing completed
[ ] HIPAA compliance audit passed
[ ] Access controls configured
[ ] Audit logging enabled

Training:
[ ] All staff trained (>90% attendance)
[ ] Super-users identified (1 per department)
[ ] Quick reference guides distributed
[ ] Helpdesk prepared (scripts, escalation paths)

Communication:
[ ] Cutover communication sent to all users
[ ] Patient notification (if applicable)
[ ] IT freeze announced (no other changes during cutover)
[ ] Emergency contacts distributed

Business Continuity:
[ ] Downtime procedures documented
[ ] Manual workflow fallback plans ready
[ ] Paper forms available (if needed)
[ ] Legacy system kept accessible (read-only)
```

#### Cutover Timeline (Recommended: Weekend)

**Friday Evening (6:00 PM)** - Preparation Phase
```
6:00 PM - Final sync from legacy system
         - Extract all data changes since last sync
         - Store in staging database

7:00 PM - Legacy system set to READ-ONLY mode
         - Display banner: "System in transition mode. Read-only until Monday."
         - Block all write operations

8:00 PM - Final data validation
         - Run automated validation scripts
         - Compare row counts, checksums
         - Spot-check 100 random records

9:00 PM - GO/NO-GO Decision Point #1
         IF validation passes: Continue
         IF validation fails: Abort, investigate, retry Saturday morning
```

**Saturday Morning (8:00 AM)** - Import Phase
```
8:00 AM - Begin production import
         - Import to Clinica production database
         - Real-time progress monitoring
         - ETA: 4-6 hours for medium hospital

2:00 PM - Import completion
         - Verify record counts match source
         - Run data integrity checks

3:00 PM - System configuration
         - Configure user accounts
         - Set up departments, facilities
         - Configure integrations (labs, PACS, pharmacy)

5:00 PM - GO/NO-GO Decision Point #2
         IF all checks pass: Continue to testing
         IF issues found: Triage (Fix if <2 hour work, else abort)
```

**Saturday Evening (6:00 PM)** - Testing Phase
```
6:00 PM - Internal smoke testing
         - Test critical workflows (patient registration, prescriptions, etc.)
         - Test by super-users (1 per department)
         - Duration: 2 hours

8:00 PM - User acceptance sign-off
         - Super-users sign off on readiness
         - Document any known issues (workarounds provided)

9:00 PM - GO/NO-GO Decision Point #3 (FINAL)
         IF UAT passed AND no critical issues: GO LIVE Sunday
         IF critical issues found: ROLLBACK to legacy system

10:00 PM - If GO: Finalize cutover
          - Update DNS (if applicable)
          - Enable production access
          - Send "System Ready" notification
```

**Sunday (All Day)** - Go-Live Day
```
6:00 AM - Clinica production LIVE
         - Monitoring team on standby
         - Helpdesk opens at 7 AM

7:00 AM - Early users test system
         - Emergency department staff (first to arrive)
         - Monitor for issues

8:00 AM - Full operations begin
         - All departments operational
         - Legacy system remains accessible (read-only)

Throughout Day:
         - Real-time incident monitoring
         - Helpdesk handles user questions
         - Escalate P0/P1 issues immediately

8:00 PM - End-of-day review
         - Incident summary
         - Decision: Continue or rollback Monday?
```

**Monday (Go-Live +1)** - Stabilization Day
```
7:00 AM - Full operational load
         - Peak patient volume expected
         - Migration team on standby

Throughout Day:
         - Performance monitoring
         - Issue resolution
         - User support

5:00 PM - Post-go-live review
         - Assess success criteria
         - Decision: Decommission legacy or extend parallel operation?
```

#### Rollback Procedures

**Scenario 1: Pre-Import Rollback (Before Saturday 2 PM)**

**Trigger Conditions**:
- Data validation fails (accuracy <99%)
- Critical infrastructure failure
- Team not ready

**Procedure**:
```
1. Notify stakeholders: "Cutover postponed to next weekend"
2. Keep legacy system in normal operation (read-write)
3. Fix issues during the week
4. Retry next weekend
```

**Impact**: Minimal - users continue on legacy system

---

**Scenario 2: Post-Import Rollback (Saturday Evening - Sunday Morning)**

**Trigger Conditions**:
- UAT identifies critical workflow failures
- Performance issues (page load >10 seconds)
- Data corruption detected

**Procedure**:
```
1. STOP all production traffic to Clinica
2. Remove DNS routing to Clinica
3. Legacy system set back to READ-WRITE mode
4. Announce rollback: "Returning to previous system due to technical issues"
5. Post-mortem: Identify root cause, fix, schedule retry

Data Handling:
- Any data entered in Clinica during test period:
  → Export to CSV
  → Manual entry into legacy system (if needed)
  → Usually <10 records during testing
```

**Impact**: Moderate - Some manual data entry, user confusion

---

**Scenario 3: Emergency Rollback (Sunday - Monday)**

**Trigger Conditions**:
- CRITICAL system outage (>30 minutes)
- Patient safety risk identified
- Major security breach

**Procedure**:
```
EMERGENCY PROTOCOL - Execute immediately:

T+0 minutes: ACTIVATE LEGACY SYSTEM (read-write)
           - Bypass normal approval process
           - Enable all users on legacy system
           - Display banner: "TEMPORARY - Use legacy system"

T+15 minutes: Notify all staff
            - Email, SMS, phone calls to department heads
            - In-person notification to emergency department

T+30 minutes: DATA RECONCILIATION PLANNING
            - Identify all data entered in Clinica since go-live
            - Usually 12-48 hours of data

T+2 hours: Begin dual-entry period
          - Enter new data in BOTH systems (temporary)
          - Plan data migration back to legacy system

T+24-48 hours: Complete reconciliation
             - Migrate Clinica data back to legacy system
             - Verify no data loss

T+1 week: Post-incident review
         - Root cause analysis
         - Remediation plan
         - Re-schedule cutover (usually 4-6 weeks out)
```

**Impact**: High - Dual data entry, significant effort

#### Rollback Decision Matrix

| Time Since Go-Live | Data Complexity | Rollback Ease | Recommended Action |
|--------------------|-----------------|---------------|---------------------|
| <24 hours | Low (<100 new records) | Easy | Rollback if any critical issue |
| 1-3 days | Medium (100-500 records) | Moderate | Rollback only for patient safety/major outage |
| 4-7 days | High (500-2000 records) | Difficult | Fix forward unless catastrophic |
| >7 days | Very High (>2000 records) | Extremely Difficult | Do NOT rollback - fix issues in Clinica |

#### Cutover Success Criteria

**Mandatory (Must Pass All)**:
```
✅ Zero data loss (source record count = destination record count)
✅ Data accuracy >99% (validated via sampling)
✅ All P0 (critical) defects resolved
✅ User authentication working (100% of users can log in)
✅ Core workflows operational:
   - Patient registration
   - Appointment scheduling
   - Prescription writing
   - Lab order entry
✅ Integrations functional:
   - PACS (imaging) if applicable
   - Lab system if applicable
   - Pharmacy system if applicable
✅ Performance acceptable (<3 second page loads for 95% of requests)
✅ Helpdesk ready (staffed, trained, escalation paths defined)
```

**Nice-to-Have (Can defer if needed)**:
```
⚠️ All P1 (high priority) defects resolved
   → Can defer 1-2 weeks if workarounds exist

⚠️ Advanced reports available
   → Can use legacy system for reports during transition

⚠️ Mobile app functional
   → Desktop/web sufficient for go-live

⚠️ Custom forms migrated
   → Can use standard forms initially

⚠️ Historical billing data available
   → Can query legacy system for old billing
```

#### Communication Plan

**Pre-Cutover (T-2 weeks)**:
```
To: All Staff
Subject: System Transition - Important Dates

We are transitioning to Clinica, our new EMR system, on [DATE].

Key Dates:
- Jan 15: Final training session
- Jan 18-19: System unavailable for maintenance
- Jan 20: New system goes live

Please review the training materials and contact the helpdesk with questions.
```

**During Cutover (Weekend)**:
```
To: All Staff
Subject: System Status - Read Only Mode

The legacy system is currently in read-only mode for data migration.
New appointments and data entry will resume on [GO-LIVE DATE].

For emergencies, contact: [EMERGENCY HOTLINE]
```

**Go-Live Day**:
```
To: All Staff
Subject: Welcome to Clinica - We're Live!

The new Clinica system is now live. Please log in at: [URL]

Your username: [USERNAME]
Reset password: [LINK]

Helpdesk: [PHONE] (available 24/7 this week)
Quick Reference Guide: [LINK]
```

**Post-Rollback (If Needed)**:
```
To: All Staff
Subject: Temporary Return to Legacy System

Due to technical issues, we have temporarily returned to the legacy system.
Please use the old system for all patient care activities.

We apologize for the inconvenience and are working to resolve the issues.

Next update: [DATE/TIME]
```

---

### Support Tiers

**Purpose**: Define support levels, response times, and escalation procedures for different customer segments.

#### Support Tier Definitions

**Tier 1: Standard Support (Included in Starter/Professional Plans)**

```
Coverage:
• Email support: 24/7 (monitored 8 AM - 6 PM local time)
• Phone support: Mon-Fri 8 AM - 6 PM local time
• Self-service portal: 24/7

Response Times (SLA):
┌─────────────┬────────────────┬─────────────────┐
│ Priority    │ First Response │ Resolution Time │
├─────────────┼────────────────┼─────────────────┤
│ P0 (Critical│ 4 hours        │ 24 hours        │
│ P1 (High)   │ 8 hours        │ 48 hours        │
│ P2 (Medium) │ 24 hours       │ 5 business days │
│ P3 (Low)    │ 48 hours       │ Best effort     │
└─────────────┴────────────────┴─────────────────┘

Priority Definitions:
• P0: System down, patient safety risk, data loss
• P1: Major feature broken, significant user impact
• P2: Minor feature issue, workaround available
• P3: Cosmetic issue, feature request, question

Support Channels:
• Email: support@clinica.com
• Phone: +1-XXX-XXX-XXXX (US), +91-XXXX-XXXXXX (India)
• Web portal: https://support.clinica.com
• Knowledge base: https://help.clinica.com

Included Services:
✅ Bug fixes & patches
✅ Security updates
✅ Regular product updates
✅ Self-service knowledge base
✅ Community forum access
❌ Dedicated support rep
❌ After-hours support (P1-P3)
❌ Custom development
❌ On-site support
```

---

**Tier 2: Professional Support (Included in Enterprise Plans)**

```
Coverage:
• Email & phone support: 24/7
• Web portal: 24/7
• Slack channel (optional): Business hours

Response Times (SLA):
┌─────────────┬────────────────┬─────────────────┐
│ Priority    │ First Response │ Resolution Time │
├─────────────┼────────────────┼─────────────────┤
│ P0 (Critical│ 1 hour         │ 8 hours         │
│ P1 (High)   │ 4 hours        │ 24 hours        │
│ P2 (Medium) │ 8 hours        │ 3 business days │
│ P3 (Low)    │ 24 hours       │ Best effort     │
└─────────────┴────────────────┴─────────────────┘

Included Services:
✅ Everything in Standard Support
✅ 24/7 phone support (all priorities)
✅ Dedicated Success Manager (shared, 1:10 ratio)
✅ Quarterly business reviews
✅ Priority bug fixes
✅ Early access to new features (beta program)
✅ Custom report development (up to 5/year)
✅ Integration assistance (standard connectors)
❌ Dedicated support engineer
❌ On-site support (except critical incidents)
❌ Custom development

Success Manager Responsibilities:
• Quarterly check-in calls
• Feature adoption guidance
• Workflow optimization recommendations
• Escalation coordination
• Product roadmap influence
```

---

**Tier 3: Premium Support (Enterprise Plus)**

```
Coverage:
• Email, phone, Slack: 24/7/365
• Dedicated support engineer assigned
• Direct mobile contact for emergencies

Response Times (SLA):
┌─────────────┬────────────────┬─────────────────┐
│ Priority    │ First Response │ Resolution Time │
├─────────────┼────────────────┼─────────────────┤
│ P0 (Critical│ 15 minutes     │ 4 hours         │
│ P1 (High)   │ 1 hour         │ 8 hours         │
│ P2 (Medium) │ 4 hours        │ 2 business days │
│ P3 (Low)    │ 8 hours        │ 1 week          │
└─────────────┴────────────────┴─────────────────┘

Included Services:
✅ Everything in Professional Support
✅ Dedicated Support Engineer (1:5 customer ratio)
✅ Dedicated Success Manager (1:3 customer ratio)
✅ Monthly business reviews + on-site visits (quarterly)
✅ Proactive monitoring & health checks
✅ Custom development hours (20 hours/quarter included)
✅ Priority feature requests (fast-track development)
✅ Unlimited custom reports
✅ White-glove migration support
✅ Disaster recovery assistance
✅ Regulatory audit support
✅ On-site training (up to 4 sessions/year)

Dedicated Support Engineer:
• Learns your specific workflows & customizations
• Proactive issue detection & resolution
• Attends your internal meetings (optional)
• Direct Slack/Teams channel
• Mobile contact for P0 emergencies
```

---

**Tier 4: Mission-Critical Support (Large Health Systems)**

```
Coverage:
• 24/7/365 with named support team (3 engineers assigned)
• On-site presence available (for systems >1000 users)
• Executive escalation path

Response Times (SLA):
┌─────────────┬────────────────┬─────────────────┐
│ Priority    │ First Response │ Resolution Time │
├─────────────┼────────────────┼─────────────────┤
│ P0 (Critical│ 5 minutes      │ 2 hours         │
│ P1 (High)   │ 30 minutes     │ 4 hours         │
│ P2 (Medium) │ 2 hours        │ 1 business day  │
│ P3 (Low)    │ 4 hours        │ 3 business days │
└─────────────┴────────────────┴─────────────────┘

Included Services:
✅ Everything in Premium Support
✅ Named support team (3 dedicated engineers)
✅ Executive Success Manager
✅ Bi-weekly business reviews + monthly on-site visits
✅ 24/7 phone hotline (direct to engineering team)
✅ Proactive capacity planning
✅ Custom development (80 hours/quarter included)
✅ Unlimited emergency on-site visits
✅ Co-located infrastructure (optional)
✅ Custom SLA terms negotiable
✅ Executive escalation (CTO direct contact)
✅ Participate in product roadmap planning
✅ Early access to all features (including beta)

Named Support Team:
• 3 engineers who know your system intimately
• Attend your change advisory board meetings
• Proactive performance tuning
• On-call rotation (one engineer always available)
• Embedded engineer option (on-site 1-2 days/week)
```

#### Support Escalation Matrix

```
Level 1: Helpdesk
├─ Tier 1 Support Agents
├─ Handles: Account issues, basic questions, known bugs
├─ Escalate to L2 if: Issue requires code change or >30 min troubleshooting
└─ Response time: Immediate (if available), max 4 hours

Level 2: Technical Support
├─ Senior Support Engineers
├─ Handles: Complex troubleshooting, integration issues, data problems
├─ Escalate to L3 if: Code fix required or architectural issue
└─ Response time: Standard tier SLAs apply

Level 3: Engineering
├─ Software Engineers
├─ Handles: Bug fixes, performance issues, custom development
├─ Escalate to L4 if: Requires major architectural change or security issue
└─ Response time: P0: 1 hour, P1: 4 hours

Level 4: Leadership
├─ Engineering Manager, CTO
├─ Handles: Major incidents, business-critical escalations
├─ Escalate to L5 if: Customer relationship at risk
└─ Response time: 30 minutes

Level 5: Executive
├─ CEO, COO
├─ Handles: Strategic issues, contract disputes
└─ Response time: 1 hour
```

#### Incident Management (P0 - Critical)

**P0 Incident Response Protocol**:

```
T+0: Incident Detected
     - Automated alert to on-call engineer
     - Customer notification: "We're aware, investigating"

T+5min: Incident Commander Assigned
       - Senior engineer takes command
       - Assemble war room (Slack/Zoom)

T+15min: Initial Assessment
        - Root cause hypothesis
        - Workaround identified (if possible)
        - Customer update #1

T+30min: Customer Bridge Line (for Enterprise+ customers)
        - Join customer's incident bridge
        - Real-time updates

T+1hour: Executive Notification
        - CTO notified for all P0 incidents
        - Customer executive notification

T+2hours: Resolution or Mitigation
         - Incident resolved OR
         - Mitigation deployed (switch to backup, rollback, etc.)

T+4hours: Post-Incident Communication
         - "Incident resolved" email
         - Preliminary root cause

T+48hours: Post-Mortem Report
          - Detailed root cause analysis
          - Timeline of events
          - Preventive measures

T+1week: Follow-Up Call
        - Review post-mortem with customer
        - Discuss compensation (if SLA violated)
```

#### Support Pricing (Add-Ons)

For customers who want to upgrade support tier:

```
Standard → Professional Support Upgrade: +$500/month (flat fee)
Professional → Premium Support Upgrade: +$2,500/month (flat fee)
Premium → Mission-Critical Support Upgrade: Custom pricing ($10K-$25K/month)

À La Carte Support Services:
• After-hours support (one-time): $500/incident
• Emergency on-site visit: $5,000 + travel expenses
• Custom training session: $2,000/session
• Dedicated support engineer (part-time): $5,000/month
• Expedited feature development: $250/hour (minimum 20 hours)
```

---

### Procurement Readiness

**Purpose**: Provide all documentation, certifications, and processes required for hospital procurement and vendor onboarding.

#### Required Documentation

**1. Company Profile & Credentials**

```
Legal Documents:
□ Certificate of Incorporation
□ Tax ID (EIN/TIN)
□ D-U-N-S Number
□ Business License
□ Professional Liability Insurance ($5M minimum)
□ Cyber Liability Insurance ($10M minimum)
□ General Liability Insurance
□ Workers Compensation Insurance

Financial Documents:
□ Audited Financial Statements (last 3 years)
□ Bank References
□ Credit References
□ SOC 2 Type II Report
□ Annual Revenue & Profitability

References:
□ 3 healthcare customer references
□ 2 large hospital references (if applicable)
□ Customer satisfaction scores
□ Case studies
```

**2. Compliance & Security Certifications**

```
Healthcare Compliance:
✅ HIPAA Compliance (attestation + audit report)
✅ HITECH Compliance
✅ 21 CFR Part 11 (if applicable for clinical trials)
✅ State-specific regulations (varies by location)

Data Security:
✅ SOC 2 Type II (annual audit)
✅ ISO 27001 (Information Security Management)
✅ HITRUST CSF Certified (healthcare-specific security framework)
✅ Penetration Testing (annual third-party audit)
✅ Vulnerability Scanning (continuous)

Privacy:
✅ GDPR Compliance (if operating in EU)
✅ CCPA Compliance (if serving California hospitals)
✅ Privacy Shield (if transferring data to/from EU)

Infrastructure:
✅ SSAE 18 (if self-hosted)
✅ AWS/Azure/GCP compliance inheritance (if cloud-hosted)
✅ Disaster Recovery Plan (tested annually)
✅ Business Continuity Plan

Software Quality:
✅ ISO 13485 (medical devices, if applicable)
✅ IEC 62304 (medical device software)
✅ HL7 Certification (for interoperability)
✅ DICOM Conformance Statement (for imaging integration)
```

**3. Product Documentation**

```
Technical Documentation:
□ System Architecture Diagram
□ Data Flow Diagrams
□ Integration Specifications (APIs, HL7, FHIR)
□ Security Architecture
□ Disaster Recovery Plan
□ Scalability & Performance Specs

User Documentation:
□ User Manuals (role-specific)
□ Administrator Guides
□ Training Materials
□ Video Tutorials
□ Quick Reference Guides

Regulatory Documentation:
□ FDA Registration (if applicable - Class II medical device)
□ CE Mark (if selling in Europe)
□ Risk Management File (ISO 14971)
□ Clinical Evaluation Report

Contract Documents:
□ Master Service Agreement (MSA) template
□ Business Associate Agreement (BAA) - HIPAA required
□ Data Processing Agreement (DPA) - GDPR required
□ Service Level Agreement (SLA) terms
□ Professional Services Agreement (for migration)
```

#### Vendor Onboarding Process

**Typical Hospital Procurement Timeline: 3-12 months**

```
Phase 1: RFP Response (Month 1-2)
├─ Receive RFP document
├─ Attend bidder's conference (if held)
├─ Submit questions by deadline
├─ Prepare written response (50-200 pages typical)
├─ Submit pricing spreadsheet
├─ Provide all required documentation
└─ Submit by deadline (no late submissions accepted)

Phase 2: Evaluation (Month 3-4)
├─ Hospital evaluates responses
├─ Shortlist vendors (typically 2-3)
├─ Reference checks conducted
├─ Financial viability assessment
└─ Technical architecture review

Phase 3: Product Demonstrations (Month 4-5)
├─ On-site demo (2-4 hours)
├─ Use hospital's workflows & data
├─ Q&A with clinical staff
├─ Technical deep-dive with IT team
└─ Executive presentation

Phase 4: Due Diligence (Month 5-7)
├─ Security assessment (questionnaire + audit)
├─ Compliance verification
├─ Site visit to vendor office (optional)
├─ Customer reference calls
├─ Financial analysis
├─ Negotiate contract terms
└─ Legal review

Phase 5: Board Approval (Month 7-9)
├─ Procurement committee recommendation
├─ CFO approval (if >$500K)
├─ Board of Directors approval (if >$1M)
└─ Final contract execution

Phase 6: Vendor Onboarding (Month 9-10)
├─ W-9 / Tax forms
├─ Insurance certificates
├─ Background checks (for on-site personnel)
├─ Badge/access requests
├─ Network access approvals
├─ BAA execution
└─ Vendor system setup (add to ERP, procurement system)

Phase 7: Project Kickoff (Month 10-12)
├─ Project charter signed
├─ Statement of Work (SOW) finalized
├─ Migration plan approved
├─ Kick-off meeting
└─ Begin implementation
```

#### RFP Response Template

**Common RFP Sections (80-150 pages typical)**

```
1. Executive Summary (2-3 pages)
   - Company overview
   - Why Clinica is the best fit
   - Key differentiators
   - Pricing summary

2. Company Profile (5-10 pages)
   - History & mission
   - Financial stability
   - Customer base (# of hospitals, beds served)
   - Geographic presence
   - Awards & recognition
   - Leadership team

3. Product Overview (15-25 pages)
   - Core features
   - Technology stack
   - Architecture diagram
   - Screenshots
   - Roadmap (future features)

4. Functional Requirements Matrix (30-50 pages)
   - Hospital provides 200-500 requirements
   - Response for EACH: "Fully Meets", "Partially Meets", "Roadmap", "Does Not Meet"
   - Explanatory comments required

   Example:
   ┌──────┬─────────────────────────────┬────────────┬──────────────────┐
   │ ID   │ Requirement                 │ Response   │ Comments         │
   ├──────┼─────────────────────────────┼────────────┼──────────────────┤
   │ 1.2.3│ Support for HL7 v2.5.1      │ Fully Meets│ Certified by...  │
   │ 1.2.4│ FHIR R4 API                 │ Roadmap    │ Q3 2026 release  │
   │ 1.2.5│ DICOM Worklist integration  │ Fully Meets│ See Section...   │
   └──────┴─────────────────────────────┴────────────┴──────────────────┘

5. Technical Architecture (10-15 pages)
   - Infrastructure (cloud vs on-premise)
   - Database technology
   - Security architecture
   - Integration capabilities
   - Scalability (max users, patients, transactions/sec)
   - Performance benchmarks
   - Backup & disaster recovery

6. Implementation Plan (10-15 pages)
   - Migration methodology
   - Timeline (Gantt chart)
   - Resource requirements
   - Training plan
   - Go-live approach
   - Risks & mitigation strategies

7. Compliance & Security (10-15 pages)
   - HIPAA compliance details
   - Certifications (SOC 2, HITRUST, etc.)
   - Data encryption (at rest & in transit)
   - Access controls & audit logging
   - Penetration testing results
   - Incident response procedures

8. Support & Maintenance (5-10 pages)
   - Support tiers
   - Response times (SLAs)
   - Escalation procedures
   - Ongoing maintenance
   - Software updates
   - System monitoring

9. Pricing (5-10 pages)
   - Migration costs (fixed price or T&M)
   - Subscription pricing
   - Add-on modules
   - Support costs
   - Training costs
   - 5-year TCO analysis
   - Payment terms

10. References (3-5 pages)
    - Minimum 3 references required
    - Similar-sized hospitals preferred
    - Contact information (with permission)
    - Brief case study for each

11. Appendices (variable)
    - Certifications (copies)
    - Insurance certificates
    - Financial statements
    - Sample contracts (MSA, BAA, SLA)
    - Product literature
    - Awards & press coverage
```

#### Pre-Qualification Questionnaires

Many hospitals require vendors to complete questionnaires BEFORE issuing RFP:

```
Common Questionnaire Topics:

1. Company Information
   - Years in business
   - Number of employees
   - Annual revenue
   - Number of healthcare customers
   - Geographic coverage

2. Product Maturity
   - Years in production
   - Current version
   - Release frequency
   - Number of active users

3. Financial Stability
   - Revenue trend (last 3 years)
   - Profitability
   - Funding sources (VC-backed, bootstrapped, public)
   - Cash runway

4. Security & Compliance
   - HIPAA compliant? (Yes/No)
   - SOC 2 Type II? (Yes/No + report date)
   - Penetration testing? (Frequency)
   - Data breach history? (disclose any incidents)

5. References
   - Provide 3 hospital references
   - Include bed count and go-live date
   - Contact information

6. Support
   - Support hours (24/7?)
   - Average response time
   - Escalation process

Scoring:
- Vendors who meet minimum thresholds are invited to RFP
- Typical requirements:
  • >3 years in business
  • >10 healthcare customers
  • SOC 2 Type II certified
  • Financial stability (positive cashflow or recent funding)
  • Zero unresolved data breaches
```

#### Contract Negotiation Points

**Common Hospital Negotiation Requests**:

```
1. Pricing
   - Multi-year discount (hospital requests 30%, vendor offers 15-25%)
   - Price lock (hospital wants 3-5 years, vendor offers 2-3 years)
   - Termination for convenience (hospital wants, vendor resists)

2. SLA Terms
   - Higher uptime (hospital wants 99.99%, vendor offers 99.9%)
   - Faster response times (hospital wants P0 in 15min, vendor offers 1hr)
   - Larger penalties (hospital wants 50% credit, vendor offers 10%)

3. Data Ownership & Portability
   - Hospital owns all data (vendor agrees)
   - Data export format (hospital wants standard format, vendor agrees)
   - Data retrieval SLA upon termination (hospital wants 30 days, vendor agrees)

4. Liability & Indemnification
   - Liability cap (hospital wants unlimited, vendor offers 2x annual fees)
   - Indemnification for data breaches (hospital wants, vendor limits)
   - Insurance requirements (hospital wants $10M, vendor has $5M)

5. Intellectual Property
   - Custom development ownership (hospital wants, vendor wants to retain)
   - Ability to modify code (hospital wants if open source, vendor resists)

6. Termination Rights
   - Termination for convenience (hospital wants 90-day notice, vendor wants 1 year + penalty)
   - Transition assistance (hospital wants 6 months support, vendor offers 3 months)
   - Data migration out (hospital wants assistance, vendor offers limited help)

7. Professional Services
   - Fixed-price migration (hospital wants, vendor prefers T&M for flexibility)
   - Timeline commitments with penalties (hospital wants, vendor offers best-efforts)
   - Resource qualifications (hospital wants senior staff, vendor assigns based on availability)

8. Regulatory Changes
   - Product updates for regulatory compliance (hospital expects included, vendor may charge)
   - Examples: New HIPAA rules, HL7 version updates, ICD-11 transition
```

**Vendor-Friendly Contract Terms (Clinica Stance)**:

```
✅ We will agree to:
   - Standard BAA (Business Associate Agreement) - HIPAA required
   - Data ownership by hospital
   - Data export upon termination (in standard format)
   - Reasonable liability cap (2-3x annual fees)
   - Industry-standard SLAs (99.9% uptime for Enterprise)
   - Price lock for multi-year commitments
   - Termination for cause (breach of contract)

⚠️ We will negotiate on:
   - Liability cap amount
   - Indemnification scope
   - SLA penalty amounts
   - Termination for convenience (with significant notice + fees)
   - Custom development IP (case-by-case)

❌ We will NOT agree to:
   - Unlimited liability
   - Termination without cause (no-fee)
   - Free custom development (hospital owns IP)
   - Unrealistic SLAs (99.99% without premium pricing)
   - Exclusive clauses (hospital cannot use other systems)
   - Source code escrow (unless large enterprise + fee)
```

#### Procurement Readiness Checklist

**For Sales Team - Before Engaging Large Hospital**:

```
Documentation Ready:
[ ] RFP response template updated (within last 6 months)
[ ] All certifications current (SOC 2, HITRUST, etc.)
[ ] Customer references confirmed & willing to speak
[ ] Pricing calculator updated with current rates
[ ] Sample contracts (MSA, BAA, SLA) reviewed by legal
[ ] Product demo environment with hospital-specific workflows
[ ] Case studies matching hospital size/type
[ ] ROI calculator customized

Team Prepared:
[ ] Sales engineer assigned (technical deep-dives)
[ ] Implementation lead identified (for migration planning)
[ ] Executive sponsor assigned (for C-level meetings)
[ ] Legal counsel briefed (for contract negotiation)
[ ] Finance prepared for lengthy payment terms (Net 60-90)

Timeline Expectations Set:
[ ] Customer aware of 3-12 month procurement process
[ ] Internal resources allocated for RFP response (80-120 hours)
[ ] Demo dates scheduled (allow 2-3 attempts)
[ ] Reference call windows identified

Risk Assessment:
[ ] Customer's legacy system identified (can we integrate?)
[ ] Customer's IT maturity assessed (do they have resources?)
[ ] Customer's financial health confirmed (can they pay?)
[ ] Competitive landscape understood (who else is bidding?)
```

---

## Appendix: Sample Data Formats

### Sample CSV Template (Doctor)

```csv
Full Name,Phone,Email,Date of Birth,Gender,Blood Type,Address,City,Medical History
Rajesh Kumar,+919876543210,rajesh@example.com,1985-03-15,Male,O+,"123 MG Road, HSR Layout",Bangalore,Diabetes Type 2
Priya Sharma,+919988776655,priya@example.com,1992-07-22,Female,A+,"456 Indiranagar",Bangalore,
Amit Patel,+919123456789,amit@example.com,1978-11-30,Male,B+,"789 Whitefield",Bangalore,Hypertension
```

### Sample Practo Export Format

**patients.csv**:
```csv
PAT_ID,PAT_NAME,PAT_PHONE,PAT_DOB,PAT_GENDER,PAT_EMAIL,PAT_ADDRESS
P001,Rajesh Kumar,9876543210,15/03/1985,M,rajesh@example.com,"123 MG Road"
P002,Priya Sharma,9988776655,22/07/1992,F,priya@example.com,"456 Indiranagar"
```

**visits.csv**:
```csv
VISIT_ID,PAT_ID,VISIT_DATE,DOCTOR_NAME,CHIEF_COMPLAINT,DIAGNOSIS,PRESCRIPTION
V001,P001,01/01/2024,Dr. Reddy,Fever,"Viral fever","Paracetamol 500mg, TID"
V002,P001,15/01/2024,Dr. Reddy,Follow-up,"Recovered",""
V003,P002,10/01/2024,Dr. Malhotra,Headache,"Migraine","Sumatriptan 50mg, SOS"
```

---

**END OF SPECIFICATION**

---

This specification provides a complete blueprint for implementing a production-ready data migration system for Clinica. It covers:

✅ UX flows for all 3 personas (Doctor, Clinic, Hospital)
✅ Technical pipeline architecture (Extract → Transform → Validate → Event → Project)
✅ Assisted migration tools (connectors, de-duplication, enrichment)
✅ Comprehensive validation rules
✅ Coexistence strategies (read-only, one-way, two-way sync)
✅ Security & compliance (HIPAA, GDPR, audit logging)
✅ Failure modes & recovery procedures
✅ Phased rollout plan with success criteria
✅ Implementation roadmap with effort estimates

Next step: Prioritize Phase 0 (Foundation) and begin implementation.
