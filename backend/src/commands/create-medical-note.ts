import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface CreateMedicalNotePayload {
  patient_id: string; // UUID
  visit_id?: string; // UUID (optional)
  note_type: 'handwritten' | 'typed' | 'template' | 'voice';
  title?: string;
  content?: string; // For typed notes or OCR output
  image_urls?: string[]; // For handwritten notes (camera captures)
  audio_url?: string; // For voice notes
  template_id?: string; // UUID (if using template)
}

/**
 * Create Medical Note Command Handler
 *
 * Creates a new medical note for a patient
 */
export const createMedicalNoteHandler: CommandHandler<CreateMedicalNotePayload> = {
  commandType: 'create-medical-note',

  async handle(command: Command<CreateMedicalNotePayload>): Promise<CommandResult> {
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

    // Generate note ID
    const noteId = command.aggregate_id || uuidv4();

    // Create note_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'medical_note',
      aggregate_id: noteId,
      aggregate_version: 1,
      event_type: 'note_created',
      event_schema_version: 1,
      event_data: {
        patient_id: command.payload.patient_id,
        visit_id: command.payload.visit_id || null,
        note_type: command.payload.note_type,
        title: command.payload.title || null,
        content: command.payload.content || null,
        image_urls: command.payload.image_urls || [],
        audio_url: command.payload.audio_url || null,
        template_id: command.payload.template_id || null,
        created_by: userId,
        created_at: new Date().toISOString(),
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

    logger.info('Medical note created', {
      note_id: noteId,
      patient_id: command.payload.patient_id,
      note_type: command.payload.note_type,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: noteId,
      aggregate_type: 'medical_note',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate create medical note payload
 */
function validatePayload(payload: CreateMedicalNotePayload): void {
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

  // Validate note_type
  const validNoteTypes = ['handwritten', 'typed', 'template', 'voice'];
  if (!payload.note_type || !validNoteTypes.includes(payload.note_type)) {
    errors.push({
      field: 'note_type',
      error: `must be one of: ${validNoteTypes.join(', ')}`,
    });
  }

  // Validate content based on note_type
  if (payload.note_type === 'typed' && !payload.content) {
    errors.push({
      field: 'content',
      error: 'required for typed notes',
    });
  }

  if (payload.note_type === 'handwritten' && (!payload.image_urls || payload.image_urls.length === 0)) {
    errors.push({
      field: 'image_urls',
      error: 'at least one image_url is required for handwritten notes',
    });
  }

  if (payload.note_type === 'voice' && !payload.audio_url) {
    errors.push({
      field: 'audio_url',
      error: 'required for voice notes',
    });
  }

  if (payload.note_type === 'template' && !payload.template_id) {
    errors.push({
      field: 'template_id',
      error: 'required for template notes',
    });
  }

  // Validate image_urls if provided
  if (payload.image_urls) {
    payload.image_urls.forEach((url, index) => {
      // Accept both regular URLs and data URLs (data:image/...)
      const isDataUrl = url.startsWith('data:image/');
      
      if (isDataUrl) {
        // Validate data URL format: data:image/<type>;base64,<data>
        // Check that it has the basic structure
        if (!url.includes(';base64,') || url.length < 50) {
          errors.push({
            field: `image_urls[${index}]`,
            error: 'must be a valid image data URL (data:image/<type>;base64,<data>)',
          });
        }
      } else {
        // Validate regular URL
        try {
          new URL(url);
        } catch {
          errors.push({
            field: `image_urls[${index}]`,
            error: 'must be a valid URL',
          });
        }
      }
    });
  }

  // Validate audio_url if provided
  if (payload.audio_url) {
    try {
      new URL(payload.audio_url);
    } catch {
      errors.push({
        field: 'audio_url',
        error: 'must be a valid URL',
      });
    }
  }

  // Validate template_id if provided
  if (payload.template_id) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(payload.template_id)) {
      errors.push({ field: 'template_id', error: 'must be a valid UUID' });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

