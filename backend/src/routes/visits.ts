import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Visit query endpoints require authentication
router.use(authenticate);

/**
 * GET /visits/:id
 *
 * Get a single visit by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        v.id,
        v.hospital_id,
        v.patient_id,
        v.doctor_id,
        v.visit_date,
        v.visit_time,
        v.visit_type,
        v.status,
        v.chief_complaint,
        v.notes,
        v.diagnosis,
        v.treatment_plan,
        v.follow_up_date,
        v.follow_up_instructions,
        v.completed_at,
        v.current_version,
        v.last_event_id,
        v.created_at,
        v.updated_at,
        p.mrn as patient_mrn,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        u.full_name as doctor_name,
        u.email as doctor_email,
        u.specialization as doctor_specialization
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN users u ON v.doctor_id = u.id
      WHERE v.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "VISIT_NOT_FOUND",
          message: "Visit not found",
        },
      });
    }

    const visit = result.rows[0];

    // Format response with nested patient and doctor info
    const formattedVisit = {
      id: visit.id,
      hospital_id: visit.hospital_id,
      patient_id: visit.patient_id,
      doctor_id: visit.doctor_id,
      patient: {
        mrn: visit.patient_mrn,
        first_name: visit.patient_first_name,
        last_name: visit.patient_last_name,
      },
      doctor: {
        name: visit.doctor_name,
        email: visit.doctor_email,
        specialization: visit.doctor_specialization,
      },
      visit_date: visit.visit_date,
      visit_time: visit.visit_time,
      visit_type: visit.visit_type,
      status: visit.status,
      chief_complaint: visit.chief_complaint,
      notes: visit.notes,
      diagnosis: visit.diagnosis,
      treatment_plan: visit.treatment_plan,
      follow_up_date: visit.follow_up_date,
      follow_up_instructions: visit.follow_up_instructions,
      completed_at: visit.completed_at,
      current_version: visit.current_version,
      last_event_id: visit.last_event_id,
      created_at: visit.created_at,
      updated_at: visit.updated_at,
    };

    return res.json(formattedVisit);
  })
);

/**
 * GET /visits
 *
 * List visits with pagination and filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitalId = req.get("X-Hospital-ID");
    const patientId = req.query.patient_id as string;
    const status = req.query.status as string;
    const visitType = req.query.visit_type as string;

    // Build query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by hospital (if provided)
    if (hospitalId) {
      conditions.push(`v.hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    // Filter by patient (if provided)
    if (patientId) {
      conditions.push(`v.patient_id = $${paramIndex++}`);
      params.push(patientId);
    }

    // Filter by status (if provided)
    if (status) {
      conditions.push(`v.status = $${paramIndex++}`);
      params.push(status);
    }

    // Filter by visit type (if provided)
    if (visitType) {
      conditions.push(`v.visit_type = $${paramIndex++}`);
      params.push(visitType);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM visits v ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get visits
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        v.id,
        v.hospital_id,
        v.patient_id,
        v.doctor_id,
        v.visit_date,
        v.visit_time,
        v.visit_type,
        v.status,
        v.chief_complaint,
        v.notes,
        v.diagnosis,
        v.treatment_plan,
        v.follow_up_date,
        v.follow_up_instructions,
        v.completed_at,
        v.current_version,
        v.created_at,
        v.updated_at,
        p.mrn as patient_mrn,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        u.full_name as doctor_name,
        u.email as doctor_email,
        u.specialization as doctor_specialization
      FROM visits v
      LEFT JOIN patients p ON v.patient_id = p.id
      LEFT JOIN users u ON v.doctor_id = u.id
      ${whereClause}
      ORDER BY v.visit_date DESC, v.visit_time DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Format results with nested patient and doctor info
    const formattedVisits = result.rows.map((visit) => ({
      id: visit.id,
      hospital_id: visit.hospital_id,
      patient_id: visit.patient_id,
      doctor_id: visit.doctor_id,
      patient: {
        mrn: visit.patient_mrn,
        first_name: visit.patient_first_name,
        last_name: visit.patient_last_name,
      },
      doctor: {
        name: visit.doctor_name,
        email: visit.doctor_email,
        specialization: visit.doctor_specialization,
      },
      visit_date: visit.visit_date,
      visit_time: visit.visit_time,
      visit_type: visit.visit_type,
      status: visit.status,
      chief_complaint: visit.chief_complaint,
      notes: visit.notes,
      diagnosis: visit.diagnosis,
      treatment_plan: visit.treatment_plan,
      follow_up_date: visit.follow_up_date,
      follow_up_instructions: visit.follow_up_instructions,
      completed_at: visit.completed_at,
      current_version: visit.current_version,
      created_at: visit.created_at,
      updated_at: visit.updated_at,
    }));

    res.json({
      data: formattedVisits,
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
