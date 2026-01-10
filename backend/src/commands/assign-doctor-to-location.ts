import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Assign Doctor to Location Payload
 */
export interface AssignDoctorToLocationPayload {
  doctor_profile_id: string;
  location_id: string;
  is_primary?: boolean;
}

/**
 * Assign Doctor to Location Command Handler
 *
 * Assigns a doctor to a specific location (for multi-location clinics)
 */
export const assignDoctorToLocationHandler: CommandHandler<AssignDoctorToLocationPayload> = {
  commandType: 'assign-doctor-to-location',

  async handle(command: Command<AssignDoctorToLocationPayload>): Promise<CommandResult> {
    logger.info('Handling assign-doctor-to-location command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
      location_id: command.payload.location_id,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Get current version of doctor profile aggregate
    const events = await eventStore.getAggregateEvents(command.payload.doctor_profile_id);

    if (events.length === 0) {
      throw new Error(`Doctor profile ${command.payload.doctor_profile_id} not found`);
    }

    const currentVersion = events[events.length - 1].aggregate_version;

    // Create doctor_location_assigned event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_profile',
      aggregate_id: command.payload.doctor_profile_id,
      aggregate_version: currentVersion + 1,
      event_type: 'doctor_location_assigned',
      event_schema_version: 1,
      event_data: {
        doctor_profile_id: command.payload.doctor_profile_id,
        location_id: command.payload.location_id,
        is_primary: command.payload.is_primary || false,
        assigned_at: new Date().toISOString(),
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

    logger.info('Doctor assigned to location successfully', {
      doctor_profile_id: command.payload.doctor_profile_id,
      location_id: command.payload.location_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.payload.doctor_profile_id,
      aggregate_type: 'doctor_profile',
      aggregate_version: currentVersion + 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate assign doctor to location payload
 */
function validatePayload(payload: AssignDoctorToLocationPayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  if (!payload.location_id || payload.location_id.trim() === '') {
    errors.push({ field: 'location_id', error: 'required' });
  }

  return errors;
}
