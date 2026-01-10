import { Router, Request, Response } from 'express';
import { db } from '../database/pool';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { commandBus } from '../event-sourcing/command-bus';
import { holdReleaseService } from '../services/hold-release-service';

const router = Router();

/**
 * GET /appointment-slots/availability
 * Search for available appointment slots
 * Public endpoint (no authentication required)
 */
router.get(
  '/availability',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const doctor_profile_id = req.query.doctor_profile_id as string;
    const location_id = req.query.location_id as string;
    const specialty = req.query.specialty as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const consultation_mode = req.query.consultation_mode as string;
    const hospitalId = req.get('X-Hospital-ID');

    const conditions: string[] = ['status = \'available\'', 'deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (hospitalId) {
      conditions.push(`hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    if (doctor_profile_id) {
      conditions.push(`doctor_profile_id = $${paramIndex++}`);
      params.push(doctor_profile_id);
    }

    if (location_id) {
      conditions.push(`location_id = $${paramIndex++}`);
      params.push(location_id);
    }

    if (specialty) {
      conditions.push(
        `doctor_profile_id IN (SELECT id FROM doctor_profiles WHERE specialties @> $${paramIndex++}::jsonb)`
      );
      params.push(JSON.stringify([specialty]));
    }

    if (start_date) {
      conditions.push(`slot_date >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`slot_date <= $${paramIndex++}`);
      params.push(end_date);
    }

    if (consultation_mode) {
      conditions.push(`consultation_mode = $${paramIndex++}`);
      params.push(consultation_mode);
    }

    // Only show slots with available capacity
    conditions.push(`current_bookings < max_capacity`);

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(
      `SELECT
        s.*,
        dp.display_name as doctor_name,
        dp.specialties,
        dp.consultation_fee,
        dp.profile_image_url,
        l.name as location_name,
        l.address as location_address
      FROM appointment_slots s
      LEFT JOIN doctor_profiles dp ON dp.id = s.doctor_profile_id
      LEFT JOIN locations l ON l.id = s.location_id
      ${whereClause}
      ORDER BY s.slot_date ASC, s.start_time ASC
      LIMIT 100`,
      params
    );

    res.json({ data: result.rows });
  })
);

/**
 * GET /appointment-slots/:id
 * Get a specific appointment slot
 */
router.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        s.*,
        dp.display_name as doctor_name,
        dp.specialties,
        dp.consultation_fee,
        dp.profile_image_url,
        l.name as location_name,
        l.address as location_address
      FROM appointment_slots s
      LEFT JOIN doctor_profiles dp ON dp.id = s.doctor_profile_id
      LEFT JOIN locations l ON l.id = s.location_id
      WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'SLOT_NOT_FOUND', message: 'Appointment slot not found' },
      });
    }

    res.json(result.rows[0]);
  })
);

/**
 * POST /appointment-slots/:id/hold
 * Create a tentative hold on a slot
 */
router.post(
  '/:id/hold',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const hospitalId = req.get('X-Hospital-ID');
    const userId = (req as any).user?.id;

    if (!hospitalId) {
      return res.status(400).json({
        error: { code: 'MISSING_HOSPITAL_ID', message: 'Hospital ID is required' },
      });
    }

    // Check if slot is available
    const isAvailable = await holdReleaseService.isSlotAvailable(id);
    if (!isAvailable) {
      return res.status(409).json({
        error: { code: 'SLOT_ALREADY_HELD', message: 'Slot is currently held by another user' },
      });
    }

    const result = await commandBus.handle({
      command_type: 'create-tentative-hold',
      command_id: crypto.randomUUID(),
      payload: {
        slot_id: id,
        ...req.body,
      },
      metadata: {
        hospital_id: hospitalId,
        user_id: userId,
        client_ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
      idempotency_key: req.get('Idempotency-Key'),
    });

    res.status(201).json({
      hold_id: result.aggregate_id,
      version: result.aggregate_version,
    });
  })
);

/**
 * DELETE /appointment-slots/:id/hold
 * Release a tentative hold on a slot
 */
router.delete(
  '/:id/hold',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: slotId } = req.params;
    const hospitalId = req.get('X-Hospital-ID');
    const userId = (req as any).user?.id;

    if (!hospitalId) {
      return res.status(400).json({
        error: { code: 'MISSING_HOSPITAL_ID', message: 'Hospital ID is required' },
      });
    }

    // Find active hold for this slot by this user
    const holdResult = await db.query(
      `SELECT * FROM tentative_holds
       WHERE slot_id = $1
         AND held_by = $2
         AND status = 'active'
         AND expires_at > NOW()
         AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [slotId, userId]
    );

    if (holdResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'HOLD_NOT_FOUND', message: 'No active hold found for this slot' },
      });
    }

    const hold = holdResult.rows[0];

    const result = await commandBus.handle({
      command_type: 'release-tentative-hold',
      command_id: crypto.randomUUID(),
      payload: {
        hold_id: hold.id,
        release_reason: 'user_cancelled',
        notes: req.body.notes,
      },
      metadata: {
        hospital_id: hospitalId,
        user_id: userId,
        client_ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
      idempotency_key: req.get('Idempotency-Key'),
    });

    res.json({
      hold_id: result.aggregate_id,
      version: result.aggregate_version,
    });
  })
);

/**
 * POST /appointment-slots/:id/block
 * Block a specific slot (admin only)
 */
router.post(
  '/:id/block',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const hospitalId = req.get('X-Hospital-ID');
    const userId = (req as any).user?.id;

    if (!hospitalId) {
      return res.status(400).json({
        error: { code: 'MISSING_HOSPITAL_ID', message: 'Hospital ID is required' },
      });
    }

    const result = await commandBus.handle({
      command_type: 'block-slot',
      command_id: crypto.randomUUID(),
      payload: {
        slot_id: id,
        ...req.body,
      },
      metadata: {
        hospital_id: hospitalId,
        user_id: userId,
        client_ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
      idempotency_key: req.get('Idempotency-Key'),
    });

    res.json({
      slot_id: result.aggregate_id,
      version: result.aggregate_version,
    });
  })
);

export default router;
