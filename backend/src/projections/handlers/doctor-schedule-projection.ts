import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Doctor Schedule Projection Handler
 *
 * Updates schedule-related tables based on schedule events
 */
export class DoctorScheduleProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'base_schedule_created',
    'base_schedule_updated',
    'schedule_override_added',
    'schedule_override_removed',
    'leave_requested',
    'leave_approved',
    'leave_rejected',
    'leave_cancelled',
    'emergency_unavailable_added',
    'forced_block_added',
    'forced_block_removed',
    'holiday_schedule_set',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'base_schedule_created':
        await this.handleBaseScheduleCreated(event, client);
        break;
      case 'base_schedule_updated':
        await this.handleBaseScheduleUpdated(event, client);
        break;
      case 'schedule_override_added':
        await this.handleScheduleOverrideAdded(event, client);
        break;
      case 'schedule_override_removed':
        await this.handleScheduleOverrideRemoved(event, client);
        break;
      case 'leave_requested':
        await this.handleLeaveRequested(event, client);
        break;
      case 'leave_approved':
        await this.handleLeaveApproved(event, client);
        break;
      case 'leave_rejected':
        await this.handleLeaveRejected(event, client);
        break;
      case 'leave_cancelled':
        await this.handleLeaveCancelled(event, client);
        break;
      case 'emergency_unavailable_added':
      case 'forced_block_added':
      case 'holiday_schedule_set':
        await this.handleScheduleExceptionAdded(event, client);
        break;
      case 'forced_block_removed':
        await this.handleScheduleExceptionRemoved(event, client);
        break;
      default:
        logger.warn('Unknown event type for doctor schedule projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle base_schedule_created event
   */
  private async handleBaseScheduleCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO doctor_schedules (
        id,
        doctor_profile_id,
        location_id,
        day_of_week,
        start_time,
        end_time,
        slot_duration_minutes,
        buffer_time_minutes,
        max_appointments_per_slot,
        consultation_mode,
        max_in_person_capacity,
        max_tele_capacity,
        effective_from,
        effective_until,
        is_active,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )`,
      [
        data.schedule_id || event.aggregate_id,
        data.doctor_profile_id,
        data.location_id,
        data.day_of_week,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes,
        data.buffer_time_minutes || 0,
        data.max_appointments_per_slot || 1,
        data.consultation_mode || 'in_person',
        data.max_in_person_capacity,
        data.max_tele_capacity,
        data.effective_from,
        data.effective_until,
        data.is_active !== undefined ? data.is_active : true,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Base schedule projection created', {
      schedule_id: data.schedule_id || event.aggregate_id,
      doctor_profile_id: data.doctor_profile_id,
      day_of_week: data.day_of_week,
      event_id: event.event_id,
    });
  }

  /**
   * Handle base_schedule_updated event
   */
  private async handleBaseScheduleUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE doctor_schedules
       SET
         start_time = COALESCE($1, start_time),
         end_time = COALESCE($2, end_time),
         slot_duration_minutes = COALESCE($3, slot_duration_minutes),
         buffer_time_minutes = COALESCE($4, buffer_time_minutes),
         max_appointments_per_slot = COALESCE($5, max_appointments_per_slot),
         consultation_mode = COALESCE($6, consultation_mode),
         max_in_person_capacity = COALESCE($7, max_in_person_capacity),
         max_tele_capacity = COALESCE($8, max_tele_capacity),
         is_active = COALESCE($9, is_active),
         current_version = $10,
         last_event_id = $11,
         updated_at = NOW()
       WHERE id = $12`,
      [
        data.start_time,
        data.end_time,
        data.slot_duration_minutes,
        data.buffer_time_minutes,
        data.max_appointments_per_slot,
        data.consultation_mode,
        data.max_in_person_capacity,
        data.max_tele_capacity,
        data.is_active,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Base schedule projection updated', {
      schedule_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle schedule_override_added event
   */
  private async handleScheduleOverrideAdded(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO schedule_overrides (
        id,
        doctor_profile_id,
        location_id,
        override_date,
        start_time,
        end_time,
        slot_duration_minutes,
        buffer_time_minutes,
        max_appointments_per_slot,
        consultation_mode,
        reason,
        created_by,
        current_version,
        last_event_id
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )`,
      [
        data.doctor_profile_id,
        data.location_id,
        data.override_date,
        data.start_time,
        data.end_time,
        data.slot_duration_minutes,
        data.buffer_time_minutes || 0,
        data.max_appointments_per_slot || 1,
        data.consultation_mode || 'in_person',
        data.reason,
        event.caused_by_user_id,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Schedule override projection created', {
      doctor_profile_id: data.doctor_profile_id,
      override_date: data.override_date,
      event_id: event.event_id,
    });
  }

  /**
   * Handle schedule_override_removed event
   */
  private async handleScheduleOverrideRemoved(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE schedule_overrides
       SET deleted_at = NOW()
       WHERE doctor_profile_id = $1 AND override_date = $2 AND deleted_at IS NULL`,
      [data.doctor_profile_id, data.override_date]
    );

    logger.info('Schedule override projection removed', {
      doctor_profile_id: data.doctor_profile_id,
      override_date: data.override_date,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_requested event
   */
  private async handleLeaveRequested(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO leave_requests (
        id,
        doctor_profile_id,
        leave_type,
        start_date,
        end_date,
        is_full_day,
        start_time,
        end_time,
        reason,
        status,
        submitted_at,
        submitted_by,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', NOW(), $10, $11, $12
      )`,
      [
        event.aggregate_id,
        data.doctor_profile_id,
        data.leave_type,
        data.start_date,
        data.end_date,
        data.is_full_day !== undefined ? data.is_full_day : true,
        data.start_time,
        data.end_time,
        data.reason,
        event.caused_by_user_id,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Leave request projection created', {
      leave_request_id: event.aggregate_id,
      doctor_profile_id: data.doctor_profile_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_approved event
   */
  private async handleLeaveApproved(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE leave_requests
       SET
         status = 'approved',
         approved_at = NOW(),
         approved_by = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [event.caused_by_user_id, event.aggregate_version, event.event_id, event.aggregate_id]
    );

    logger.info('Leave request approved projection updated', {
      leave_request_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_rejected event
   */
  private async handleLeaveRejected(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE leave_requests
       SET
         status = 'rejected',
         rejected_at = NOW(),
         rejected_by = $1,
         rejection_reason = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        event.caused_by_user_id,
        data.rejection_reason,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Leave request rejected projection updated', {
      leave_request_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_cancelled event
   */
  private async handleLeaveCancelled(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE leave_requests
       SET
         status = 'cancelled',
         cancelled_at = NOW(),
         cancellation_reason = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [data.cancellation_reason, event.aggregate_version, event.event_id, event.aggregate_id]
    );

    logger.info('Leave request cancelled projection updated', {
      leave_request_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle schedule exception events (emergency, forced block, holiday)
   */
  private async handleScheduleExceptionAdded(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;
    const exceptionTypeMap: Record<string, string> = {
      emergency_unavailable_added: 'emergency',
      forced_block_added: 'forced_block',
      holiday_schedule_set: 'holiday',
    };

    const exceptionType = exceptionTypeMap[event.event_type] || 'forced_block';

    await client.query(
      `INSERT INTO schedule_exceptions (
        id,
        doctor_profile_id,
        hospital_id,
        exception_type,
        exception_date,
        start_time,
        end_time,
        reason,
        is_hospital_wide,
        created_by,
        can_be_overridden,
        current_version,
        last_event_id
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )`,
      [
        data.doctor_profile_id,
        data.is_hospital_wide ? event.hospital_id : null,
        exceptionType,
        data.exception_date,
        data.start_time,
        data.end_time,
        data.reason,
        data.is_hospital_wide || false,
        event.caused_by_user_id,
        data.can_be_overridden !== undefined ? data.can_be_overridden : false,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Schedule exception projection created', {
      exception_type: exceptionType,
      exception_date: data.exception_date,
      event_id: event.event_id,
    });
  }

  /**
   * Handle forced_block_removed event
   */
  private async handleScheduleExceptionRemoved(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE schedule_exceptions
       SET deleted_at = NOW()
       WHERE exception_date = $1
         AND (doctor_profile_id = $2 OR hospital_id = $3)
         AND deleted_at IS NULL`,
      [data.exception_date, data.doctor_profile_id, event.hospital_id]
    );

    logger.info('Schedule exception projection removed', {
      exception_date: data.exception_date,
      event_id: event.event_id,
    });
  }
}
