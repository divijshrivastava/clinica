import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Activate Doctor Payload
 */
export interface ActivateDoctorPayload {
  doctor_profile_id: string;
  is_bookable?: boolean;
  accepts_online_bookings?: boolean;
  public_profile_visible?: boolean;
  bookability_score?: number;
}

/**
 * Activate Doctor Command Handler
 *
 * Activates a doctor profile, making them available for bookings
 */
export const activateDoctorHandler: CommandHandler<ActivateDoctorPayload> = {
  commandType: 'activate-doctor',

  async handle(command: Command<ActivateDoctorPayload>): Promise<CommandResult> {
    logger.info('Handling activate-doctor command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
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
    const events = await eventStore.getEvents({
      aggregate_id: command.payload.doctor_profile_id,
      aggregate_type: 'doctor_profile',
    });

    if (events.length === 0) {
      throw new Error(`Doctor profile ${command.payload.doctor_profile_id} not found`);
    }

    const currentVersion = events[events.length - 1].aggregate_version;

    // Create doctor_activated event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_profile',
      aggregate_id: command.payload.doctor_profile_id,
      aggregate_version: currentVersion + 1,
      event_type: 'doctor_activated',
      event_schema_version: 1,
      event_data: {
        doctor_profile_id: command.payload.doctor_profile_id,
        is_bookable: command.payload.is_bookable !== undefined ? command.payload.is_bookable : true,
        accepts_online_bookings:
          command.payload.accepts_online_bookings !== undefined
            ? command.payload.accepts_online_bookings
            : true,
        public_profile_visible:
          command.payload.public_profile_visible !== undefined
            ? command.payload.public_profile_visible
            : true,
        bookability_score:
          command.payload.bookability_score !== undefined ? command.payload.bookability_score : 100.0,
        activated_at: new Date().toISOString(),
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

    logger.info('Doctor activated successfully', {
      doctor_profile_id: command.payload.doctor_profile_id,
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
 * Validate activate doctor payload
 */
function validatePayload(payload: ActivateDoctorPayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  if (
    payload.bookability_score !== undefined &&
    (payload.bookability_score < 0 || payload.bookability_score > 100)
  ) {
    errors.push({ field: 'bookability_score', error: 'must be between 0 and 100' });
  }

  return errors;
}
