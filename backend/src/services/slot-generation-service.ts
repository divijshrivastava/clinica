import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/pool';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Slot Generation Service
 *
 * Handles pre-generation of appointment slots based on doctor schedules
 * Implements priority-based conflict resolution:
 * 1. Forced Block (highest priority)
 * 2. Emergency Unavailable
 * 3. Leave (approved)
 * 4. Holiday
 * 5. Override
 * 6. Base Schedule (lowest priority)
 */
export class SlotGenerationService {
  /**
   * Generate slots for a specific doctor for a date range
   */
  async generateSlotsForDoctor(
    doctorProfileId: string,
    startDate: Date,
    endDate: Date,
    hospitalId: string
  ): Promise<number> {
    logger.info('Generating slots for doctor', {
      doctor_profile_id: doctorProfileId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    let totalSlotsGenerated = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      // Get effective schedule for this date
      const effectiveSchedule = await this.getEffectiveScheduleForDate(
        doctorProfileId,
        dateStr,
        dayOfWeek,
        hospitalId
      );

      if (effectiveSchedule) {
        const slots = await this.generateSlotsForDate(
          doctorProfileId,
          dateStr,
          effectiveSchedule,
          hospitalId
        );
        totalSlotsGenerated += slots.length;

        // Emit slots_generated event
        if (slots.length > 0) {
          await this.emitSlotsGeneratedEvent(doctorProfileId, slots, hospitalId);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    logger.info('Slot generation completed', {
      doctor_profile_id: doctorProfileId,
      total_slots: totalSlotsGenerated,
    });

    return totalSlotsGenerated;
  }

  /**
   * Get effective schedule for a specific date
   * Applies priority-based conflict resolution
   */
  private async getEffectiveScheduleForDate(
    doctorProfileId: string,
    date: string,
    dayOfWeek: number,
    hospitalId: string
  ): Promise<any | null> {
    // Check for forced blocks (highest priority)
    const forcedBlock = await db.query(
      `SELECT * FROM schedule_exceptions
       WHERE doctor_profile_id = $1
         AND exception_type = 'forced_block'
         AND $2::date BETWEEN start_date AND end_date
         AND hospital_id = $3
         AND deleted_at IS NULL
       LIMIT 1`,
      [doctorProfileId, date, hospitalId]
    );

    if (forcedBlock.rows.length > 0) {
      logger.debug('Date blocked by forced block', { doctor_profile_id: doctorProfileId, date });
      return null; // No slots for this date
    }

    // Check for emergency unavailable
    const emergencyBlock = await db.query(
      `SELECT * FROM schedule_exceptions
       WHERE doctor_profile_id = $1
         AND exception_type = 'emergency_unavailable'
         AND $2::date BETWEEN start_date AND end_date
         AND hospital_id = $3
         AND deleted_at IS NULL
       LIMIT 1`,
      [doctorProfileId, date, hospitalId]
    );

    if (emergencyBlock.rows.length > 0) {
      logger.debug('Date blocked by emergency', { doctor_profile_id: doctorProfileId, date });
      return null;
    }

    // Check for approved leave
    const leave = await db.query(
      `SELECT * FROM leave_requests
       WHERE doctor_profile_id = $1
         AND status = 'approved'
         AND $2::date BETWEEN start_date AND end_date
         AND hospital_id = $3
         AND deleted_at IS NULL
       LIMIT 1`,
      [doctorProfileId, date, hospitalId]
    );

    if (leave.rows.length > 0) {
      logger.debug('Date blocked by approved leave', { doctor_profile_id: doctorProfileId, date });
      return null;
    }

    // Check for holiday
    const holiday = await db.query(
      `SELECT * FROM schedule_exceptions
       WHERE doctor_profile_id = $1
         AND exception_type = 'holiday'
         AND $2::date BETWEEN start_date AND end_date
         AND hospital_id = $3
         AND deleted_at IS NULL
       LIMIT 1`,
      [doctorProfileId, date, hospitalId]
    );

    if (holiday.rows.length > 0) {
      logger.debug('Date is a holiday', { doctor_profile_id: doctorProfileId, date });
      return null;
    }

    // Check for schedule override (higher priority than base schedule)
    const override = await db.query(
      `SELECT * FROM schedule_overrides
       WHERE doctor_profile_id = $1
         AND override_date = $2
         AND hospital_id = $3
         AND deleted_at IS NULL
       LIMIT 1`,
      [doctorProfileId, date, hospitalId]
    );

    if (override.rows.length > 0) {
      logger.debug('Using schedule override', { doctor_profile_id: doctorProfileId, date });
      return {
        ...override.rows[0],
        source: 'override',
      };
    }

    // Fall back to base schedule
    const baseSchedule = await db.query(
      `SELECT * FROM doctor_schedules
       WHERE doctor_profile_id = $1
         AND day_of_week = $2
         AND is_active = TRUE
         AND (effective_from IS NULL OR effective_from <= $3)
         AND (effective_until IS NULL OR effective_until >= $3)
         AND hospital_id = $4
         AND deleted_at IS NULL
       ORDER BY effective_from DESC
       LIMIT 1`,
      [doctorProfileId, dayOfWeek, date, hospitalId]
    );

    if (baseSchedule.rows.length > 0) {
      logger.debug('Using base schedule', { doctor_profile_id: doctorProfileId, date });
      return {
        ...baseSchedule.rows[0],
        source: 'base_schedule',
      };
    }

    logger.debug('No schedule found for date', { doctor_profile_id: doctorProfileId, date });
    return null;
  }

  /**
   * Generate individual slots for a specific date based on schedule
   */
  private async generateSlotsForDate(
    doctorProfileId: string,
    date: string,
    schedule: any,
    hospitalId: string
  ): Promise<any[]> {
    const slots: any[] = [];
    const startTime = schedule.start_time; // e.g., "09:00"
    const endTime = schedule.end_time; // e.g., "17:00"
    const slotDuration = schedule.slot_duration_minutes;
    const bufferTime = schedule.buffer_time_minutes || 0;

    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStartHour = Math.floor(currentMinutes / 60);
      const slotStartMin = currentMinutes % 60;
      const slotEndMinutes = currentMinutes + slotDuration;
      const slotEndHour = Math.floor(slotEndMinutes / 60);
      const slotEndMin = slotEndMinutes % 60;

      const slotStartTime = `${String(slotStartHour).padStart(2, '0')}:${String(slotStartMin).padStart(2, '0')}`;
      const slotEndTime = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;

      const slot = {
        slot_id: uuidv4(),
        doctor_profile_id: doctorProfileId,
        location_id: schedule.location_id,
        schedule_source: schedule.source,
        slot_date: date,
        start_time: slotStartTime,
        end_time: slotEndTime,
        duration_minutes: slotDuration,
        consultation_mode: schedule.consultation_mode || 'in_person',
        max_capacity: schedule.max_appointments_per_slot || 1,
        max_in_person_capacity: schedule.max_in_person_capacity || 1,
        max_tele_capacity: schedule.max_tele_capacity || 0,
      };

      slots.push(slot);

      // Move to next slot (add slot duration + buffer time)
      currentMinutes += slotDuration + bufferTime;
    }

    return slots;
  }

  /**
   * Emit slots_generated event
   */
  private async emitSlotsGeneratedEvent(
    doctorProfileId: string,
    slots: any[],
    hospitalId: string
  ): Promise<void> {
    const aggregateId = uuidv4();

    await eventStore.appendEvent({
      aggregate_type: 'appointment_slot',
      aggregate_id: aggregateId,
      aggregate_version: 1,
      event_type: 'slots_generated',
      event_schema_version: 1,
      event_data: {
        doctor_profile_id: doctorProfileId,
        slots: slots,
        generation_date: new Date().toISOString(),
      },
      event_metadata: {
        source: 'slot_generation_service',
      },
      hospital_id: hospitalId,
      correlation_id: aggregateId,
      causation_id: aggregateId,
    });
  }

  /**
   * Regenerate slots for a doctor (e.g., after schedule change)
   * Deletes existing future slots and regenerates
   */
  async regenerateSlotsForDoctor(
    doctorProfileId: string,
    hospitalId: string,
    fromDate?: Date
  ): Promise<number> {
    const startDate = fromDate || new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 90); // 90 days ahead

    logger.info('Regenerating slots for doctor', {
      doctor_profile_id: doctorProfileId,
      from_date: startDate.toISOString().split('T')[0],
    });

    // Delete existing future slots
    await db.query(
      `DELETE FROM appointment_slots
       WHERE doctor_profile_id = $1
         AND slot_date >= $2
         AND status = 'available'
         AND hospital_id = $3`,
      [doctorProfileId, startDate.toISOString().split('T')[0], hospitalId]
    );

    // Generate new slots
    return await this.generateSlotsForDoctor(doctorProfileId, startDate, endDate, hospitalId);
  }

  /**
   * Generate slots for all active doctors
   * Should be run as a daily cron job
   */
  async generateSlotsForAllDoctors(hospitalId: string): Promise<void> {
    logger.info('Generating slots for all active doctors', { hospital_id: hospitalId });

    const doctors = await db.query(
      `SELECT id FROM doctor_profiles
       WHERE status = 'active'
         AND is_bookable = TRUE
         AND hospital_id = $1
         AND deleted_at IS NULL`,
      [hospitalId]
    );

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);

    for (const doctor of doctors.rows) {
      try {
        await this.generateSlotsForDoctor(doctor.id, today, endDate, hospitalId);
      } catch (error: any) {
        logger.error('Failed to generate slots for doctor', {
          doctor_profile_id: doctor.id,
          error: error.message,
        });
      }
    }

    logger.info('Completed slot generation for all doctors', {
      hospital_id: hospitalId,
      doctor_count: doctors.rows.length,
    });
  }
}

// Export singleton instance
export const slotGenerationService = new SlotGenerationService();
