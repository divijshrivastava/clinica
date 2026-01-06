import { Event } from '../event-sourcing/types';
import { ProjectionHandler } from './types';
import { logger } from '../utils/logger';
import { db } from '../database/pool';
import { PoolClient } from 'pg';

/**
 * Event Dispatcher
 *
 * Routes events to appropriate projection handlers
 * Handles errors and logs to projection_errors table
 */
class EventDispatcher {
  private handlers: Map<string, ProjectionHandler[]> = new Map();

  /**
   * Register a projection handler
   */
  registerHandler(handler: ProjectionHandler): void {
    for (const eventType of handler.eventTypes) {
      const existingHandlers = this.handlers.get(eventType) || [];
      existingHandlers.push(handler);
      this.handlers.set(eventType, existingHandlers);
    }

    logger.info('Registered projection handler', {
      eventTypes: handler.eventTypes,
      handlerName: handler.constructor.name,
    });
  }

  /**
   * Dispatch event to all registered handlers
   *
   * @param event - Event to dispatch
   * @param client - Optional database client for transaction support
   */
  async dispatch(event: Event, client?: PoolClient): Promise<void> {
    const handlers = this.handlers.get(event.event_type) || [];

    if (handlers.length === 0) {
      logger.debug('No handlers registered for event type', {
        event_type: event.event_type,
        event_id: event.event_id,
      });
      return;
    }

    logger.debug('Dispatching event to projection handlers', {
      event_type: event.event_type,
      event_id: event.event_id,
      handler_count: handlers.length,
    });

    // Process each handler
    for (const handler of handlers) {
      await this.processHandler(event, handler, client);
    }
  }

  /**
   * Process a single handler
   */
  private async processHandler(
    event: Event,
    handler: ProjectionHandler,
    client?: PoolClient
  ): Promise<void> {
    const projectionName = handler.constructor.name;

    try {
      // Execute handler
      if (client) {
        await handler.handle(event, client);
      } else {
        // Create new transaction for this handler
        await db.transaction(async (txClient) => {
          await handler.handle(event, txClient);
        });
      }

      logger.debug('Projection handler processed event successfully', {
        projection: projectionName,
        event_type: event.event_type,
        event_id: event.event_id,
      });
    } catch (error: any) {
      logger.error('Projection handler failed', {
        projection: projectionName,
        event_type: event.event_type,
        event_id: event.event_id,
        error: error.message,
      });

      // Log to projection_errors table
      await this.logProjectionError(event, projectionName, error);

      // Don't throw - we want to continue processing other handlers
      // The error is logged for manual intervention
    }
  }

  /**
   * Log projection error to database
   */
  private async logProjectionError(
    event: Event,
    projectionName: string,
    error: Error
  ): Promise<void> {
    try {
      // Just insert the error (no uniqueness constraint in the schema)
      await db.query(
        `INSERT INTO projection_errors (
          event_id,
          event_number,
          event_type,
          projection_name,
          error_message,
          error_details
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.event_id,
          event.event_number,
          event.event_type,
          projectionName,
          error.message,
          JSON.stringify({ stack: error.stack }),
        ]
      );
    } catch (logError: any) {
      // If we can't even log the error, just log to console
      logger.error('Failed to log projection error to database', {
        projection: projectionName,
        event_id: event.event_id,
        original_error: error.message,
        log_error: logError.message,
      });
    }
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): string[] {
    const handlerNames = new Set<string>();
    for (const handlers of this.handlers.values()) {
      for (const handler of handlers) {
        handlerNames.add(handler.constructor.name);
      }
    }
    return Array.from(handlerNames);
  }
}

// Export singleton instance
export const eventDispatcher = new EventDispatcher();
