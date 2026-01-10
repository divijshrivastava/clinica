import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Resource Projection Handler
 *
 * Updates the `rooms` and `equipment` tables based on resource events
 */
export class ResourceProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'room_created',
    'room_updated',
    'room_deactivated',
    'room_auto_assigned',
    'room_manually_overridden',
    'equipment_created',
    'equipment_updated',
    'equipment_assigned_to_slot',
    'equipment_maintenance_scheduled',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'room_created':
        await this.handleRoomCreated(event, client);
        break;
      case 'room_updated':
        await this.handleRoomUpdated(event, client);
        break;
      case 'room_deactivated':
        await this.handleRoomDeactivated(event, client);
        break;
      case 'room_auto_assigned':
      case 'room_manually_overridden':
        await this.handleRoomAssignment(event, client);
        break;
      case 'equipment_created':
        await this.handleEquipmentCreated(event, client);
        break;
      case 'equipment_updated':
        await this.handleEquipmentUpdated(event, client);
        break;
      case 'equipment_assigned_to_slot':
        await this.handleEquipmentAssignment(event, client);
        break;
      case 'equipment_maintenance_scheduled':
        await this.handleEquipmentMaintenance(event, client);
        break;
      default:
        logger.warn('Unknown event type for resource projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle room_created event
   */
  private async handleRoomCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO rooms (
        id,
        hospital_id,
        location_id,
        room_number,
        room_name,
        room_type,
        floor,
        capacity,
        has_video_equipment,
        is_wheelchair_accessible,
        amenities,
        is_active,
        notes,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.location_id,
        data.room_number,
        data.room_name,
        data.room_type,
        data.floor,
        data.capacity || 1,
        data.has_video_equipment || false,
        data.is_wheelchair_accessible || false,
        data.amenities || [],
        data.is_active !== undefined ? data.is_active : true,
        data.notes,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Room projection created', {
      room_id: event.aggregate_id,
      room_number: data.room_number,
      event_id: event.event_id,
    });
  }

  /**
   * Handle room_updated event
   */
  private async handleRoomUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query based on provided fields
    if (data.room_name !== undefined) {
      updateFields.push(`room_name = $${paramCount++}`);
      updateValues.push(data.room_name);
    }

    if (data.room_type !== undefined) {
      updateFields.push(`room_type = $${paramCount++}`);
      updateValues.push(data.room_type);
    }

    if (data.floor !== undefined) {
      updateFields.push(`floor = $${paramCount++}`);
      updateValues.push(data.floor);
    }

    if (data.capacity !== undefined) {
      updateFields.push(`capacity = $${paramCount++}`);
      updateValues.push(data.capacity);
    }

    if (data.has_video_equipment !== undefined) {
      updateFields.push(`has_video_equipment = $${paramCount++}`);
      updateValues.push(data.has_video_equipment);
    }

    if (data.is_wheelchair_accessible !== undefined) {
      updateFields.push(`is_wheelchair_accessible = $${paramCount++}`);
      updateValues.push(data.is_wheelchair_accessible);
    }

    if (data.amenities !== undefined) {
      updateFields.push(`amenities = $${paramCount++}`);
      updateValues.push(data.amenities);
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      updateValues.push(data.notes);
    }

    if (updateFields.length > 0) {
      updateFields.push(`current_version = $${paramCount++}`);
      updateValues.push(event.aggregate_version);

      updateFields.push(`last_event_id = $${paramCount++}`);
      updateValues.push(event.event_id);

      updateFields.push(`updated_at = NOW()`);

      updateValues.push(event.aggregate_id);

      await client.query(
        `UPDATE rooms SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      );
    }

    logger.info('Room projection updated', {
      room_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle room_deactivated event
   */
  private async handleRoomDeactivated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE rooms
       SET
         is_active = FALSE,
         current_version = $1,
         last_event_id = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [event.aggregate_version, event.event_id, event.aggregate_id]
    );

    logger.info('Room deactivated projection updated', {
      room_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle room assignment events
   */
  private async handleRoomAssignment(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO appointment_room_assignments (
        id,
        hospital_id,
        appointment_id,
        slot_id,
        room_id,
        assignment_type,
        assigned_by,
        notes
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )`,
      [
        event.hospital_id,
        data.appointment_id,
        data.slot_id,
        data.room_id,
        event.event_type === 'room_auto_assigned' ? 'auto' : 'manual',
        event.caused_by_user_id,
        data.notes,
      ]
    );

    logger.info('Room assignment projection created', {
      room_id: data.room_id,
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle equipment_created event
   */
  private async handleEquipmentCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO equipment (
        id,
        hospital_id,
        location_id,
        equipment_name,
        equipment_type,
        serial_number,
        manufacturer,
        model,
        purchase_date,
        warranty_expiry_date,
        requires_calibration,
        calibration_frequency_days,
        last_calibration_date,
        next_calibration_due,
        is_portable,
        status,
        notes,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.location_id,
        data.equipment_name,
        data.equipment_type,
        data.serial_number,
        data.manufacturer,
        data.model,
        data.purchase_date,
        data.warranty_expiry_date,
        data.requires_calibration || false,
        data.calibration_frequency_days,
        null, // last_calibration_date
        null, // next_calibration_due
        data.is_portable || false,
        data.status || 'active',
        data.notes,
        event.aggregate_version,
        event.event_id,
      ]
    );

    logger.info('Equipment projection created', {
      equipment_id: event.aggregate_id,
      equipment_name: data.equipment_name,
      event_id: event.event_id,
    });
  }

  /**
   * Handle equipment_updated event
   */
  private async handleEquipmentUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    if (data.equipment_name !== undefined) {
      updateFields.push(`equipment_name = $${paramCount++}`);
      updateValues.push(data.equipment_name);
    }

    if (data.equipment_type !== undefined) {
      updateFields.push(`equipment_type = $${paramCount++}`);
      updateValues.push(data.equipment_type);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      updateValues.push(data.status);
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      updateValues.push(data.notes);
    }

    if (updateFields.length > 0) {
      updateFields.push(`current_version = $${paramCount++}`);
      updateValues.push(event.aggregate_version);

      updateFields.push(`last_event_id = $${paramCount++}`);
      updateValues.push(event.event_id);

      updateFields.push(`updated_at = NOW()`);

      updateValues.push(event.aggregate_id);

      await client.query(
        `UPDATE equipment SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      );
    }

    logger.info('Equipment projection updated', {
      equipment_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle equipment_assigned_to_slot event
   */
  private async handleEquipmentAssignment(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    // Could create an equipment_assignments table or update slot metadata
    logger.info('Equipment assignment projection (not implemented)', {
      equipment_id: data.equipment_id,
      slot_id: data.slot_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle equipment_maintenance_scheduled event
   */
  private async handleEquipmentMaintenance(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE equipment
       SET
         last_calibration_date = $1,
         next_calibration_due = $2,
         current_version = $3,
         last_event_id = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [
        data.maintenance_date,
        data.next_maintenance_due,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Equipment maintenance projection updated', {
      equipment_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}
