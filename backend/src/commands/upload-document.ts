import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface UploadDocumentPayload {
  patient_id: string; // UUID
  visit_id?: string; // UUID (optional)
  document_type: 'lab_report' | 'imaging' | 'prescription' | 'consent_form' | 'insurance' | 'other';
  title: string;
  description?: string;
  file_url: string; // S3 or storage URL
  file_name: string;
  file_size_bytes?: number;
  mime_type?: string;
  thumbnail_url?: string;
  page_count?: number;
  tags?: string[];
}

/**
 * Upload Document Command Handler
 *
 * Uploads a document for a patient
 */
export const uploadDocumentHandler: CommandHandler<UploadDocumentPayload> = {
  commandType: 'upload-document',

  async handle(command: Command<UploadDocumentPayload>): Promise<CommandResult> {
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

    // Generate document ID
    const documentId = command.aggregate_id || uuidv4();

    // Create document_uploaded event
    const event = await eventStore.appendEvent({
      aggregate_type: 'document',
      aggregate_id: documentId,
      aggregate_version: 1,
      event_type: 'document_uploaded',
      event_schema_version: 1,
      event_data: {
        patient_id: command.payload.patient_id,
        visit_id: command.payload.visit_id || null,
        document_type: command.payload.document_type,
        title: command.payload.title,
        description: command.payload.description || null,
        file_url: command.payload.file_url,
        file_name: command.payload.file_name,
        file_size_bytes: command.payload.file_size_bytes || null,
        mime_type: command.payload.mime_type || null,
        thumbnail_url: command.payload.thumbnail_url || null,
        page_count: command.payload.page_count || null,
        tags: command.payload.tags || [],
        uploaded_by: userId,
        uploaded_at: new Date().toISOString(),
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

    logger.info('Document uploaded', {
      document_id: documentId,
      patient_id: command.payload.patient_id,
      document_type: command.payload.document_type,
      file_name: command.payload.file_name,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: documentId,
      aggregate_type: 'document',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate upload document payload
 */
function validatePayload(payload: UploadDocumentPayload): void {
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

  // Validate document_type
  const validDocumentTypes = ['lab_report', 'imaging', 'prescription', 'consent_form', 'insurance', 'other'];
  if (!payload.document_type || !validDocumentTypes.includes(payload.document_type)) {
    errors.push({
      field: 'document_type',
      error: `must be one of: ${validDocumentTypes.join(', ')}`,
    });
  }

  // Validate title
  if (!payload.title || payload.title.trim().length === 0) {
    errors.push({ field: 'title', error: 'required' });
  }
  if (payload.title && payload.title.length > 200) {
    errors.push({
      field: 'title',
      error: 'must be 200 characters or less',
    });
  }

  // Validate file_url
  if (!payload.file_url || payload.file_url.trim().length === 0) {
    errors.push({ field: 'file_url', error: 'required' });
  } else {
    try {
      new URL(payload.file_url);
    } catch {
      errors.push({
        field: 'file_url',
        error: 'must be a valid URL',
      });
    }
  }

  // Validate file_name
  if (!payload.file_name || payload.file_name.trim().length === 0) {
    errors.push({ field: 'file_name', error: 'required' });
  }

  // Validate file_size_bytes if provided
  if (payload.file_size_bytes !== undefined && payload.file_size_bytes < 0) {
    errors.push({
      field: 'file_size_bytes',
      error: 'must be non-negative',
    });
  }

  // Validate page_count if provided
  if (payload.page_count !== undefined && payload.page_count < 1) {
    errors.push({
      field: 'page_count',
      error: 'must be at least 1',
    });
  }

  // Validate thumbnail_url if provided
  if (payload.thumbnail_url) {
    try {
      new URL(payload.thumbnail_url);
    } catch {
      errors.push({
        field: 'thumbnail_url',
        error: 'must be a valid URL',
      });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

