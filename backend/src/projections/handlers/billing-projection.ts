import { Pool } from 'pg';
import { logger } from '../../utils/logger';

interface Event {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  aggregate_version: number;
  event_data: any;
  hospital_id: string;
  caused_by_user_id: string | null;
  event_timestamp: Date;
}

export class BillingProjectionHandler {
  constructor(private db: Pool) {}

  async handleEvent(event: Event): Promise<void> {
    try {
      switch (event.event_type) {
        case 'charge_code_created':
          await this.handleChargeCodeCreated(event);
          break;

        case 'charge_code_updated':
          await this.handleChargeCodeUpdated(event);
          break;

        case 'charge_code_deactivated':
          await this.handleChargeCodeDeactivated(event);
          break;

        case 'invoice_created':
          await this.handleInvoiceCreated(event);
          break;

        case 'invoice_item_added':
          await this.handleInvoiceItemAdded(event);
          break;

        case 'invoice_finalized':
          await this.handleInvoiceFinalized(event);
          break;

        case 'invoice_cancelled':
          await this.handleInvoiceCancelled(event);
          break;

        case 'payment_received':
          await this.handlePaymentReceived(event);
          break;

        case 'payment_allocated':
          await this.handlePaymentAllocated(event);
          break;

        default:
          // Event not handled by this projection
          return;
      }

      logger.info(`Billing projection handled event: ${event.event_type} (${event.event_id})`);
    } catch (error) {
      logger.error(`Failed to handle billing event ${event.event_id}:`, error);
      throw error;
    }
  }

  private async handleChargeCodeCreated(event: Event): Promise<void> {
    const data = event.event_data;

    await this.db.query(
      `INSERT INTO charge_codes (
        id, current_version, hospital_id, code, display_name, description,
        category, department_id, service_type, base_price, currency, unit,
        is_taxable, tax_rate, effective_from, effective_until, is_active,
        created_at, updated_at, last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )`,
      [
        event.aggregate_id,
        event.aggregate_version,
        event.hospital_id,
        data.code,
        data.display_name,
        data.description,
        data.category,
        data.department_id,
        data.service_type || 'BOTH',
        data.base_price,
        data.currency || 'INR',
        data.unit || 'per_service',
        data.is_taxable || false,
        data.tax_rate || 0,
        data.effective_from,
        data.effective_until,
        true,
        event.event_timestamp,
        event.event_timestamp,
        event.event_id
      ]
    );
  }

  private async handleChargeCodeUpdated(event: Event): Promise<void> {
    const data = event.event_data;

    await this.db.query(
      `UPDATE charge_codes SET
        current_version = $1,
        display_name = COALESCE($2, display_name),
        description = COALESCE($3, description),
        base_price = COALESCE($4, base_price),
        tax_rate = COALESCE($5, tax_rate),
        is_taxable = COALESCE($6, is_taxable),
        updated_at = $7,
        last_event_id = $8
       WHERE id = $9`,
      [
        event.aggregate_version,
        data.display_name,
        data.description,
        data.base_price,
        data.tax_rate,
        data.is_taxable,
        event.event_timestamp,
        event.event_id,
        event.aggregate_id
      ]
    );
  }

  private async handleChargeCodeDeactivated(event: Event): Promise<void> {
    await this.db.query(
      `UPDATE charge_codes SET
        current_version = $1,
        is_active = false,
        updated_at = $2,
        last_event_id = $3
       WHERE id = $4`,
      [event.aggregate_version, event.event_timestamp, event.event_id, event.aggregate_id]
    );
  }

  private async handleInvoiceCreated(event: Event): Promise<void> {
    const data = event.event_data;

    // Insert invoice
    await this.db.query(
      `INSERT INTO invoices (
        id, current_version, hospital_id, patient_id, invoice_number, invoice_date,
        visit_id, admission_id, tariff_id, package_id,
        subtotal, discount_amount, discount_reason, tax_amount, total_amount,
        paid_amount, outstanding_amount, status, due_date, notes,
        created_at, created_by, updated_at, last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, CURRENT_DATE,
        $6, $7, $8, $9,
        $10, $11, $12, $13, $14,
        0, $14, 'draft', $15, $16,
        $17, $18, $17, $19
      )`,
      [
        event.aggregate_id,
        event.aggregate_version,
        event.hospital_id,
        data.patient_id,
        data.invoice_number,
        data.visit_id,
        data.admission_id,
        data.tariff_id,
        data.package_id,
        data.subtotal,
        data.discount_amount || 0,
        data.discount_reason,
        data.tax_amount,
        data.total_amount,
        data.due_date,
        data.notes,
        event.event_timestamp,
        event.caused_by_user_id,
        event.event_id
      ]
    );

    // Insert line items
    if (data.line_items && Array.isArray(data.line_items)) {
      for (const item of data.line_items) {
        await this.db.query(
          `INSERT INTO invoice_line_items (
            invoice_id, charge_code_id, line_number, description,
            quantity, unit_price, discount_percentage, discount_amount,
            tax_rate, tax_amount, line_total, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            event.aggregate_id,
            item.charge_code_id,
            item.line_number,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount_percentage,
            item.discount_amount,
            item.tax_rate,
            item.tax_amount,
            item.line_total,
            event.event_timestamp
          ]
        );
      }
    }
  }

  private async handleInvoiceItemAdded(event: Event): Promise<void> {
    const data = event.event_data;

    await this.db.query(
      `INSERT INTO invoice_line_items (
        invoice_id, charge_code_id, line_number, description,
        quantity, unit_price, discount_percentage, discount_amount,
        tax_rate, tax_amount, line_total, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        event.aggregate_id,
        data.charge_code_id,
        data.line_number,
        data.description,
        data.quantity,
        data.unit_price,
        data.discount_percentage || 0,
        data.discount_amount || 0,
        data.tax_rate || 0,
        data.tax_amount || 0,
        data.line_total,
        event.event_timestamp
      ]
    );

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(event.aggregate_id);
  }

  private async handleInvoiceFinalized(event: Event): Promise<void> {
    await this.db.query(
      `UPDATE invoices SET
        current_version = $1,
        status = 'finalized',
        finalized_at = $2,
        finalized_by = $3,
        outstanding_amount = total_amount,
        updated_at = $2,
        last_event_id = $4
       WHERE id = $5`,
      [
        event.aggregate_version,
        event.event_timestamp,
        event.caused_by_user_id,
        event.event_id,
        event.aggregate_id
      ]
    );
  }

  private async handleInvoiceCancelled(event: Event): Promise<void> {
    const data = event.event_data;

    await this.db.query(
      `UPDATE invoices SET
        current_version = $1,
        status = 'cancelled',
        cancelled_at = $2,
        cancellation_reason = $3,
        updated_at = $2,
        last_event_id = $4
       WHERE id = $5`,
      [
        event.aggregate_version,
        event.event_timestamp,
        data.reason,
        event.event_id,
        event.aggregate_id
      ]
    );
  }

  private async handlePaymentReceived(event: Event): Promise<void> {
    const data = event.event_data;

    await this.db.query(
      `INSERT INTO payments (
        id, current_version, hospital_id, patient_id, payment_number,
        payment_date, payment_time, amount, payment_method,
        reference_number, card_last_4, upi_transaction_id,
        cheque_number, cheque_date, bank_name, status, notes,
        received_by, created_at, updated_at, last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, 'received', $15,
        $16, $6, $6, $17
      )`,
      [
        event.aggregate_id,
        event.aggregate_version,
        event.hospital_id,
        data.patient_id,
        data.payment_number,
        event.event_timestamp,
        data.amount,
        data.payment_method,
        data.reference_number,
        data.card_last_4,
        data.upi_transaction_id,
        data.cheque_number,
        data.cheque_date,
        data.bank_name,
        data.notes,
        event.caused_by_user_id,
        event.event_id
      ]
    );
  }

  private async handlePaymentAllocated(event: Event): Promise<void> {
    const data = event.event_data;

    // Create settlement record
    await this.db.query(
      `INSERT INTO payment_settlements (
        payment_id, invoice_id, allocated_amount, settlement_date,
        created_at, created_by
      ) VALUES ($1, $2, $3, $4, $4, $5)`,
      [
        event.aggregate_id,
        data.invoice_id,
        data.allocated_amount,
        event.event_timestamp,
        event.caused_by_user_id
      ]
    );

    // Update invoice paid_amount and outstanding_amount
    await this.db.query(
      `UPDATE invoices SET
        paid_amount = paid_amount + $1,
        outstanding_amount = outstanding_amount - $1,
        status = CASE
          WHEN outstanding_amount - $1 <= 0 THEN 'paid'
          WHEN paid_amount > 0 THEN 'partially_paid'
          ELSE status
        END,
        paid_at = CASE
          WHEN outstanding_amount - $1 <= 0 THEN $2
          ELSE paid_at
        END,
        updated_at = $2
       WHERE id = $3`,
      [data.allocated_amount, event.event_timestamp, data.invoice_id]
    );
  }

  private async recalculateInvoiceTotals(invoiceId: string): Promise<void> {
    // Recalculate totals from line items
    const result = await this.db.query(
      `SELECT
        SUM(quantity * unit_price) as subtotal,
        SUM(discount_amount) as total_discount,
        SUM(tax_amount) as total_tax,
        SUM(line_total) as total
       FROM invoice_line_items
       WHERE invoice_id = $1`,
      [invoiceId]
    );

    if (result.rows.length > 0) {
      const totals = result.rows[0];
      await this.db.query(
        `UPDATE invoices SET
          subtotal = $1,
          tax_amount = $2,
          total_amount = $3,
          outstanding_amount = $3 - paid_amount,
          updated_at = NOW()
         WHERE id = $4`,
        [totals.subtotal, totals.total_tax, totals.total, invoiceId]
      );
    }
  }
}
