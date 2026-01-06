import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface RescheduleAppointmentPayload {
  scheduled_at: string; // ISO 8601 datetime
  duration_minutes?: number;
  reason?: string;
}

/**
 * Reschedule Appointment Command Handler
 *
 * Reschedules an existing appointment to a new time
 */
export const rescheduleAppointmentHandler: CommandHandler<RescheduleAppointmentPayload> = {
  commandType: 'reschedule-appointment',

  async handle(command: Command<RescheduleAppointmentPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Ensure aggregate_id is provided
    if (!command.aggregate_id) {
      throw new CommandValidationError([
        { field: 'aggregate_id', error: 'required' },
      ]);
    }

    const userId = command.metadata?.user_id;

    // Get current aggregate version
    const currentVersion = await eventStore.getAggregateVersion(command.aggregate_id);
    const nextVersion = currentVersion + 1;

    // Create appointment_rescheduled event
    const event = await eventStore.appendEvent({
      event_type: 'appointment_rescheduled',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'appointment',
      aggregate_version: nextVersion,
      event_data: {
        scheduled_at: command.payload.scheduled_at,
        duration_minutes: command.payload.duration_minutes || null,
        reason: command.payload.reason || null,
        rescheduled_at: new Date().toISOString(),
        rescheduled_by: userId || null,
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: command.metadata?.hospital_id || '',
      causation_id: command.command_id,
      correlation_id: command.metadata?.correlation_id || command.command_id,
      caused_by_user_id: userId,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('Appointment rescheduled', {
      appointment_id: command.aggregate_id,
      new_scheduled_at: command.payload.scheduled_at,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'appointment',
      aggregate_version: event.aggregate_version,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate reschedule appointment payload
 */
function validatePayload(payload: RescheduleAppointmentPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

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

