import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Visit Projection Handler
 *
 * Updates the `visits` table based on visit events
 */
export class VisitProjectionHandler implements ProjectionHandler {
  eventTypes = ['visit_scheduled', 'visit_completed'];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'visit_scheduled':
        await this.handleVisitScheduled(event, client);
        break;
      case 'visit_completed':
        await this.handleVisitCompleted(event, client);
        break;
      default:
        logger.warn('Unknown event type for visit projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle visit_scheduled event
   *
   * Creates a new visit record in the visits table
   */
  private async handleVisitScheduled(event: Event, client: PoolClient): Promise<void> {
    const data = event.event_data;

    // Parse scheduled_at ISO datetime into date and time
    const scheduledDate = new Date(data.scheduled_at);
    const visitDate = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const visitTime = scheduledDate.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS

    // Get doctor_id from event metadata (user_id)
    const doctorId = event.event_metadata?.user_id || event.event_metadata?.doctor_id;

    await client.query(
      `INSERT INTO visits (
        id,
        hospital_id,
        patient_id,
        doctor_id,
        visit_date,
        visit_time,
        visit_type,
        status,
        chief_complaint,
        notes,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.patient_id,
        doctorId,
        visitDate,
        visitTime,
        data.visit_type,
        'scheduled', // Initial status
        data.chief_complaint,
        data.notes,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Visit projection created', {
      visit_id: event.aggregate_id,
      patient_id: data.patient_id,
      visit_type: data.visit_type,
      visit_date: visitDate,
      event_id: event.event_id,
    });
  }

  /**
   * Handle visit_completed event
   *
   * Updates visit status and completion details
   */
  private async handleVisitCompleted(event: Event, client: PoolClient): Promise<void> {
    const data = event.event_data;

    const result = await client.query(
      `UPDATE visits
       SET
         status = 'completed',
         diagnosis = $1,
         treatment_plan = $2,
         follow_up_date = $3,
         follow_up_instructions = $4,
         completed_at = $5,
         current_version = $6,
         last_event_id = $7,
         updated_at = NOW()
       WHERE id = $8`,
      [
        data.diagnosis,
        data.treatment_notes, // Maps to treatment_plan
        data.follow_up_date,
        data.discharge_instructions, // Maps to follow_up_instructions
        data.completed_at,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error(`Visit not found for completion: ${event.aggregate_id}`);
    }

    logger.info('Visit projection completed', {
      visit_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle visit_cancelled event
   *
   * Updates visit status to cancelled
   */
  private async handleVisitCancelled(event: Event, client: PoolClient): Promise<void> {
    const data = event.event_data;

    const result = await client.query(
      `UPDATE visits
       SET
         status = 'cancelled',
         cancellation_reason = $1,
         cancelled_at = $2,
         current_version = $3,
         last_event_id = $4,
         last_event_schema_version = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        data.cancellation_reason,
        data.cancelled_at || new Date().toISOString(),
        event.aggregate_version,
        event.event_id,
        event.event_schema_version,
        event.aggregate_id,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error(`Visit not found for cancellation: ${event.aggregate_id}`);
    }

    logger.info('Visit projection cancelled', {
      visit_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

// Export singleton instance
export const visitProjectionHandler = new VisitProjectionHandler();
