import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface Medication {
  drug_name: string;
  dosage: string; // e.g., "500mg", "10ml"
  frequency: string; // e.g., "twice daily", "once a day"
  duration_days?: number;
  instructions?: string; // Additional instructions
  quantity?: number;
}

export interface CreatePrescriptionPayload {
  patient_id: string; // UUID
  visit_id?: string; // UUID (optional)
  diagnosis?: string;
  notes?: string;
  medications: Medication[];
  valid_until?: string; // ISO 8601 date
}

/**
 * Create Prescription Command Handler
 *
 * Creates a new prescription for a patient
 */
export const createPrescriptionHandler: CommandHandler<CreatePrescriptionPayload> = {
  commandType: 'create-prescription',

  async handle(command: Command<CreatePrescriptionPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    if (!userId) {
      throw new Error('user_id is required in command metadata');
    }

    // Generate prescription ID
    const prescriptionId = command.aggregate_id || uuidv4();

    // Generate prescription number (human-readable)
    const prescriptionNumber = `RX-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Create prescription_issued event
    const event = await eventStore.appendEvent({
      aggregate_type: 'prescription',
      aggregate_id: prescriptionId,
      aggregate_version: 1,
      event_type: 'prescription_issued',
      event_schema_version: 1,
      event_data: {
        patient_id: command.payload.patient_id,
        visit_id: command.payload.visit_id || null,
        doctor_id: userId,
        prescription_number: prescriptionNumber,
        medications: command.payload.medications,
        diagnosis: command.payload.diagnosis || null,
        notes: command.payload.notes || null,
        valid_until: command.payload.valid_until || null,
        issued_at: new Date().toISOString(),
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: hospitalId,
      idempotency_key: command.idempotency_key,
      correlation_id: command.metadata?.correlation_id || command.command_id,
      causation_id: command.command_id,
      caused_by_user_id: userId,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('Prescription created', {
      prescription_id: prescriptionId,
      prescription_number: prescriptionNumber,
      patient_id: command.payload.patient_id,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: prescriptionId,
      aggregate_type: 'prescription',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create prescription payload
 */
function validatePayload(payload: CreatePrescriptionPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // Validate patient_id (UUID format)
  if (!payload.patient_id) {
    errors.push({ field: 'patient_id', error: 'required' });
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.patient_id)) {
      errors.push({ field: 'patient_id', error: 'must be a valid UUID' });
    }
  }

  // Validate visit_id if provided
  if (payload.visit_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.visit_id)) {
      errors.push({ field: 'visit_id', error: 'must be a valid UUID' });
    }
  }

  // Validate medications array
  if (!payload.medications || !Array.isArray(payload.medications) || payload.medications.length === 0) {
    errors.push({
      field: 'medications',
      error: 'at least one medication is required',
    });
  } else {
    payload.medications.forEach((med, index) => {
      if (!med.drug_name || med.drug_name.trim().length === 0) {
        errors.push({
          field: `medications[${index}].drug_name`,
          error: 'required',
        });
      }

      if (!med.dosage || med.dosage.trim().length === 0) {
        errors.push({
          field: `medications[${index}].dosage`,
          error: 'required',
        });
      }

      if (!med.frequency || med.frequency.trim().length === 0) {
        errors.push({
          field: `medications[${index}].frequency`,
          error: 'required',
        });
      }

      if (med.duration_days !== undefined && med.duration_days < 1) {
        errors.push({
          field: `medications[${index}].duration_days`,
          error: 'must be at least 1 day',
        });
      }
    });
  }

  // Validate valid_until date if provided
  if (payload.valid_until) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(payload.valid_until)) {
      errors.push({
        field: 'valid_until',
        error: 'must be in ISO 8601 format (YYYY-MM-DD)',
      });
    } else {
      const date = new Date(payload.valid_until);
      if (isNaN(date.getTime())) {
        errors.push({
          field: 'valid_until',
          error: 'is not a valid date',
        });
      } else if (date < new Date()) {
        errors.push({
          field: 'valid_until',
          error: 'cannot be in the past',
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

