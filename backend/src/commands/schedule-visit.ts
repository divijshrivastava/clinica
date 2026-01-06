import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult } from '../event-sourcing/types';
import { CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';

/**
 * Schedule Visit Payload
 */
interface ScheduleVisitPayload {
  patient_id: string;
  visit_type: 'consultation' | 'follow_up' | 'procedure' | 'emergency';
  chief_complaint: string;
  scheduled_at?: string; // ISO 8601 datetime
  priority?: 'routine' | 'urgent' | 'emergency';
  notes?: string;
}

/**
 * Schedule Visit Command Handler
 *
 * Creates a new visit for a patient
 */
export const scheduleVisitHandler: CommandHandler<ScheduleVisitPayload> = {
  commandType: 'schedule-visit',

  async handle(command: Command<ScheduleVisitPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Generate visit ID (aggregate_id)
    const visitId = command.aggregate_id || uuidv4();

    // Append visit_scheduled event to event store
    const event = await eventStore.appendEvent({
      event_type: 'visit_scheduled',
      event_schema_version: 1,
      aggregate_id: visitId,
      aggregate_type: 'visit',
      aggregate_version: 1,
      event_data: {
        patient_id: command.payload.patient_id,
        visit_type: command.payload.visit_type,
        chief_complaint: command.payload.chief_complaint,
        scheduled_at: command.payload.scheduled_at || new Date().toISOString(),
        priority: command.payload.priority || 'routine',
        notes: command.payload.notes,
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
      aggregate_id: visitId,
      aggregate_type: 'visit',
      aggregate_version: event.aggregate_version,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate schedule visit payload
 */
function validatePayload(payload: ScheduleVisitPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // Patient ID is required
  if (!payload.patient_id) {
    errors.push({ field: 'patient_id', error: 'required' });
  } else if (typeof payload.patient_id !== 'string') {
    errors.push({ field: 'patient_id', error: 'must be a string' });
  } else if (!isValidUUID(payload.patient_id)) {
    errors.push({ field: 'patient_id', error: 'must be a valid UUID' });
  }

  // Visit type is required
  if (!payload.visit_type) {
    errors.push({ field: 'visit_type', error: 'required' });
  } else if (!['consultation', 'follow_up', 'procedure', 'emergency'].includes(payload.visit_type)) {
    errors.push({
      field: 'visit_type',
      error: 'must be one of: consultation, follow_up, procedure, emergency',
    });
  }

  // Chief complaint is required
  if (!payload.chief_complaint) {
    errors.push({ field: 'chief_complaint', error: 'required' });
  } else if (typeof payload.chief_complaint !== 'string') {
    errors.push({ field: 'chief_complaint', error: 'must be a string' });
  } else if (payload.chief_complaint.trim().length === 0) {
    errors.push({ field: 'chief_complaint', error: 'cannot be empty' });
  }

  // Scheduled at (optional)
  if (payload.scheduled_at !== undefined) {
    if (typeof payload.scheduled_at !== 'string') {
      errors.push({ field: 'scheduled_at', error: 'must be an ISO 8601 datetime string' });
    } else if (!isValidISO8601(payload.scheduled_at)) {
      errors.push({ field: 'scheduled_at', error: 'invalid ISO 8601 datetime format' });
    }
  }

  // Priority (optional)
  if (payload.priority !== undefined && !['routine', 'urgent', 'emergency'].includes(payload.priority)) {
    errors.push({
      field: 'priority',
      error: 'must be one of: routine, urgent, emergency',
    });
  }

  // Notes (optional)
  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    errors.push({ field: 'notes', error: 'must be a string' });
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Validate ISO 8601 datetime format
 */
function isValidISO8601(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}
