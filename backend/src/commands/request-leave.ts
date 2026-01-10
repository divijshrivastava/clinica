import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Request Leave Payload
 */
export interface RequestLeavePayload {
  doctor_profile_id: string;
  leave_type: 'sick' | 'vacation' | 'emergency' | 'conference' | 'other';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
  notes?: string;
}

/**
 * Request Leave Command Handler
 *
 * Submits a leave request for a doctor
 */
export const requestLeaveHandler: CommandHandler<RequestLeavePayload> = {
  commandType: 'request-leave',

  async handle(command: Command<RequestLeavePayload>): Promise<CommandResult> {
    logger.info('Handling request-leave command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
      start_date: command.payload.start_date,
      end_date: command.payload.end_date,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const leaveRequestId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create leave_requested event
    const event = await eventStore.appendEvent({
      aggregate_type: 'leave_request',
      aggregate_id: leaveRequestId,
      aggregate_version: 1,
      event_type: 'leave_requested',
      event_schema_version: 1,
      event_data: {
        leave_request_id: leaveRequestId,
        doctor_profile_id: command.payload.doctor_profile_id,
        leave_type: command.payload.leave_type,
        start_date: command.payload.start_date,
        end_date: command.payload.end_date,
        reason: command.payload.reason,
        notes: command.payload.notes || null,
        status: 'pending',
        requested_at: new Date().toISOString(),
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

    logger.info('Leave request created successfully', {
      leave_request_id: leaveRequestId,
      doctor_profile_id: command.payload.doctor_profile_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: leaveRequestId,
      aggregate_type: 'leave_request',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate request leave payload
 */
function validatePayload(payload: RequestLeavePayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  if (!payload.leave_type) {
    errors.push({ field: 'leave_type', error: 'required' });
  }

  const validLeaveTypes = ['sick', 'vacation', 'emergency', 'conference', 'other'];
  if (!validLeaveTypes.includes(payload.leave_type)) {
    errors.push({ field: 'leave_type', error: 'invalid leave type' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(payload.start_date)) {
    errors.push({ field: 'start_date', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  if (!dateRegex.test(payload.end_date)) {
    errors.push({ field: 'end_date', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  // Validate end_date >= start_date
  if (dateRegex.test(payload.start_date) && dateRegex.test(payload.end_date)) {
    const startDate = new Date(payload.start_date);
    const endDate = new Date(payload.end_date);

    if (endDate < startDate) {
      errors.push({ field: 'end_date', error: 'must be on or after start_date' });
    }
  }

  if (!payload.reason || payload.reason.trim() === '') {
    errors.push({ field: 'reason', error: 'required' });
  }

  return errors;
}
