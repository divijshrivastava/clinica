import { Router, Request, Response } from "express";
import { db } from "../database/pool";
import { asyncHandler } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";

const router = Router();

// Appointment query endpoints require authentication
router.use(authenticate);

/**
 * GET /appointments/:id
 *
 * Get a single appointment by ID
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
        a.id,
        a.hospital_id,
        a.patient_id,
        a.doctor_id,
        a.scheduled_at,
        a.duration_minutes,
        a.appointment_type,
        a.status,
        a.reason,
        a.notes,
        a.reminder_sent_at,
        a.confirmed_at,
        a.confirmed_by,
        a.cancelled_at,
        a.cancellation_reason,
        a.no_show_recorded_at,
        a.visit_id,
        a.current_version,
        a.last_event_id,
        a.created_at,
        a.updated_at,
        p.mrn as patient_mrn,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "APPOINTMENT_NOT_FOUND",
          message: "Appointment not found",
        },
      });
    }

    const appointment = result.rows[0];

    // Format response with nested patient info
    const formattedAppointment = {
      id: appointment.id,
      hospital_id: appointment.hospital_id,
      patient_id: appointment.patient_id,
      patient: {
        mrn: appointment.patient_mrn,
        first_name: appointment.patient_first_name,
        last_name: appointment.patient_last_name,
      },
      doctor_id: appointment.doctor_id,
      scheduled_at: appointment.scheduled_at,
      duration_minutes: appointment.duration_minutes,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      reason: appointment.reason,
      notes: appointment.notes,
      reminder_sent_at: appointment.reminder_sent_at,
      confirmed_at: appointment.confirmed_at,
      confirmed_by: appointment.confirmed_by,
      cancelled_at: appointment.cancelled_at,
      cancellation_reason: appointment.cancellation_reason,
      no_show_recorded_at: appointment.no_show_recorded_at,
      visit_id: appointment.visit_id,
      current_version: appointment.current_version,
      last_event_id: appointment.last_event_id,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
    };

    return res.json(formattedAppointment);
  })
);

/**
 * GET /appointments
 *
 * List appointments with pagination and filtering
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const hospitalId = req.get("X-Hospital-ID");
      const patientId = req.query.patient_id as string;
      const doctorId = req.query.doctor_id as string;
      const status = req.query.status as string;
      const dateFrom = req.query.date_from as string;
      const dateTo = req.query.date_to as string;

      // Build query
      const conditions: string[] = ["a.deleted_at IS NULL"];
      const params: any[] = [];
      let paramIndex = 1;

    // Filter by hospital (if provided)
    if (hospitalId) {
      conditions.push(`a.hospital_id = $${paramIndex++}`);
      params.push(hospitalId);
    }

    // Filter by patient (if provided)
    if (patientId) {
      conditions.push(`a.patient_id = $${paramIndex++}`);
      params.push(patientId);
    }

    // Filter by doctor (if provided)
    if (doctorId) {
      conditions.push(`a.doctor_id = $${paramIndex++}`);
      params.push(doctorId);
    }

    // Filter by status (if provided)
    if (status) {
      conditions.push(`a.status = $${paramIndex++}`);
      params.push(status);
    }

    // Filter by date range (if provided)
    if (dateFrom) {
      conditions.push(`a.scheduled_at >= $${paramIndex++}`);
      params.push(new Date(dateFrom));
    }

    if (dateTo) {
      conditions.push(`a.scheduled_at <= $${paramIndex++}`);
      params.push(new Date(dateTo));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM appointments a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get appointments
    params.push(limit);
    params.push(offset);

    const result = await db.query(
      `SELECT
        a.id,
        a.hospital_id,
        a.patient_id,
        a.doctor_id,
        a.scheduled_at,
        a.duration_minutes,
        a.appointment_type,
        a.status,
        a.reason,
        a.confirmed_at,
        a.cancelled_at,
        a.current_version,
        a.created_at,
        a.updated_at,
        p.mrn as patient_mrn,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      ${whereClause}
      ORDER BY a.scheduled_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Format results with nested patient info
    const formattedAppointments = result.rows.map((appointment) => ({
      id: appointment.id,
      hospital_id: appointment.hospital_id,
      patient_id: appointment.patient_id,
      patient: {
        mrn: appointment.patient_mrn,
        first_name: appointment.patient_first_name,
        last_name: appointment.patient_last_name,
      },
      doctor_id: appointment.doctor_id,
      scheduled_at: appointment.scheduled_at,
      duration_minutes: appointment.duration_minutes,
      appointment_type: appointment.appointment_type,
      status: appointment.status,
      reason: appointment.reason,
      confirmed_at: appointment.confirmed_at,
      cancelled_at: appointment.cancelled_at,
      current_version: appointment.current_version,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
    }));

      res.json({
        data: formattedAppointments,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
        },
      });
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      throw error; // Let asyncHandler handle it
    }
  })
);

export default router;

