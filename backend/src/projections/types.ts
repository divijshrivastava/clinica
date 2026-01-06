import { Event } from '../event-sourcing/types';
import { PoolClient } from 'pg';

/**
 * Projection handler interface
 *
 * Each handler processes specific event types and updates read models
 */
export interface ProjectionHandler {
  /**
   * Event types this handler processes
   */
  eventTypes: string[];

  /**
   * Handle the event and update projections
   *
   * @param event - The event to process
   * @param client - Database client (for transaction support)
   */
  handle(event: Event, client: PoolClient): Promise<void>;

  /**
   * Optional: Get the current position of this projection
   * Used for tracking projection lag
   */
  getPosition?(): Promise<number>;

  /**
   * Optional: Rebuild projection from scratch
   * Used for projection recovery
   */
  rebuild?(): Promise<void>;
}

/**
 * Projection error for logging failures
 */
export interface ProjectionError {
  event_id: string;
  event_type: string;
  projection_name: string;
  error_message: string;
  error_stack?: string;
  retry_count: number;
}

/**
 * Projection checkpoint for tracking progress
 */
export interface ProjectionCheckpoint {
  projection_name: string;
  last_event_number: number;
  last_processed_at: Date;
}
