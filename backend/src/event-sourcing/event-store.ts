import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/pool';
import { logger } from '../utils/logger';
import {
  Event,
  ConcurrencyConflictError,
  IdempotencyKeyConflictError,
} from './types';

/**
 * Event Store Repository
 * Handles all interactions with the event_store table
 */
export class EventStore {
  /**
   * Append a new event to the event store
   * Throws ConcurrencyConflictError if version mismatch
   * Throws IdempotencyKeyConflictError if duplicate idempotency key
   */
  async appendEvent(
    event: Omit<Event, 'event_id' | 'event_number' | 'event_timestamp'>,
    client?: PoolClient
  ): Promise<Event> {
    const eventId = uuidv4();
    const now = new Date();

    const queryFn = client ? client.query.bind(client) : db.query.bind(db);

    try {
      const result = await queryFn<Event>(
        `INSERT INTO event_store (
          event_id,
          aggregate_type,
          aggregate_id,
          aggregate_version,
          event_type,
          event_schema_version,
          event_data,
          event_metadata,
          hospital_id,
          correlation_id,
          causation_id,
          event_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          eventId,
          event.aggregate_type,
          event.aggregate_id,
          event.aggregate_version,
          event.event_type,
          event.event_schema_version,
          JSON.stringify(event.event_data),
          JSON.stringify(event.event_metadata),
          event.hospital_id,
          event.correlation_id,
          event.causation_id,
          now,
        ]
      );

      logger.info('Event appended', {
        event_id: eventId,
        event_type: event.event_type,
        aggregate_id: event.aggregate_id,
        aggregate_version: event.aggregate_version,
      });

      return result.rows[0];
    } catch (error: any) {
      // Handle optimistic concurrency conflict
      if (error.code === '23505' && error.constraint === 'event_store_aggregate_id_aggregate_version_key') {
        const currentVersion = await this.getAggregateVersion(event.aggregate_id);
        throw new ConcurrencyConflictError(
          event.aggregate_version,
          currentVersion,
          event.aggregate_id
        );
      }

      // Handle idempotency key conflict
      if (error.code === '23505' && error.constraint === 'event_store_idempotency_key_key') {
        // This is actually OK - return original result
        const originalEvent = await this.getEventByIdempotencyKey(event.idempotency_key!);
        throw new IdempotencyKeyConflictError(event.idempotency_key!, {
          command_id: event.correlation_id || '',
          aggregate_id: originalEvent.aggregate_id,
          aggregate_type: originalEvent.aggregate_type,
          aggregate_version: originalEvent.aggregate_version,
          events: [originalEvent],
          status: 'accepted',
          processed_at: originalEvent.event_timestamp,
        });
      }

      throw error;
    }
  }

  /**
   * Get current version of an aggregate
   */
  async getAggregateVersion(aggregateId: string): Promise<number> {
    const result = await db.query<{ version: number }>(
      'SELECT get_aggregate_version($1) as version',
      [aggregateId]
    );

    return result.rows[0]?.version || 0;
  }

  /**
   * Get all events for an aggregate
   */
  async getAggregateEvents(
    aggregateId: string,
    fromVersion: number = 0
  ): Promise<Event[]> {
    const result = await db.query<Event>(
      `SELECT * FROM get_aggregate_events($1, $2)`,
      [aggregateId, fromVersion]
    );

    return result.rows.map(row => ({
      ...row,
      event_data: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
      event_metadata: typeof row.event_metadata === 'string' ? JSON.parse(row.event_metadata) : row.event_metadata,
    }));
  }

  /**
   * Get event by idempotency key
   */
  async getEventByIdempotencyKey(idempotencyKey: string): Promise<Event> {
    const result = await db.query<Event>(
      `SELECT * FROM event_store WHERE idempotency_key = $1`,
      [idempotencyKey]
    );

    if (result.rows.length === 0) {
      throw new Error(`No event found with idempotency key: ${idempotencyKey}`);
    }

    const row = result.rows[0];
    return {
      ...row,
      event_data: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
      event_metadata: typeof row.event_metadata === 'string' ? JSON.parse(row.event_metadata) : row.event_metadata,
    };
  }

  /**
   * Get events for projection catch-up
   */
  async getProjectionCatchupEvents(
    projectionName: string,
    batchSize: number = 1000
  ): Promise<Event[]> {
    const result = await db.query<Event>(
      `SELECT * FROM get_projection_catchup_events($1, $2)`,
      [projectionName, batchSize]
    );

    return result.rows.map(row => ({
      ...row,
      event_data: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
      event_metadata: typeof row.event_metadata === 'string' ? JSON.parse(row.event_metadata) : row.event_metadata,
    }));
  }

  /**
   * Mark events as processed by projection
   */
  async markEventsProcessed(
    projectionName: string,
    eventNumber: number
  ): Promise<void> {
    await db.query(
      `SELECT mark_events_processed($1, $2)`,
      [projectionName, eventNumber]
    );
  }

  /**
   * Create aggregate snapshot
   */
  async createSnapshot<T = any>(
    aggregateId: string,
    snapshotData: T
  ): Promise<string> {
    const result = await db.query<{ snapshot_id: string }>(
      `SELECT create_aggregate_snapshot($1, $2) as snapshot_id`,
      [aggregateId, JSON.stringify(snapshotData)]
    );

    return result.rows[0].snapshot_id;
  }

  /**
   * Get aggregate with snapshot (faster loading)
   */
  async getAggregateWithSnapshot<T = any>(
    aggregateId: string
  ): Promise<{ snapshot_data: T | null; snapshot_version: number; events: Event[] }> {
    const result = await db.query<{
      snapshot_data: T | null;
      snapshot_version: number;
      events: any;
    }>(
      `SELECT * FROM get_aggregate_with_snapshot($1)`,
      [aggregateId]
    );

    const row = result.rows[0];

    if (!row || !row.snapshot_data) {
      return {
        snapshot_data: null,
        snapshot_version: 0,
        events: [],
      };
    }

    // Parse events array
    const events = row.events ? (Array.isArray(row.events) ? row.events : JSON.parse(row.events)) : [];

    return {
      snapshot_data: row.snapshot_data,
      snapshot_version: row.snapshot_version,
      events: events.map((e: any) => ({
        ...e,
        event_data: typeof e.event_data === 'string' ? JSON.parse(e.event_data) : e.event_data,
        event_metadata: typeof e.event_metadata === 'string' ? JSON.parse(e.event_metadata) : e.event_metadata,
      })),
    };
  }

  /**
   * Check projection lag
   */
  async checkProjectionLag(): Promise<{
    projection_name: string;
    lag_events: number;
    lag_seconds: number;
    is_rebuilding: boolean;
    error_count: number;
  }[]> {
    const result = await db.query(
      `SELECT * FROM check_projection_lag()`
    );

    return result.rows;
  }
}

// Export singleton instance
export const eventStore = new EventStore();
