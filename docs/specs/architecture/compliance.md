# MyMedic — Compliance Architecture (Regulatory, Medico-Legal, Financial, Insurance, Accreditation)

## 1. Purpose

This document defines the compliance framework underpinning MyMedic across four domains:

1. Clinical & Medico-Legal Compliance  
2. Financial & Tax Compliance  
3. Interoperability & Regulatory Compliance  
4. Enterprise & Accreditation Compliance

Compliance is a strategic enabler for:

✔ adoption by chains  
✔ procurement by hospitals  
✔ integration with insurers  
✔ cross-border expansion  
✔ legal defensibility  
✔ investor risk assessment  

---

## 2. Compliance Drivers (By Actor)

| Actor | Compliance Driver |
|---|---|
| Doctor | medico-legal defense |
| Clinic | financial + operational audit |
| Chain | reconciliation + benchmarking + variance |
| Hospital OPD | accreditation + integration |
| Insurance/TPA | claim adjudication + audit |
| Government | regulatory + residency |
| Patient | privacy + consent |

No single compliance driver covers all actors.

---

## 3. Clinical & Medico-Legal Compliance

Clinical records must be:

✔ chronological  
✔ immutable or versioned  
✔ attributable (who did what)  
✔ reconstructable (forensic)  
✔ durable (long retention)  

Event sourcing provides:

✔ immutable timeline  
✔ versioned state  
✔ replayable context  
✔ causation links  
✔ audit signatures (Phase 3)  

This is critical for:

- medico-legal disputes
- cancer care
- IVF cycles
- oncology second opinions
- insurance adjudication

---

## 4. Financial & Tax Compliance (India)

India requires compliance with:

✔ GST (where applicable)  
✔ invoice retention (5 years)  
✔ refund audit trails  
✔ reconciliation for settlement  
✔ POS reporting (if integrated)  

MyMedic supports:

- reconciliation events
- refund events
- settlement reports
- invoice export (Phase 2)
- GST ledger (Phase 2/3)

Chains rely on:

**variance reporting** → largest determinant of margin.

---

## 5. Interoperability & Data Standards (India)

India is rolling out NDHM/ABDM:

✔ ABHA (patient identity)
✔ Consent artifacts
✔ FHIR-based formats
✔ HIE-CM
✔ Provider registries
✔ Facility registries

MyMedic supports alignment via Phase 2:

Phase 2:
- ABHA linking (optional)
- facility/provider registration
- consent artifacts
- FHIR export

Phase 3:
- FHIR messaging
- HIE submission
- NDHM claim rails (future TPA)

Not required for clinics in Phase 1.

---

## 6. NABH (Accreditation for OPD/Hospitals)

NABH accreditation impacts:

- documentation
- audit trails
- consent
- retention
- security
- data export

MyMedic supports:

✔ event trails for audit  
✔ structured consent (Phase 2)  
✔ export capabilities  
✔ ADT integration (OPD→IPD handoff)  

---

## 7. Insurance/TPA & Claims (Phase 3+)

Insurance workflows require:

✔ claim events  
✔ document bundles  
✔ preauthorization  
✔ discharge summaries  
✔ ICD/DRG coding  
✔ tariff schedules  
✔ TPA submission rails  
✔ audit/replay  
✔ denial management  
✔ settlement reconciliation  

MyMedic aligns via:

Phase 2 → OPD → IPD referral pipeline  
Phase 3 → Claims & TPA modules

---

## 8. Retention & Destruction Policies

Retention varies:

| Data Type | Duration |
|---|---|
| Financial records | 5+ years |
| Medico-legal | 7–10 years |
| Cancer/IVF records | 10+ years |
| Insurance claims | claim lifecycle + dispute |
| Audit logs | configurable |
| Access logs | 1–3 years |
| PHI (hospital) | jurisdiction-specific |

Destruction must support:

✔ selective deletion  
✔ redaction  
✔ pseudonymization  
✔ export-first workflows  
✔ tenant offboarding

---

## 9. Data Residency & Sovereignty

Residency requirements:

- India: optional
- GCC: mandatory (Phase 3)
- EU: GDPR (Phase 3/4)
- SE Asia: PDPA (SG/MY)

MyMedic supports residency via:

✔ SaaS regional deployments  
✔ hybrid deployments  
✔ VPC deployments  
✔ on-prem deployments  

Phase 3 introduces:

✔ region-bound warehouse  
✔ region-bound event store  
✔ region-bound object storage  

---

## 10. Consent Management (Phase 2+)

Consent required for:

✔ NDHM data sharing  
✔ telemedicine  
✔ post-op follow-up  
✔ referral  
✔ insurance submission  
✔ imaging sharing  
✔ medico-legal requests

Consent artifacts include:

- purpose
- scope
- duration
- subject
- revocation
- audit

---

## 11. Access & Audit Compliance

Compliance audits validate:

✔ role and permission models  
✔ override paths  
✔ discount/financial approvals  
✔ data access logs  
✔ signature integrity  
✔ forensic replay  

Event sourcing provides strongest evidence model:

> “Not just the final state, but exactly how it got there.”

---

## 12. International Compliance Roadmap

Roadmap for international expansion:

| Region | Regulation |
|---|---|
| US | HIPAA / HITRUST |
| EU | GDPR |
| SG | PDPA |
| UAE | DHA / DOH |
| SA | NCA / SDAIA |
| AUS | MyHR / ADHA |

MyMedic aligns via:

- PHI classification
- audit + replay
- tenant isolation
- regional deployments

---

## 13. Procurement Compliance (Hospitals)

Hospitals require:

✔ vendor due diligence  
✔ security documentation  
✔ threat model  
✔ incident response policy  
✔ breach notification policy  
✔ disaster recovery policy  
✔ business continuity plan  
✔ penetration test results  
✔ subprocessor disclosures  

MyMedic can ship all by Phase 2–3.

---

## 14. Chain Compliance (Financial + Operational)

Chains require:

✔ reconciliation accuracy  
✔ settlement correctness  
✔ discount/override audit  
✔ branch variance  
✔ city variance  
✔ pricing governance  
✔ deposit rules  
✔ refund policy enforcement

MyMedic natively supports these via event model.

---

## 15. Summary

MyMedic’s compliance strategy enables:

✔ clinic adoption (low-friction)  
✔ chain scale (financial governance)  
✔ hospital procurement (integration + audit)  
✔ insurance workflows (Phase 3)  
✔ international expansion (Phase 3/4)

Compliance is not merely avoidance of risk — it is a GTM accelerator.

