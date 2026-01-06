import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Document Projection Handler
 *
 * Updates the `documents` table based on document events
 */
export class DocumentProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'document_uploaded',
    'document_categorized',
    'document_shared',
    'document_deleted',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'document_uploaded':
        await this.handleDocumentUploaded(event, client);
        break;
      case 'document_categorized':
        await this.handleDocumentCategorized(event, client);
        break;
      case 'document_shared':
        await this.handleDocumentShared(event, client);
        break;
      case 'document_deleted':
        await this.handleDocumentDeleted(event, client);
        break;
      default:
        logger.warn('Unknown event type for document projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle document_uploaded event
   *
   * Creates a new document record
   */
  private async handleDocumentUploaded(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO documents (
        id,
        hospital_id,
        patient_id,
        visit_id,
        document_type,
        title,
        description,
        file_url,
        file_name,
        file_size_bytes,
        mime_type,
        thumbnail_url,
        page_count,
        tags,
        current_version,
        last_event_id,
        uploaded_by,
        uploaded_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.patient_id,
        data.visit_id || null,
        data.document_type,
        data.title,
        data.description || null,
        data.file_url,
        data.file_name,
        data.file_size_bytes || null,
        data.mime_type || null,
        data.thumbnail_url || null,
        data.page_count || null,
        data.tags || [],
        event.aggregate_version,
        event.event_id,
        data.uploaded_by,
      ]
    );

    logger.info('Document projection created', {
      document_id: event.aggregate_id,
      patient_id: data.patient_id,
      document_type: data.document_type,
      file_name: data.file_name,
      event_id: event.event_id,
    });
  }

  /**
   * Handle document_categorized event
   *
   * Updates document category/type
   */
  private async handleDocumentCategorized(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE documents
       SET
         document_type = $1,
         tags = COALESCE($2, tags),
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        data.document_type,
        data.tags || null,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Document projection updated (categorized)', {
      document_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle document_shared event
   *
   * Updates document sharing information
   */
  private async handleDocumentShared(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE documents
       SET
         shared_with = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        data.shared_with || [],
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Document projection updated (shared)', {
      document_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle document_deleted event
   *
   * Soft deletes the document
   */
  private async handleDocumentDeleted(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE documents
       SET
         deleted_at = NOW(),
         deleted_by = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        event.caused_by_user_id,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Document projection updated (deleted)', {
      document_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}

// Export singleton instance
export const documentProjectionHandler = new DocumentProjectionHandler();

