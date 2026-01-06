import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Patient Registration Payload
 */
export interface RegisterPatientPayload {
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  whatsapp_phone?: string;
  whatsapp_opted_in?: boolean;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
  };
}

/**
 * Register Patient Command Handler
 *
 * Creates a new patient aggregate and emits patient_registered event
 */
export const registerPatientHandler: CommandHandler<RegisterPatientPayload> = {
  commandType: 'register-patient',

  async handle(command: Command<RegisterPatientPayload>): Promise<CommandResult> {
    logger.info('Handling register-patient command', {
      command_id: command.command_id,
      mrn: command.payload.mrn,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    // Generate patient ID
    const patientId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // TODO: Check if MRN already exists in hospital
    // This would require querying the patients projection
    // For now, we rely on database unique constraint

    // Create patient_registered event
    const event = await eventStore.appendEvent({
      aggregate_type: 'patient',
      aggregate_id: patientId,
      aggregate_version: 1,
      event_type: 'patient_registered',
      event_schema_version: 1,
      event_data: {
        mrn: command.payload.mrn,
        first_name: command.payload.first_name,
        last_name: command.payload.last_name,
        date_of_birth: command.payload.date_of_birth,
        gender: command.payload.gender,
        phone: command.payload.phone,
        email: command.payload.email || null,
        whatsapp_phone: command.payload.whatsapp_phone || command.payload.phone,
        whatsapp_opted_in: command.payload.whatsapp_opted_in ?? true,
        address: command.payload.address || null,
        registered_at: new Date().toISOString(),
      },
      event_metadata: {
        source: 'registration_desk',
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

    logger.info('Patient registered successfully', {
      patient_id: patientId,
      mrn: command.payload.mrn,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: patientId,
      aggregate_type: 'patient',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate registration payload
 */
function validatePayload(payload: RegisterPatientPayload) {
  const errors = [];

  // Required fields
  if (!payload.mrn || payload.mrn.trim() === '') {
    errors.push({ field: 'mrn', error: 'required' });
  }

  if (!payload.first_name || payload.first_name.trim() === '') {
    errors.push({ field: 'first_name', error: 'required' });
  }

  if (!payload.last_name || payload.last_name.trim() === '') {
    errors.push({ field: 'last_name', error: 'required' });
  }

  if (!payload.date_of_birth) {
    errors.push({ field: 'date_of_birth', error: 'required' });
  } else {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.date_of_birth)) {
      errors.push({ field: 'date_of_birth', error: 'invalid_format (expected YYYY-MM-DD)' });
    }
  }

  if (!payload.gender) {
    errors.push({ field: 'gender', error: 'required' });
  } else if (!['male', 'female', 'other'].includes(payload.gender)) {
    errors.push({ field: 'gender', error: 'invalid (must be male, female, or other)' });
  }

  if (!payload.phone || payload.phone.trim() === '') {
    errors.push({ field: 'phone', error: 'required' });
  } else {
    // Validate phone format (basic check for +91 followed by 10 digits)
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(payload.phone)) {
      errors.push({ field: 'phone', error: 'invalid_format (expected +91XXXXXXXXXX)' });
    }
  }

  // Optional email validation
  if (payload.email && payload.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      errors.push({ field: 'email', error: 'invalid_format' });
    }
  }

  // MRN format validation (must match schema pattern)
  if (payload.mrn) {
    const mrnRegex = /^MRN-\d{4}-\d{6}$/;
    if (!mrnRegex.test(payload.mrn)) {
      errors.push({
        field: 'mrn',
        error: 'invalid_format (expected MRN-YYYY-XXXXXX, e.g., MRN-2026-001234)'
      });
    }
  }

  return errors;
}
