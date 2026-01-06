import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface DispensePrescriptionPayload {
  dispensed_by: string; // Pharmacy name or pharmacist name
  notes?: string;
}

/**
 * Dispense Prescription Command Handler
 *
 * Marks a prescription as dispensed
 */
export const dispensePrescriptionHandler: CommandHandler<DispensePrescriptionPayload> = {
  commandType: 'dispense-prescription',

  async handle(command: Command<DispensePrescriptionPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Ensure aggregate_id is provided
    if (!command.aggregate_id) {
      throw new CommandValidationError([
        { field: 'aggregate_id', error: 'required' },
      ]);
    }

    // Get current aggregate version
    const currentVersion = await eventStore.getAggregateVersion(command.aggregate_id);
    const nextVersion = currentVersion + 1;

    // Create prescription_dispensed event
    const event = await eventStore.appendEvent({
      event_type: 'prescription_dispensed',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'prescription',
      aggregate_version: nextVersion,
      event_data: {
        dispensed_by: command.payload.dispensed_by,
        notes: command.payload.notes || null,
        dispensed_at: new Date().toISOString(),
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: command.metadata?.hospital_id || '',
      causation_id: command.command_id,
      correlation_id: command.metadata?.correlation_id || command.command_id,
      caused_by_user_id: command.metadata?.user_id,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('Prescription dispensed', {
      prescription_id: command.aggregate_id,
      dispensed_by: command.payload.dispensed_by,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'prescription',
      aggregate_version: event.aggregate_version,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate dispense prescription payload
 */
function validatePayload(payload: DispensePrescriptionPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  if (!payload.dispensed_by || payload.dispensed_by.trim().length === 0) {
    errors.push({
      field: 'dispensed_by',
      error: 'required',
    });
  }

  if (payload.dispensed_by && payload.dispensed_by.length > 200) {
    errors.push({
      field: 'dispensed_by',
      error: 'must be 200 characters or less',
    });
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

