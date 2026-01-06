import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Appointment Projection Handler
 *
 * Updates the `appointments` table based on appointment events
 */
export class AppointmentProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'appointment_scheduled',
    'appointment_confirmed',
    'appointment_rescheduled',
    'appointment_cancelled',
    'appointment_completed',
    'appointment_no_show_recorded',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'appointment_scheduled':
        await this.handleAppointmentScheduled(event, client);
        break;
      case 'appointment_confirmed':
        await this.handleAppointmentConfirmed(event, client);
        break;
      case 'appointment_rescheduled':
        await this.handleAppointmentRescheduled(event, client);
        break;
      case 'appointment_cancelled':
        await this.handleAppointmentCancelled(event, client);
        break;
      case 'appointment_completed':
        await this.handleAppointmentCompleted(event, client);
        break;
      case 'appointment_no_show_recorded':
        await this.handleAppointmentNoShow(event, client);
        break;
      default:
        logger.warn('Unknown event type for appointment projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle appointment_scheduled event
   *
   * Creates a new appointment record
   */
  private async handleAppointmentScheduled(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO appointments (
        id,
        hospital_id,
        patient_id,
        doctor_id,
        scheduled_at,
        duration_minutes,
        appointment_type,
        reason,
        notes,
        status,
        current_version,
        last_event_id,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled', $10, $11, $12, NOW()
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.patient_id,
        data.doctor_id,
        new Date(data.scheduled_at),
        data.duration_minutes || 30,
        data.appointment_type || null,
        data.reason || null,
        data.notes || null,
        event.aggregate_version,
        event.event_id,
        data.scheduled_by || event.caused_by_user_id,
      ]
    );

    logger.info('Appointment projection created', {
      appointment_id: event.aggregate_id,
      patient_id: data.patient_id,
      scheduled_at: data.scheduled_at,
      event_id: event.event_id,
    });
  }

  /**
   * Handle appointment_confirmed event
   *
   * Updates appointment status to confirmed
   */
  private async handleAppointmentConfirmed(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointments
       SET
         status = 'confirmed',
         confirmed_at = $1,
         confirmed_by = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        new Date(data.confirmed_at),
        data.confirmed_by || null,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Appointment projection updated (confirmed)', {
      appointment_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle appointment_rescheduled event
   *
   * Updates appointment scheduled time
   */
  private async handleAppointmentRescheduled(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointments
       SET
         scheduled_at = $1,
         duration_minutes = COALESCE($2, duration_minutes),
         status = 'rescheduled',
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        new Date(data.scheduled_at),
        data.duration_minutes || null,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Appointment projection updated (rescheduled)', {
      appointment_id: event.aggregate_id,
      new_scheduled_at: data.scheduled_at,
      event_id: event.event_id,
    });
  }

  /**
   * Handle appointment_cancelled event
   *
   * Updates appointment status to cancelled
   */
  private async handleAppointmentCancelled(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointments
       SET
         status = 'cancelled',
         cancelled_at = $1,
         cancellation_reason = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        new Date(data.cancelled_at),
        data.cancellation_reason,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Appointment projection updated (cancelled)', {
      appointment_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle appointment_completed event
   *
   * Updates appointment status to completed
   */
  private async handleAppointmentCompleted(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointments
       SET
         status = 'completed',
         visit_id = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        data.visit_id || null,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Appointment projection updated (completed)', {
      appointment_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle appointment_no_show_recorded event
   *
   * Updates appointment status to no_show
   */
  private async handleAppointmentNoShow(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointments
       SET
         status = 'no_show',
         no_show_recorded_at = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        new Date(data.no_show_recorded_at || new Date().toISOString()),
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Appointment projection updated (no_show)', {
      appointment_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

// Export singleton instance
export const appointmentProjectionHandler = new AppointmentProjectionHandler();

