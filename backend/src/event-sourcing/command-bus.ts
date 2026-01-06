import { db } from '../database/pool';
import { logger } from '../utils/logger';
import { eventStore } from './event-store';
import {
  Command,
  CommandResult,
  CommandHandler,
  ConcurrencyConflictError,
  IdempotencyKeyConflictError,
} from './types';

/**
 * Command Bus - Central orchestrator for command handling
 *
 * Responsibilities:
 * 1. Check idempotency
 * 2. Load aggregate
 * 3. Check expected version (optimistic concurrency)
 * 4. Execute command handler (business logic)
 * 5. Append events to event store
 * 6. Return result
 */
export class CommandBus {
  private handlers: Map<string, CommandHandler> = new Map();

  /**
   * Register a command handler
   */
  registerHandler(handler: CommandHandler): void {
    if (this.handlers.has(handler.commandType)) {
      throw new Error(`Handler for command ${handler.commandType} already registered`);
    }
    this.handlers.set(handler.commandType, handler);
    logger.info(`Registered command handler: ${handler.commandType}`);
  }

  /**
   * Handle a command
   * Returns command result with events
   */
  async handle<TPayload = any>(
    command: Command<TPayload>
  ): Promise<CommandResult> {
    const startTime = Date.now();

    logger.info('Handling command', {
      command_id: command.command_id,
      command_type: command.command_type,
      aggregate_id: command.aggregate_id,
      idempotency_key: command.idempotency_key,
    });

    try {
      // 1. Check idempotency
      if (command.idempotency_key) {
        try {
          const existingEvent = await eventStore.getEventByIdempotencyKey(command.idempotency_key);

          // Return original result (HTTP 200, not an error)
          logger.info('Duplicate command detected (idempotency)', {
            command_id: command.command_id,
            idempotency_key: command.idempotency_key,
            original_event_id: existingEvent.event_id,
          });

          return {
            command_id: command.command_id,
            aggregate_id: existingEvent.aggregate_id,
            aggregate_type: existingEvent.aggregate_type,
            aggregate_version: existingEvent.aggregate_version,
            events: [existingEvent],
            status: 'accepted',
            processed_at: existingEvent.event_timestamp,
          };
        } catch (error) {
          // No existing event found - continue with command processing
        }
      }

      // 2. Get command handler
      const handler = this.handlers.get(command.command_type);
      if (!handler) {
        throw new Error(`No handler registered for command: ${command.command_type}`);
      }

      // 3. Execute within transaction
      const result = await db.transaction(async (client) => {
        // Set session variables for RLS
        if (command.metadata?.hospital_id) {
          await db.setSessionVariables(client, {
            current_hospital_id: command.metadata.hospital_id,
            current_user_id: command.metadata.user_id || '',
          });
        }

        // 4. Check expected version (optimistic concurrency)
        if (command.expected_version !== undefined && command.aggregate_id) {
          const currentVersion = await eventStore.getAggregateVersion(command.aggregate_id);

          if (currentVersion !== command.expected_version) {
            throw new ConcurrencyConflictError(
              command.expected_version,
              currentVersion,
              command.aggregate_id
            );
          }
        }

        // 5. Execute command handler (business logic)
        const commandResult = await handler.handle(command);

        return commandResult;
      });

      const duration = Date.now() - startTime;
      logger.info('Command handled successfully', {
        command_id: command.command_id,
        command_type: command.command_type,
        aggregate_id: result.aggregate_id,
        aggregate_version: result.aggregate_version,
        events_count: result.events.length,
        duration_ms: duration,
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ConcurrencyConflictError) {
        logger.warn('Concurrency conflict detected', {
          command_id: command.command_id,
          aggregate_id: error.aggregateId,
          expected_version: error.expectedVersion,
          actual_version: error.actualVersion,
        });
        throw error;
      }

      if (error instanceof IdempotencyKeyConflictError) {
        logger.warn('Idempotency key conflict (duplicate command)', {
          command_id: command.command_id,
          idempotency_key: error.idempotencyKey,
        });
        throw error;
      }

      logger.error('Command handling failed', {
        command_id: command.command_id,
        command_type: command.command_type,
        error,
        duration_ms: duration,
      });

      throw error;
    }
  }

  /**
   * Get registered handlers
   */
  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Export singleton instance
export const commandBus = new CommandBus();
