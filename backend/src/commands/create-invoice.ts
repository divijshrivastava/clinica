import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { EventStore } from '../event-sourcing/EventStore';
import { logger } from '../utils/logger';

export interface InvoiceLineItem {
  charge_code_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  tax_rate?: number;
}

export interface CreateInvoiceCommand {
  hospital_id: string;
  patient_id: string;
  visit_id?: string;
  admission_id?: string;
  tariff_id?: string;
  package_id?: string;
  line_items: InvoiceLineItem[];
  discount_amount?: number;
  discount_reason?: string;
  due_date?: string;
  notes?: string;
  user_id: string;
}

export async function createInvoice(
  db: Pool,
  eventStore: EventStore,
  command: CreateInvoiceCommand
): Promise<string> {
  const {
    hospital_id,
    patient_id,
    visit_id,
    admission_id,
    tariff_id,
    package_id,
    line_items,
    discount_amount = 0,
    discount_reason,
    due_date,
    notes,
    user_id
  } = command;

  // Validate required fields
  if (!hospital_id || !patient_id || !line_items || line_items.length === 0) {
    throw new Error('Missing required fields: hospital_id, patient_id, line_items');
  }

  // Verify patient exists
  const patientCheck = await db.query(
    `SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND deleted_at IS NULL`,
    [patient_id, hospital_id]
  );

  if (patientCheck.rows.length === 0) {
    throw new Error(`Patient ${patient_id} not found or deleted`);
  }

  const invoiceId = uuidv4();

  // Generate invoice number
  const invoiceNumberResult = await db.query(
    `SELECT COUNT(*) as count FROM invoices WHERE hospital_id = $1`,
    [hospital_id]
  );
  const invoiceCount = parseInt(invoiceNumberResult.rows[0].count) + 1;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount).padStart(5, '0')}`;

  // Calculate totals
  let subtotal = 0;
  const processedLineItems = line_items.map((item, index) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const discountAmount = (item.discount_percentage || 0) * lineSubtotal / 100;
    const taxableAmount = lineSubtotal - discountAmount;
    const taxAmount = (item.tax_rate || 0) * taxableAmount / 100;
    const lineTotal = taxableAmount + taxAmount;

    subtotal += lineSubtotal;

    return {
      line_number: index + 1,
      charge_code_id: item.charge_code_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage || 0,
      discount_amount: discountAmount,
      tax_rate: item.tax_rate || 0,
      tax_amount: taxAmount,
      line_total: lineTotal
    };
  });

  const totalDiscountAmount = discount_amount;
  const taxAmount = processedLineItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const totalAmount = subtotal - totalDiscountAmount + taxAmount;

  // Append event to event store
  await eventStore.appendEvent({
    aggregate_type: 'invoice',
    aggregate_id: invoiceId,
    event_type: 'invoice_created',
    event_data: {
      hospital_id,
      patient_id,
      invoice_number: invoiceNumber,
      visit_id,
      admission_id,
      tariff_id,
      package_id,
      subtotal,
      discount_amount: totalDiscountAmount,
      discount_reason,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      due_date,
      notes,
      line_items: processedLineItems
    },
    hospital_id,
    caused_by_user_id: user_id,
    caused_by_command: 'CreateInvoice'
  });

  logger.info(`Invoice created: ${invoiceNumber} (${invoiceId}) for patient ${patient_id}`);

  return invoiceId;
}
