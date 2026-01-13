# MyMedic — Security Architecture & Threat Model (Hybrid RBAC/ABAC + Multi-Tenant)

## 1. Purpose

This document defines the security architecture of MyMedic across:

✔ authentication  
✔ authorization  
✔ tenancy isolation  
✔ data protection  
✔ secret management  
✔ integration security  
✔ PHI protection  
✔ compliance posture  
✔ procurement expectations  
✔ hospital infosec questionnaires  

Security is considered a product feature, not an afterthought.

---

## 2. Threat Model Scope

MyMedic’s threat surface includes:

**Internal threats:**
- unauthorized staff access
- role misconfigurations
- override misuse
- discount abuse
- reconciliation bypass
- policy violations

**External threats:**
- credential attacks
- session hijacking
- API abuse
- tenant isolation breaches
- PHI exfiltration
- payment/UPI fraud
- messaging abuse (WhatsApp/SMS)

**Integration threats:**
- HIS interface tampering
- ADT mismatches
- refund settlement mismatches
- insurance claim replay attacks
- webhook forgery

MyMedic implements controls for all three.

---

## 3. Authentication Model (AuthN)

AuthN supports multiple identity providers:

✔ Email+Password (default)  
✔ Phone+OTP (for staff/portal)  
✔ OAuth2 (Phase 2 for SSO)  
✔ SAML/LDAP (Phase 3 for hospitals)  
✔ JWT tokens (internal APIs)  

Multi-factor modes:

✔ SMS/OTP  
✔ TOTP (Phase 2)  
✔ SSO MFA inherit (hospital)  

Session security:

✔ short-lived access tokens  
✔ refresh tokens with rotation  
✔ device binding (optional doctor mobile)  
✔ IP allowlisting (Phase 3 for hospitals)  
✔ certificate pinning (mobile optional)

---

## 4. Authorization Model (AuthZ)

MyMedic uses hybrid **RBAC + ABAC**:

### **RBAC (Role-Based)**

Roles include:

- doctor
- receptionist
- operations
- finance
- chain admin
- hospital IT (Phase 2)
- hospital procurement (Phase 3)
- integration service accounts

### **ABAC (Attribute-Based)**

Attributes include:

- tenant_id
- branch_id
- doctor_id
- department_id (hospital)
- specialty_id (hospital)
- pricing policy
- reconciliation rights
- override rights

ABAC needed for fine-grained chain controls (e.g. pricing override vs refund override).

---

## 5. Multi-Tenant Isolation

Isolation is enforced at three levels:

### Level 1 — Application Envelope

Every request carries:

```
tenant_id
branch_id (optional)
doctor_id (optional)
user_role
```

### Level 2 — Data Layer

Row-level isolation keyed by:

✔ tenant_id  
✔ branch_id  

### Level 3 — Warehouse (Phase 2)

Warehouse uses:

- separate schemas OR
- row-level policies

### Level 4 — Physical (Phase 3)

Hospitals may require:

- VPC separation
- cluster separation
- region separation
- HSM-backed secrets

---

## 6. PHI Data Classification

PHI classification tiers:

| Tier | Example | Protection Required |
|---|---|---|
| Tier 0 | non-PHI metadata | standard data |
| Tier 1 | identity (name, phone) | encryption at rest |
| Tier 2 | clinical info | stricter retention + access audit |
| Tier 3 | financial/insurance | reconciliation audit |
| Tier 4 | medico-legal | immutable audit + replay |

Tier 4 maps to hospital governance.

---

## 7. Data Encryption & Protection

### In Transit

```
TLS 1.2+
HSTS
```

### At Rest

✔ DB encryption  
✔ Event Store encryption  
✔ Warehouse encryption  
✔ Object store encryption  

### In Application

✔ tokenization for sensitive fields  
✔ optional field encryption for PHI (Phase 2)  

---

## 8. Secret Management

Secrets stored in:

- cloud KMS
- sealed vaults (optional Phase 3)
- HSM-backed storage (hospital-grade)

Secrets include:

- JWT signing keys
- DB creds
- integration creds (UPI/WhatsApp/HIS)
- SSO keys
- webhook signing tokens

---

## 9. Integration Security

Integration surfaces include:

✔ Payments (UPI/card)  
✔ WhatsApp messaging  
✔ HIS/ADT (hospital)  
✔ Insurance/TPA (Phase 3)  

Secured via:

- signed requests
- mTLS (Phase 3)
- IP allowlisting (hospital)
- replay protection (nonce/timestamp)
- idempotency keys
- schema validation

---

## 10. Webhook Security

Webhooks secured via:

✔ HMAC signatures  
✔ replay windows  
✔ event sequencing  
✔ exponential retry  
✔ DLQ for failures  
✔ hospital-side audit logs (optional)

---

## 11. Hospital Interface Security (Phase 2+)

Hospitals require:

✔ audit logs  
✔ replay prevention  
✔ encrypted transport  
✔ message transformation logs  
✔ dual-write reconciliation  

HL7/FHIR payloads require:

✔ schema validation  
✔ mapping validation  
✔ identity resolution  
✔ failure DLQs  
✔ retry policies  

---

## 12. Consent Management (Phase 2+)

NDHM/ABHA consent framework:

✔ consent artifacts  
✔ expiry  
✔ revocation  
✔ auditability  
✔ data minimization  

This enables insurance + TPA workflows later.

---

## 13. Fraud & Abuse Controls (Financial)

Financial abuse scenarios:

✔ deposit misuse  
✔ refund fraud  
✔ reconciliation bypass  
✔ phantom cancellations  
✔ discount misuse  
✔ package abuse (Phase 2)

Controls include:

- approval workflows
- event audit
- reconciliation checks
- variance detection
- RBAC/ABAC permissions
- chain override logging

---

## 14. Logging for Forensics

Logged fields include:

✔ who  
✔ what  
✔ when  
✔ where  
✔ version  
✔ tenant  
✔ branch  
✔ policy context  
✔ before/after diff (non-PHI fields)  

Forensic maps to:

- medico-legal defense
- insurance disputes
- hospital audits
- accreditation (NABH)
- financial audits (GST)

---

## 15. Procurement & Infosec Checklists (Hospital)

Hospitals typically request:

- network diagrams
- data flow diagrams
- access control matrix
- role definitions
- SSO support
- encryption statement
- PHI storage policy
- consent workflows
- retention policies
- incident procedures
- audit logs
- pen test reports
- SLA/SLO documentation

MyMedic provides these in Phase 2+.

---

## 16. Regulatory Alignment

India (current target):

✔ NABH OPD alignment  
✔ NDHM interoperability (optional Phase 2)  
✔ GST audit & reconciliation  
✔ financial retention compliance  
✔ medico-legal records retention  

International (future):

✔ HIPAA (US)
✔ GDPR (EU)
✔ PDPA (Singapore)
✔ DHA (Dubai)
✔ MOH/HAAD (Abu Dhabi)

---

## 17. Summary

Security model ensures:

✔ PHI protection  
✔ financial integrity  
✔ auditability  
✔ forensic reconstruction  
✔ integration trust  
✔ procurement readiness  
✔ multi-tenant safety  

MyMedic can scale to:

> Clinic → Chain → Hospital → Insurance (TPA) → Government

without re-architecting its security base.

