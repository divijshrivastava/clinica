import { Router, Request, Response } from 'express';
import { db } from '../database/pool';
import { asyncHandler } from '../middleware/error-handler';
import { authenticate } from '../middleware/auth';
import { commandBus } from '../event-sourcing/command-bus';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /doctor-schedules
 * Create a base schedule for a doctor
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const hospitalId = req.get('X-Hospital-ID');
    const userId = (req as any).user?.id;

    if (!hospitalId) {
      return res.status(400).json({
        error: { code: 'MISSING_HOSPITAL_ID', message: 'Hospital ID is required' },
      });
    }

    const result = await commandBus.execute({
      command_type: 'create-base-schedule',
      command_id: crypto.randomUUID(),
      payload: req.body,
      metadata: {
        hospital_id: hospitalId,
        user_id: userId,
        client_ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
      idempotency_key: req.get('Idempotency-Key'),
    });

    res.status(201).json({
      schedule_id: result.aggregate_id,
      version: result.aggregate_version,
    });
  })
);

/**
 * GET /doctor-schedules
 * List schedules for a doctor
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const doctor_profile_id = req.query.doctor_profile_id as string;
    const location_id = req.query.location_id as string;
    const hospitalId = req.get('X-Hospital-ID');

    if (!doctor_profile_id) {
      return res.status(400).json({
        error: { code: 'MISSING_DOCTOR_ID', message: 'doctor_profile_id query parameter is required' },
      });
    }

    const conditions: string[] = ['deleted_at IS NULL', 'is_active = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    conditions.push(`doctor_profile_id = $${paramIndex++}`);
    params.push(doctor_profile_id);

    if (hospitalId) {
      conditions.push(`hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    if (location_id) {
      conditions.push(`location_id = $${paramIndex++}`);
      params.push(location_id);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(
      `SELECT * FROM doctor_schedules
       ${whereClause}
       ORDER BY day_of_week ASC, start_time ASC`,
      params
    );

    res.json({ data: result.rows });
  })
);

/**
 * GET /doctor-schedules/:id
 * Get a specific schedule
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM doctor_schedules WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found' },
      });
    }

    res.json(result.rows[0]);
  })
);

/**
 * POST /doctor-schedules/overrides
 * Add a schedule override for a specific date
 */
router.post(
  '/overrides',
  asyncHandler(async (req: Request, res: Response) => {
    const hospitalId = req.get('X-Hospital-ID');
    const userId = (req as any).user?.id;

    if (!hospitalId) {
      return res.status(400).json({
        error: { code: 'MISSING_HOSPITAL_ID', message: 'Hospital ID is required' },
      });
    }

    const result = await commandBus.execute({
      command_type: 'add-schedule-override',
      command_id: crypto.randomUUID(),
      payload: req.body,
      metadata: {
        hospital_id: hospitalId,
        user_id: userId,
        client_ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
      idempotency_key: req.get('Idempotency-Key'),
    });

    res.status(201).json({
      override_id: result.aggregate_id,
      version: result.aggregate_version,
    });
  })
);

/**
 * GET /doctor-schedules/overrides
 * List schedule overrides for a doctor
 */
router.get(
  '/overrides',
  asyncHandler(async (req: Request, res: Response) => {
    const doctor_profile_id = req.query.doctor_profile_id as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const hospitalId = req.get('X-Hospital-ID');

    if (!doctor_profile_id) {
      return res.status(400).json({
        error: { code: 'MISSING_DOCTOR_ID', message: 'doctor_profile_id query parameter is required' },
      });
    }

    const conditions: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    conditions.push(`doctor_profile_id = $${paramIndex++}`);
    params.push(doctor_profile_id);

    if (hospitalId) {
      conditions.push(`hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    if (start_date) {
      conditions.push(`override_date >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`override_date <= $${paramIndex++}`);
      params.push(end_date);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(
      `SELECT * FROM schedule_overrides
       ${whereClause}
       ORDER BY override_date ASC`,
      params
    );

    res.json({ data: result.rows });
  })
);

/**
 * POST /doctor-schedules/forced-blocks
 * Add a forced block (admin-only unavailability)
 */
router.post(
  '/forced-blocks',
  asyncHandler(async (req: Request, res: Response) => {
    const hospitalId = req.get('X-Hospital-ID');
    const userId = (req as any).user?.id;

    if (!hospitalId) {
      return res.status(400).json({
        error: { code: 'MISSING_HOSPITAL_ID', message: 'Hospital ID is required' },
      });
    }

    const result = await commandBus.execute({
      command_type: 'add-forced-block',
      command_id: crypto.randomUUID(),
      payload: req.body,
      metadata: {
        hospital_id: hospitalId,
        user_id: userId,
        client_ip: req.ip,
        user_agent: req.get('User-Agent'),
      },
      idempotency_key: req.get('Idempotency-Key'),
    });

    res.status(201).json({
      block_id: result.aggregate_id,
      version: result.aggregate_version,
    });
  })
);

export default router;
