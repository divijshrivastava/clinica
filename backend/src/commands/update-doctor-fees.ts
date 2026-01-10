import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Update Doctor Fees Payload
 */
export interface UpdateDoctorFeesPayload {
  doctor_profile_id: string;
  consultation_fee?: number;
  follow_up_fee?: number;
  tele_consultation_fee?: number;
  currency?: string;
}

/**
 * Update Doctor Fees Command Handler
 *
 * Updates the consultation fees for a doctor profile
 */
export const updateDoctorFeesHandler: CommandHandler<UpdateDoctorFeesPayload> = {
  commandType: 'update-doctor-fees',

  async handle(command: Command<UpdateDoctorFeesPayload>): Promise<CommandResult> {
    logger.info('Handling update-doctor-fees command', {
      command_id: command.command_id,
      doctor_profile_id: command.payload.doctor_profile_id,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const doctorProfileId = command.payload.doctor_profile_id;
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Get current aggregate version
    const currentVersion = await eventStore.getAggregateVersion(doctorProfileId);
    const newVersion = currentVersion + 1;

    // Create doctor_fees_updated event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_profile',
      aggregate_id: doctorProfileId,
      aggregate_version: newVersion,
      event_type: 'doctor_fees_updated',
      event_schema_version: 1,
      event_data: {
        doctor_profile_id: doctorProfileId,
        consultation_fee: command.payload.consultation_fee,
        follow_up_fee: command.payload.follow_up_fee,
        tele_consultation_fee: command.payload.tele_consultation_fee,
        currency: command.payload.currency || 'INR',
        updated_at: new Date().toISOString(),
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

    logger.info('Doctor fees updated successfully', {
      doctor_profile_id: doctorProfileId,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: doctorProfileId,
      aggregate_type: 'doctor_profile',
      aggregate_version: newVersion,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate update fees payload
 */
function validatePayload(payload: UpdateDoctorFeesPayload) {
  const errors = [];

  if (!payload.doctor_profile_id || payload.doctor_profile_id.trim() === '') {
    errors.push({ field: 'doctor_profile_id', error: 'required' });
  }

  // At least one fee must be provided
  if (
    payload.consultation_fee === undefined &&
    payload.follow_up_fee === undefined &&
    payload.tele_consultation_fee === undefined
  ) {
    errors.push({ field: 'fees', error: 'at least one fee must be provided' });
  }

  // Validate fees are non-negative
  if (payload.consultation_fee !== undefined && payload.consultation_fee < 0) {
    errors.push({ field: 'consultation_fee', error: 'must be non-negative' });
  }

  if (payload.follow_up_fee !== undefined && payload.follow_up_fee < 0) {
    errors.push({ field: 'follow_up_fee', error: 'must be non-negative' });
  }

  if (payload.tele_consultation_fee !== undefined && payload.tele_consultation_fee < 0) {
    errors.push({ field: 'tele_consultation_fee', error: 'must be non-negative' });
  }

  return errors;
}
