import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface ScheduleAppointmentPayload {
  patient_id: string; // UUID
  doctor_id: string; // UUID
  scheduled_at: string; // ISO 8601 datetime
  duration_minutes?: number; // Default: 30
  appointment_type?: string;
  reason?: string;
  notes?: string;
}

/**
 * Schedule Appointment Command Handler
 *
 * Creates a new appointment for a patient
 */
export const scheduleAppointmentHandler: CommandHandler<ScheduleAppointmentPayload> = {
  commandType: 'schedule-appointment',

  async handle(command: Command<ScheduleAppointmentPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Generate appointment ID
    const appointmentId = command.aggregate_id || uuidv4();

    // Create appointment_scheduled event
    const event = await eventStore.appendEvent({
      aggregate_type: 'appointment',
      aggregate_id: appointmentId,
      aggregate_version: 1,
      event_type: 'appointment_scheduled',
      event_schema_version: 1,
      event_data: {
        patient_id: command.payload.patient_id,
        doctor_id: command.payload.doctor_id,
        scheduled_at: command.payload.scheduled_at,
        duration_minutes: command.payload.duration_minutes || 30,
        appointment_type: command.payload.appointment_type || null,
        reason: command.payload.reason || null,
        notes: command.payload.notes || null,
        scheduled_by: userId || null,
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: hospitalId,
      idempotency_key: command.idempotency_key,
      correlation_id: command.metadata?.correlation_id || command.command_id,
      causation_id: command.command_id,
      caused_by_user_id: userId,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('Appointment scheduled', {
      appointment_id: appointmentId,
      patient_id: command.payload.patient_id,
      doctor_id: command.payload.doctor_id,
      scheduled_at: command.payload.scheduled_at,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: appointmentId,
      aggregate_type: 'appointment',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate schedule appointment payload
 */
function validatePayload(payload: ScheduleAppointmentPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // Validate patient_id (UUID format)
  if (!payload.patient_id) {
    errors.push({ field: 'patient_id', error: 'required' });
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.patient_id)) {
      errors.push({ field: 'patient_id', error: 'must be a valid UUID' });
    }
  }

  // Validate doctor_id (UUID format)
  if (!payload.doctor_id) {
    errors.push({ field: 'doctor_id', error: 'required' });
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.doctor_id)) {
      errors.push({ field: 'doctor_id', error: 'must be a valid UUID' });
    }
  }

  // Validate scheduled_at (ISO 8601 datetime)
  if (!payload.scheduled_at) {
    errors.push({ field: 'scheduled_at', error: 'required' });
  } else {
    const date = new Date(payload.scheduled_at);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'scheduled_at',
        error: 'must be a valid ISO 8601 datetime',
      });
    } else if (date < new Date()) {
      errors.push({
        field: 'scheduled_at',
        error: 'cannot be in the past',
      });
    }
  }

  // Validate duration_minutes
  if (payload.duration_minutes !== undefined) {
    if (payload.duration_minutes < 5) {
      errors.push({
        field: 'duration_minutes',
        error: 'must be at least 5 minutes',
      });
    }
    if (payload.duration_minutes > 480) {
      errors.push({
        field: 'duration_minutes',
        error: 'must be at most 480 minutes (8 hours)',
      });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

