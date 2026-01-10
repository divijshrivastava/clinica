import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Release Tentative Hold Payload
 */
export interface ReleaseTentativeHoldPayload {
  hold_id: string;
  release_reason: 'user_cancelled' | 'booking_completed' | 'expired' | 'admin_override';
  notes?: string;
}

/**
 * Release Tentative Hold Command Handler
 *
 * Releases a tentative hold on a slot
 */
export const releaseTentativeHoldHandler: CommandHandler<ReleaseTentativeHoldPayload> = {
  commandType: 'release-tentative-hold',

  async handle(command: Command<ReleaseTentativeHoldPayload>): Promise<CommandResult> {
    logger.info('Handling release-tentative-hold command', {
      command_id: command.command_id,
      hold_id: command.payload.hold_id,
      release_reason: command.payload.release_reason,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Get current version of hold aggregate
    const events = await eventStore.getEvents({
      aggregate_id: command.payload.hold_id,
      aggregate_type: 'appointment_slot',
    });

    if (events.length === 0) {
      throw new Error(`Hold ${command.payload.hold_id} not found`);
    }

    const currentVersion = events[events.length - 1].aggregate_version;

    // Determine event type based on release reason
    const eventType =
      command.payload.release_reason === 'expired' ? 'tentative_hold_expired' : 'tentative_hold_released';

    // Create tentative_hold_released or tentative_hold_expired event
    const event = await eventStore.appendEvent({
      aggregate_type: 'appointment_slot',
      aggregate_id: command.payload.hold_id,
      aggregate_version: currentVersion + 1,
      event_type: eventType,
      event_schema_version: 1,
      event_data: {
        hold_id: command.payload.hold_id,
        release_reason: command.payload.release_reason,
        released_by: userId,
        notes: command.payload.notes || null,
        released_at: new Date().toISOString(),
      },
      event_metadata: {
        source: 'system',
        ...command.metadata,
      },
      hospital_id: hospitalId,
      idempotency_key: command.idempotency_key,
      correlation_id: command.command_id,
      causation_id: command.command_id,
      caused_by_user_id: userId,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('Tentative hold released successfully', {
      hold_id: command.payload.hold_id,
      release_reason: command.payload.release_reason,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.payload.hold_id,
      aggregate_type: 'appointment_slot',
      aggregate_version: currentVersion + 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate release tentative hold payload
 */
function validatePayload(payload: ReleaseTentativeHoldPayload) {
  const errors = [];

  if (!payload.hold_id || payload.hold_id.trim() === '') {
    errors.push({ field: 'hold_id', error: 'required' });
  }

  if (!payload.release_reason) {
    errors.push({ field: 'release_reason', error: 'required' });
  }

  const validReasons = ['user_cancelled', 'booking_completed', 'expired', 'admin_override'];
  if (!validReasons.includes(payload.release_reason)) {
    errors.push({ field: 'release_reason', error: 'invalid release reason' });
  }

  return errors;
}
