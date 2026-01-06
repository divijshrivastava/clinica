import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface ConfirmAppointmentPayload {
  confirmed_by?: string; // Who confirmed (patient, receptionist, etc.)
}

/**
 * Confirm Appointment Command Handler
 *
 * Confirms a scheduled appointment
 */
export const confirmAppointmentHandler: CommandHandler<ConfirmAppointmentPayload> = {
  commandType: 'confirm-appointment',

  async handle(command: Command<ConfirmAppointmentPayload>): Promise<CommandResult> {
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

    // Create appointment_confirmed event
    const event = await eventStore.appendEvent({
      event_type: 'appointment_confirmed',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'appointment',
      aggregate_version: nextVersion,
      event_data: {
        confirmed_by: command.payload?.confirmed_by || null,
        confirmed_at: new Date().toISOString(),
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

    logger.info('Appointment confirmed', {
      appointment_id: command.aggregate_id,
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

