import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Assign Doctor to Department Payload
 */
export interface AssignDoctorToDepartmentPayload {
  doctor_profile_id: string;
  department_id: string;
  allocation_percentage?: number;
  is_primary?: boolean;
}

/**
 * Assign Doctor to Department Command Handler
 *
 * Assigns a doctor to a department with optional allocation percentage
 */
export const assignDoctorToDepartmentHandler: CommandHandler<AssignDoctorToDepartmentPayload> = {
  commandType: 'assign-doctor-to-department',

  async handle(command: Command<AssignDoctorToDepartmentPayload>): Promise<CommandResult> {
    logger.info('Handling assign-doctor-to-department command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
      department_id: command.payload.department_id,
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

    // Create doctor_department_assigned event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_profile',
      aggregate_id: command.payload.doctor_profile_id,
      aggregate_version: currentVersion + 1,
      event_type: 'doctor_department_assigned',
      event_schema_version: 1,
      event_data: {
        doctor_profile_id: command.payload.doctor_profile_id,
        department_id: command.payload.department_id,
        allocation_percentage: command.payload.allocation_percentage || 100.0,
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

    logger.info('Doctor assigned to department successfully', {
      doctor_profile_id: command.payload.doctor_profile_id,
      department_id: command.payload.department_id,
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
 * Validate assign doctor to department payload
 */
function validatePayload(payload: AssignDoctorToDepartmentPayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  if (!payload.department_id || payload.department_id.trim() === '') {
    errors.push({ field: 'department_id', error: 'required' });
  }

  if (
    payload.allocation_percentage !== undefined &&
    (payload.allocation_percentage < 0 || payload.allocation_percentage > 100)
  ) {
    errors.push({ field: 'allocation_percentage', error: 'must be between 0 and 100' });
  }

  return errors;
}
