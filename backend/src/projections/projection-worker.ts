import { db } from '../database/pool';
import { Event } from '../event-sourcing/types';
import { eventDispatcher } from './event-dispatcher';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Projection Worker
 *
 * Continuously processes events from the event store and dispatches them to projection handlers
 */
export class ProjectionWorker {
  private running = false;
  private projectionName: string;
  private batchSize: number;
  private pollIntervalMs: number;

  constructor(
    projectionName: string = 'main',
    batchSize: number = config.eventSourcing.projectionBatchSize,
    pollIntervalMs: number = 1000
  ) {
    this.projectionName = projectionName;
    this.batchSize = batchSize;
    this.pollIntervalMs = pollIntervalMs;
  }

  /**
   * Start the projection worker
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Projection worker already running', {
        projection: this.projectionName,
      });
      return;
    }

    this.running = true;

    logger.info('Starting projection worker', {
      projection: this.projectionName,
      batch_size: this.batchSize,
      poll_interval_ms: this.pollIntervalMs,
    });

    // Start processing loop
    this.processLoop();
  }

  /**
   * Stop the projection worker
   */
  stop(): void {
    logger.info('Stopping projection worker', {
      projection: this.projectionName,
    });
    this.running = false;
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        const processedCount = await this.processBatch();

        if (processedCount === 0) {
          // No events to process, sleep longer
          await this.sleep(this.pollIntervalMs);
        } else {
          // Events were processed, check immediately for more
          await this.sleep(10);
        }
      } catch (error: any) {
        logger.error('Error in projection worker loop', {
          projection: this.projectionName,
          error: error.message,
          stack: error.stack,
        });

        // Sleep before retrying
        await this.sleep(5000);
      }
    }

    logger.info('Projection worker stopped', {
      projection: this.projectionName,
    });
  }

  /**
   * Process a batch of events
   *
   * @returns Number of events processed
   */
  private async processBatch(): Promise<number> {
    return await db.transaction(async (client) => {
      // Get current checkpoint
      const lastEventNumber = await this.getCheckpoint(client);

      // Fetch next batch of events
      const result = await client.query<Event>(
        `SELECT
          event_id,
          event_type,
          event_schema_version,
          aggregate_id,
          aggregate_type,
          aggregate_version,
          event_data,
          event_metadata,
          event_number,
          event_timestamp,
          hospital_id,
          causation_id,
          correlation_id
        FROM event_store
        WHERE event_number > $1
        ORDER BY event_number ASC
        LIMIT $2`,
        [lastEventNumber, this.batchSize]
      );

      const events = result.rows;

      if (events.length === 0) {
        return 0;
      }

      logger.debug('Processing event batch', {
        projection: this.projectionName,
        batch_size: events.length,
        from_event: events[0].event_number,
        to_event: events[events.length - 1].event_number,
      });

      // Process each event
      for (const event of events) {
        try {
          // Dispatch to all registered handlers
          await eventDispatcher.dispatch(event, client);

          // Update checkpoint after successful processing
          await this.updateCheckpoint(client, event.event_number);
        } catch (error: any) {
          logger.error('Failed to process event in projection worker', {
            projection: this.projectionName,
            event_id: event.event_id,
            event_type: event.event_type,
            event_number: event.event_number,
            error: error.message,
          });

          // Error is already logged to projection_errors by dispatcher
          // We update the checkpoint anyway to skip this event and continue
          await this.updateCheckpoint(client, event.event_number);
        }
      }

      logger.info('Processed event batch', {
        projection: this.projectionName,
        events_processed: events.length,
        last_event_number: events[events.length - 1].event_number,
      });

      return events.length;
    });
  }

  /**
   * Get current checkpoint (last processed event number)
   */
  private async getCheckpoint(client: any): Promise<number> {
    const result = await client.query(
      `SELECT last_event_number
       FROM projection_checkpoints
       WHERE projection_name = $1`,
      [this.projectionName]
    );

    if (result.rows.length === 0) {
      // Initialize checkpoint
      await client.query(
        `INSERT INTO projection_checkpoints (projection_name, last_event_number)
         VALUES ($1, 0)`,
        [this.projectionName]
      );
      return 0;
    }

    return result.rows[0].last_event_number;
  }

  /**
   * Update checkpoint
   */
  private async updateCheckpoint(
    client: any,
    eventNumber: number
  ): Promise<void> {
    await client.query(
      `UPDATE projection_checkpoints
       SET last_event_number = $1,
           last_processed_at = NOW()
       WHERE projection_name = $2`,
      [eventNumber, this.projectionName]
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<{
    running: boolean;
    projection_name: string;
    last_event_number: number;
    last_processed_at: Date | null;
    lag_events: number;
  }> {
    const checkpointResult = await db.query(
      `SELECT last_event_number, last_processed_at
       FROM projection_checkpoints
       WHERE projection_name = $1`,
      [this.projectionName]
    );

    const checkpoint = checkpointResult.rows[0] || {
      last_event_number: 0,
      last_processed_at: null,
    };

    // Get total events in store
    const totalResult = await db.query(
      `SELECT COALESCE(MAX(event_number), 0) as max_event_number
       FROM event_store`
    );

    const maxEventNumber = totalResult.rows[0].max_event_number;
    const lag = maxEventNumber - checkpoint.last_event_number;

    return {
      running: this.running,
      projection_name: this.projectionName,
      last_event_number: checkpoint.last_event_number,
      last_processed_at: checkpoint.last_processed_at,
      lag_events: lag,
    };
  }
}

// Export singleton instance
export const projectionWorker = new ProjectionWorker('main');
