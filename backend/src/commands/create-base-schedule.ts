import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Create Base Schedule Payload
 */
export interface CreateBaseSchedulePayload {
  doctor_profile_id: string;
  location_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  slot_duration_minutes: number;
  buffer_time_minutes?: number;
  max_appointments_per_slot?: number;
  consultation_mode?: 'in_person' | 'tele_consultation' | 'both';
  max_in_person_capacity?: number;
  max_tele_capacity?: number;
  effective_from?: string; // YYYY-MM-DD
  effective_until?: string; // YYYY-MM-DD
}

/**
 * Create Base Schedule Command Handler
 *
 * Creates a recurring weekly schedule for a doctor
 */
export const createBaseScheduleHandler: CommandHandler<CreateBaseSchedulePayload> = {
  commandType: 'create-base-schedule',

  async handle(command: Command<CreateBaseSchedulePayload>): Promise<CommandResult> {
    logger.info('Handling create-base-schedule command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
      day_of_week: command.payload.day_of_week,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const scheduleId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create base_schedule_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_schedule',
      aggregate_id: scheduleId,
      aggregate_version: 1,
      event_type: 'base_schedule_created',
      event_schema_version: 1,
      event_data: {
        schedule_id: scheduleId,
        doctor_profile_id: command.payload.doctor_profile_id,
        location_id: command.payload.location_id,
        day_of_week: command.payload.day_of_week,
        start_time: command.payload.start_time,
        end_time: command.payload.end_time,
        slot_duration_minutes: command.payload.slot_duration_minutes,
        buffer_time_minutes: command.payload.buffer_time_minutes || 0,
        max_appointments_per_slot: command.payload.max_appointments_per_slot || 1,
        consultation_mode: command.payload.consultation_mode || 'in_person',
        max_in_person_capacity: command.payload.max_in_person_capacity || command.payload.max_appointments_per_slot || 1,
        max_tele_capacity: command.payload.max_tele_capacity || 0,
        effective_from: command.payload.effective_from || new Date().toISOString().split('T')[0],
        effective_until: command.payload.effective_until || null,
        is_active: true,
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

    logger.info('Base schedule created successfully', {
      schedule_id: scheduleId,
      doctor_profile_id: command.payload.doctor_profile_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: scheduleId,
      aggregate_type: 'doctor_schedule',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create base schedule payload
 */
function validatePayload(payload: CreateBaseSchedulePayload) {
  const errors = [];

  // Required fields
  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  if (!payload.location_id || payload.location_id.trim() === '') {
    errors.push({ field: 'location_id', error: 'required' });
  }

  // Validate day_of_week
  if (payload.day_of_week < 0 || payload.day_of_week > 6) {
    errors.push({ field: 'day_of_week', error: 'must be between 0 (Sunday) and 6 (Saturday)' });
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

  // Validate slot_duration_minutes
  if (!payload.slot_duration_minutes || payload.slot_duration_minutes < 5) {
    errors.push({ field: 'slot_duration_minutes', error: 'must be at least 5 minutes' });
  }

  if (payload.slot_duration_minutes > 480) {
    errors.push({ field: 'slot_duration_minutes', error: 'cannot exceed 480 minutes (8 hours)' });
  }

  // Validate buffer_time
  if (payload.buffer_time_minutes !== undefined && payload.buffer_time_minutes < 0) {
    errors.push({ field: 'buffer_time_minutes', error: 'must be non-negative' });
  }

  // Validate capacities
  if (payload.max_appointments_per_slot !== undefined && payload.max_appointments_per_slot < 1) {
    errors.push({ field: 'max_appointments_per_slot', error: 'must be at least 1' });
  }

  // Validate dates
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (payload.effective_from && !dateRegex.test(payload.effective_from)) {
    errors.push({ field: 'effective_from', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  if (payload.effective_until && !dateRegex.test(payload.effective_until)) {
    errors.push({ field: 'effective_until', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  return errors;
}
