import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { EventStore } from '../event-sourcing/EventStore';
import { logger } from '../utils/logger';

export interface ReceivePaymentCommand {
  hospital_id: string;
  patient_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'insurance';
  reference_number?: string;
  card_last_4?: string;
  upi_transaction_id?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_name?: string;
  notes?: string;
  invoice_ids?: string[]; // Invoices to allocate payment to
  user_id: string;
}

export async function receivePayment(
  db: Pool,
  eventStore: EventStore,
  command: ReceivePaymentCommand
): Promise<string> {
  const {
    hospital_id,
    patient_id,
    amount,
    payment_method,
    reference_number,
    card_last_4,
    upi_transaction_id,
    cheque_number,
    cheque_date,
    bank_name,
    notes,
    invoice_ids = [],
    user_id
  } = command;

  // Validate required fields
  if (!hospital_id || !patient_id || !amount || !payment_method) {
    throw new Error('Missing required fields: hospital_id, patient_id, amount, payment_method');
  }

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  // Verify patient exists
  const patientCheck = await db.query(
    `SELECT id FROM patients WHERE id = $1 AND hospital_id = $2 AND deleted_at IS NULL`,
    [patient_id, hospital_id]
  );

  if (patientCheck.rows.length === 0) {
    throw new Error(`Patient ${patient_id} not found or deleted`);
  }

  const paymentId = uuidv4();

  // Generate payment number
  const paymentNumberResult = await db.query(
    `SELECT COUNT(*) as count FROM payments WHERE hospital_id = $1`,
    [hospital_id]
  );
  const paymentCount = parseInt(paymentNumberResult.rows[0].count) + 1;
  const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount).padStart(5, '0')}`;

  // Append payment_received event
  await eventStore.appendEvent({
    aggregate_type: 'payment',
    aggregate_id: paymentId,
    event_type: 'payment_received',
    event_data: {
      hospital_id,
      patient_id,
      payment_number: paymentNumber,
      amount,
      payment_method,
      reference_number,
      card_last_4,
      upi_transaction_id,
      cheque_number,
      cheque_date,
      bank_name,
      notes
    },
    hospital_id,
    caused_by_user_id: user_id,
    caused_by_command: 'ReceivePayment'
  });

  logger.info(`Payment received: ${paymentNumber} (${paymentId}) - ${amount} ${payment_method}`);

  // If invoice_ids provided, allocate payment to invoices
  if (invoice_ids.length > 0) {
    let remainingAmount = amount;

    for (const invoiceId of invoice_ids) {
      if (remainingAmount <= 0) break;

      // Get invoice outstanding amount
      const invoiceResult = await db.query(
        `SELECT outstanding_amount FROM invoices WHERE id = $1 AND hospital_id = $2`,
        [invoiceId, hospital_id]
      );

      if (invoiceResult.rows.length === 0) {
        logger.warn(`Invoice ${invoiceId} not found, skipping allocation`);
        continue;
      }

      const outstandingAmount = parseFloat(invoiceResult.rows[0].outstanding_amount);

      if (outstandingAmount <= 0) {
        logger.info(`Invoice ${invoiceId} already fully paid, skipping`);
        continue;
      }

      // Allocate the minimum of remaining payment or outstanding amount
      const allocationAmount = Math.min(remainingAmount, outstandingAmount);

      // Emit payment_allocated event
      await eventStore.appendEvent({
        aggregate_type: 'payment',
        aggregate_id: paymentId,
        event_type: 'payment_allocated',
        event_data: {
          invoice_id: invoiceId,
          allocated_amount: allocationAmount
        },
        hospital_id,
        caused_by_user_id: user_id,
        caused_by_command: 'AllocatePayment'
      });

      logger.info(`Allocated ${allocationAmount} from payment ${paymentId} to invoice ${invoiceId}`);

      remainingAmount -= allocationAmount;
    }

    if (remainingAmount > 0) {
      logger.info(`Unallocated payment amount: ${remainingAmount} (credit balance for patient)`);
    }
  }

  return paymentId;
}
