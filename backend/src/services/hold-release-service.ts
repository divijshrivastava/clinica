import { db } from '../database/pool';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

/**
 * Hold Auto-Release Service
 *
 * Automatically releases expired tentative holds
 * Should be run as a cron job every minute
 */
export class HoldReleaseService {
  /**
   * Process all expired holds
   * Should be called every minute
   */
  async processExpiredHolds(): Promise<number> {
    logger.debug('Processing expired holds');

    // Find all expired holds that are still active
    const expiredHolds = await db.query(
      `SELECT * FROM tentative_holds
       WHERE status = 'active'
         AND expires_at <= NOW()
         AND deleted_at IS NULL
       ORDER BY expires_at ASC
       LIMIT 100`, // Process in batches
      []
    );

    let releasedCount = 0;

    for (const hold of expiredHolds.rows) {
      try {
        await this.releaseHold(hold.id, hold.hospital_id, 'expired', 'Auto-released by system');
        releasedCount++;
      } catch (error: any) {
        logger.error('Failed to release expired hold', {
          hold_id: hold.id,
          error: error.message,
        });
      }
    }

    if (releasedCount > 0) {
      logger.info('Released expired holds', { count: releasedCount });
    }

    return releasedCount;
  }

  /**
   * Release a specific hold
   */
  async releaseHold(
    holdId: string,
    hospitalId: string,
    releaseReason: 'user_cancelled' | 'booking_completed' | 'expired' | 'admin_override',
    notes?: string
  ): Promise<void> {
    logger.info('Releasing hold', { hold_id: holdId, release_reason: releaseReason });

    // Get current version of hold
    const events = await eventStore.getAggregateEvents(holdId);

    if (events.length === 0) {
      throw new Error(`Hold ${holdId} not found in event store`);
    }

    const currentVersion = events[events.length - 1].aggregate_version;

    // Determine event type
    const eventType = releaseReason === 'expired' ? 'tentative_hold_expired' : 'tentative_hold_released';

    // Emit release event
    await eventStore.appendEvent({
      aggregate_type: 'appointment_slot',
      aggregate_id: holdId,
      aggregate_version: currentVersion + 1,
      event_type: eventType,
      event_schema_version: 1,
      event_data: {
        hold_id: holdId,
        release_reason: releaseReason,
        released_by: 'system',
        notes: notes || null,
        released_at: new Date().toISOString(),
      },
      event_metadata: {
        source: 'hold_release_service',
      },
      hospital_id: hospitalId,
      correlation_id: holdId,
      causation_id: holdId,
    });

    logger.info('Hold released successfully', {
      hold_id: holdId,
      release_reason: releaseReason,
    });
  }

  /**
   * Extend a hold (e.g., if payment is in progress)
   */
  async extendHold(holdId: string, additionalMinutes: number): Promise<void> {
    logger.info('Extending hold', { hold_id: holdId, additional_minutes: additionalMinutes });

    const newExpiresAt = new Date(Date.now() + additionalMinutes * 60000);

    await db.query(
      `UPDATE tentative_holds
       SET expires_at = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'active'`,
      [newExpiresAt.toISOString(), holdId]
    );

    logger.info('Hold extended successfully', {
      hold_id: holdId,
      new_expires_at: newExpiresAt.toISOString(),
    });
  }

  /**
   * Get active holds for a slot
   */
  async getActiveHoldsForSlot(slotId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT * FROM tentative_holds
       WHERE slot_id = $1
         AND status = 'active'
         AND expires_at > NOW()
         AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [slotId]
    );

    return result.rows;
  }

  /**
   * Check if a slot is available (no active holds)
   */
  async isSlotAvailable(slotId: string): Promise<boolean> {
    const activeHolds = await this.getActiveHoldsForSlot(slotId);
    return activeHolds.length === 0;
  }

  /**
   * Get hold statistics
   */
  async getHoldStatistics(hospitalId: string, days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') as active_holds,
         COUNT(*) FILTER (WHERE status = 'released') as released_holds,
         COUNT(*) FILTER (WHERE status = 'expired') as expired_holds,
         COUNT(*) FILTER (WHERE status = 'released' AND release_reason = 'booking_completed') as converted_to_bookings,
         AVG(EXTRACT(EPOCH FROM (released_at - created_at)) / 60) FILTER (WHERE released_at IS NOT NULL) as avg_hold_duration_minutes
       FROM tentative_holds
       WHERE hospital_id = $1
         AND created_at >= $2`,
      [hospitalId, startDate.toISOString()]
    );

    const conversionRate =
      stats.rows[0].released_holds > 0
        ? (stats.rows[0].converted_to_bookings / stats.rows[0].released_holds) * 100
        : 0;

    return {
      active_holds: parseInt(stats.rows[0].active_holds) || 0,
      released_holds: parseInt(stats.rows[0].released_holds) || 0,
      expired_holds: parseInt(stats.rows[0].expired_holds) || 0,
      converted_to_bookings: parseInt(stats.rows[0].converted_to_bookings) || 0,
      conversion_rate: conversionRate.toFixed(2) + '%',
      avg_hold_duration_minutes: parseFloat(stats.rows[0].avg_hold_duration_minutes).toFixed(2),
    };
  }
}

// Export singleton instance
export const holdReleaseService = new HoldReleaseService();
