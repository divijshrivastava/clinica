import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Create Doctor Profile Payload
 */
export interface CreateDoctorProfilePayload {
  user_id: string;
  display_name?: string;
  salutation?: string;
  bio?: string;
  profile_image_url?: string;
  years_of_experience?: number;
  registration_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  specialties: string[];
  qualifications: Array<{
    degree: string;
    institution: string;
    year: number;
    specialization?: string;
  }>;
  languages?: string[];
  consultation_modes?: ('in_person' | 'tele_consultation' | 'both')[];
  consultation_fee?: number;
  follow_up_fee?: number;
  tele_consultation_fee?: number;
  tags?: string[];
}

/**
 * Create Doctor Profile Command Handler
 *
 * Creates a new doctor profile aggregate and emits doctor_profile_created event
 * Also initiates the onboarding workflow
 */
export const createDoctorProfileHandler: CommandHandler<CreateDoctorProfilePayload> = {
  commandType: 'create-doctor-profile',

  async handle(command: Command<CreateDoctorProfilePayload>): Promise<CommandResult> {
    logger.info('Handling create-doctor-profile command', {
      command_id: command.command_id,
      user_id: command.payload.user_id,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    // Generate doctor profile ID
    const doctorProfileId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create doctor_profile_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'doctor_profile',
      aggregate_id: doctorProfileId,
      aggregate_version: 1,
      event_type: 'doctor_profile_created',
      event_schema_version: 1,
      event_data: {
        doctor_profile_id: doctorProfileId,
        user_id: command.payload.user_id,
        display_name: command.payload.display_name || null,
        salutation: command.payload.salutation || null,
        bio: command.payload.bio || null,
        profile_image_url: command.payload.profile_image_url || null,
        years_of_experience: command.payload.years_of_experience || null,
        registration_number: command.payload.registration_number || null,
        license_number: command.payload.license_number || null,
        license_expiry_date: command.payload.license_expiry_date || null,
        specialties: command.payload.specialties,
        qualifications: command.payload.qualifications,
        languages: command.payload.languages || ['English'],
        consultation_modes: command.payload.consultation_modes || ['in_person'],
        consultation_fee: command.payload.consultation_fee || null,
        follow_up_fee: command.payload.follow_up_fee || null,
        tele_consultation_fee: command.payload.tele_consultation_fee || null,
        tags: command.payload.tags || [],
        status: 'draft',
        is_bookable: false,
        accepts_online_bookings: false,
        public_profile_visible: false,
        bookability_score: 0.0,
        created_at: new Date().toISOString(),
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

    logger.info('Doctor profile created successfully', {
      doctor_profile_id: doctorProfileId,
      user_id: command.payload.user_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: doctorProfileId,
      aggregate_type: 'doctor_profile',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create doctor profile payload
 */
function validatePayload(payload: CreateDoctorProfilePayload) {
  const errors = [];

  // Required fields
  if (!payload.user_id || payload.user_id.trim() === '') {
    errors.push({ field: 'user_id', error: 'required' });
  }

  if (!payload.specialties || payload.specialties.length === 0) {
    errors.push({ field: 'specialties', error: 'required (at least one specialty)' });
  }

  if (!payload.qualifications || payload.qualifications.length === 0) {
    errors.push({ field: 'qualifications', error: 'required (at least one qualification)' });
  }

  // Validate qualifications
  if (payload.qualifications) {
    payload.qualifications.forEach((qual, index) => {
      if (!qual.degree) {
        errors.push({ field: `qualifications[${index}].degree`, error: 'required' });
      }
      if (!qual.institution) {
        errors.push({ field: `qualifications[${index}].institution`, error: 'required' });
      }
      if (!qual.year || qual.year < 1950 || qual.year > new Date().getFullYear()) {
        errors.push({ field: `qualifications[${index}].year`, error: 'invalid year' });
      }
    });
  }

  // Validate license expiry date if provided
  if (payload.license_expiry_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.license_expiry_date)) {
      errors.push({ field: 'license_expiry_date', error: 'invalid_format (expected YYYY-MM-DD)' });
    }
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
