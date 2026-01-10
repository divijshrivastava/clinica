import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Reject Leave Payload
 */
export interface RejectLeavePayload {
  leave_request_id: string;
  rejection_reason: string;
  rejector_notes?: string;
}

/**
 * Reject Leave Command Handler
 *
 * Rejects a pending leave request
 */
export const rejectLeaveHandler: CommandHandler<RejectLeavePayload> = {
  commandType: 'reject-leave',

  async handle(command: Command<RejectLeavePayload>): Promise<CommandResult> {
    logger.info('Handling reject-leave command', {
      command_id: command.command_id,
      leave_request_id: command.payload.leave_request_id,
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

    // Get current version of leave request aggregate
    const events = await eventStore.getAggregateEvents(command.payload.leave_request_id);

    if (events.length === 0) {
      throw new Error(`Leave request ${command.payload.leave_request_id} not found`);
    }

    const currentVersion = events[events.length - 1].aggregate_version;

    // Check if leave is in pending status
    const lastEvent = events[events.length - 1];
    if (lastEvent.event_data.status && lastEvent.event_data.status !== 'pending') {
      throw new Error(`Leave request is not in pending status. Current status: ${lastEvent.event_data.status}`);
    }

    // Create leave_rejected event
    const event = await eventStore.appendEvent({
      aggregate_type: 'leave_request',
      aggregate_id: command.payload.leave_request_id,
      aggregate_version: currentVersion + 1,
      event_type: 'leave_rejected',
      event_schema_version: 1,
      event_data: {
        leave_request_id: command.payload.leave_request_id,
        rejected_by: userId,
        rejection_reason: command.payload.rejection_reason,
        rejector_notes: command.payload.rejector_notes || null,
        rejected_at: new Date().toISOString(),
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

    logger.info('Leave request rejected successfully', {
      leave_request_id: command.payload.leave_request_id,
      rejected_by: userId,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: command.payload.leave_request_id,
      aggregate_type: 'leave_request',
      aggregate_version: currentVersion + 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate reject leave payload
 */
function validatePayload(payload: RejectLeavePayload) {
  const errors = [];

  if (!payload.leave_request_id || payload.leave_request_id.trim() === '') {
    errors.push({ field: 'leave_request_id', error: 'required' });
  }

  if (!payload.rejection_reason || payload.rejection_reason.trim() === '') {
    errors.push({ field: 'rejection_reason', error: 'required' });
  }

  return errors;
}
