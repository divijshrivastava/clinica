import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Create Equipment Payload
 */
export interface CreateEquipmentPayload {
  location_id: string;
  equipment_name: string;
  equipment_type: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  purchase_date?: string; // YYYY-MM-DD
  warranty_expiry_date?: string; // YYYY-MM-DD
  requires_calibration?: boolean;
  calibration_frequency_days?: number;
  is_portable?: boolean;
  notes?: string;
}

/**
 * Create Equipment Command Handler
 *
 * Creates a new equipment record
 */
export const createEquipmentHandler: CommandHandler<CreateEquipmentPayload> = {
  commandType: 'create-equipment',

  async handle(command: Command<CreateEquipmentPayload>): Promise<CommandResult> {
    logger.info('Handling create-equipment command', {
      command_id: command.command_id,
      equipment_name: command.payload.equipment_name,
      location_id: command.payload.location_id,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const equipmentId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create equipment_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'equipment',
      aggregate_id: equipmentId,
      aggregate_version: 1,
      event_type: 'equipment_created',
      event_schema_version: 1,
      event_data: {
        equipment_id: equipmentId,
        location_id: command.payload.location_id,
        equipment_name: command.payload.equipment_name,
        equipment_type: command.payload.equipment_type,
        serial_number: command.payload.serial_number || null,
        manufacturer: command.payload.manufacturer || null,
        model: command.payload.model || null,
        purchase_date: command.payload.purchase_date || null,
        warranty_expiry_date: command.payload.warranty_expiry_date || null,
        requires_calibration: command.payload.requires_calibration || false,
        calibration_frequency_days: command.payload.calibration_frequency_days || null,
        is_portable: command.payload.is_portable || false,
        status: 'active',
        notes: command.payload.notes || null,
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

    logger.info('Equipment created successfully', {
      equipment_id: equipmentId,
      equipment_name: command.payload.equipment_name,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: equipmentId,
      aggregate_type: 'equipment',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create equipment payload
 */
function validatePayload(payload: CreateEquipmentPayload) {
  const errors = [];

  if (!payload.location_id || payload.location_id.trim() === '') {
    errors.push({ field: 'location_id', error: 'required' });
  }

  if (!payload.equipment_name || payload.equipment_name.trim() === '') {
    errors.push({ field: 'equipment_name', error: 'required' });
  }

  if (!payload.equipment_type || payload.equipment_type.trim() === '') {
    errors.push({ field: 'equipment_type', error: 'required' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (payload.purchase_date && !dateRegex.test(payload.purchase_date)) {
    errors.push({ field: 'purchase_date', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  if (payload.warranty_expiry_date && !dateRegex.test(payload.warranty_expiry_date)) {
    errors.push({ field: 'warranty_expiry_date', error: 'invalid format (expected YYYY-MM-DD)' });
  }

  if (payload.calibration_frequency_days !== undefined && payload.calibration_frequency_days < 1) {
    errors.push({ field: 'calibration_frequency_days', error: 'must be at least 1' });
  }

  return errors;
}
