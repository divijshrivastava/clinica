import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Document query endpoints require authentication
router.use(authenticate);

/**
 * GET /documents/:id
 *
 * Get a single document by ID
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
        document_type,
        title,
        description,
        file_url,
        file_name,
        file_size_bytes,
        mime_type,
        thumbnail_url,
        page_count,
        tags,
        is_sensitive,
        shared_with,
        download_count,
        current_version,
        last_event_id,
        uploaded_at,
        uploaded_by,
        updated_at
      FROM documents
      WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Document not found",
        },
      });
    }

    const document = result.rows[0];
    // Parse array fields
    document.tags = document.tags || [];
    document.shared_with = document.shared_with || [];

    return res.json(document);
  })
);

/**
 * GET /documents
 *
 * List documents with pagination and filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitalId = req.get("X-Hospital-ID");
    const patientId = req.query.patient_id as string;
    const visitId = req.query.visit_id as string;
    const documentType = req.query.document_type as string;

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

    // Filter by document type (if provided)
    if (documentType) {
      conditions.push(`document_type = $${paramIndex++}`);
      params.push(documentType);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM documents ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get documents
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        id,
        hospital_id,
        patient_id,
        visit_id,
        document_type,
        title,
        description,
        file_url,
        file_name,
        file_size_bytes,
        mime_type,
        thumbnail_url,
        page_count,
        tags,
        download_count,
        current_version,
        uploaded_at,
        updated_at
      FROM documents
      ${whereClause}
      ORDER BY uploaded_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Parse array fields
    const documents = result.rows.map((doc) => ({
      ...doc,
      tags: doc.tags || [],
    }));

    res.json({
      data: documents,
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

