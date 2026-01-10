import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Leave Request Projection Handler
 *
 * Updates the `leave_requests` table based on leave request events
 */
export class LeaveRequestProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'leave_requested',
    'leave_approved',
    'leave_rejected',
    'leave_cancelled',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'leave_requested':
        await this.handleLeaveRequested(event, client);
        break;
      case 'leave_approved':
        await this.handleLeaveApproved(event, client);
        break;
      case 'leave_rejected':
        await this.handleLeaveRejected(event, client);
        break;
      case 'leave_cancelled':
        await this.handleLeaveCancelled(event, client);
        break;
      default:
        logger.warn('Unknown event type for leave request projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle leave_requested event
   */
  private async handleLeaveRequested(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO leave_requests (
        id,
        hospital_id,
        doctor_profile_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status,
        requested_by,
        notes,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.doctor_profile_id,
        data.leave_type,
        data.start_date,
        data.end_date,
        data.reason,
        'pending',
        event.caused_by_user_id,
        data.notes,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Leave request projection created', {
      leave_request_id: event.aggregate_id,
      doctor_profile_id: data.doctor_profile_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_approved event
   */
  private async handleLeaveApproved(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE leave_requests
       SET
         status = 'approved',
         approved_by = $1,
         approved_at = $2,
         approver_notes = $3,
         current_version = $4,
         last_event_id = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        data.approved_by,
        data.approved_at,
        data.approver_notes,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Leave request approved projection updated', {
      leave_request_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_rejected event
   */
  private async handleLeaveRejected(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE leave_requests
       SET
         status = 'rejected',
         rejected_by = $1,
         rejected_at = $2,
         rejection_reason = $3,
         approver_notes = $4,
         current_version = $5,
         last_event_id = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        data.rejected_by,
        data.rejected_at,
        data.rejection_reason,
        data.rejector_notes,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Leave request rejected projection updated', {
      leave_request_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle leave_cancelled event
   */
  private async handleLeaveCancelled(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE leave_requests
       SET
         status = 'cancelled',
         cancelled_by = $1,
         cancelled_at = $2,
         cancellation_reason = $3,
         current_version = $4,
         last_event_id = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        data.cancelled_by,
        data.cancelled_at,
        data.cancellation_reason,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Leave request cancelled projection updated', {
      leave_request_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}
