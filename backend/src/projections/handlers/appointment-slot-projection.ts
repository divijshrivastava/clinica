import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Appointment Slot Projection Handler
 *
 * Updates the `appointment_slots` and `tentative_holds` tables based on slot events
 */
export class AppointmentSlotProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'slots_generated',
    'slot_blocked',
    'slot_unblocked',
    'slot_capacity_changed',
    'tentative_hold_created',
    'tentative_hold_released',
    'tentative_hold_expired',
    'slot_booked',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'slots_generated':
        await this.handleSlotsGenerated(event, client);
        break;
      case 'slot_blocked':
        await this.handleSlotBlocked(event, client);
        break;
      case 'slot_unblocked':
        await this.handleSlotUnblocked(event, client);
        break;
      case 'slot_capacity_changed':
        await this.handleSlotCapacityChanged(event, client);
        break;
      case 'tentative_hold_created':
        await this.handleTentativeHoldCreated(event, client);
        break;
      case 'tentative_hold_released':
        await this.handleTentativeHoldReleased(event, client);
        break;
      case 'tentative_hold_expired':
        await this.handleTentativeHoldExpired(event, client);
        break;
      case 'slot_booked':
        await this.handleSlotBooked(event, client);
        break;
      default:
        logger.warn('Unknown event type for appointment slot projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle slots_generated event
   *
   * Creates multiple appointment slots in bulk
   */
  private async handleSlotsGenerated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;
    const slots = data.slots || [];

    // Bulk insert slots
    for (const slot of slots) {
      await client.query(
        `INSERT INTO appointment_slots (
          id,
          hospital_id,
          doctor_profile_id,
          location_id,
          schedule_source,
          slot_date,
          start_time,
          end_time,
          duration_minutes,
          consultation_mode,
          max_capacity,
          max_in_person_capacity,
          max_tele_capacity,
          current_bookings,
          in_person_bookings,
          tele_bookings,
          status,
          current_version,
          last_event_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          slot.slot_id,
          event.hospital_id,
          data.doctor_profile_id,
          slot.location_id,
          slot.schedule_source || 'base_schedule',
          slot.slot_date,
          slot.start_time,
          slot.end_time,
          slot.duration_minutes,
          slot.consultation_mode || 'in_person',
          slot.max_capacity || 1,
          slot.max_in_person_capacity || 1,
          slot.max_tele_capacity || 0,
          0, // current_bookings
          0, // in_person_bookings
          0, // tele_bookings
          'available',
          1,
          event.event_id,
        ]
      );
    }

    logger.info('Slots generated projection created', {
      doctor_profile_id: data.doctor_profile_id,
      slot_count: slots.length,
      event_id: event.event_id,
    });
  }

  /**
   * Handle slot_blocked event
   */
  private async handleSlotBlocked(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointment_slots
       SET
         status = 'blocked',
         blocked_reason = $1,
         blocked_by = $2,
         blocked_at = $3,
         current_version = $4,
         last_event_id = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        data.reason,
        data.blocked_by,
        data.blocked_at,
        event.aggregate_version,
        event.event_id,
        data.slot_id,
      ]
    );

    logger.info('Slot blocked projection updated', {
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle slot_unblocked event
   */
  private async handleSlotUnblocked(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointment_slots
       SET
         status = 'available',
         blocked_reason = NULL,
         blocked_by = NULL,
         blocked_at = NULL,
         current_version = $1,
         last_event_id = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [
        event.aggregate_version,
        event.event_id,
        data.slot_id,
      ]
    );

    logger.info('Slot unblocked projection updated', {
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle slot_capacity_changed event
   */
  private async handleSlotCapacityChanged(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE appointment_slots
       SET
         max_capacity = $1,
         max_in_person_capacity = $2,
         max_tele_capacity = $3,
         current_version = $4,
         last_event_id = $5,
         updated_at = NOW()
       WHERE id = $6`,
      [
        data.max_capacity,
        data.max_in_person_capacity,
        data.max_tele_capacity,
        event.aggregate_version,
        event.event_id,
        data.slot_id,
      ]
    );

    logger.info('Slot capacity changed projection updated', {
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle tentative_hold_created event
   */
  private async handleTentativeHoldCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO tentative_holds (
        id,
        hospital_id,
        slot_id,
        patient_id,
        hold_type,
        held_by,
        expires_at,
        status,
        notes,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.slot_id,
        data.patient_id,
        data.hold_type,
        data.held_by,
        data.expires_at,
        'active',
        data.notes,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Tentative hold created projection updated', {
      hold_id: event.aggregate_id,
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle tentative_hold_released event
   */
  private async handleTentativeHoldReleased(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE tentative_holds
       SET
         status = 'released',
         released_at = $1,
         released_by = $2,
         release_reason = $3,
         current_version = $4,
         last_event_id = $5
       WHERE id = $6`,
      [
        data.released_at,
        data.released_by,
        data.release_reason,
        event.aggregate_version,
        event.event_id,
        data.hold_id,
      ]
    );

    logger.info('Tentative hold released projection updated', {
      hold_id: data.hold_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle tentative_hold_expired event
   */
  private async handleTentativeHoldExpired(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE tentative_holds
       SET
         status = 'expired',
         released_at = $1,
         release_reason = 'expired',
         current_version = $2,
         last_event_id = $3
       WHERE id = $4`,
      [
        data.released_at || new Date().toISOString(),
        event.aggregate_version,
        event.event_id,
        data.hold_id,
      ]
    );

    logger.info('Tentative hold expired projection updated', {
      hold_id: data.hold_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle slot_booked event
   */
  private async handleSlotBooked(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    // Update slot booking count
    await client.query(
      `UPDATE appointment_slots
       SET
         current_bookings = current_bookings + 1,
         in_person_bookings = in_person_bookings + CASE WHEN $1 = 'in_person' THEN 1 ELSE 0 END,
         tele_bookings = tele_bookings + CASE WHEN $1 = 'tele_consultation' THEN 1 ELSE 0 END,
         status = CASE 
           WHEN current_bookings + 1 >= max_capacity THEN 'fully_booked' 
           ELSE status 
         END,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [
        data.consultation_mode,
        event.aggregate_version,
        event.event_id,
        data.slot_id,
      ]
    );

    logger.info('Slot booked projection updated', {
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }
}
