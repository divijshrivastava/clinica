import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * User Projection Handler
 *
 * Updates the `users` table based on user events
 */
export class UserProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'user_registered',
    'user_updated',
    'user_deactivated',
    'user_activated',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'user_registered':
        await this.handleUserRegistered(event, client);
        break;
      case 'user_updated':
        await this.handleUserUpdated(event, client);
        break;
      case 'user_deactivated':
        await this.handleUserDeactivated(event, client);
        break;
      case 'user_activated':
        await this.handleUserActivated(event, client);
        break;
      default:
        logger.warn('Unknown event type for user projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle user_registered event
   *
   * Creates a new user record
   */
  private async handleUserRegistered(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO users (
        id,
        hospital_id,
        email,
        password_hash,
        full_name,
        role,
        phone,
        registration_number,
        specialization,
        department,
        is_active,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )`,
      [
        event.aggregate_id,
        data.hospital_id,
        data.email,
        data.password_hash,
        data.full_name,
        data.role,
        data.phone || null,
        data.registration_number || null,
        data.specialization || null,
        data.department || null,
        data.is_active !== false,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('User projection created', {
      user_id: event.aggregate_id,
      hospital_id: data.hospital_id,
      email: data.email,
      event_id: event.event_id,
    });
  }

  /**
   * Handle user_updated event
   *
   * Updates user information
   */
  private async handleUserUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(data.full_name);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.registration_number !== undefined) {
      updates.push(`registration_number = $${paramIndex++}`);
      values.push(data.registration_number);
    }
    if (data.specialization !== undefined) {
      updates.push(`specialization = $${paramIndex++}`);
      values.push(data.specialization);
    }
    if (data.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(data.department);
    }
    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(data.settings));
    }

    if (updates.length === 0) {
      logger.warn('No updates provided in user_updated event', {
        user_id: event.aggregate_id,
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
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    logger.info('User projection updated', {
      user_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle user_deactivated event
   *
   * Deactivates a user
   */
  private async handleUserDeactivated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE users
       SET
         is_active = FALSE,
         current_version = $1,
         last_event_id = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('User projection deactivated', {
      user_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle user_activated event
   *
   * Activates a user
   */
  private async handleUserActivated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE users
       SET
         is_active = TRUE,
         current_version = $1,
         last_event_id = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('User projection activated', {
      user_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

