import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';

export interface CreateUserPayload {
  hospital_id: string;
  email: string;
  password: string;
  full_name: string;
  role: 'doctor' | 'nurse' | 'admin' | 'receptionist' | 'lab_technician';
  phone?: string;
  registration_number?: string;
  specialization?: string;
  department?: string;
  invited_by?: string; // User ID who sent the invitation
}

/**
 * Create User Command Handler
 *
 * Creates a new user account for a hospital
 */
export const createUserHandler: CommandHandler<CreateUserPayload> = {
  commandType: 'create-user',

  async handle(command: Command<CreateUserPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    const hospitalId = command.payload.hospital_id;
    const userId = command.aggregate_id || uuidv4();
    const createdByUserId = command.metadata?.user_id;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(command.payload.password, saltRounds);

    // Create user_registered event
    const event = await eventStore.appendEvent({
      aggregate_type: 'user',
      aggregate_id: userId,
      aggregate_version: 1,
      event_type: 'user_registered',
      event_schema_version: 1,
      event_data: {
        hospital_id: hospitalId,
        email: command.payload.email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: command.payload.full_name,
        role: command.payload.role,
        phone: command.payload.phone || null,
        registration_number: command.payload.registration_number || null,
        specialization: command.payload.specialization || null,
        department: command.payload.department || null,
        is_active: true,
        invited_by: command.payload.invited_by || null,
        registered_at: new Date().toISOString(),
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: hospitalId,
      idempotency_key: command.idempotency_key,
      correlation_id: command.metadata?.correlation_id || command.command_id,
      causation_id: command.command_id,
      caused_by_user_id: createdByUserId,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('User created successfully', {
      user_id: userId,
      hospital_id: hospitalId,
      email: command.payload.email,
      role: command.payload.role,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: userId,
      aggregate_type: 'user',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create user payload
 */
function validatePayload(payload: CreateUserPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // Validate hospital_id
  if (!payload.hospital_id) {
    errors.push({ field: 'hospital_id', error: 'required' });
  } else {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.hospital_id)) {
      errors.push({ field: 'hospital_id', error: 'must be a valid UUID' });
    }
  }

  // Validate email
  if (!payload.email || payload.email.trim().length === 0) {
    errors.push({ field: 'email', error: 'required' });
  } else {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
    if (!emailRegex.test(payload.email)) {
      errors.push({ field: 'email', error: 'must be a valid email address' });
    }
  }

  // Validate password
  if (!payload.password || payload.password.length < 8) {
    errors.push({ field: 'password', error: 'must be at least 8 characters' });
  }
  if (payload.password && payload.password.length > 128) {
    errors.push({ field: 'password', error: 'must be 128 characters or less' });
  }

  // Validate full_name
  if (!payload.full_name || payload.full_name.trim().length === 0) {
    errors.push({ field: 'full_name', error: 'required' });
  }
  if (payload.full_name && payload.full_name.length > 200) {
    errors.push({ field: 'full_name', error: 'must be 200 characters or less' });
  }

  // Validate role
  const validRoles = ['doctor', 'nurse', 'admin', 'receptionist', 'lab_technician'];
  if (!payload.role || !validRoles.includes(payload.role)) {
    errors.push({
      field: 'role',
      error: `must be one of: ${validRoles.join(', ')}`,
    });
  }

  // Validate phone if provided
  if (payload.phone && payload.phone.trim().length > 0) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(payload.phone)) {
      errors.push({ field: 'phone', error: 'must be a valid phone number' });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

