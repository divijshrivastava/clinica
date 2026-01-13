# MyMedic — Pricing System Specification (Chain Governance Model)

## 1. Purpose

Pricing in outpatient care is non-trivial because it encodes:

- revenue strategy
- branch differentials
- doctor seniority
- package structures
- promotional strategy
- financial controls
- chain governance

Pricing is not a static list — it is an operational control surface.

---

## 2. Pricing Objects

Pricing in MyMedic extends across:

```
consult → procedure → tele → follow-ups → packages (phase 2)
```

Pricing objects include:

1. **Visit Types**
2. **Procedures**
3. **Modifiers**
4. **Packages (Phase 2)**
5. **Consumables (Phase 3)**
6. **Discounts & Overrides**
7. **Refund Rules**
8. **Deposit Rules**
9. **Balance Rules**

This matches chain realities.

---

## 3. Pricing Formula

Pricing uses multi-dimensional formula:

```
final_price = base
             + branch_modifier
             + doctor_modifier
             + chain_override
             + discount (optional)
```

All modifiers can be toggled per chain.

---

## 4. Base Pricing

Base pricing is defined at:

```
clinic_id or chain_id
```

Example:

```
Consultation = ₹800
Laser Hair Removal (Half Face) = ₹3,500
Implant = ₹35,000
```

---

## 5. Branch Modifiers

Branches differ in:

- rent
- equipment
- demand
- demographic willingness to pay

Example modifiers:

```
Koramangala +15%
Whitefield +10%
Hebbal +0%
```

Branch modifier drives price segmentation without chaos.

---

## 6. Doctor Modifiers

Doctor seniority affects willingness to pay.

Specialties like derm, dental, IVF often price differently for:

- Sr consultant
- Consultant
- Visiting consultant

Modifiers:

```
Sr. consultant +20%
Visiting consultant -10%
```

Doctor modifier shows **in staff console**, not necessarily in portal.

---

## 7. Chain Overrides

Chain overrides used for:

- unifying pricing
- promotional adjustments
- compliance events
- vendor audits

Chains often adjust city-level pricing:

```
Bangalore +10%
Chennai +5%
Delhi +20%
```

Chain override sits at highest precedence layer.

---

## 8. Deposit Rules (PM3 Integration)

Deposit rules attach to procedures.

Deposit configuration includes:

- deposit amount (₹ or %)
- forfeiture time
- refundable conditions
- expiry
- transfer rules (branch → branch)
- minimum window before procedure

Example:

```
Implant:
deposit: ₹5,000
forfeit: <24h
transfer: allowed (branch)
expiry: 60 days
```

Deposit rules are chain-critical.

---

## 9. Balance Rules

Balance is always collected **in-clinic** for Phase 1.

Balance may involve:

- package inclusion (Phase 2)
- consumables (Phase 3)
- drugs/meds (Phase 3)

Chain can enforce:

```
no discharge without balance clearance
```

---

## 10. Discounts & Overrides

Discounts occur frequently in aesthetic & dental.

Discount governance model:

✔ percentage vs fixed  
✔ branch-level permissions  
✔ doctor approval (optional)  
✔ chain override (optional)

Audit trails required for:

- doctor authorization
- promotional authorization
- expiry of promo codes

Most clinics today have zero auditing — huge leakage.

---

## 11. Packages (Phase 2)

Packages represent:

- multi-session procedures
- prepaid bundles
- treatment cycles

Examples:

- IVF cycle package
- Invisalign package
- Laser hair removal 6 sessions
- Chemo cycle package
- Ortho rehab package

Features needed:

✔ installment support  
✔ session tracking  
✔ package expiry  
✔ discounts  
✔ revenue allocation (Phase 3 for chains)  

---

## 12. Consumables (Phase 3)

Consumables belong in OPD+HIS phases:

- implants
- fillers (Botox)
- dental material
- surgical kits

Consumables force reconciliation with:

- OT inventory
- pharmacy
- procurement

Not needed for MVP clinics.

---

## 13. Refund Rules

Refund rules depend on:

✔ visit type
✔ payment type
✔ timing window

Example:

```
consult → refund full
procedure → refund deposit if >48h
tele → no refund after join
```

Chain may vary by branch/city.

---

## 14. Currency & GST

Clinic pricing may be:

- GST inclusive (aesthetic)
- GST exclusive (dental, IVF)

Portal must support GST labeling:

```
price inclusive of GST
```

Financial export must include:

✔ GST
✔ HSN code (Phase 2 for chains)
✔ invoice metadata

---

## 15. Price Visibility (Portal)

Chains differ on visibility:

```
transparent
semi-transparent
opaque
```

Examples:

- derm often transparent (marketed)
- dental semi-transparent (depends on material)
- IVF opaque (depends on protocol)
- oncology opaque (timing + drug regimens)

Portal supports:

✔ visible price
✔ visible visit fee only
✔ visible deposit only
✔ no visible price

---

## 16. Chain Special Behavior

Chains require:

✔ pricing uniformity  
✔ override permissions  
✔ deviation audits  
✔ branch variance reports  
✔ price benchmarking  

Benchmark example:

```
Branch A: Avg ticket ₹4,850
Branch B: Avg ticket ₹3,200
```

Variance unlocks chain GM% improvement.

---

## 17. Portal Conversion Impact

Transparent pricing improves:

✔ conversion
✔ portal adoption
✔ prepaid flows
✔ deposit capture

Opaque pricing requires:

✔ staff handoff workflow

MyMedic supports both.

---

## 18. Multi-City Pricing

City-level pricing must support:

- different willingness to pay
- different competitive sets
- different doctor fees

Example:

```
Mumbai +20%
Bangalore +10%
Tier-2 -15%
```

---

## 19. Price Audit Features (Chain)

Chains love:

✔ who discounted
✔ by how much
✔ for which patient
✔ for which doctor
✔ for which branch
✔ time-stamped

Audit creates compliance layer.

---

## 20. Pricing Not in Scope (Phase 1)

Excluded intentionally:

✖ insurance fee schedules  
✖ TPA tariffs  
✖ claims  
✖ government rates  
✖ DRG coding  

These belong to hospital OPD/IPD/HIS stack.

---

## 21. Summary

Pricing is not a static table; it is a governance system.

MyMedic supports governance via:

✔ pricing layers  
✔ deposit rules  
✔ refund rules  
✔ discount permissions  
✔ variance reporting  
✔ audit trails  

Pricing ties together:

Scheduling → Payments → Reconciliation → Analytics → Expansion

This is where chains get their financial control & margin expansion.

