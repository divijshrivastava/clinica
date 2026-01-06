import { Command, CommandHandler, CommandResult } from '../event-sourcing/types';
import { CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';

/**
 * Update Patient Contact Payload
 */
interface UpdatePatientContactPayload {
  phone?: string;
  email?: string;
  whatsapp_phone?: string;
  whatsapp_opted_in?: boolean;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

/**
 * Update Patient Contact Command Handler
 *
 * Updates patient contact information (phone, email, WhatsApp, address)
 */
export const updatePatientContactHandler: CommandHandler<UpdatePatientContactPayload> = {
  commandType: 'update-patient-contact',

  async handle(command: Command<UpdatePatientContactPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Ensure aggregate_id is provided
    if (!command.aggregate_id) {
      throw new CommandValidationError([
        { field: 'aggregate_id', error: 'required' },
      ]);
    }

    // Append patient_contact_updated event to event store
    const event = await eventStore.appendEvent({
      event_type: 'patient_contact_updated',
      event_schema_version: 1,
      aggregate_id: command.aggregate_id,
      aggregate_type: 'patient',
      aggregate_version: 2,
      event_data: {
        phone: command.payload.phone,
        email: command.payload.email,
        whatsapp_phone: command.payload.whatsapp_phone,
        whatsapp_opted_in: command.payload.whatsapp_opted_in,
        address: command.payload.address,
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
 * Validate update patient contact payload
 */
function validatePayload(payload: UpdatePatientContactPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // At least one field must be provided
  const hasAnyField =
    payload.phone !== undefined ||
    payload.email !== undefined ||
    payload.whatsapp_phone !== undefined ||
    payload.whatsapp_opted_in !== undefined ||
    payload.address !== undefined;

  if (!hasAnyField) {
    errors.push({
      field: 'payload',
      error: 'At least one field must be provided (phone, email, whatsapp_phone, whatsapp_opted_in, or address)',
    });
  }

  // Validate phone format (if provided)
  if (payload.phone !== undefined) {
    if (typeof payload.phone !== 'string') {
      errors.push({ field: 'phone', error: 'must be a string' });
    } else if (payload.phone && !isValidPhone(payload.phone)) {
      errors.push({
        field: 'phone',
        error: 'invalid_format (expected +91XXXXXXXXXX or empty string)',
      });
    }
  }

  // Validate email format (if provided)
  if (payload.email !== undefined) {
    if (typeof payload.email !== 'string') {
      errors.push({ field: 'email', error: 'must be a string' });
    } else if (payload.email && !isValidEmail(payload.email)) {
      errors.push({ field: 'email', error: 'invalid_format' });
    }
  }

  // Validate WhatsApp phone (if provided)
  if (payload.whatsapp_phone !== undefined) {
    if (typeof payload.whatsapp_phone !== 'string') {
      errors.push({ field: 'whatsapp_phone', error: 'must be a string' });
    } else if (payload.whatsapp_phone && !isValidPhone(payload.whatsapp_phone)) {
      errors.push({
        field: 'whatsapp_phone',
        error: 'invalid_format (expected +91XXXXXXXXXX or empty string)',
      });
    }
  }

  // Validate WhatsApp opted in (if provided)
  if (payload.whatsapp_opted_in !== undefined && typeof payload.whatsapp_opted_in !== 'boolean') {
    errors.push({ field: 'whatsapp_opted_in', error: 'must be a boolean' });
  }

  // Validate address (if provided)
  if (payload.address !== undefined) {
    if (typeof payload.address !== 'object' || payload.address === null) {
      errors.push({ field: 'address', error: 'must be an object' });
    } else {
      // Validate address fields (all optional)
      const addressFields = ['line1', 'line2', 'city', 'state', 'postal_code', 'country'];
      for (const field of addressFields) {
        const value = (payload.address as any)[field];
        if (value !== undefined && typeof value !== 'string') {
          errors.push({ field: `address.${field}`, error: 'must be a string' });
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

/**
 * Validate phone number format
 */
function isValidPhone(phone: string): boolean {
  if (phone === '') return true; // Allow empty string to clear field
  return /^\+91\d{10}$/.test(phone);
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (email === '') return true; // Allow empty string to clear field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
