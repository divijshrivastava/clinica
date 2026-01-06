import { Command, CommandHandler, CommandResult } from '../event-sourcing/types';
import { CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';

/**
 * Complete Visit Payload
 */
interface CompleteVisitPayload {
  diagnosis?: string;
  treatment_notes?: string;
  follow_up_required?: boolean;
  follow_up_date?: string; // ISO 8601 date
  discharge_instructions?: string;
}

/**
 * Complete Visit Command Handler
 *
 * Marks a visit as completed with diagnosis and treatment notes
 */
export const completeVisitHandler: CommandHandler<CompleteVisitPayload> = {
  commandType: 'complete-visit',

  async handle(command: Command<CompleteVisitPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Ensure aggregate_id is provided
    if (!command.aggregate_id) {
      throw new CommandValidationError([
        { field: 'aggregate_id', error: 'required' },
      ]);
    }

    // Append visit_completed event to event store
    const event = await eventStore.appendEvent({
      event_type: 'visit_completed',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'visit',
      aggregate_version: 2,
      event_data: {
        diagnosis: command.payload.diagnosis,
        treatment_notes: command.payload.treatment_notes,
        follow_up_required: command.payload.follow_up_required || false,
        follow_up_date: command.payload.follow_up_date,
        discharge_instructions: command.payload.discharge_instructions,
        completed_at: new Date().toISOString(),
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: command.metadata?.hospital_id || '',
      causation_id: command.command_id,
      correlation_id: command.metadata?.correlation_id || command.command_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'visit',
      aggregate_version: event.aggregate_version,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate complete visit payload
 */
function validatePayload(payload: CompleteVisitPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // Diagnosis (optional)
  if (payload.diagnosis !== undefined && typeof payload.diagnosis !== 'string') {
    errors.push({ field: 'diagnosis', error: 'must be a string' });
  }

  // Treatment notes (optional)
  if (payload.treatment_notes !== undefined && typeof payload.treatment_notes !== 'string') {
    errors.push({ field: 'treatment_notes', error: 'must be a string' });
  }

  // Follow-up required (optional)
  if (payload.follow_up_required !== undefined && typeof payload.follow_up_required !== 'boolean') {
    errors.push({ field: 'follow_up_required', error: 'must be a boolean' });
  }

  // Follow-up date (optional)
  if (payload.follow_up_date !== undefined) {
    if (typeof payload.follow_up_date !== 'string') {
      errors.push({ field: 'follow_up_date', error: 'must be an ISO 8601 date string' });
    } else if (!isValidISO8601Date(payload.follow_up_date)) {
      errors.push({ field: 'follow_up_date', error: 'invalid ISO 8601 date format' });
    }
  }

  // Discharge instructions (optional)
  if (payload.discharge_instructions !== undefined && typeof payload.discharge_instructions !== 'string') {
    errors.push({ field: 'discharge_instructions', error: 'must be a string' });
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

/**
 * Validate ISO 8601 date format
 */
function isValidISO8601Date(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}
