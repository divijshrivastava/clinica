import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Medical Note Projection Handler
 *
 * Updates the `medical_notes` table based on medical note events
 */
export class MedicalNoteProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'note_created',
    'note_content_updated',
    'note_image_uploaded',
    'note_ocr_completed',
    'note_signed',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'note_created':
        await this.handleNoteCreated(event, client);
        break;
      case 'note_content_updated':
        await this.handleNoteContentUpdated(event, client);
        break;
      case 'note_image_uploaded':
        await this.handleNoteImageUploaded(event, client);
        break;
      case 'note_ocr_completed':
        await this.handleNoteOcrCompleted(event, client);
        break;
      case 'note_signed':
        await this.handleNoteSigned(event, client);
        break;
      default:
        logger.warn('Unknown event type for medical note projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle note_created event
   *
   * Creates a new medical note record
   */
  private async handleNoteCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO medical_notes (
        id,
        hospital_id,
        patient_id,
        visit_id,
        note_type,
        title,
        content,
        image_urls,
        audio_url,
        template_id,
        current_version,
        last_event_id,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.patient_id,
        data.visit_id || null,
        data.note_type,
        data.title || null,
        data.content || null,
        data.image_urls || [],
        data.audio_url || null,
        data.template_id || null,
        event.aggregate_version,
        event.event_id,
        data.created_by,
      ]
    );

    logger.info('Medical note projection created', {
      note_id: event.aggregate_id,
      patient_id: data.patient_id,
      note_type: data.note_type,
      event_id: event.event_id,
    });
  }

  /**
   * Handle note_content_updated event
   *
   * Updates note content
   */
  private async handleNoteContentUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE medical_notes
       SET
         title = COALESCE($1, title),
         content = COALESCE($2, content),
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW(),
         updated_by = $5
       WHERE id = $6`,
      [
        data.title || null,
        data.content || null,
        event.aggregate_version,
        event.event_id,
        event.caused_by_user_id,
        event.aggregate_id,
      ]
    );

    logger.info('Medical note projection updated (content)', {
      note_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle note_image_uploaded event
   *
   * Adds image URLs to note
   */
  private async handleNoteImageUploaded(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE medical_notes
       SET
         image_urls = array_cat(COALESCE(image_urls, ARRAY[]::TEXT[]), $1),
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        data.image_urls || [],
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Medical note projection updated (image uploaded)', {
      note_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle note_ocr_completed event
   *
   * Updates note with OCR results
   */
  private async handleNoteOcrCompleted(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE medical_notes
       SET
         content = $1,
         ocr_confidence = $2,
         ocr_status = $3,
         current_version = $4,
         last_event_id = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        data.content || null,
        data.ocr_confidence || null,
        data.ocr_status || null,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Medical note projection updated (OCR completed)', {
      note_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle note_signed event
   *
   * Marks note as signed
   */
  private async handleNoteSigned(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE medical_notes
       SET
         is_signed = TRUE,
         signed_at = $1,
         signed_by = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        new Date(data.signed_at),
        data.signed_by,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Medical note projection updated (signed)', {
      note_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

// Export singleton instance
export const medicalNoteProjectionHandler = new MedicalNoteProjectionHandler();

