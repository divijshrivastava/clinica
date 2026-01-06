import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Prescription query endpoints require authentication
router.use(authenticate);

/**
 * GET /prescriptions/:id
 *
 * Get a single prescription by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        patient_id,
        visit_id,
        doctor_id,
        prescription_number,
        medications,
        diagnosis,
        notes,
        is_digital_signature,
        signature_url,
        valid_until,
        is_dispensed,
        dispensed_at,
        dispensed_by,
        current_version,
        last_event_id,
        created_at,
        updated_at
      FROM prescriptions
      WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "PRESCRIPTION_NOT_FOUND",
          message: "Prescription not found",
        },
      });
    }

    const prescription = result.rows[0];
    // medications is already parsed as JSONB by PostgreSQL
    // Only parse if it's a string (shouldn't happen with JSONB, but safe fallback)
    if (typeof prescription.medications === 'string') {
      prescription.medications = JSON.parse(prescription.medications);
    }

    return res.json(prescription);
  })
);

/**
 * GET /prescriptions
 *
 * List prescriptions with pagination and filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitalId = req.get("X-Hospital-ID");
    const patientId = req.query.patient_id as string;
    const visitId = req.query.visit_id as string;
    const isDispensed = req.query.is_dispensed as string;

    // Build query
    const conditions: string[] = ["deleted_at IS NULL"];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by hospital (if provided)
    if (hospitalId) {
      conditions.push(`hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    // Filter by patient (if provided)
    if (patientId) {
      conditions.push(`patient_id = $${paramIndex++}`);
      params.push(patientId);
    }

    // Filter by visit (if provided)
    if (visitId) {
      conditions.push(`visit_id = $${paramIndex++}`);
      params.push(visitId);
    }

    // Filter by dispensed status (if provided)
    if (isDispensed !== undefined) {
      conditions.push(`is_dispensed = $${paramIndex++}`);
      params.push(isDispensed === "true");
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM prescriptions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get prescriptions
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        patient_id,
        visit_id,
        doctor_id,
        prescription_number,
        medications,
        diagnosis,
        notes,
        is_digital_signature,
        valid_until,
        is_dispensed,
        dispensed_at,
        current_version,
        created_at,
        updated_at
      FROM prescriptions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // medications is already parsed as JSONB by PostgreSQL
    // Only parse if it's a string (shouldn't happen with JSONB, but safe fallback)
    const prescriptions = result.rows.map((prescription) => ({
      ...prescription,
      medications: typeof prescription.medications === 'string' 
        ? JSON.parse(prescription.medications) 
        : prescription.medications,
    }));

    res.json({
      data: prescriptions,
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

