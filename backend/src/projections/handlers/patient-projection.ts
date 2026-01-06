import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Patient Projection Handler
 *
 * Updates the `patients` table based on patient events
 */
export class PatientProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'patient_registered',
    'patient_contact_updated',
    'patient_demographics_updated',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'patient_registered':
        await this.handlePatientRegistered(event, client);
        break;
      case 'patient_contact_updated':
        await this.handlePatientContactUpdated(event, client);
        break;
      case 'patient_demographics_updated':
        await this.handlePatientDemographicsUpdated(event, client);
        break;
      default:
        logger.warn('Unknown event type for patient projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle patient_registered event
   *
   * Creates a new patient record in the patients table
   */
  private async handlePatientRegistered(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO patients (
        id,
        hospital_id,
        mrn,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        email,
        whatsapp_phone,
        whatsapp_opted_in,
        address,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.mrn,
        data.first_name,
        data.last_name,
        data.date_of_birth,
        data.gender,
        data.phone,
        data.email,
        data.whatsapp_phone,
        data.whatsapp_opted_in || false,
        JSON.stringify(data.address || null),
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Patient projection created', {
      patient_id: event.aggregate_id,
      mrn: data.mrn,
      event_id: event.event_id,
    });
  }

  /**
   * Handle patient_contact_updated event
   *
   * Updates patient contact information
   */
  private async handlePatientContactUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query based on what fields are present
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.whatsapp_phone !== undefined) {
      updates.push(`whatsapp_phone = $${paramIndex++}`);
      values.push(data.whatsapp_phone);
    }

    if (data.whatsapp_opted_in !== undefined) {
      updates.push(`whatsapp_opted_in = $${paramIndex++}`);
      values.push(data.whatsapp_opted_in);
    }

    if (data.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(JSON.stringify(data.address));
    }

    // Always update version and last event info
    updates.push(`current_version = $${paramIndex++}`);
    values.push(event.aggregate_version);

    updates.push(`last_event_id = $${paramIndex++}`);
    values.push(event.event_id);

    updates.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    values.push(event.aggregate_id);

    const query = `
      UPDATE patients
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      throw new Error(`Patient not found for contact update: ${event.aggregate_id}`);
    }

    logger.info('Patient contact projection updated', {
      patient_id: event.aggregate_id,
      event_id: event.event_id,
      fields_updated: updates.length - 3, // Subtract version/event tracking fields
    });
  }

  /**
   * Handle patient_demographics_updated event
   *
   * Updates patient demographic information
   */
  private async handlePatientDemographicsUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(data.first_name);
    }

    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(data.last_name);
    }

    if (data.date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramIndex++}`);
      values.push(data.date_of_birth);
    }

    if (data.gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(data.gender);
    }

    // Always update version and last event info
    updates.push(`current_version = $${paramIndex++}`);
    values.push(event.aggregate_version);

    updates.push(`last_event_id = $${paramIndex++}`);
    values.push(event.event_id);

    updates.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    values.push(event.aggregate_id);

    const query = `
      UPDATE patients
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      throw new Error(`Patient not found for demographics update: ${event.aggregate_id}`);
    }

    logger.info('Patient demographics projection updated', {
      patient_id: event.aggregate_id,
      event_id: event.event_id,
      fields_updated: updates.length - 3,
    });
  }
}

// Export singleton instance
export const patientProjectionHandler = new PatientProjectionHandler();
