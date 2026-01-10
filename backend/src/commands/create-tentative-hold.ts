import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Create Tentative Hold Payload
 */
export interface CreateTentativeHoldPayload {
  slot_id: string;
  patient_id?: string;
  hold_type: 'patient_booking' | 'admin_booking' | 'system_reservation';
  hold_duration_minutes?: number;
  notes?: string;
}

/**
 * Create Tentative Hold Command Handler
 *
 * Creates a temporary hold on a slot to prevent double-booking
 */
export const createTentativeHoldHandler: CommandHandler<CreateTentativeHoldPayload> = {
  commandType: 'create-tentative-hold',

  async handle(command: Command<CreateTentativeHoldPayload>): Promise<CommandResult> {
    logger.info('Handling create-tentative-hold command', {
      command_id: command.command_id,
      slot_id: command.payload.slot_id,
      hold_type: command.payload.hold_type,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const holdId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Determine hold duration based on type
    let holdDuration = command.payload.hold_duration_minutes;
    if (!holdDuration) {
      holdDuration = command.payload.hold_type === 'patient_booking' ? 10 : 30; // 10 mins for patients, 30 for admin
    }

    const expiresAt = new Date(Date.now() + holdDuration * 60000);

    // Create tentative_hold_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'appointment_slot',
      aggregate_id: holdId,
      aggregate_version: 1,
      event_type: 'tentative_hold_created',
      event_schema_version: 1,
      event_data: {
        hold_id: holdId,
        slot_id: command.payload.slot_id,
        patient_id: command.payload.patient_id || null,
        hold_type: command.payload.hold_type,
        held_by: userId,
        hold_duration_minutes: holdDuration,
        expires_at: expiresAt.toISOString(),
        notes: command.payload.notes || null,
        created_at: new Date().toISOString(),
      },
      event_metadata: {
        source: command.payload.hold_type === 'patient_booking' ? 'patient_portal' : 'admin_portal',
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

    logger.info('Tentative hold created successfully', {
      hold_id: holdId,
      slot_id: command.payload.slot_id,
      expires_at: expiresAt.toISOString(),
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: holdId,
      aggregate_type: 'appointment_slot',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create tentative hold payload
 */
function validatePayload(payload: CreateTentativeHoldPayload) {
  const errors = [];

  if (!payload.slot_id || payload.slot_id.trim() === '') {
    errors.push({ field: 'slot_id', error: 'required' });
  }

  if (!payload.hold_type) {
    errors.push({ field: 'hold_type', error: 'required' });
  }

  const validHoldTypes = ['patient_booking', 'admin_booking', 'system_reservation'];
  if (!validHoldTypes.includes(payload.hold_type)) {
    errors.push({ field: 'hold_type', error: 'invalid hold type' });
  }

  if (
    payload.hold_duration_minutes !== undefined &&
    (payload.hold_duration_minutes < 1 || payload.hold_duration_minutes > 60)
  ) {
    errors.push({ field: 'hold_duration_minutes', error: 'must be between 1 and 60 minutes' });
  }

  return errors;
}
