import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EventStore } from '../event-sourcing/EventStore';
import { createChargeCode } from '../commands/create-charge-code';
import { createInvoice } from '../commands/create-invoice';
import { receivePayment } from '../commands/receive-payment';
import { logger } from '../utils/logger';

const router = Router();

let db: Pool;
let eventStore: EventStore;

export function initBillingRoutes(database: Pool, store: EventStore) {
  db = database;
  eventStore = store;
  return router;
}

// ============================================
// CHARGE CODES ROUTES
// ============================================

// GET /api/billing/charge-codes - List all charge codes
router.get('/charge-codes', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const { category, is_active = 'true' } = req.query;

    let query = `
      SELECT id, code, display_name, description, category,
             service_type, base_price, currency, unit,
             is_taxable, tax_rate, is_active, effective_from, effective_until
      FROM charge_codes
      WHERE hospital_id = $1
    `;
    const params: any[] = [hospital_id];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (is_active === 'true') {
      query += ` AND is_active = true`;
    }

    query += ` ORDER BY category, display_name`;

    const result = await db.query(query, params);

    res.status(200).json({
      charge_codes: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Failed to list charge codes:', error);
    res.status(500).json({ error: 'Failed to list charge codes' });
  }
});

// POST /api/billing/charge-codes - Create new charge code
router.post('/charge-codes', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const user_id = (req as any).user?.id;

    const chargeCodeId = await createChargeCode(db, eventStore, {
      hospital_id,
      user_id,
      ...req.body
    });

    res.status(201).json({
      message: 'Charge code created',
      charge_code_id: chargeCodeId
    });
  } catch (error: any) {
    logger.error('Failed to create charge code:', error);
    res.status(400).json({ error: error.message || 'Failed to create charge code' });
  }
});

// GET /api/billing/charge-codes/:id - Get charge code by ID
router.get('/charge-codes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hospital_id = (req as any).user?.hospital_id;

    const result = await db.query(
      `SELECT * FROM charge_codes WHERE id = $1 AND hospital_id = $2`,
      [id, hospital_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Charge code not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to get charge code:', error);
    res.status(500).json({ error: 'Failed to get charge code' });
  }
});

// ============================================
// INVOICES ROUTES
// ============================================

// GET /api/billing/invoices - List all invoices
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const { patient_id, status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.id, i.invoice_number, i.invoice_date, i.patient_id,
             p.first_name, p.last_name, p.phone,
             i.total_amount, i.paid_amount, i.outstanding_amount,
             i.status, i.due_date, i.created_at
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      WHERE i.hospital_id = $1
    `;
    const params: any[] = [hospital_id];
    let paramIndex = 2;

    if (patient_id) {
      query += ` AND i.patient_id = $${paramIndex}`;
      params.push(patient_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await db.query(query, params);

    res.status(200).json({
      invoices: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Failed to list invoices:', error);
    res.status(500).json({ error: 'Failed to list invoices' });
  }
});

// POST /api/billing/invoices - Create new invoice
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const user_id = (req as any).user?.id;

    const invoiceId = await createInvoice(db, eventStore, {
      hospital_id,
      user_id,
      ...req.body
    });

    res.status(201).json({
      message: 'Invoice created',
      invoice_id: invoiceId
    });
  } catch (error: any) {
    logger.error('Failed to create invoice:', error);
    res.status(400).json({ error: error.message || 'Failed to create invoice' });
  }
});

// GET /api/billing/invoices/:id - Get invoice by ID
router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hospital_id = (req as any).user?.hospital_id;

    const invoiceResult = await db.query(
      `SELECT i.*, p.first_name, p.last_name, p.phone, p.email
       FROM invoices i
       JOIN patients p ON p.id = i.patient_id
       WHERE i.id = $1 AND i.hospital_id = $2`,
      [id, hospital_id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceResult.rows[0];

    // Get line items
    const itemsResult = await db.query(
      `SELECT il.*, cc.display_name as charge_code_name
       FROM invoice_line_items il
       JOIN charge_codes cc ON cc.id = il.charge_code_id
       WHERE il.invoice_id = $1
       ORDER BY il.line_number`,
      [id]
    );

    invoice.line_items = itemsResult.rows;

    // Get payment settlements
    const settlementsResult = await db.query(
      `SELECT ps.*, p.payment_number, p.payment_date, p.payment_method
       FROM payment_settlements ps
       JOIN payments p ON p.id = ps.payment_id
       WHERE ps.invoice_id = $1
       ORDER BY ps.settlement_date DESC`,
      [id]
    );

    invoice.settlements = settlementsResult.rows;

    res.status(200).json(invoice);
  } catch (error) {
    logger.error('Failed to get invoice:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

// ============================================
// PAYMENTS ROUTES
// ============================================

// GET /api/billing/payments - List all payments
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const { patient_id, payment_method, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT pm.id, pm.payment_number, pm.payment_date, pm.amount,
             pm.payment_method, pm.status, pm.reference_number,
             p.first_name, p.last_name, p.phone
      FROM payments pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE pm.hospital_id = $1
    `;
    const params: any[] = [hospital_id];
    let paramIndex = 2;

    if (patient_id) {
      query += ` AND pm.patient_id = $${paramIndex}`;
      params.push(patient_id);
      paramIndex++;
    }

    if (payment_method) {
      query += ` AND pm.payment_method = $${paramIndex}`;
      params.push(payment_method);
      paramIndex++;
    }

    query += ` ORDER BY pm.payment_date DESC, pm.payment_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await db.query(query, params);

    res.status(200).json({
      payments: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Failed to list payments:', error);
    res.status(500).json({ error: 'Failed to list payments' });
  }
});

// POST /api/billing/payments - Record new payment
router.post('/payments', async (req: Request, res: Response) => {
  try {
    const hospital_id = (req as any).user?.hospital_id;
    const user_id = (req as any).user?.id;

    const paymentId = await receivePayment(db, eventStore, {
      hospital_id,
      user_id,
      ...req.body
    });

    res.status(201).json({
      message: 'Payment recorded',
      payment_id: paymentId
    });
  } catch (error: any) {
    logger.error('Failed to record payment:', error);
    res.status(400).json({ error: error.message || 'Failed to record payment' });
  }
});

// GET /api/billing/payments/:id - Get payment by ID
router.get('/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hospital_id = (req as any).user?.hospital_id;

    const paymentResult = await db.query(
      `SELECT pm.*, p.first_name, p.last_name, p.phone
       FROM payments pm
       JOIN patients p ON p.id = pm.patient_id
       WHERE pm.id = $1 AND pm.hospital_id = $2`,
      [id, hospital_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Get settlements (allocations to invoices)
    const settlementsResult = await db.query(
      `SELECT ps.*, i.invoice_number
       FROM payment_settlements ps
       JOIN invoices i ON i.id = ps.invoice_id
       WHERE ps.payment_id = $1
       ORDER BY ps.settlement_date`,
      [id]
    );

    payment.settlements = settlementsResult.rows;

    res.status(200).json(payment);
  } catch (error) {
    logger.error('Failed to get payment:', error);
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

// ============================================
// PATIENT BILLING SUMMARY
// ============================================

// GET /api/billing/patients/:patientId/summary - Get patient billing summary
router.get('/patients/:patientId/summary', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const hospital_id = (req as any).user?.hospital_id;

    // Get outstanding invoices
    const invoicesResult = await db.query(
      `SELECT COUNT(*) as count, SUM(outstanding_amount) as total_outstanding
       FROM invoices
       WHERE patient_id = $1 AND hospital_id = $2 AND outstanding_amount > 0`,
      [patientId, hospital_id]
    );

    // Get total paid
    const paymentsResult = await db.query(
      `SELECT SUM(amount) as total_paid
       FROM payments
       WHERE patient_id = $1 AND hospital_id = $2 AND status != 'refunded'`,
      [patientId, hospital_id]
    );

    res.status(200).json({
      patient_id: patientId,
      outstanding_invoices: parseInt(invoicesResult.rows[0].count),
      total_outstanding: parseFloat(invoicesResult.rows[0].total_outstanding || 0),
      total_paid: parseFloat(paymentsResult.rows[0].total_paid || 0)
    });
  } catch (error) {
    logger.error('Failed to get patient billing summary:', error);
    res.status(500).json({ error: 'Failed to get patient billing summary' });
  }
});

export default router;
