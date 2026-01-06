import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate, optionalAuthenticate } from "../middleware/auth";

const router = Router();

// Patient query endpoints require authentication
router.use(authenticate);

/**
 * GET /patients/:id
 *
 * Get a single patient by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        mrn,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        email,
        whatsapp_phone,
        whatsapp_opted_in,
        address,
        current_version,
        last_event_id,
        created_at,
        updated_at
      FROM patients
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "PATIENT_NOT_FOUND",
          message: "Patient not found",
        },
      });
    }

    const patient = result.rows[0];

    return res.json(patient);
  })
);

/**
 * GET /patients
 *
 * List patients with pagination and filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitalId = req.get("X-Hospital-ID");
    const search = req.query.search as string;

    // Build query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by hospital (if provided)
    if (hospitalId) {
      conditions.push(`hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    // Search by name or MRN (if provided)
    if (search) {
      conditions.push(`(
        mrn ILIKE $${paramIndex} OR
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM patients ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get patients
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        mrn,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        email,
        current_version,
        created_at,
        updated_at
      FROM patients
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    res.json({
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  })
);

/**
 * GET /patients/:id/timeline
 *
 * Get patient event timeline
 */
router.get(
  "/:id/timeline",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    // Get events for this patient
    const result = await db.query(
      `SELECT
        event_id,
        event_type,
        event_schema_version,
        aggregate_version,
        event_data,
        event_metadata,
        event_timestamp,
        hospital_id
      FROM event_store
      WHERE aggregate_id = $1 AND aggregate_type = 'patient'
      ORDER BY event_number DESC
      LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total
       FROM event_store
       WHERE aggregate_id = $1 AND aggregate_type = 'patient'`,
      [id]
    );
    const total = parseInt(countResult.rows[0].total);

    res.json({
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    });
  })
);

export default router;
