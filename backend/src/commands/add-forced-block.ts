import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Add Forced Block Payload
 */
export interface AddForcedBlockPayload {
  doctor_profile_id: string;
  start_datetime: string; // ISO 8601 datetime
  end_datetime: string; // ISO 8601 datetime
  reason: string;
  notes?: string;
}

/**
 * Add Forced Block Command Handler
 *
 * Adds an admin-only unavailability block for a doctor
 */
export const addForcedBlockHandler: CommandHandler<AddForcedBlockPayload> = {
  commandType: 'add-forced-block',

  async handle(command: Command<AddForcedBlockPayload>): Promise<CommandResult> {
    logger.info('Handling add-forced-block command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
      start_datetime: command.payload.start_datetime,
      end_datetime: command.payload.end_datetime,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const blockId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create forced_block_added event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_schedule',
      aggregate_id: blockId,
      aggregate_version: 1,
      event_type: 'forced_block_added',
      event_schema_version: 1,
      event_data: {
        block_id: blockId,
        doctor_profile_id: command.payload.doctor_profile_id,
        start_datetime: command.payload.start_datetime,
        end_datetime: command.payload.end_datetime,
        reason: command.payload.reason,
        notes: command.payload.notes || null,
        created_by: userId,
        created_at: new Date().toISOString(),
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

    logger.info('Forced block added successfully', {
      block_id: blockId,
      doctor_profile_id: command.payload.doctor_profile_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: blockId,
      aggregate_type: 'doctor_schedule',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate add forced block payload
 */
function validatePayload(payload: AddForcedBlockPayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  // Validate ISO 8601 datetime format
  const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateTimeRegex.test(payload.start_datetime)) {
    errors.push({ field: 'start_datetime', error: 'invalid format (expected ISO 8601)' });
  }

  if (!isoDateTimeRegex.test(payload.end_datetime)) {
    errors.push({ field: 'end_datetime', error: 'invalid format (expected ISO 8601)' });
  }

  // Validate end_datetime > start_datetime
  if (isoDateTimeRegex.test(payload.start_datetime) && isoDateTimeRegex.test(payload.end_datetime)) {
    const startDate = new Date(payload.start_datetime);
    const endDate = new Date(payload.end_datetime);

    if (endDate <= startDate) {
      errors.push({ field: 'end_datetime', error: 'must be after start_datetime' });
    }
  }

  if (!payload.reason || payload.reason.trim() === '') {
    errors.push({ field: 'reason', error: 'required' });
  }

  return errors;
}
