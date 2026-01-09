import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Doctor query endpoints require authentication
router.use(authenticate);

/**
 * GET /doctors/:id
 *
 * Get a single doctor by ID with their statistics
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        u.id,
        u.hospital_id,
        u.email,
        u.phone,
        u.full_name,
        u.role,
        u.registration_number,
        u.specialization,
        u.department,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "DOCTOR_NOT_FOUND",
          message: "Doctor not found",
        },
      });
    }

    const doctor = result.rows[0];

    // Get statistics for this doctor
    const statsResult = await db.query(
      `SELECT
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') as total_visits,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'scheduled') as scheduled_visits,
        COUNT(DISTINCT v.patient_id) as total_patients,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'scheduled') as upcoming_appointments
      FROM users u
      LEFT JOIN visits v ON v.doctor_id = u.id AND v.deleted_at IS NULL
      LEFT JOIN appointments a ON a.doctor_id = u.id AND a.deleted_at IS NULL
      WHERE u.id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];

    const formattedDoctor = {
      id: doctor.id,
      hospital_id: doctor.hospital_id,
      email: doctor.email,
      phone: doctor.phone,
      full_name: doctor.full_name,
      role: doctor.role,
      registration_number: doctor.registration_number,
      specialization: doctor.specialization,
      department: doctor.department,
      is_active: doctor.is_active,
      created_at: doctor.created_at,
      updated_at: doctor.updated_at,
      stats: {
        total_visits: parseInt(stats.total_visits) || 0,
        scheduled_visits: parseInt(stats.scheduled_visits) || 0,
        total_patients: parseInt(stats.total_patients) || 0,
        upcoming_appointments: parseInt(stats.upcoming_appointments) || 0,
      },
    };

    return res.json(formattedDoctor);
  })
);

/**
 * GET /doctors
 *
 * List all doctors in the hospital
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const hospitalId = req.get("X-Hospital-ID");

    const conditions: string[] = ["u.deleted_at IS NULL"];
    const params: any[] = [];
    let paramIndex = 1;

    if (hospitalId) {
      conditions.push(`u.hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get doctors
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        u.id,
        u.hospital_id,
        u.email,
        u.phone,
        u.full_name,
        u.role,
        u.registration_number,
        u.specialization,
        u.department,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM users u
      ${whereClause}
      ORDER BY u.full_name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const formattedDoctors = result.rows.map((doctor) => ({
      id: doctor.id,
      hospital_id: doctor.hospital_id,
      email: doctor.email,
      phone: doctor.phone,
      full_name: doctor.full_name,
      role: doctor.role,
      registration_number: doctor.registration_number,
      specialization: doctor.specialization,
      department: doctor.department,
      is_active: doctor.is_active,
      created_at: doctor.created_at,
      updated_at: doctor.updated_at,
    }));

    res.json({
      data: formattedDoctors,
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
