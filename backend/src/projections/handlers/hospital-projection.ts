import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Hospital Projection Handler
 *
 * Updates the `hospitals` table based on hospital events
 */
export class HospitalProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'hospital_created',
    'hospital_settings_updated',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'hospital_created':
        await this.handleHospitalCreated(event, client);
        break;
      case 'hospital_settings_updated':
        await this.handleHospitalSettingsUpdated(event, client);
        break;
      default:
        logger.warn('Unknown event type for hospital projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle hospital_created event
   *
   * Creates a new hospital record
   */
  private async handleHospitalCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO hospitals (
        id,
        name,
        license_number,
        license_type,
        max_users,
        max_patients,
        address,
        phone,
        email,
        timezone,
        settings,
        subscription_tier,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )`,
      [
        event.aggregate_id,
        data.name,
        data.license_number || null,
        data.license_type || null,
        data.max_users || null,
        data.max_patients || null,
        JSON.stringify(data.address || null),
        data.phone || null,
        data.email,
        data.timezone || 'Asia/Kolkata',
        JSON.stringify(data.settings || {}),
        data.subscription_tier || 'basic',
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Hospital projection created', {
      hospital_id: event.aggregate_id,
      name: data.name,
      event_id: event.event_id,
    });
  }

  /**
   * Handle hospital_settings_updated event
   *
   * Updates hospital settings
   */
  private async handleHospitalSettingsUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.license_number !== undefined) {
      updates.push(`license_number = $${paramIndex++}`);
      values.push(data.license_number);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(JSON.stringify(data.address));
    }
    if (data.timezone !== undefined) {
      updates.push(`timezone = $${paramIndex++}`);
      values.push(data.timezone);
    }
    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(data.settings));
    }
    if (data.subscription_tier !== undefined) {
      updates.push(`subscription_tier = $${paramIndex++}`);
      values.push(data.subscription_tier);
    }
    if (data.max_users !== undefined) {
      updates.push(`max_users = $${paramIndex++}`);
      values.push(data.max_users);
    }
    if (data.max_patients !== undefined) {
      updates.push(`max_patients = $${paramIndex++}`);
      values.push(data.max_patients);
    }

    if (updates.length === 0) {
      logger.warn('No updates provided in hospital_settings_updated event', {
        hospital_id: event.aggregate_id,
        event_id: event.event_id,
      });
      return;
    }

    updates.push(`current_version = $${paramIndex++}`);
    values.push(event.aggregate_version);
    updates.push(`last_event_id = $${paramIndex++}`);
    values.push(event.event_id);
    updates.push(`updated_at = NOW()`);
    values.push(event.aggregate_id);

    await client.query(
      `UPDATE hospitals
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    logger.info('Hospital projection updated', {
      hospital_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

