import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Block Slot Payload
 */
export interface BlockSlotPayload {
  slot_id: string;
  reason: string;
  notes?: string;
}

/**
 * Block Slot Command Handler
 *
 * Blocks a specific appointment slot
 */
export const blockSlotHandler: CommandHandler<BlockSlotPayload> = {
  commandType: 'block-slot',

  async handle(command: Command<BlockSlotPayload>): Promise<CommandResult> {
    logger.info('Handling block-slot command', {
      command_id: command.command_id,
      slot_id: command.payload.slot_id,
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

    // Get current version of slot aggregate
    const events = await eventStore.getAggregateEvents(command.payload.slot_id);

    if (events.length === 0) {
      throw new Error(`Slot ${command.payload.slot_id} not found`);
    }

    const currentVersion = events[events.length - 1].aggregate_version;

    // Create slot_blocked event
    const event = await eventStore.appendEvent({
      aggregate_type: 'appointment_slot',
      aggregate_id: command.payload.slot_id,
      aggregate_version: currentVersion + 1,
      event_type: 'slot_blocked',
      event_schema_version: 1,
      event_data: {
        slot_id: command.payload.slot_id,
        reason: command.payload.reason,
        blocked_by: userId,
        notes: command.payload.notes || null,
        blocked_at: new Date().toISOString(),
      },
      event_metadata: {
        source: 'admin_portal',
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

    logger.info('Slot blocked successfully', {
      slot_id: command.payload.slot_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.payload.slot_id,
      aggregate_type: 'appointment_slot',
      aggregate_version: currentVersion + 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate block slot payload
 */
function validatePayload(payload: BlockSlotPayload) {
  const errors = [];

  if (!payload.slot_id || payload.slot_id.trim() === '') {
    errors.push({ field: 'slot_id', error: 'required' });
  }

  if (!payload.reason || payload.reason.trim() === '') {
    errors.push({ field: 'reason', error: 'required' });
  }

  return errors;
}
