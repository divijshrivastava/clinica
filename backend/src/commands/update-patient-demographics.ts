import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface UpdatePatientDemographicsPayload {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string; // ISO 8601 date
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

/**
 * Update Patient Demographics Command Handler
 *
 * Updates patient demographic information (name, DOB, gender)
 */
export const updatePatientDemographicsHandler: CommandHandler<UpdatePatientDemographicsPayload> = {
  commandType: 'update-patient-demographics',

  async handle(command: Command<UpdatePatientDemographicsPayload>): Promise<CommandResult> {
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

    // Create patient_demographics_updated event
    const event = await eventStore.appendEvent({
      event_type: 'patient_demographics_updated',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'patient',
      aggregate_version: nextVersion,
      event_data: {
        first_name: command.payload.first_name,
        last_name: command.payload.last_name,
        date_of_birth: command.payload.date_of_birth,
        gender: command.payload.gender,
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

    logger.info('Patient demographics updated', {
      patient_id: command.aggregate_id,
      event_id: event.event_id,
      fields_updated: Object.keys(command.payload).length,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'patient',
      aggregate_version: event.aggregate_version,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate update patient demographics payload
 */
function validatePayload(payload: UpdatePatientDemographicsPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // At least one field must be provided
  if (!payload.first_name && !payload.last_name && !payload.date_of_birth && !payload.gender) {
    errors.push({
      field: 'payload',
      error: 'At least one field (first_name, last_name, date_of_birth, gender) must be provided',
    });
  }

  // Validate date_of_birth format (ISO 8601 date)
  if (payload.date_of_birth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.date_of_birth)) {
      errors.push({
        field: 'date_of_birth',
        error: 'date_of_birth must be in ISO 8601 format (YYYY-MM-DD)',
      });
    }

    // Validate it's a valid date and not in the future
    const date = new Date(payload.date_of_birth);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'date_of_birth',
        error: 'date_of_birth is not a valid date',
      });
    } else if (date > new Date()) {
      errors.push({
        field: 'date_of_birth',
        error: 'date_of_birth cannot be in the future',
      });
    }
  }

  // Validate gender
  if (payload.gender) {
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!validGenders.includes(payload.gender)) {
      errors.push({
        field: 'gender',
        error: `gender must be one of: ${validGenders.join(', ')}`,
      });
    }
  }

  // Validate name fields
  if (payload.first_name !== undefined) {
    if (payload.first_name.length < 1) {
      errors.push({
        field: 'first_name',
        error: 'first_name cannot be empty',
      });
    }
    if (payload.first_name.length > 100) {
      errors.push({
        field: 'first_name',
        error: 'first_name must be 100 characters or less',
      });
    }
  }

  if (payload.last_name !== undefined) {
    if (payload.last_name.length < 1) {
      errors.push({
        field: 'last_name',
        error: 'last_name cannot be empty',
      });
    }
    if (payload.last_name.length > 100) {
      errors.push({
        field: 'last_name',
        error: 'last_name must be 100 characters or less',
      });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

