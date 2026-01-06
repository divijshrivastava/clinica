import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Medical note query endpoints require authentication
router.use(authenticate);

/**
 * GET /medical-notes/:id
 *
 * Get a single medical note by ID
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
        note_type,
        title,
        content,
        image_urls,
        audio_url,
        ocr_confidence,
        ocr_status,
        is_signed,
        signed_at,
        signed_by,
        template_id,
        current_version,
        last_event_id,
        created_at,
        updated_at
      FROM medical_notes
      WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "MEDICAL_NOTE_NOT_FOUND",
          message: "Medical note not found",
        },
      });
    }

    return res.json(result.rows[0]);
  })
);

/**
 * GET /medical-notes
 *
 * List medical notes with pagination and filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitalId = req.get("X-Hospital-ID");
    const patientId = req.query.patient_id as string;
    const visitId = req.query.visit_id as string;
    const noteType = req.query.note_type as string;
    const isSigned = req.query.is_signed as string;

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

    // Filter by note type (if provided)
    if (noteType) {
      conditions.push(`note_type = $${paramIndex++}`);
      params.push(noteType);
    }

    // Filter by signed status (if provided)
    if (isSigned !== undefined) {
      conditions.push(`is_signed = $${paramIndex++}`);
      params.push(isSigned === "true");
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM medical_notes ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get medical notes
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        patient_id,
        visit_id,
        note_type,
        title,
        content,
        image_urls,
        audio_url,
        ocr_confidence,
        is_signed,
        signed_at,
        template_id,
        current_version,
        created_at,
        updated_at
      FROM medical_notes
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

export default router;

