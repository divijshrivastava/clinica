# MyMedic Billing & ADT Integration Specification

**Author:** Principal Technical Architect + Clinical Systems PM
**Date:** 2026-01-08
**Version:** 1.0
**Status:** Draft

---

## Executive Summary

This document specifies the design and implementation of **Billing** and **ADT (Admission/Discharge/Transfer)** modules for the MyMedic healthcare platform. Both modules are designed as optional, tenant-configurable capabilities that coexist with existing Hospital Information Systems (HIS) while maintaining event-sourced architecture principles.

**Key Design Principles:**
- Modularity: Optional per-tenant, per-department
- Event-Sourced: All operations emit domain events
- Coexistence: Works alongside existing HIS systems
- Flexibility: Supports independent doctors, clinics, and hospitals
- Future-Ready: Extensible to insurance/TPA integrations

---

# A. Billing Technical Specification

## A1. Core Requirements

**Scope:**
- Charge Codes (master catalog of billable items)
- Charge Items (actual charges on invoices)
- Invoices (billing documents)
- Payments (money received)
- Settlements (payment allocation to invoices)
- Discounts (reductions in charges)
- Taxes (optional tax calculation)
- Tariffs (differential pricing structures)
- Department-level pricing
- Package pricing (bundled services)

**Design Constraints:**
- Billing is **optional** - can be disabled per tenant
- Must work for: Independent doctors, Clinics, Hospitals
- Coexistence with existing HIS billing systems
- Event-sourced backend (CQRS pattern)
- No rewrites of existing modules
- Future extensibility toward insurance/TPA

---

## A2. Data Models

### A2.1 Tenant Billing Configuration

```sql
CREATE TABLE tenant_billing_config (
  tenant_id UUID PRIMARY KEY REFERENCES hospitals(id),
  billing_enabled BOOLEAN DEFAULT false,
  billing_mode VARCHAR(50) NOT NULL DEFAULT 'full',
    -- 'full': MyMedic handles all billing
    -- 'export_only': Generate invoices but export to HIS for payment
    -- 'coexist': Selective departments use MyMedic billing

  -- Feature Toggles
  enable_invoicing BOOLEAN DEFAULT true,
  enable_payments BOOLEAN DEFAULT true,
  enable_packages BOOLEAN DEFAULT false,
  enable_tariffs BOOLEAN DEFAULT false,
  enable_tax_calculation BOOLEAN DEFAULT false,

  -- HIS Integration
  his_billing_system VARCHAR(100),
  export_to_his BOOLEAN DEFAULT false,
  his_export_format VARCHAR(50), -- 'csv', 'hl7', 'fhir', 'api'
  his_api_endpoint VARCHAR(500),

  -- Workflow Settings
  auto_generate_invoice BOOLEAN DEFAULT false,
  invoice_on_visit_complete BOOLEAN DEFAULT true,
  require_settlement_before_checkout BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### A2.2 Charge Codes (Master Catalog)

```sql
CREATE TABLE charge_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id),
  code VARCHAR(50) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,

  category VARCHAR(100) NOT NULL,
    -- 'consultation', 'procedure', 'lab', 'radiology',
    -- 'pharmacy', 'room', 'equipment', 'supplies'

  department_id UUID REFERENCES departments(id),
  service_type VARCHAR(50) NOT NULL DEFAULT 'BOTH',
    -- 'OPD', 'IPD', 'BOTH'

  -- Pricing
  base_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  unit VARCHAR(50) DEFAULT 'per_service',
    -- 'per_service', 'per_day', 'per_hour', 'per_unit'

  -- Tax Configuration
  is_taxable BOOLEAN DEFAULT false,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,

  -- Status
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code),
  CHECK (base_price >= 0),
  CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

CREATE INDEX idx_charge_codes_tenant_category
  ON charge_codes(tenant_id, category);
CREATE INDEX idx_charge_codes_department
  ON charge_codes(department_id);
```

### A2.3 Tariff Tables (Differential Pricing)

```sql
CREATE TABLE tariff_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id),
  tariff_name VARCHAR(100) NOT NULL,
  description TEXT,
  tariff_type VARCHAR(50) NOT NULL,
    -- 'general', 'insurance', 'corporate', 'employee', 'research'

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, tariff_name)
);

CREATE TABLE tariff_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_id UUID NOT NULL REFERENCES tariff_tables(id) ON DELETE CASCADE,
  charge_code_id UUID NOT NULL REFERENCES charge_codes(id) ON DELETE CASCADE,

  override_price DECIMAL(12,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0.00,

  effective_from DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tariff_id, charge_code_id),
  CHECK (override_price >= 0),
  CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

CREATE INDEX idx_tariff_prices_tariff
  ON tariff_prices(tariff_id);
```

### A2.4 Package Pricing (Bundled Services)

```sql
CREATE TABLE billing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id),
  package_code VARCHAR(50) NOT NULL,
  package_name VARCHAR(255) NOT NULL,
  description TEXT,

  package_type VARCHAR(50) NOT NULL,
    -- 'maternity', 'surgery', 'health_checkup', 'chronic_care'

  total_price DECIMAL(12,2) NOT NULL,
  validity_days INTEGER DEFAULT 365,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, package_code),
  CHECK (total_price >= 0),
  CHECK (validity_days > 0)
);

CREATE TABLE package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES billing_packages(id) ON DELETE CASCADE,
  charge_code_id UUID NOT NULL REFERENCES charge_codes(id),

  included_quantity INTEGER NOT NULL DEFAULT 1,
  is_mandatory BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(package_id, charge_code_id),
  CHECK (included_quantity > 0)
);

CREATE INDEX idx_package_items_package
  ON package_items(package_id);
```

### A2.5 Invoices

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id),
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Patient & Visit Context
  patient_id UUID NOT NULL REFERENCES patients(id),
  visit_id UUID REFERENCES visits(id),
  admission_id UUID, -- Links to ADT admission

  invoice_type VARCHAR(50) NOT NULL,
    -- 'opd', 'ipd', 'package', 'pharmacy', 'emergency', 'radiology'

  -- Financial Amounts
  subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12,2) DEFAULT 0.00,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,

  -- Pricing Context
  tariff_id UUID REFERENCES tariff_tables(id),
  package_id UUID REFERENCES billing_packages(id),

  -- Status & Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- 'draft', 'finalized', 'partially_paid', 'paid', 'cancelled', 'refunded'

  finalized_at TIMESTAMPTZ,
  finalized_by_user_id UUID REFERENCES users(id),

  -- HIS Export
  exported_to_his BOOLEAN DEFAULT false,
  his_invoice_id VARCHAR(255),
  his_export_timestamp TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, invoice_number),
  CHECK (subtotal_amount >= 0),
  CHECK (discount_amount >= 0),
  CHECK (tax_amount >= 0),
  CHECK (total_amount >= 0),
  CHECK (paid_amount >= 0),
  CHECK (balance_amount >= 0),
  CHECK (total_amount = subtotal_amount - discount_amount + tax_amount)
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_visit ON invoices(visit_id);
CREATE INDEX idx_invoices_admission ON invoices(admission_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
```

### A2.6 Invoice Line Items

```sql
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  charge_code_id UUID NOT NULL REFERENCES charge_codes(id),

  description VARCHAR(500),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL,

  -- Pricing Override Context
  pricing_source VARCHAR(50) NOT NULL,
    -- 'base_price', 'tariff', 'package', 'manual_override'
  applied_tariff_id UUID REFERENCES tariff_tables(id),
  applied_package_id UUID REFERENCES billing_packages(id),

  -- Line Totals
  line_subtotal DECIMAL(12,2) NOT NULL,
  line_discount DECIMAL(12,2) DEFAULT 0.00,
  line_tax DECIMAL(12,2) DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL,

  -- Context
  service_date DATE,
  performed_by_user_id UUID REFERENCES users(id),
  department_id UUID REFERENCES departments(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(invoice_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (line_subtotal >= 0),
  CHECK (line_discount >= 0),
  CHECK (line_tax >= 0),
  CHECK (line_total >= 0),
  CHECK (line_total = line_subtotal - line_discount + line_tax)
);

CREATE INDEX idx_invoice_line_items_invoice
  ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_charge_code
  ON invoice_line_items(charge_code_id);
```

### A2.7 Payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES hospitals(id),
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  patient_id UUID NOT NULL REFERENCES patients(id),

  -- Payment Details
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
    -- 'cash', 'card', 'upi', 'bank_transfer', 'cheque', 'insurance'

  -- Payment Method Details
  card_last4 VARCHAR(4),
  transaction_id VARCHAR(255),
  cheque_number VARCHAR(50),
  bank_name VARCHAR(100),

  -- Settlement
  allocated_amount DECIMAL(12,2) DEFAULT 0.00,
  unallocated_amount DECIMAL(12,2) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'cleared', 'failed', 'refunded'

  received_by_user_id UUID REFERENCES users(id),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, payment_number),
  CHECK (amount > 0),
  CHECK (allocated_amount >= 0),
  CHECK (unallocated_amount >= 0),
  CHECK (unallocated_amount = amount - allocated_amount)
);

CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);
```

### A2.8 Payment Settlements (Allocation)

```sql
CREATE TABLE payment_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id),

  allocated_amount DECIMAL(12,2) NOT NULL,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,

  settled_by_user_id UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (allocated_amount > 0)
);

CREATE INDEX idx_payment_settlements_payment
  ON payment_settlements(payment_id);
CREATE INDEX idx_payment_settlements_invoice
  ON payment_settlements(invoice_id);
```

---

## A3. Domain Events (Event Sourcing)

All billing operations emit domain events that are persisted in the event store before projection updates.

### A3.1 Event Interface

```typescript
interface BillingDomainEvent {
  event_id: string; // UUID
  event_type: string;
  aggregate_type: 'invoice' | 'payment' | 'settlement';
  aggregate_id: string; // UUID of invoice/payment

  event_data: any;

  metadata: {
    tenant_id: string;
    patient_id: string;
    caused_by_user_id: string;
    timestamp: Date;
    correlation_id?: string;
    billing_context?: string; // 'opd' | 'ipd' | 'package'
  };
}
```

### A3.2 Invoice Events

**invoice_created**
```typescript
interface InvoiceCreatedEvent extends BillingDomainEvent {
  event_type: 'invoice_created';
  aggregate_type: 'invoice';
  event_data: {
    invoice_id: string;
    invoice_number: string;
    patient_id: string;
    visit_id?: string;
    admission_id?: string;
    invoice_type: string;
    tariff_id?: string;
    package_id?: string;
    created_by_user_id: string;
  };
}
```

**invoice_line_item_added**
```typescript
interface InvoiceLineItemAddedEvent extends BillingDomainEvent {
  event_type: 'invoice_line_item_added';
  aggregate_type: 'invoice';
  event_data: {
    invoice_id: string;
    line_item_id: string;
    charge_code_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    pricing_source: string;
  };
}
```

**invoice_discount_applied**
```typescript
interface InvoiceDiscountAppliedEvent extends BillingDomainEvent {
  event_type: 'invoice_discount_applied';
  aggregate_type: 'invoice';
  event_data: {
    invoice_id: string;
    discount_amount: number;
    discount_reason: string;
    approved_by_user_id?: string;
  };
}
```

**invoice_finalized**
```typescript
interface InvoiceFinalizedEvent extends BillingDomainEvent {
  event_type: 'invoice_finalized';
  aggregate_type: 'invoice';
  event_data: {
    invoice_id: string;
    invoice_number: string;
    subtotal_amount: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    finalized_at: Date;
    finalized_by_user_id: string;
  };
}
```

**invoice_cancelled**
```typescript
interface InvoiceCancelledEvent extends BillingDomainEvent {
  event_type: 'invoice_cancelled';
  aggregate_type: 'invoice';
  event_data: {
    invoice_id: string;
    cancellation_reason: string;
    cancelled_by_user_id: string;
  };
}
```

### A3.3 Payment Events

**payment_received**
```typescript
interface PaymentReceivedEvent extends BillingDomainEvent {
  event_type: 'payment_received';
  aggregate_type: 'payment';
  event_data: {
    payment_id: string;
    payment_number: string;
    patient_id: string;
    amount: number;
    payment_method: string;
    transaction_id?: string;
    received_by_user_id: string;
  };
}
```

**payment_allocated**
```typescript
interface PaymentAllocatedEvent extends BillingDomainEvent {
  event_type: 'payment_allocated';
  aggregate_type: 'payment';
  event_data: {
    payment_id: string;
    invoice_id: string;
    allocated_amount: number;
    settled_by_user_id: string;
  };
}
```

**payment_refunded**
```typescript
interface PaymentRefundedEvent extends BillingDomainEvent {
  event_type: 'payment_refunded';
  aggregate_type: 'payment';
  event_data: {
    payment_id: string;
    refund_amount: number;
    refund_reason: string;
    refund_method: string;
    processed_by_user_id: string;
  };
}
```

---

## A4. Read Projections

Projection workers consume domain events and update read models for query performance.

### A4.1 Invoice Summary Projection

```typescript
interface InvoiceSummaryProjection {
  invoice_id: string;
  invoice_number: string;
  patient_id: string;
  patient_name: string;
  invoice_date: Date;
  invoice_type: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  last_updated: Date;
}
```

**Projection Worker:**
```typescript
class InvoiceSummaryProjector {
  async handleEvent(event: BillingDomainEvent) {
    switch (event.event_type) {
      case 'invoice_created':
        await this.createInvoiceSummary(event);
        break;
      case 'invoice_finalized':
        await this.updateInvoiceStatus(event);
        break;
      case 'payment_allocated':
        await this.updatePaidAmount(event);
        break;
    }
  }

  private async createInvoiceSummary(event: InvoiceCreatedEvent) {
    const patient = await this.queryService.getPatient(event.event_data.patient_id);

    await this.db.query(`
      INSERT INTO invoice_summary_view
        (invoice_id, invoice_number, patient_id, patient_name,
         invoice_date, invoice_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'draft')
    `, [
      event.event_data.invoice_id,
      event.event_data.invoice_number,
      event.event_data.patient_id,
      patient.full_name,
      new Date(),
      event.event_data.invoice_type
    ]);
  }
}
```

### A4.2 Patient Outstanding Balance Projection

```sql
CREATE MATERIALIZED VIEW patient_outstanding_balances AS
SELECT
  patient_id,
  SUM(balance_amount) as total_outstanding,
  COUNT(*) as unpaid_invoice_count,
  MIN(invoice_date) as oldest_invoice_date,
  MAX(invoice_date) as latest_invoice_date
FROM invoices
WHERE status IN ('finalized', 'partially_paid')
  AND balance_amount > 0
GROUP BY patient_id;

CREATE UNIQUE INDEX idx_patient_balances_patient
  ON patient_outstanding_balances(patient_id);
```

**Refresh Strategy:**
```typescript
class PatientBalanceProjector {
  async handlePaymentAllocated(event: PaymentAllocatedEvent) {
    // Incremental update - just refresh affected patient
    await this.db.query(`
      REFRESH MATERIALIZED VIEW CONCURRENTLY patient_outstanding_balances
      WHERE patient_id = $1
    `, [event.metadata.patient_id]);
  }
}
```

---

## A5. Coexistence Modes with HIS

### Mode 1: Full Billing (Standalone)

MyMedic handles all billing operations. HIS billing is disabled.

**Configuration:**
```json
{
  "billing_mode": "full",
  "billing_enabled": true,
  "export_to_his": false
}
```

**Workflow:**
1. Doctor adds charges → MyMedic
2. Invoice generation → MyMedic
3. Payment collection → MyMedic
4. Settlement → MyMedic
5. Reporting → MyMedic

---

### Mode 2: Export-Only (Coexistence)

MyMedic generates invoices but exports to HIS for payment processing.

**Configuration:**
```json
{
  "billing_mode": "export_only",
  "billing_enabled": true,
  "export_to_his": true,
  "his_export_format": "csv",
  "enable_payments": false
}
```

**Workflow:**
1. Doctor adds charges → MyMedic
2. Invoice generation → MyMedic
3. **Export invoice to HIS** (CSV/API/HL7)
4. Payment collection → HIS
5. **Import payment status from HIS** (reconciliation)

**Export Format (CSV):**
```csv
invoice_number,patient_mrn,invoice_date,charge_code,description,quantity,unit_price,total
INV-2026-0001,MRN-12345,2026-01-08,CONS-001,Consultation,1,500.00,500.00
INV-2026-0001,MRN-12345,2026-01-08,LAB-001,Blood Test,1,250.00,250.00
```

---

### Mode 3: Hybrid (Department-Selective)

Some departments use MyMedic billing, others use HIS billing.

**Configuration:**
```json
{
  "billing_mode": "coexist",
  "billing_enabled": true,
  "department_overrides": {
    "dept-radiology-uuid": { "use_mymedic_billing": true },
    "dept-pharmacy-uuid": { "use_mymedic_billing": true },
    "dept-surgery-uuid": { "use_his_billing": true }
  }
}
```

**Routing Logic:**
```typescript
class BillingRouter {
  async shouldUseMyMedicBilling(
    tenantId: string,
    departmentId: string
  ): Promise<boolean> {
    const config = await this.getConfig(tenantId);

    if (config.billing_mode === 'full') return true;
    if (config.billing_mode === 'export_only') return true;

    if (config.billing_mode === 'coexist') {
      const deptOverride = config.department_overrides[departmentId];
      return deptOverride?.use_mymedic_billing ?? false;
    }

    return false;
  }
}
```

---

## A6. Pricing Resolution Hierarchy

When adding a charge to an invoice, the system resolves the price using this hierarchy:

**Priority Order:**
1. **Package Coverage** → If charge code is included in patient's active package, price = 0 (FREE)
2. **Tariff Price** → If patient has a tariff assigned and charge code exists in tariff, use tariff price
3. **Base Price** → Use charge_codes.base_price
4. **Manual Override** → User can override (requires approval for large discounts)

**Implementation:**
```typescript
class PricingService {
  async resolvePrice(
    tenantId: string,
    patientId: string,
    chargeCodeId: string,
    quantity: number = 1,
    context: {
      visitId?: string;
      tariffId?: string;
      packageId?: string;
    }
  ): Promise<PricingResolution> {

    // Step 1: Check package coverage
    if (context.packageId) {
      const packageItem = await this.db.query(`
        SELECT included_quantity
        FROM package_items
        WHERE package_id = $1 AND charge_code_id = $2
      `, [context.packageId, chargeCodeId]);

      if (packageItem && quantity <= packageItem.included_quantity) {
        return {
          unit_price: 0,
          pricing_source: 'package',
          applied_package_id: context.packageId,
          line_total: 0
        };
      }
    }

    // Step 2: Check tariff pricing
    if (context.tariffId) {
      const tariffPrice = await this.db.query(`
        SELECT override_price, discount_percentage
        FROM tariff_prices
        WHERE tariff_id = $1 AND charge_code_id = $2
          AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
          AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
      `, [context.tariffId, chargeCodeId]);

      if (tariffPrice) {
        const unitPrice = tariffPrice.override_price;
        const lineSubtotal = unitPrice * quantity;
        const discount = lineSubtotal * (tariffPrice.discount_percentage / 100);

        return {
          unit_price: unitPrice,
          pricing_source: 'tariff',
          applied_tariff_id: context.tariffId,
          line_subtotal: lineSubtotal,
          line_discount: discount,
          line_total: lineSubtotal - discount
        };
      }
    }

    // Step 3: Fall back to base price
    const chargeCode = await this.db.query(`
      SELECT base_price, is_taxable, tax_rate
      FROM charge_codes
      WHERE id = $1 AND tenant_id = $2
    `, [chargeCodeId, tenantId]);

    const lineSubtotal = chargeCode.base_price * quantity;
    const lineTax = chargeCode.is_taxable
      ? lineSubtotal * (chargeCode.tax_rate / 100)
      : 0;

    return {
      unit_price: chargeCode.base_price,
      pricing_source: 'base_price',
      line_subtotal: lineSubtotal,
      line_tax: lineTax,
      line_total: lineSubtotal + lineTax
    };
  }
}

interface PricingResolution {
  unit_price: number;
  pricing_source: 'package' | 'tariff' | 'base_price' | 'manual_override';
  applied_package_id?: string;
  applied_tariff_id?: string;
  line_subtotal: number;
  line_discount?: number;
  line_tax?: number;
  line_total: number;
}
```

---

## A7. Invoice State Machine

```
┌─────────┐
│  draft  │ ← Initial state
└────┬────┘
     │ finalize_invoice()
     ↓
┌──────────┐
│finalized │ ← Invoice locked, no more edits
└────┬─────┘
     │ record_payment() [partial]
     ↓
┌────────────────┐
│partially_paid  │
└────┬───────────┘
     │ record_payment() [full]
     ↓
┌──────┐
│ paid │ ← Fully settled
└──────┘

    ╔════════════╗
    ║ cancelled  ║ ← Can cancel from draft only
    ╚════════════╝

    ╔═══════════╗
    ║ refunded  ║ ← Can refund from paid only
    ╚═══════════╝
```

**State Transitions:**
```typescript
class InvoiceAggregate {
  status: InvoiceStatus;

  finalize(userId: string): InvoiceFinalizedEvent {
    if (this.status !== 'draft') {
      throw new Error('Only draft invoices can be finalized');
    }

    if (this.lineItems.length === 0) {
      throw new Error('Cannot finalize invoice without line items');
    }

    this.status = 'finalized';

    return {
      event_type: 'invoice_finalized',
      aggregate_type: 'invoice',
      aggregate_id: this.id,
      event_data: {
        invoice_id: this.id,
        invoice_number: this.invoiceNumber,
        total_amount: this.totalAmount,
        finalized_at: new Date(),
        finalized_by_user_id: userId
      }
    };
  }

  cancel(userId: string, reason: string): InvoiceCancelledEvent {
    if (this.status !== 'draft') {
      throw new Error('Only draft invoices can be cancelled');
    }

    this.status = 'cancelled';

    return {
      event_type: 'invoice_cancelled',
      // ...
    };
  }

  recordPayment(paymentAmount: number): void {
    this.paidAmount += paymentAmount;
    this.balanceAmount = this.totalAmount - this.paidAmount;

    if (this.balanceAmount === 0) {
      this.status = 'paid';
    } else {
      this.status = 'partially_paid';
    }
  }
}
```

---

## A8. Reconciliation & Data Integrity

### Daily Reconciliation Checks

**Check 1: Invoice Totals Match Line Items**
```sql
SELECT
  i.invoice_number,
  i.subtotal_amount as invoice_subtotal,
  SUM(li.line_subtotal) as calculated_subtotal,
  i.total_amount as invoice_total,
  SUM(li.line_total) as calculated_total
FROM invoices i
JOIN invoice_line_items li ON i.id = li.invoice_id
WHERE i.tenant_id = $1
  AND i.status != 'cancelled'
GROUP BY i.id
HAVING
  i.subtotal_amount != SUM(li.line_subtotal)
  OR i.total_amount != SUM(li.line_total);
```

**Check 2: Payment Allocations Match Paid Amount**
```sql
SELECT
  i.invoice_number,
  i.paid_amount as invoice_paid,
  COALESCE(SUM(ps.allocated_amount), 0) as total_allocated
FROM invoices i
LEFT JOIN payment_settlements ps ON i.id = ps.invoice_id
WHERE i.tenant_id = $1
GROUP BY i.id
HAVING i.paid_amount != COALESCE(SUM(ps.allocated_amount), 0);
```

**Check 3: Payment Unallocated Amount Correct**
```sql
SELECT
  p.payment_number,
  p.amount as payment_amount,
  p.allocated_amount as payment_allocated,
  COALESCE(SUM(ps.allocated_amount), 0) as sum_settlements
FROM payments p
LEFT JOIN payment_settlements ps ON p.id = ps.payment_id
WHERE p.tenant_id = $1
GROUP BY p.id
HAVING p.allocated_amount != COALESCE(SUM(ps.allocated_amount), 0);
```

**Automated Daily Job:**
```typescript
class BillingReconciliationService {
  async runDailyReconciliation(tenantId: string) {
    const errors = [];

    errors.push(...await this.checkInvoiceTotals(tenantId));
    errors.push(...await this.checkPaymentAllocations(tenantId));
    errors.push(...await this.checkUnallocatedPayments(tenantId));

    if (errors.length > 0) {
      await this.notifyBillingManager(tenantId, errors);
      await this.logReconciliationErrors(tenantId, errors);
    }

    return {
      status: errors.length === 0 ? 'success' : 'issues_found',
      error_count: errors.length,
      errors: errors
    };
  }
}
```

---

# B. UX Flows for OPD + IPD Billing

## B1. Differences Between OPD and IPD

| Aspect | OPD (Outpatient) | IPD (Inpatient) |
|--------|------------------|-----------------|
| **Duration** | Single visit (hours) | Multi-day stay |
| **Charge Timing** | Immediate at checkout | Accumulated daily |
| **Invoice Generation** | At visit end | At discharge |
| **Settlement** | Same day | Can be deferred |
| **Complexity** | Simple (2-5 charges) | Complex (50+ charges) |
| **Room Charges** | None | Per-day room rent |
| **Package Eligibility** | Rare | Common (surgery packages) |
| **User Actors** | Receptionist, Doctor | Nurse, Ward clerk, Billing dept |

---

## B2. Actor Models & Permissions

### OPD Actors

| Actor | Permissions | Typical Actions |
|-------|-------------|-----------------|
| **Doctor** | - View invoice<br>- Add charges (consultations, procedures) | Prescribe, perform minor procedures |
| **Receptionist** | - Create invoice<br>- Add charges<br>- Finalize invoice<br>- Apply discount (up to 10%)<br>- Record payment | Check-in, checkout, billing |
| **Billing Manager** | - All permissions<br>- Apply large discounts<br>- Void invoices<br>- Refunds | Handle exceptions, approvals |

### IPD Actors

| Actor | Permissions | Typical Actions |
|-------|-------------|-----------------|
| **Doctor** | - View invoice<br>- Add charges (procedures, surgeries) | Daily rounds, procedures |
| **Nurse** | - Add charges (medications, consumables)<br>- View invoice | Administer medications, wound care |
| **Ward Clerk** | - Add charges (room, diet, equipment)<br>- View invoice | Daily room charges |
| **Billing Clerk** | - Review invoice<br>- Finalize invoice<br>- Apply discounts | Pre-discharge billing review |
| **Billing Manager** | - All permissions | Final approval, discharge clearance |

---

## B3. OPD Billing UX Flow

### Timeline

```
Patient Arrival → Registration → Consultation → Diagnostics → Checkout
                                                                   ↓
                                                            Invoice + Payment
```

### Step-by-Step Flow

**Step 1: Visit Registration**
- Receptionist creates visit record
- System auto-creates **draft invoice** if `auto_generate_invoice: true`

**Step 2: Doctor Consultation**
- Doctor completes consultation
- Doctor marks visit status as `consultation_complete`
- **Automatic charge addition:** Consultation fee (charge code: `CONS-GP`) added to invoice

**Step 3: Additional Services (Optional)**
- If lab tests ordered → Lab dept adds charges to invoice
- If pharmacy dispensed → Pharmacy adds charges
- If X-ray done → Radiology adds charges

**Step 4: Checkout (Receptionist)**

**Screen: Invoice Review**
```
┌─────────────────────────────────────────────────┐
│ Invoice #INV-2026-0123                          │
│ Patient: John Doe (MRN: 12345)                  │
│ Date: 2026-01-08                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ Consultation - General Practice    ₹500.00     │
│ Blood Test - CBC                   ₹250.00     │
│ X-Ray - Chest PA                   ₹400.00     │
│                                    ─────────    │
│ Subtotal                           ₹1,150.00   │
│ Discount                           -₹50.00     │
│                                    ─────────    │
│ Total Amount                       ₹1,100.00   │
│                                                 │
│ [Apply Discount] [Finalize Invoice]            │
└─────────────────────────────────────────────────┘
```

**Step 5: Apply Discount (If needed)**
- Receptionist clicks "Apply Discount"
- For discounts ≤10%: Auto-approved
- For discounts >10%: Requires billing manager approval

**Step 6: Finalize Invoice**
- Receptionist clicks "Finalize Invoice"
- Invoice status changes to `finalized`
- Invoice becomes **immutable** (no more edits)

**Step 7: Record Payment**

**Screen: Payment Entry**
```
┌─────────────────────────────────────────────────┐
│ Record Payment                                  │
├─────────────────────────────────────────────────┤
│ Invoice Total: ₹1,100.00                        │
│                                                 │
│ Payment Method:                                 │
│ ○ Cash  ● Card  ○ UPI  ○ Bank Transfer          │
│                                                 │
│ Amount Received: [₹1,100.00]                    │
│                                                 │
│ Card Last 4 Digits: [4532]                      │
│ Transaction ID: [TXN-20260108-1234]             │
│                                                 │
│ [Record Payment]                                │
└─────────────────────────────────────────────────┘
```

**Step 8: Generate Receipt**
- System auto-allocates payment to invoice
- Invoice status → `paid`
- Print/Email receipt to patient

**Receipt Example:**
```
════════════════════════════════════════
        Dr. Sarah Chen Medical Practice
             Receipt #PAY-2026-0045
════════════════════════════════════════
Date: 08-Jan-2026           Time: 14:23

Patient: John Doe
MRN: 12345

Invoice: INV-2026-0123
────────────────────────────────────────
Consultation                    ₹500.00
Blood Test - CBC                ₹250.00
X-Ray - Chest PA                ₹400.00
                               ─────────
Subtotal                      ₹1,150.00
Discount                        -₹50.00
                               ─────────
Total                         ₹1,100.00

Payment Method: Card (****4532)
Amount Paid                   ₹1,100.00
Balance                            ₹0.00
────────────────────────────────────────
Thank you for your visit!
════════════════════════════════════════
```

---

## B4. IPD Billing UX Flow

### Timeline

```
Admission → Daily Charges (Multiple Days) → Pre-Discharge Review → Discharge → Final Settlement
     ↓                                               ↓
  Create Invoice                              Finalize Invoice
```

### Step-by-Step Flow

**Step 1: Admission (ADT Event A01)**
- Patient admitted to ward
- System receives ADT A01 event (see Section C)
- **Automatic invoice creation**: IPD invoice in `draft` status

**Step 2: Daily Charge Accrual (Days 1-N)**

Charges are added continuously by multiple actors:

**Day 1 Charges:**
- **Ward Clerk** adds: Room rent (General Ward) - ₹1,500/day
- **Nurse** adds: IV Fluids, Medications
- **Doctor** adds: Daily consultation visit

**Day 2 Charges:**
- **Ward Clerk** adds: Room rent - ₹1,500/day
- **Nurse** adds: Medications, Dressing materials
- **Doctor** adds: Procedure (Minor surgery)

**Day 3 Charges:**
- **Ward Clerk** adds: Room rent - ₹1,500/day
- **Radiology** adds: CT Scan
- **Lab** adds: Blood tests

**Screen: IPD Invoice (Running Total)**
```
┌──────────────────────────────────────────────────┐
│ Invoice #INV-IPD-2026-0089                       │
│ Patient: Jane Smith (MRN: 67890)                 │
│ Admission Date: 05-Jan-2026                      │
│ Admission ID: ADM-2026-0045                      │
│ Current Status: In-patient (Ward 3, Bed 12)      │
├──────────────────────────────────────────────────┤
│ Date       Description          Qty    Amount    │
├──────────────────────────────────────────────────┤
│ 05-Jan     Room Rent - GW        1    ₹1,500.00  │
│ 05-Jan     IV Fluids             2      ₹300.00  │
│ 05-Jan     Doctor Visit          1      ₹500.00  │
│                                                   │
│ 06-Jan     Room Rent - GW        1    ₹1,500.00  │
│ 06-Jan     Antibiotics           3      ₹450.00  │
│ 06-Jan     Minor Surgery         1    ₹5,000.00  │
│                                                   │
│ 07-Jan     Room Rent - GW        1    ₹1,500.00  │
│ 07-Jan     CT Scan - Abdomen     1    ₹3,500.00  │
│ 07-Jan     Blood Tests           1      ₹800.00  │
│                                        ─────────  │
│ Running Total                        ₹15,550.00  │
│                                                   │
│ Status: Draft (Charges still being added)        │
└──────────────────────────────────────────────────┘
```

**Step 3: Pre-Discharge Billing Review**

**Trigger:** Doctor marks patient as "Ready for Discharge"

**Workflow:**
1. Billing clerk receives notification
2. Reviews all accumulated charges
3. Checks for missing charges (common: pharmacy, dietetics)
4. Applies package pricing if applicable
5. Applies tariff/insurance discounts

**Screen: Pre-Discharge Review**
```
┌──────────────────────────────────────────────────┐
│ Pre-Discharge Billing Review                     │
│ Invoice #INV-IPD-2026-0089                       │
├──────────────────────────────────────────────────┤
│ Charge Summary by Category:                     │
│                                                   │
│ Room & Board (3 days)              ₹4,500.00     │
│ Doctor Consultations                 ₹500.00     │
│ Procedures & Surgery               ₹5,000.00     │
│ Medications & Pharmacy               ₹750.00     │
│ Diagnostics (Lab + Radiology)      ₹4,300.00     │
│ Consumables                          ₹500.00     │
│                                    ─────────     │
│ Subtotal                          ₹15,550.00     │
│                                                   │
│ Applied Tariff: Corporate (15% off)              │
│ Discount                          -₹2,332.50     │
│                                    ─────────     │
│ Total Payable                     ₹13,217.50     │
│                                                   │
│ ⚠ Missing Charges?                               │
│ □ Dietary charges not added                      │
│ □ Physiotherapy sessions                         │
│                                                   │
│ [Add Missing Charges] [Finalize Invoice]         │
└──────────────────────────────────────────────────┘
```

**Step 4: Finalize Invoice**
- Billing clerk clicks "Finalize Invoice"
- Invoice status → `finalized`
- Invoice becomes **immutable**
- Patient/family receives invoice copy

**Step 5: Discharge (ADT Event A03)**
- Doctor approves discharge
- System receives ADT A03 event
- Patient **cannot be discharged** until invoice settled (if `require_settlement_before_checkout: true`)

**Step 6: Payment & Settlement**

**Option A: Full Payment at Discharge**
```
┌──────────────────────────────────────────────────┐
│ Discharge Settlement                             │
├──────────────────────────────────────────────────┤
│ Total Payable: ₹13,217.50                        │
│                                                   │
│ Payment 1:                                       │
│ Card (****3456) - ₹10,000.00                     │
│                                                   │
│ Payment 2:                                       │
│ Cash - ₹3,217.50                                 │
│                                    ─────────     │
│ Total Paid                        ₹13,217.50     │
│ Balance                                 ₹0.00    │
│                                                   │
│ Invoice Status: Paid ✓                           │
│                                                   │
│ [Print Receipt] [Email Receipt]                  │
└──────────────────────────────────────────────────┘
```

**Option B: Partial Payment (Insurance/TPA)**
```
┌──────────────────────────────────────────────────┐
│ Discharge Settlement                             │
├──────────────────────────────────────────────────┤
│ Total Payable: ₹13,217.50                        │
│                                                   │
│ Insurance Coverage (TPA: XYZ Health)             │
│ Pre-authorized Amount: ₹12,000.00                │
│                                                   │
│ Patient Co-pay Required: ₹1,217.50               │
│                                                   │
│ Payment Received (Cash): ₹1,217.50               │
│                                                   │
│ Invoice Status: Partially Paid                   │
│ Pending from Insurance: ₹12,000.00               │
│                                                   │
│ [Generate TPA Claim] [Print Receipt]             │
└──────────────────────────────────────────────────┘
```

**Step 7: Post-Discharge Adjustments (If Needed)**

Scenario: Pharmacy forgot to bill 2 medications

**Workflow:**
1. Create **supplementary invoice** (linked to original admission)
2. Add missed charges
3. Notify patient
4. Collect additional payment

---

## B5. Exception Handling

### Exception 1: Patient Refuses to Pay (OPD)

**Scenario:** Patient disputes charges or cannot pay immediately

**UX Flow:**
1. Receptionist marks invoice as "Disputed" with reason
2. Billing manager receives alert
3. Manager reviews and decides:
   - **Option A:** Apply discount to settle
   - **Option B:** Create payment plan
   - **Option C:** Escalate to admin
4. Invoice remains `finalized` but unpaid
5. Patient added to "Outstanding Balances" list

---

### Exception 2: Wrong Charges Added (IPD)

**Scenario:** Nurse accidentally added wrong medication charge

**UX Flow (Before Finalization):**
1. Nurse/Billing clerk clicks "Remove Line Item"
2. System prompts: "Reason for removal?"
3. Nurse enters: "Wrong medication charged - corrected"
4. Line item deleted (soft delete with audit log)
5. Correct charge added

**UX Flow (After Finalization):**
1. **Cannot edit finalized invoice**
2. Create **credit note** (negative invoice)
3. Credit note offsets original invoice
4. Create new invoice with correct charges

---

### Exception 3: Discharge Before Payment (IPD)

**Scenario:** Emergency situation, patient must leave before payment

**UX Flow:**
1. Doctor requests "Emergency Discharge Override"
2. Billing manager approves
3. System allows discharge with unpaid invoice
4. Invoice marked with "Emergency Discharge" flag
5. Patient added to "Accounts Receivable" list
6. Automated follow-up reminders sent

---

## B6. UI States & Empty States

### Empty State: No Charges on Invoice

```
┌──────────────────────────────────────────────────┐
│ Invoice #INV-2026-0150                           │
│ Patient: Alice Brown (MRN: 11111)                │
├──────────────────────────────────────────────────┤
│                                                   │
│              No charges added yet                │
│                                                   │
│   Add charges for consultations, procedures,     │
│   diagnostics, or pharmacy services.             │
│                                                   │
│            [+ Add Charge Item]                   │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

### Loading State: Applying Tariff Pricing

```
┌──────────────────────────────────────────────────┐
│ Recalculating invoice with Corporate Tariff...  │
│                                                   │
│              ⏳ Please wait                       │
│                                                   │
│ Applying 15% discount to all eligible charges    │
└──────────────────────────────────────────────────┘
```

---

### Error State: Payment Failed

```
┌──────────────────────────────────────────────────┐
│ ⚠ Payment Processing Failed                      │
├──────────────────────────────────────────────────┤
│ Card transaction declined by bank                │
│                                                   │
│ Error Code: INSUFFICIENT_FUNDS                   │
│ Transaction ID: TXN-2026-5678                    │
│                                                   │
│ Please try:                                      │
│ • Different payment method                       │
│ • Contact your bank                              │
│ • Pay partial amount                             │
│                                                   │
│ [Try Again] [Change Payment Method]              │
└──────────────────────────────────────────────────┘
```

---

# C. ADT Integration Specification

## C1. ADT Event Types

ADT (Admission/Discharge/Transfer) events are HL7 messages sent by Hospital Information Systems to notify patient movement and status changes.

### Supported ADT Events

| HL7 Event | Name | Description | MyMedic Action |
|-----------|------|-------------|----------------|
| **A01** | Admit Patient | Patient admitted to inpatient unit | Create admission record + IPD invoice |
| **A02** | Transfer Patient | Patient moved to different ward/bed | Update admission location, adjust room charges |
| **A03** | Discharge Patient | Patient discharged from hospital | Close admission, finalize invoice |
| **A08** | Update Patient Info | Patient demographics changed | Update patient record |
| **A11** | Cancel Admit | Admission cancelled (error correction) | Void admission + invoice |
| **A13** | Cancel Discharge | Discharge cancelled, patient re-admitted | Reopen admission |

---

## C2. Payload Examples

### C2.1 HL7 ADT^A01 (Admit Patient)

**HL7 v2.5 Format:**
```
MSH|^~\&|HIS|MAIN_HOSPITAL|MYMEDIC|MYMEDIC_SYSTEM|20260108143000||ADT^A01|MSG0001|P|2.5
EVN|A01|20260108143000|||USER123|20260108143000
PID|1||MRN-67890^^^MAIN_HOSPITAL^MRN||SMITH^JANE^A||19850315|F|||123 Main St^^Mumbai^^400001^IND||(022)1234-5678|||S||PA-2026-0045|||
PV1|1|I|WARD3^BED12^ROOM5^MAIN_HOSPITAL^^^^GENERAL|||DOC123^CHEN^SARAH^A^^^DR|||MED||||ADM|||DOC123^CHEN^SARAH^A^^^DR|PA-2026-0045|INS001||||||||||||||||||||MAIN_HOSPITAL||ACC||ADM|20260105120000
```

**Parsed Fields:**
```json
{
  "message_type": "ADT^A01",
  "message_control_id": "MSG0001",
  "event_timestamp": "2026-01-08T14:30:00Z",
  "patient": {
    "mrn": "MRN-67890",
    "last_name": "Smith",
    "first_name": "Jane",
    "middle_name": "A",
    "date_of_birth": "1985-03-15",
    "gender": "F",
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "postal_code": "400001",
      "country": "IND"
    },
    "phone": "(022)1234-5678"
  },
  "visit": {
    "visit_number": "PA-2026-0045",
    "patient_class": "I", // Inpatient
    "admission_datetime": "2026-01-05T12:00:00Z",
    "location": {
      "ward": "WARD3",
      "bed": "BED12",
      "room": "ROOM5",
      "facility": "MAIN_HOSPITAL",
      "bed_type": "GENERAL"
    },
    "attending_doctor": {
      "id": "DOC123",
      "last_name": "Chen",
      "first_name": "Sarah",
      "title": "DR"
    },
    "admission_type": "ADM", // Admission
    "financial_class": "INS001" // Insurance
  }
}
```

---

### C2.2 HL7 ADT^A02 (Transfer Patient)

```
MSH|^~\&|HIS|MAIN_HOSPITAL|MYMEDIC|MYMEDIC_SYSTEM|20260107100000||ADT^A02|MSG0002|P|2.5
EVN|A02|20260107100000|||USER456|20260107100000
PID|1||MRN-67890^^^MAIN_HOSPITAL^MRN||SMITH^JANE^A||19850315|F
PV1|1|I|ICU1^BED5^ROOM201^MAIN_HOSPITAL^^^^ICU|||DOC123^CHEN^SARAH^A^^^DR|||MED||||ADM|||DOC123^CHEN^SARAH^A^^^DR|PA-2026-0045|INS001||||||||||||||||||||MAIN_HOSPITAL||ACC||TRN|20260107100000
```

**Parsed Transfer Event:**
```json
{
  "message_type": "ADT^A02",
  "event_timestamp": "2026-01-07T10:00:00Z",
  "patient_mrn": "MRN-67890",
  "visit_number": "PA-2026-0045",
  "new_location": {
    "ward": "ICU1",
    "bed": "BED5",
    "room": "ROOM201",
    "bed_type": "ICU"
  },
  "transfer_datetime": "2026-01-07T10:00:00Z"
}
```

---

### C2.3 HL7 ADT^A03 (Discharge Patient)

```
MSH|^~\&|HIS|MAIN_HOSPITAL|MYMEDIC|MYMEDIC_SYSTEM|20260108160000||ADT^A03|MSG0003|P|2.5
EVN|A03|20260108160000|||USER789|20260108160000
PID|1||MRN-67890^^^MAIN_HOSPITAL^MRN||SMITH^JANE^A||19850315|F
PV1|1|I|WARD3^BED12^ROOM5^MAIN_HOSPITAL^^^^GENERAL|||DOC123^CHEN^SARAH^A^^^DR|||MED||||ADM|||DOC123^CHEN^SARAH^A^^^DR|PA-2026-0045|INS001||||||||||||||||||||MAIN_HOSPITAL||ACC||DIS|20260108160000|20260108160000
```

**Parsed Discharge Event:**
```json
{
  "message_type": "ADT^A03",
  "event_timestamp": "2026-01-08T16:00:00Z",
  "patient_mrn": "MRN-67890",
  "visit_number": "PA-2026-0045",
  "discharge_datetime": "2026-01-08T16:00:00Z",
  "discharge_disposition": "HOME" // HOME, TRANSFER, DECEASED, etc.
}
```

---

### C2.4 JSON ADT API Format (Alternative)

For modern HIS systems that support REST APIs instead of HL7, MyMedic also accepts JSON payloads.

**POST /integrations/adt/events**

**Payload:**
```json
{
  "event_type": "admission",
  "event_id": "ADT-EVT-20260108-001",
  "event_timestamp": "2026-01-08T14:30:00Z",
  "source_system": "MAIN_HIS",
  "patient": {
    "mrn": "MRN-67890",
    "first_name": "Jane",
    "last_name": "Smith",
    "date_of_birth": "1985-03-15",
    "gender": "F",
    "phone": "(022)1234-5678",
    "email": "jane.smith@example.com"
  },
  "admission": {
    "admission_id": "PA-2026-0045",
    "admission_datetime": "2026-01-05T12:00:00Z",
    "location": {
      "ward": "WARD3",
      "bed": "BED12",
      "room": "ROOM5",
      "bed_type": "GENERAL"
    },
    "attending_doctor_id": "DOC123",
    "admission_type": "emergency",
    "financial_class": "insurance"
  }
}
```

---

## C3. Transport Methods

MyMedic supports three ADT integration transport methods to accommodate various HIS capabilities.

---

### C3.1 Method 1: HL7 TCP/IP Push (Real-time)

**Architecture:**
```
┌─────────────┐                  ┌──────────────┐
│             │   HL7 over MLLP  │              │
│  HIS System ├─────────────────>│  MyMedic     │
│             │   Port 7777      │  HL7 Listener│
└─────────────┘                  └──────────────┘
                                        │
                                        ↓
                                 ┌──────────────┐
                                 │ Event Queue  │
                                 │ (RabbitMQ)   │
                                 └──────────────┘
                                        │
                                        ↓
                                 ┌──────────────┐
                                 │ ADT Processor│
                                 │ Worker       │
                                 └──────────────┘
```

**MyMedic HL7 Listener Implementation:**
```typescript
import * as net from 'net';
import { HL7Parser } from './hl7-parser';
import { ADTEventQueue } from './adt-queue';

class HL7ADTListener {
  private server: net.Server;
  private parser: HL7Parser;
  private queue: ADTEventQueue;

  constructor() {
    this.parser = new HL7Parser();
    this.queue = new ADTEventQueue();
  }

  start(port: number = 7777) {
    this.server = net.createServer((socket) => {
      console.log('HIS connected:', socket.remoteAddress);

      socket.on('data', async (data) => {
        try {
          // HL7 uses MLLP protocol: <VT>message<FS><CR>
          // Remove MLLP wrapper bytes
          const rawMessage = data.toString();
          const message = rawMessage
            .replace(/[\x0B\x1C\x0D]/g, '') // Remove VT, FS, CR
            .trim();

          console.log('Received HL7 message:', message.substring(0, 100));

          // Parse HL7 message
          const parsedEvent = this.parser.parse(message);

          // Validate event
          await this.validateADTEvent(parsedEvent);

          // Queue for processing
          await this.queue.enqueue(parsedEvent);

          // Send ACK (acknowledgment) back to HIS
          const ack = this.buildACK(parsedEvent.MSH.MessageControlID, 'AA'); // AA = Application Accept
          socket.write(this.wrapMLLP(ack));

        } catch (error) {
          console.error('HL7 processing error:', error);

          // Send NACK (negative acknowledgment)
          const nack = this.buildACK(
            parsedEvent?.MSH?.MessageControlID || 'UNKNOWN',
            'AE', // AE = Application Error
            error.message
          );
          socket.write(this.wrapMLLP(nack));
        }
      });

      socket.on('error', (err) => {
        console.error('Socket error:', err);
      });
    });

    this.server.listen(port, () => {
      console.log(`HL7 ADT Listener started on port ${port}`);
    });
  }

  private buildACK(messageControlId: string, ackCode: string, errorMessage?: string): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);

    return [
      `MSH|^~\\&|MYMEDIC|MYMEDIC_SYSTEM|HIS|MAIN_HOSPITAL|${timestamp}||ACK|ACK-${messageControlId}|P|2.5`,
      `MSA|${ackCode}|${messageControlId}${errorMessage ? '|' + errorMessage : ''}`
    ].join('\r');
  }

  private wrapMLLP(message: string): Buffer {
    // MLLP format: <VT>message<FS><CR>
    return Buffer.from(`\x0B${message}\x1C\x0D`);
  }

  stop() {
    this.server.close();
  }
}
```

**Configuration:**
```json
{
  "adt_integration": {
    "enabled": true,
    "transport_method": "hl7_tcp",
    "hl7_listener_port": 7777,
    "hl7_version": "2.5",
    "sending_application": "MAIN_HIS",
    "receiving_application": "MYMEDIC"
  }
}
```

---

### C3.2 Method 2: REST API Polling (Batch)

**Architecture:**
```
┌──────────────┐                  ┌──────────────┐
│              │                  │              │
│  MyMedic     │   HTTP GET       │  HIS REST    │
│  Poller      ├─────────────────>│  API         │
│  (Cron Job)  │   Every 5 min    │              │
└──────────────┘                  └──────────────┘
      │
      ↓
┌──────────────┐
│ ADT Processor│
└──────────────┘
```

**HIS API Endpoint:**
```
GET /api/v1/adt/events?since=2026-01-08T14:00:00Z&limit=100
Authorization: Bearer <API_KEY>
```

**Response:**
```json
{
  "events": [
    {
      "event_id": "ADT-001",
      "event_type": "admission",
      "event_timestamp": "2026-01-08T14:30:00Z",
      "patient": { /* ... */ },
      "admission": { /* ... */ }
    },
    {
      "event_id": "ADT-002",
      "event_type": "transfer",
      "event_timestamp": "2026-01-08T14:45:00Z",
      "patient": { /* ... */ },
      "transfer": { /* ... */ }
    }
  ],
  "pagination": {
    "total": 2,
    "has_more": false
  }
}
```

**MyMedic Poller Implementation:**
```typescript
class ADTPollingService {
  private lastPollTimestamp: Date;

  async pollForADTEvents() {
    const config = await this.getConfig();

    try {
      const response = await fetch(
        `${config.his_api_endpoint}/adt/events?since=${this.lastPollTimestamp.toISOString()}&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${config.his_api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      for (const event of data.events) {
        await this.processADTEvent(event);
      }

      this.lastPollTimestamp = new Date();

      console.log(`Polled ${data.events.length} ADT events`);

    } catch (error) {
      console.error('ADT polling failed:', error);
      await this.notifyAdminOfPollingFailure(error);
    }
  }

  startPolling(intervalMinutes: number = 5) {
    setInterval(() => {
      this.pollForADTEvents();
    }, intervalMinutes * 60 * 1000);
  }
}
```

---

### C3.3 Method 3: SFTP File Drop (Batch)

**Architecture:**
```
┌──────────────┐                  ┌──────────────┐
│              │   SFTP PUT       │              │
│  HIS System  ├─────────────────>│  SFTP Server │
│  (Daily Job) │   adt_*.csv      │  (MyMedic)   │
└──────────────┘                  └──────────────┘
                                         │
                                         ↓
                                  ┌──────────────┐
                                  │ File Watcher │
                                  │ (Cron)       │
                                  └──────────────┘
                                         │
                                         ↓
                                  ┌──────────────┐
                                  │ CSV Parser   │
                                  └──────────────┘
```

**CSV File Format (adt_20260108.csv):**
```csv
event_type,event_timestamp,mrn,patient_name,dob,gender,admission_id,location_ward,location_bed,doctor_id,admission_datetime
admission,2026-01-08T14:30:00Z,MRN-67890,"Smith, Jane A",1985-03-15,F,PA-2026-0045,WARD3,BED12,DOC123,2026-01-05T12:00:00Z
transfer,2026-01-07T10:00:00Z,MRN-67890,"Smith, Jane A",1985-03-15,F,PA-2026-0045,ICU1,BED5,DOC123,
discharge,2026-01-08T16:00:00Z,MRN-67890,"Smith, Jane A",1985-03-15,F,PA-2026-0045,WARD3,BED12,DOC123,2026-01-08T16:00:00Z
```

**File Processing Service:**
```typescript
class SFTPADTFileProcessor {
  async processADTFile(filePath: string) {
    const csvContent = await fs.readFile(filePath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    for (const record of records) {
      const adtEvent = this.csvToADTEvent(record);
      await this.processADTEvent(adtEvent);
    }

    // Archive processed file
    await this.archiveFile(filePath);
  }

  private csvToADTEvent(record: any): ADTEvent {
    return {
      event_type: record.event_type,
      event_timestamp: new Date(record.event_timestamp),
      patient: {
        mrn: record.mrn,
        full_name: record.patient_name,
        date_of_birth: record.dob,
        gender: record.gender
      },
      admission: {
        admission_id: record.admission_id,
        location: {
          ward: record.location_ward,
          bed: record.location_bed
        },
        attending_doctor_id: record.doctor_id,
        admission_datetime: record.admission_datetime
          ? new Date(record.admission_datetime)
          : undefined
      }
    };
  }
}
```

---

## C4. Validation Rules

All incoming ADT events must pass validation before processing.

### C4.1 Validation Checklist

| # | Validation Rule | Action on Failure |
|---|-----------------|-------------------|
| 1 | Required fields present | Reject event, send NACK |
| 2 | Patient MRN exists in MyMedic | Auto-create patient if `auto_create_patients: true`, else reject |
| 3 | Doctor ID exists in MyMedic | Warn, use default/unassigned doctor |
| 4 | Bed/Ward location valid | Warn, accept event but flag for review |
| 5 | Duplicate admission ID | Reject if exact duplicate, accept if correction (A11) |
| 6 | Discharge before admission | Reject event, data integrity error |
| 7 | Transfer without active admission | Reject event |
| 8 | Financial class/insurance valid | Accept with warning |

---

### C4.2 Validation Implementation

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

class ADTValidationService {
  async validateADTEvent(event: ADTEvent): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Validation 1: Required fields
    if (!event.patient?.mrn) {
      result.errors.push({
        field: 'patient.mrn',
        message: 'Patient MRN is required',
        severity: 'error'
      });
      result.valid = false;
    }

    if (event.event_type === 'admission' && !event.admission?.admission_id) {
      result.errors.push({
        field: 'admission.admission_id',
        message: 'Admission ID is required for admission events',
        severity: 'error'
      });
      result.valid = false;
    }

    // Validation 2: Patient exists
    const patient = await this.patientService.findByMRN(event.patient.mrn);
    if (!patient) {
      const config = await this.getConfig();
      if (config.auto_create_patients) {
        result.warnings.push({
          field: 'patient',
          message: 'Patient not found, will auto-create',
          severity: 'warning'
        });
      } else {
        result.errors.push({
          field: 'patient.mrn',
          message: `Patient with MRN ${event.patient.mrn} not found`,
          severity: 'error'
        });
        result.valid = false;
      }
    }

    // Validation 3: Duplicate admission check
    if (event.event_type === 'admission') {
      const existingAdmission = await this.admissionService.findByAdmissionId(
        event.admission.admission_id
      );

      if (existingAdmission) {
        result.errors.push({
          field: 'admission.admission_id',
          message: `Admission ${event.admission.admission_id} already exists`,
          severity: 'error'
        });
        result.valid = false;
      }
    }

    // Validation 4: Bed availability (for admissions)
    if (event.event_type === 'admission') {
      const bed = await this.locationService.findBed(
        event.admission.location.ward,
        event.admission.location.bed
      );

      if (bed && bed.occupied) {
        result.warnings.push({
          field: 'admission.location.bed',
          message: `Bed ${bed.bed_number} is already occupied, will flag for review`,
          severity: 'warning'
        });
      }
    }

    // Validation 5: Discharge validation
    if (event.event_type === 'discharge') {
      const admission = await this.admissionService.findActiveByVisitNumber(
        event.admission.admission_id
      );

      if (!admission) {
        result.errors.push({
          field: 'admission.admission_id',
          message: `No active admission found for visit ${event.admission.admission_id}`,
          severity: 'error'
        });
        result.valid = false;
      }

      if (admission && event.discharge_datetime < admission.admission_datetime) {
        result.errors.push({
          field: 'discharge_datetime',
          message: 'Discharge datetime cannot be before admission datetime',
          severity: 'error'
        });
        result.valid = false;
      }
    }

    return result;
  }
}
```

---

## C5. Failure Handling

### C5.1 Failure Scenarios

| Scenario | Handling Strategy | User Impact |
|----------|------------------|-------------|
| Patient not found | Auto-create if enabled, else reject | None if auto-create enabled |
| Duplicate admission (A01) | Reject event, send NACK | HIS notified, requires manual resolution |
| Bed already occupied | Accept with warning, flag for admin review | Admin reviews bed assignment |
| Admission not found (A03) | Reject event, send NACK | HIS notified, verify admission ID |
| Network timeout (HL7) | Retry 3 times with exponential backoff | Delayed processing (< 5 min) |
| Invalid HL7 format | Reject, log to dead letter queue | Admin reviews malformed messages |
| Database unavailable | Queue event, process when DB recovers | Delayed processing (auto-retry) |

---

### C5.2 Retry Logic

```typescript
class ADTRetryService {
  async processWithRetry(
    event: ADTEvent,
    maxRetries: number = 3
  ): Promise<ProcessingResult> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.processor.process(event);
        return result;

      } catch (error) {
        lastError = error;

        if (this.isRetryable(error)) {
          const delayMs = this.calculateBackoff(attempt);
          console.log(`Retry ${attempt}/${maxRetries} after ${delayMs}ms:`, error.message);
          await this.sleep(delayMs);
        } else {
          // Non-retryable error, fail immediately
          throw error;
        }
      }
    }

    // All retries exhausted
    await this.sendToDeadLetterQueue(event, lastError);
    throw new Error(`Processing failed after ${maxRetries} retries: ${lastError.message}`);
  }

  private isRetryable(error: Error): boolean {
    // Retryable errors: network, timeout, temporary DB issues
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'DATABASE_UNAVAILABLE',
      'LOCK_TIMEOUT'
    ];

    return retryableErrors.some(code => error.message.includes(code));
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  private async sendToDeadLetterQueue(event: ADTEvent, error: Error) {
    await this.dlq.enqueue({
      event: event,
      error: error.message,
      stack: error.stack,
      failed_at: new Date(),
      retry_count: 3
    });

    await this.notifyAdmin({
      title: 'ADT Event Processing Failed',
      event_id: event.event_id,
      error: error.message
    });
  }
}
```

---

### C5.3 Dead Letter Queue

Failed events after all retries are sent to a Dead Letter Queue for manual review.

**DLQ Storage:**
```sql
CREATE TABLE adt_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255),
  event_type VARCHAR(50),
  raw_payload JSONB,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by_user_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX idx_adt_dlq_reviewed ON adt_dead_letter_queue(reviewed);
CREATE INDEX idx_adt_dlq_failed_at ON adt_dead_letter_queue(failed_at DESC);
```

**Admin UI for DLQ:**
```
┌──────────────────────────────────────────────────┐
│ ADT Integration - Dead Letter Queue             │
├──────────────────────────────────────────────────┤
│ Showing 5 unresolved failures                    │
│                                                   │
│ [Event] ADT-001 | 2026-01-08 14:30               │
│ Type: Admission                                  │
│ Error: Patient MRN-99999 not found              │
│ Retries: 3                                       │
│ [View Details] [Retry] [Mark Resolved]           │
│                                                   │
│ [Event] ADT-002 | 2026-01-08 15:00               │
│ Type: Transfer                                   │
│ Error: Admission PA-9999 not found               │
│ Retries: 3                                       │
│ [View Details] [Retry] [Mark Resolved]           │
│                                                   │
└──────────────────────────────────────────────────┘
```

---

### C5.4 Monitoring & Alerting

**Metrics to Track:**
```typescript
interface ADTIntegrationMetrics {
  events_received_total: number;
  events_processed_success: number;
  events_processed_failed: number;
  events_in_dead_letter_queue: number;
  average_processing_time_ms: number;
  last_event_received_at: Date;
  hl7_connection_status: 'connected' | 'disconnected';
}
```

**Alert Conditions:**
1. **No events received in 24 hours** → Alert: HIS may be down
2. **> 10 events in DLQ** → Alert: System integration issue
3. **HL7 connection disconnected** → Alert: Network issue
4. **Processing time > 5 seconds** → Warning: Performance degradation

**Prometheus Metrics Export:**
```typescript
class ADTMetricsExporter {
  private registry: Registry;

  constructor() {
    this.registry = new Registry();

    this.eventsReceivedCounter = new Counter({
      name: 'adt_events_received_total',
      help: 'Total number of ADT events received',
      labelNames: ['event_type']
    });

    this.eventsProcessedCounter = new Counter({
      name: 'adt_events_processed_total',
      help: 'Total number of ADT events processed',
      labelNames: ['event_type', 'status']
    });

    this.processingTimeHistogram = new Histogram({
      name: 'adt_processing_duration_seconds',
      help: 'ADT event processing duration',
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.registry.registerMetric(this.eventsReceivedCounter);
    this.registry.registerMetric(this.eventsProcessedCounter);
    this.registry.registerMetric(this.processingTimeHistogram);
  }

  recordEventReceived(eventType: string) {
    this.eventsReceivedCounter.inc({ event_type: eventType });
  }

  recordEventProcessed(eventType: string, status: 'success' | 'failed') {
    this.eventsProcessedCounter.inc({ event_type: eventType, status });
  }

  recordProcessingTime(durationSeconds: number) {
    this.processingTimeHistogram.observe(durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
```

---

## C6. Billing Interactions

ADT events trigger automatic billing operations to ensure charges are accurately captured and invoices are generated.

### C6.1 A01 (Admission) → Create IPD Invoice

**Event Flow:**
```
HIS sends A01 → MyMedic receives → Validate → Create admission record
                                                         ↓
                                              Create IPD invoice (draft)
                                                         ↓
                                              Add initial room charge
```

**Implementation:**
```typescript
class AdmissionEventHandler {
  async handleAdmissionEvent(event: ADTAdmissionEvent) {
    // Step 1: Create admission record
    const admission = await this.admissionService.createAdmission({
      admission_id: event.admission.admission_id,
      patient_id: event.patient.id,
      admission_datetime: event.admission.admission_datetime,
      location: event.admission.location,
      attending_doctor_id: event.admission.attending_doctor_id,
      admission_type: event.admission.admission_type
    });

    // Step 2: Check if billing is enabled for tenant
    const billingConfig = await this.billingService.getConfig(event.tenant_id);
    if (!billingConfig.billing_enabled) {
      return; // Skip billing for this tenant
    }

    // Step 3: Create IPD invoice
    const invoice = await this.billingService.createInvoice({
      tenant_id: event.tenant_id,
      patient_id: event.patient.id,
      admission_id: admission.id,
      invoice_type: 'ipd',
      status: 'draft',
      tariff_id: await this.resolveTariffForPatient(event.patient.id),
      created_by_trigger: 'adt_admission_event'
    });

    // Step 4: Add initial room charge (Day 1)
    const roomChargeCode = await this.chargeCodeService.findByCode(
      event.tenant_id,
      this.mapBedTypeToChargeCode(event.admission.location.bed_type)
    );

    await this.billingService.addLineItem(invoice.id, {
      charge_code_id: roomChargeCode.id,
      quantity: 1,
      unit_price: roomChargeCode.base_price,
      service_date: event.admission.admission_datetime,
      description: `Room Rent - ${event.admission.location.bed_type} - Day 1`,
      department_id: await this.getDepartmentForWard(event.admission.location.ward)
    });

    // Step 5: Schedule daily room charge automation
    await this.scheduleRecurringRoomCharges(admission.id, invoice.id);

    console.log(`Created IPD invoice ${invoice.invoice_number} for admission ${admission.admission_id}`);
  }

  private mapBedTypeToChargeCode(bedType: string): string {
    const mapping = {
      'GENERAL': 'ROOM-GENERAL',
      'SEMI_PRIVATE': 'ROOM-SEMI-PRIVATE',
      'PRIVATE': 'ROOM-PRIVATE',
      'ICU': 'ROOM-ICU',
      'NICU': 'ROOM-NICU'
    };
    return mapping[bedType] || 'ROOM-GENERAL';
  }
}
```

---

### C6.2 A02 (Transfer) → Adjust Room Charges

**Event Flow:**
```
HIS sends A02 → MyMedic receives → Validate → Update admission location
                                                         ↓
                                              End current room charge
                                                         ↓
                                              Start new room charge (new bed type)
```

**Scenario:** Patient transferred from General Ward (₹1,500/day) to ICU (₹5,000/day) on Day 3

**Implementation:**
```typescript
class TransferEventHandler {
  async handleTransferEvent(event: ADTTransferEvent) {
    // Step 1: Find active admission
    const admission = await this.admissionService.findByAdmissionId(
      event.admission.admission_id
    );

    if (!admission) {
      throw new Error(`Admission ${event.admission.admission_id} not found`);
    }

    // Step 2: Update admission location
    const oldLocation = admission.location;
    await this.admissionService.updateLocation(admission.id, {
      ward: event.new_location.ward,
      bed: event.new_location.bed,
      room: event.new_location.room,
      bed_type: event.new_location.bed_type,
      transferred_at: event.transfer_datetime
    });

    // Step 3: Find active IPD invoice
    const invoice = await this.billingService.findActiveIPDInvoice(admission.id);
    if (!invoice) {
      console.warn(`No active invoice for admission ${admission.admission_id}`);
      return;
    }

    // Step 4: Check if bed type changed (affects pricing)
    if (oldLocation.bed_type !== event.new_location.bed_type) {
      // Prorate charges if transfer happened mid-day
      const transferHour = event.transfer_datetime.getHours();
      const fullDayCharge = transferHour < 12; // Transfer before noon = charge full day for old room

      // Add final charge for old room
      const oldRoomChargeCode = await this.chargeCodeService.findByCode(
        event.tenant_id,
        this.mapBedTypeToChargeCode(oldLocation.bed_type)
      );

      await this.billingService.addLineItem(invoice.id, {
        charge_code_id: oldRoomChargeCode.id,
        quantity: fullDayCharge ? 1 : 0.5,
        unit_price: oldRoomChargeCode.base_price,
        service_date: event.transfer_datetime,
        description: `Room Rent - ${oldLocation.bed_type} (until transfer)`,
        notes: `Transferred to ${event.new_location.ward}/${event.new_location.bed}`
      });

      // Add first charge for new room
      const newRoomChargeCode = await this.chargeCodeService.findByCode(
        event.tenant_id,
        this.mapBedTypeToChargeCode(event.new_location.bed_type)
      );

      await this.billingService.addLineItem(invoice.id, {
        charge_code_id: newRoomChargeCode.id,
        quantity: fullDayCharge ? 0 : 0.5,
        unit_price: newRoomChargeCode.base_price,
        service_date: event.transfer_datetime,
        description: `Room Rent - ${event.new_location.bed_type} (from transfer)`,
        notes: `Transferred from ${oldLocation.ward}/${oldLocation.bed}`
      });

      // Update recurring charge automation
      await this.updateRecurringRoomCharges(
        admission.id,
        invoice.id,
        newRoomChargeCode.id
      );
    }

    console.log(`Processed transfer for admission ${admission.admission_id}: ${oldLocation.bed_type} → ${event.new_location.bed_type}`);
  }
}
```

---

### C6.3 A03 (Discharge) → Finalize Invoice

**Event Flow:**
```
HIS sends A03 → MyMedic receives → Validate → Update admission status (discharged)
                                                         ↓
                                              Add final room charge
                                                         ↓
                                              Calculate totals
                                                         ↓
                                              Auto-finalize invoice (optional)
                                                         ↓
                                              Notify billing department
```

**Implementation:**
```typescript
class DischargeEventHandler {
  async handleDischargeEvent(event: ADTDischargeEvent) {
    // Step 1: Find active admission
    const admission = await this.admissionService.findByAdmissionId(
      event.admission.admission_id
    );

    if (!admission || admission.status === 'discharged') {
      throw new Error(`No active admission found for ${event.admission.admission_id}`);
    }

    // Step 2: Update admission status
    await this.admissionService.discharge(admission.id, {
      discharge_datetime: event.discharge_datetime,
      discharge_disposition: event.discharge_disposition,
      discharged_by_user_id: event.metadata.caused_by_user_id
    });

    // Step 3: Find IPD invoice
    const invoice = await this.billingService.findActiveIPDInvoice(admission.id);
    if (!invoice) {
      console.warn(`No invoice for admission ${admission.admission_id}, skipping billing`);
      return;
    }

    // Step 4: Add final room charge (for discharge day)
    const admissionDays = this.calculateDays(
      admission.admission_datetime,
      event.discharge_datetime
    );

    const lastRoomCharge = await this.getLastRoomChargeCode(invoice.id);
    if (lastRoomCharge) {
      await this.billingService.addLineItem(invoice.id, {
        charge_code_id: lastRoomCharge.charge_code_id,
        quantity: 1,
        unit_price: lastRoomCharge.unit_price,
        service_date: event.discharge_datetime,
        description: `Room Rent - Day ${admissionDays} (Discharge Day)`
      });
    }

    // Step 5: Stop recurring room charge automation
    await this.cancelRecurringRoomCharges(admission.id);

    // Step 6: Recalculate invoice totals
    await this.billingService.recalculateInvoice(invoice.id);

    // Step 7: Auto-finalize if configured
    const config = await this.billingService.getConfig(event.tenant_id);
    if (config.auto_finalize_on_discharge) {
      await this.billingService.finalizeInvoice(invoice.id, {
        finalized_by_user_id: 'system',
        finalized_by_trigger: 'adt_discharge_event'
      });

      console.log(`Auto-finalized invoice ${invoice.invoice_number} on discharge`);
    } else {
      // Notify billing department for manual review
      await this.notificationService.sendNotification({
        recipient_role: 'billing_clerk',
        title: 'Patient Discharged - Invoice Ready for Review',
        message: `Patient ${event.patient.full_name} (${event.patient.mrn}) has been discharged. Invoice ${invoice.invoice_number} is ready for review and finalization.`,
        action_url: `/billing/invoices/${invoice.id}`,
        priority: 'high'
      });
    }

    // Step 8: Check if settlement required before physical discharge
    if (config.require_settlement_before_checkout && invoice.balance_amount > 0) {
      await this.blockPhysicalDischarge(admission.id, {
        reason: 'Pending invoice settlement',
        invoice_id: invoice.id,
        balance_amount: invoice.balance_amount
      });

      await this.notificationService.sendNotification({
        recipient_role: 'billing_clerk',
        title: '⚠ Discharge Blocked - Payment Required',
        message: `Cannot discharge ${event.patient.full_name} until invoice ${invoice.invoice_number} (₹${invoice.balance_amount}) is settled.`,
        priority: 'urgent'
      });
    }
  }

  private calculateDays(admissionDate: Date, dischargeDate: Date): number {
    const diffMs = dischargeDate.getTime() - admissionDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
```

---

### C6.4 Post-Discharge Billing Adjustments

**Scenario 1: Missing Charges Discovered After Discharge**

Patient was discharged on Day 3, but pharmacy forgot to bill 2 medications.

**Workflow:**
```typescript
class PostDischargeAdjustmentService {
  async addMissingCharges(
    admissionId: string,
    missingCharges: ChargeItem[]
  ) {
    const admission = await this.admissionService.findById(admissionId);
    if (admission.status !== 'discharged') {
      throw new Error('Admission is still active');
    }

    const invoice = await this.billingService.findIPDInvoice(admissionId);

    if (invoice.status === 'paid') {
      // Create supplementary invoice
      const suppInvoice = await this.billingService.createInvoice({
        tenant_id: invoice.tenant_id,
        patient_id: invoice.patient_id,
        admission_id: admissionId,
        invoice_type: 'ipd_supplementary',
        status: 'draft',
        parent_invoice_id: invoice.id,
        notes: 'Post-discharge adjustments for missing charges'
      });

      for (const charge of missingCharges) {
        await this.billingService.addLineItem(suppInvoice.id, charge);
      }

      await this.billingService.finalizeInvoice(suppInvoice.id);

      // Notify patient
      await this.notificationService.sendToPatient(invoice.patient_id, {
        title: 'Additional Invoice Issued',
        message: `A supplementary invoice ${suppInvoice.invoice_number} has been issued for additional charges. Amount: ₹${suppInvoice.total_amount}`,
        action_url: `/invoices/${suppInvoice.id}`
      });

    } else if (invoice.status === 'finalized' || invoice.status === 'partially_paid') {
      // Invoice not fully paid yet, can add charges directly
      for (const charge of missingCharges) {
        await this.billingService.addLineItem(invoice.id, charge);
      }

      await this.billingService.recalculateInvoice(invoice.id);

      // Notify billing department
      await this.notificationService.sendNotification({
        recipient_role: 'billing_clerk',
        title: 'Invoice Updated with Missing Charges',
        message: `Invoice ${invoice.invoice_number} updated. New total: ₹${invoice.total_amount}`,
        priority: 'medium'
      });
    }
  }
}
```

---

**Scenario 2: Incorrect Discharge (A13 Cancel Discharge)**

Patient was discharged but needs to be re-admitted same day.

**Implementation:**
```typescript
class CancelDischargeEventHandler {
  async handleCancelDischargeEvent(event: ADTCancelDischargeEvent) {
    // Step 1: Find discharged admission
    const admission = await this.admissionService.findByAdmissionId(
      event.admission.admission_id
    );

    if (!admission || admission.status !== 'discharged') {
      throw new Error('No discharged admission found');
    }

    // Step 2: Reopen admission
    await this.admissionService.cancelDischarge(admission.id, {
      cancelled_at: event.event_timestamp,
      cancelled_by_user_id: event.metadata.caused_by_user_id,
      cancellation_reason: event.cancellation_reason
    });

    // Step 3: Find invoice
    const invoice = await this.billingService.findIPDInvoice(admission.id);

    if (invoice.status === 'paid') {
      // Cannot reopen paid invoice - create new invoice for continued stay
      const newInvoice = await this.billingService.createInvoice({
        tenant_id: invoice.tenant_id,
        patient_id: invoice.patient_id,
        admission_id: admission.id,
        invoice_type: 'ipd_continued',
        status: 'draft',
        parent_invoice_id: invoice.id,
        notes: 'Discharge cancelled, continued stay'
      });

      // Resume room charges on new invoice
      await this.scheduleRecurringRoomCharges(admission.id, newInvoice.id);

    } else if (invoice.status === 'finalized') {
      // Revert invoice to draft to allow adding more charges
      await this.billingService.unfinalizeInvoice(invoice.id, {
        reason: 'Discharge cancelled via ADT A13 event',
        authorized_by_user_id: event.metadata.caused_by_user_id
      });

      // Resume room charges
      await this.scheduleRecurringRoomCharges(admission.id, invoice.id);
    }

    console.log(`Cancelled discharge for admission ${admission.admission_id}`);
  }
}
```

---

## C7. HIS Coexistence & Source of Truth

When MyMedic billing operates alongside an existing HIS billing system, clear rules must define **source of truth** for each data entity.

### C7.1 Source of Truth Matrix

| Data Entity | Source of Truth | MyMedic Role | Sync Direction |
|-------------|----------------|--------------|----------------|
| **Patient Demographics** | HIS | Read-only consumer | HIS → MyMedic |
| **Admission/Discharge/Transfer** | HIS | Event listener | HIS → MyMedic |
| **Bed/Ward Locations** | HIS | Read-only consumer | HIS → MyMedic |
| **Doctor/Staff Master** | HIS (or MyMedic) | Configurable | Bi-directional |
| **Charge Codes** | **MyMedic** | Master | MyMedic → HIS (export) |
| **Invoices (MyMedic departments)** | **MyMedic** | Master | MyMedic → HIS (export) |
| **Invoices (HIS departments)** | HIS | N/A | N/A |
| **Payments** | Configurable | Depends on mode | Bi-directional or HIS→MyMedic |

---

### C7.2 Conflict Resolution Strategies

**Conflict Type 1: Patient Demographic Mismatch**

**Scenario:** HIS sends ADT event with patient name "John Smith", but MyMedic has "Jonathan Smith" for same MRN.

**Resolution:**
```typescript
class PatientConflictResolver {
  async resolvePatientDemographicConflict(
    hisMRN: string,
    hisData: PatientDemographics,
    myMedicData: PatientDemographics
  ) {
    const config = await this.getConfig();

    if (config.patient_data_source_of_truth === 'HIS') {
      // HIS is source of truth - overwrite MyMedic data
      await this.patientService.update(myMedicData.id, {
        full_name: hisData.full_name,
        date_of_birth: hisData.date_of_birth,
        gender: hisData.gender,
        phone: hisData.phone,
        updated_by: 'adt_sync',
        updated_at: new Date()
      });

      await this.auditLog.log({
        action: 'patient_demographics_synced_from_his',
        patient_id: myMedicData.id,
        changes: this.diffObjects(myMedicData, hisData)
      });

    } else {
      // MyMedic is source of truth - log conflict but don't overwrite
      await this.conflictLog.log({
        conflict_type: 'patient_demographic_mismatch',
        mrn: hisMRN,
        his_data: hisData,
        mymedic_data: myMedicData,
        resolution: 'kept_mymedic_data',
        requires_review: true
      });

      await this.notifyDataSteward({
        title: 'Patient Data Conflict Detected',
        message: `MRN ${hisMRN}: HIS has "${hisData.full_name}", MyMedic has "${myMedicData.full_name}"`,
        action_required: 'review_and_resolve'
      });
    }
  }
}
```

---

**Conflict Type 2: Duplicate Admission IDs**

**Scenario:** HIS sends A01 (Admission) for admission ID "PA-2026-0045", but MyMedic already has this admission.

**Resolution:**
```typescript
class AdmissionConflictResolver {
  async resolveDuplicateAdmission(
    hisAdmission: ADTAdmissionEvent,
    existingAdmission: Admission
  ) {
    // Check if this is an exact duplicate (idempotency)
    const isIdempotent = this.isIdempotentEvent(hisAdmission, existingAdmission);

    if (isIdempotent) {
      // Exact duplicate - HIS likely retransmitted, acknowledge but don't process
      console.log(`Idempotent A01 event for admission ${hisAdmission.admission.admission_id}, skipping`);
      return { action: 'acknowledged', created: false };
    }

    // Not idempotent - data differs, likely HIS correction
    const hasSignificantChanges = this.hasSignificantChanges(hisAdmission, existingAdmission);

    if (hasSignificantChanges) {
      // Update existing admission with HIS data
      await this.admissionService.update(existingAdmission.id, {
        admission_datetime: hisAdmission.admission.admission_datetime,
        location: hisAdmission.admission.location,
        attending_doctor_id: hisAdmission.admission.attending_doctor_id,
        updated_by: 'adt_correction',
        updated_at: new Date()
      });

      await this.auditLog.log({
        action: 'admission_corrected_via_adt',
        admission_id: existingAdmission.id,
        changes: this.diffObjects(existingAdmission, hisAdmission)
      });

      return { action: 'updated', created: false };

    } else {
      // Conflict - log for manual review
      await this.conflictLog.log({
        conflict_type: 'duplicate_admission_id',
        admission_id: hisAdmission.admission.admission_id,
        his_data: hisAdmission,
        mymedic_data: existingAdmission,
        resolution: 'rejected',
        requires_review: true
      });

      throw new Error(`Duplicate admission ID ${hisAdmission.admission.admission_id} with conflicting data`);
    }
  }

  private isIdempotentEvent(
    hisEvent: ADTAdmissionEvent,
    existing: Admission
  ): boolean {
    return (
      hisEvent.patient.mrn === existing.patient_mrn &&
      hisEvent.admission.admission_datetime.getTime() === existing.admission_datetime.getTime() &&
      hisEvent.admission.location.bed === existing.location.bed
    );
  }
}
```

---

### C7.3 Data Reconciliation

**Daily Reconciliation Job:**

Compares HIS and MyMedic data to detect discrepancies.

```typescript
class ADTReconciliationService {
  async runDailyReconciliation(tenantId: string, date: Date) {
    const report = {
      date: date,
      discrepancies: [],
      stats: {
        total_admissions_his: 0,
        total_admissions_mymedic: 0,
        matched: 0,
        missing_in_mymedic: 0,
        missing_in_his: 0,
        data_mismatches: 0
      }
    };

    // Step 1: Fetch admissions from HIS for the date
    const hisAdmissions = await this.hisApiClient.getAdmissions(tenantId, date);
    report.stats.total_admissions_his = hisAdmissions.length;

    // Step 2: Fetch admissions from MyMedic for the date
    const myMedicAdmissions = await this.admissionService.getAdmissionsByDate(tenantId, date);
    report.stats.total_admissions_mymedic = myMedicAdmissions.length;

    // Step 3: Match by admission ID
    const hisAdmissionMap = new Map(hisAdmissions.map(a => [a.admission_id, a]));
    const myMedicAdmissionMap = new Map(myMedicAdmissions.map(a => [a.admission_id, a]));

    // Check for missing in MyMedic
    for (const [admissionId, hisAdm] of hisAdmissionMap) {
      if (!myMedicAdmissionMap.has(admissionId)) {
        report.discrepancies.push({
          type: 'missing_in_mymedic',
          admission_id: admissionId,
          his_data: hisAdm
        });
        report.stats.missing_in_mymedic++;
      }
    }

    // Check for missing in HIS (shouldn't happen if HIS is source of truth)
    for (const [admissionId, mmAdm] of myMedicAdmissionMap) {
      if (!hisAdmissionMap.has(admissionId)) {
        report.discrepancies.push({
          type: 'missing_in_his',
          admission_id: admissionId,
          mymedic_data: mmAdm
        });
        report.stats.missing_in_his++;
      }
    }

    // Check for data mismatches
    for (const [admissionId, hisAdm] of hisAdmissionMap) {
      const mmAdm = myMedicAdmissionMap.get(admissionId);
      if (mmAdm) {
        const mismatches = this.compareAdmissionData(hisAdm, mmAdm);
        if (mismatches.length > 0) {
          report.discrepancies.push({
            type: 'data_mismatch',
            admission_id: admissionId,
            fields: mismatches
          });
          report.stats.data_mismatches++;
        } else {
          report.stats.matched++;
        }
      }
    }

    // Step 4: Store reconciliation report
    await this.storeReconciliationReport(report);

    // Step 5: Alert if significant discrepancies
    if (report.stats.missing_in_mymedic > 5 || report.stats.data_mismatches > 10) {
      await this.notifyAdmin({
        title: 'ADT Reconciliation Issues Detected',
        message: `${report.stats.missing_in_mymedic} admissions missing in MyMedic, ${report.stats.data_mismatches} data mismatches`,
        severity: 'high',
        action_url: `/admin/reconciliation/${report.id}`
      });
    }

    return report;
  }

  private compareAdmissionData(hisAdm: any, mmAdm: Admission): string[] {
    const mismatches = [];

    if (hisAdm.patient_mrn !== mmAdm.patient_mrn) {
      mismatches.push('patient_mrn');
    }

    if (hisAdm.location.bed !== mmAdm.location.bed) {
      mismatches.push('bed');
    }

    if (Math.abs(hisAdm.admission_datetime - mmAdm.admission_datetime) > 60000) {
      // Allow 1 minute tolerance
      mismatches.push('admission_datetime');
    }

    return mismatches;
  }
}
```

---

### C7.4 Migration Path: HIS → MyMedic Billing

For organizations transitioning from HIS billing to MyMedic billing, a phased migration approach:

**Phase 1: Observation (1-2 months)**
- MyMedic runs in `export_only` mode
- Invoices generated in MyMedic but exported to HIS
- Payments still collected in HIS
- **Goal:** Validate invoice accuracy, train staff

**Phase 2: Hybrid (2-3 months)**
- Select 1-2 departments for full MyMedic billing (e.g., Radiology, Physiotherapy)
- Rest of hospital continues HIS billing
- **Goal:** Prove MyMedic billing works end-to-end

**Phase 3: Full Cutover (1 month)**
- All departments switch to MyMedic billing
- HIS billing disabled
- **Goal:** Complete migration

**Migration Checklist:**
```markdown
## Pre-Migration Checklist

### Data Setup
- [ ] All charge codes imported from HIS to MyMedic
- [ ] Tariff tables configured
- [ ] Department mappings complete
- [ ] User roles and permissions assigned

### Integration Testing
- [ ] ADT events flowing correctly (A01, A02, A03)
- [ ] Patient demographics syncing
- [ ] Room charges auto-adding on admission
- [ ] Invoice finalization on discharge

### User Training
- [ ] Billing staff trained on MyMedic UI
- [ ] Doctors trained on adding charges
- [ ] Receptionist trained on payment collection
- [ ] Finance team trained on reports

### Reconciliation
- [ ] Daily reconciliation job running
- [ ] Discrepancy alerts configured
- [ ] Backup/rollback plan documented

### Go-Live Support
- [ ] IT support on standby for first week
- [ ] Hotline for billing queries
- [ ] Daily review meetings scheduled
```

---

## Document Summary

This specification covers:

**Section A: Billing Technical Specification**
- 8 database tables (charge codes, invoices, payments, settlements, tariffs, packages)
- 10+ domain events for event sourcing
- 3 coexistence modes with HIS
- Pricing hierarchy (package → tariff → base → manual)
- Invoice state machine
- Reconciliation procedures

**Section B: UX Flows**
- OPD billing flow (7 steps, same-day settlement)
- IPD billing flow (7 steps, multi-day accrual)
- Actor permission matrix
- Exception handling (disputes, wrong charges, emergency discharge)
- UI mockups and empty states

**Section C: ADT Integration**
- 6 ADT event types (A01, A02, A03, A08, A11, A13)
- 3 transport methods (HL7 TCP/IP, REST API, SFTP)
- Validation rules and conflict resolution
- Failure handling with retry logic and dead letter queue
- **Billing interactions:** Admission → Create invoice, Transfer → Adjust charges, Discharge → Finalize invoice
- **HIS coexistence:** Source of truth rules, data reconciliation, migration path

---

**End of Specification**
