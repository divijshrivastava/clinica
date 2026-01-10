import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, Command, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Create Room Payload
 */
export interface CreateRoomPayload {
  location_id: string;
  room_number: string;
  room_name?: string;
  room_type: 'consultation' | 'examination' | 'procedure' | 'tele_consultation' | 'other';
  floor?: string;
  capacity?: number;
  has_video_equipment?: boolean;
  is_wheelchair_accessible?: boolean;
  amenities?: string[];
  notes?: string;
}

/**
 * Create Room Command Handler
 *
 * Creates a new consultation room
 */
export const createRoomHandler: CommandHandler<CreateRoomPayload> = {
  commandType: 'create-room',

  async handle(command: Command<CreateRoomPayload>): Promise<CommandResult> {
    logger.info('Handling create-room command', {
      command_id: command.command_id,
      room_number: command.payload.room_number,
      location_id: command.payload.location_id,
    });

    // Validate payload
    const validationErrors = validatePayload(command.payload);
    if (validationErrors.length > 0) {
      throw new CommandValidationError(validationErrors);
    }

    const roomId = uuidv4();
    const hospitalId = command.metadata?.hospital_id;
    const userId = command.metadata?.user_id;

    if (!hospitalId) {
      throw new Error('hospital_id is required in command metadata');
    }

    // Create room_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'room',
      aggregate_id: roomId,
      aggregate_version: 1,
      event_type: 'room_created',
      event_schema_version: 1,
      event_data: {
        room_id: roomId,
        location_id: command.payload.location_id,
        room_number: command.payload.room_number,
        room_name: command.payload.room_name || null,
        room_type: command.payload.room_type,
        floor: command.payload.floor || null,
        capacity: command.payload.capacity || 1,
        has_video_equipment: command.payload.has_video_equipment || false,
        is_wheelchair_accessible: command.payload.is_wheelchair_accessible || false,
        amenities: command.payload.amenities || [],
        is_active: true,
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

    logger.info('Room created successfully', {
      room_id: roomId,
      room_number: command.payload.room_number,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: roomId,
      aggregate_type: 'room',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create room payload
 */
function validatePayload(payload: CreateRoomPayload) {
  const errors = [];

  if (!payload.location_id || payload.location_id.trim() === '') {
    errors.push({ field: 'location_id', error: 'required' });
  }

  if (!payload.room_number || payload.room_number.trim() === '') {
    errors.push({ field: 'room_number', error: 'required' });
  }

  if (!payload.room_type) {
    errors.push({ field: 'room_type', error: 'required' });
  }

  const validRoomTypes = ['consultation', 'examination', 'procedure', 'tele_consultation', 'other'];
  if (!validRoomTypes.includes(payload.room_type)) {
    errors.push({ field: 'room_type', error: 'invalid room type' });
  }

  if (payload.capacity !== undefined && payload.capacity < 1) {
    errors.push({ field: 'capacity', error: 'must be at least 1' });
  }

  return errors;
}
