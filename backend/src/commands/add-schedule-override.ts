import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Add Schedule Override Payload
 */
export interface AddScheduleOverridePayload {
  doctor_profile_id: string;
  location_id: string;
  override_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  slot_duration_minutes?: number;
  buffer_time_minutes?: number;
  max_appointments_per_slot?: number;
  consultation_mode?: 'in_person' | 'tele_consultation' | 'both';
  reason?: string;
}

/**
 * Add Schedule Override Command Handler
 *
 * Adds a specific date override to a doctor's schedule
 */
export const addScheduleOverrideHandler: CommandHandler<AddScheduleOverridePayload> = {
  commandType: 'add-schedule-override',

  async handle(command: Command<AddScheduleOverridePayload>): Promise<CommandResult> {
    logger.info('Handling add-schedule-override command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
      override_date: command.payload.override_date,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const overrideId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create schedule_override_added event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_schedule',
      aggregate_id: overrideId,
      aggregate_version: 1,
      event_type: 'schedule_override_added',
      event_schema_version: 1,
      event_data: {
        override_id: overrideId,
        doctor_profile_id: command.payload.doctor_profile_id,
        location_id: command.payload.location_id,
        override_date: command.payload.override_date,
        start_time: command.payload.start_time,
        end_time: command.payload.end_time,
        slot_duration_minutes: command.payload.slot_duration_minutes || 30,
        buffer_time_minutes: command.payload.buffer_time_minutes || 0,
        max_appointments_per_slot: command.payload.max_appointments_per_slot || 1,
        consultation_mode: command.payload.consultation_mode || 'in_person',
        reason: command.payload.reason || null,
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

    logger.info('Schedule override added successfully', {
      override_id: overrideId,
      doctor_profile_id: command.payload.doctor_profile_id,
      override_date: command.payload.override_date,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: overrideId,
      aggregate_type: 'doctor_schedule',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate add schedule override payload
 */
function validatePayload(payload: AddScheduleOverridePayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  if (!payload.location_id || payload.location_id.trim() === '') {
    errors.push({ field: 'location_id', error: 'required' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(payload.override_date)) {
    errors.push({ field: 'override_date', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(payload.start_time)) {
    errors.push({ field: 'start_time', error: 'invalid format (expected HH:MM)' });
  }

  if (!timeRegex.test(payload.end_time)) {
    errors.push({ field: 'end_time', error: 'invalid format (expected HH:MM)' });
  }

  // Validate end_time > start_time
  if (timeRegex.test(payload.start_time) && timeRegex.test(payload.end_time)) {
    const [startHour, startMin] = payload.start_time.split(':').map(Number);
    const [endHour, endMin] = payload.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      errors.push({ field: 'end_time', error: 'must be after start_time' });
    }
  }

  return errors;
}
