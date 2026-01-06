import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Prescription Projection Handler
 *
 * Updates the `prescriptions` table based on prescription events
 */
export class PrescriptionProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'prescription_issued',
    'prescription_signed',
    'prescription_dispensed',
    'prescription_cancelled',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'prescription_issued':
        await this.handlePrescriptionIssued(event, client);
        break;
      case 'prescription_signed':
        await this.handlePrescriptionSigned(event, client);
        break;
      case 'prescription_dispensed':
        await this.handlePrescriptionDispensed(event, client);
        break;
      case 'prescription_cancelled':
        await this.handlePrescriptionCancelled(event, client);
        break;
      default:
        logger.warn('Unknown event type for prescription projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle prescription_issued event
   *
   * Creates a new prescription record
   */
  private async handlePrescriptionIssued(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO prescriptions (
        id,
        hospital_id,
        patient_id,
        visit_id,
        doctor_id,
        prescription_number,
        medications,
        diagnosis,
        notes,
        valid_until,
        current_version,
        last_event_id,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.patient_id,
        data.visit_id || null,
        data.doctor_id,
        data.prescription_number,
        JSON.stringify(data.medications),
        data.diagnosis || null,
        data.notes || null,
        data.valid_until ? new Date(data.valid_until) : null,
        event.aggregate_version,
        event.event_id,
        data.doctor_id,
      ]
    );

    logger.info('Prescription projection created', {
      prescription_id: event.aggregate_id,
      prescription_number: data.prescription_number,
      event_id: event.event_id,
    });
  }

  /**
   * Handle prescription_signed event
   *
   * Updates prescription with signature information
   */
  private async handlePrescriptionSigned(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE prescriptions
       SET
         is_digital_signature = $1,
         signature_url = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        data.is_digital_signature ?? true,
        data.signature_url || null,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Prescription projection updated (signed)', {
      prescription_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle prescription_dispensed event
   *
   * Updates prescription with dispense information
   */
  private async handlePrescriptionDispensed(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE prescriptions
       SET
         is_dispensed = TRUE,
         dispensed_at = $1,
         dispensed_by = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        new Date(data.dispensed_at),
        data.dispensed_by,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Prescription projection updated (dispensed)', {
      prescription_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle prescription_cancelled event
   *
   * Soft deletes the prescription
   */
  private async handlePrescriptionCancelled(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE prescriptions
       SET
         deleted_at = NOW(),
         deleted_by = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        event.caused_by_user_id,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Prescription projection updated (cancelled)', {
      prescription_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

// Export singleton instance
export const prescriptionProjectionHandler = new PrescriptionProjectionHandler();

