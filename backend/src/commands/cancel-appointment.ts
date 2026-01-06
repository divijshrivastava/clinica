import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface CancelAppointmentPayload {
  cancellation_reason: string;
}

/**
 * Cancel Appointment Command Handler
 *
 * Cancels a scheduled appointment
 */
export const cancelAppointmentHandler: CommandHandler<CancelAppointmentPayload> = {
  commandType: 'cancel-appointment',

  async handle(command: Command<CancelAppointmentPayload>): Promise<CommandResult> {
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

    // Create appointment_cancelled event
    const event = await eventStore.appendEvent({
      event_type: 'appointment_cancelled',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'appointment',
      aggregate_version: nextVersion,
      event_data: {
        cancellation_reason: command.payload.cancellation_reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId || null,
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

    logger.info('Appointment cancelled', {
      appointment_id: command.aggregate_id,
      reason: command.payload.cancellation_reason,
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
 * Validate cancel appointment payload
 */
function validatePayload(payload: CancelAppointmentPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  if (!payload.cancellation_reason || payload.cancellation_reason.trim().length === 0) {
    errors.push({
      field: 'cancellation_reason',
      error: 'required',
    });
  }

  if (payload.cancellation_reason && payload.cancellation_reason.length > 500) {
    errors.push({
      field: 'cancellation_reason',
      error: 'must be 500 characters or less',
    });
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

