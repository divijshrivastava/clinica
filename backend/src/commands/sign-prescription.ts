import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface SignPrescriptionPayload {
  signature_url?: string; // URL to signature image
  is_digital_signature?: boolean;
}

/**
 * Sign Prescription Command Handler
 *
 * Signs a prescription (digital signature)
 */
export const signPrescriptionHandler: CommandHandler<SignPrescriptionPayload> = {
  commandType: 'sign-prescription',

  async handle(command: Command<SignPrescriptionPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Ensure aggregate_id is provided
    if (!command.aggregate_id) {
      throw new CommandValidationError([
        { field: 'aggregate_id', error: 'required' },
      ]);
    }

    const userId = command.metadata?.user_id;
    if (!userId) {
      throw new Error('user_id is required in command metadata');
    }

    // Get current aggregate version
    const currentVersion = await eventStore.getAggregateVersion(command.aggregate_id);
    const nextVersion = currentVersion + 1;

    // Create prescription_signed event
    const event = await eventStore.appendEvent({
      event_type: 'prescription_signed',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'prescription',
      aggregate_version: nextVersion,
      event_data: {
        signature_url: command.payload.signature_url || null,
        is_digital_signature: command.payload.is_digital_signature ?? true,
        signed_at: new Date().toISOString(),
        signed_by: userId,
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

    logger.info('Prescription signed', {
      prescription_id: command.aggregate_id,
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
 * Validate sign prescription payload
 */
function validatePayload(payload: SignPrescriptionPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // If signature_url is provided, validate URL format
  if (payload.signature_url) {
    try {
      new URL(payload.signature_url);
    } catch {
      errors.push({
        field: 'signature_url',
        error: 'must be a valid URL',
      });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

