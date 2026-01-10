import { PoolClient } from 'pg';
import { Event } from '../../event-sourcing/types';
import { ProjectionHandler } from '../types';
import { logger } from '../../utils/logger';

/**
 * Doctor Profile Projection Handler
 *
 * Updates the `doctor_profiles` and related tables based on doctor profile events
 */
export class DoctorProfileProjectionHandler implements ProjectionHandler {
  eventTypes = [
    'doctor_profile_created',
    'doctor_profile_updated',
    'doctor_specialty_added',
    'doctor_specialty_removed',
    'doctor_qualification_added',
    'doctor_department_assigned',
    'doctor_location_assigned',
    'doctor_location_removed',
    'doctor_fees_updated',
    'doctor_status_changed',
    'doctor_onboarding_stage_completed',
    'doctor_verification_completed',
    'doctor_activated',
    'doctor_deactivated',
  ];

  async handle(event: Event, client: PoolClient): Promise<void> {
    switch (event.event_type) {
      case 'doctor_profile_created':
        await this.handleDoctorProfileCreated(event, client);
        break;
      case 'doctor_profile_updated':
        await this.handleDoctorProfileUpdated(event, client);
        break;
      case 'doctor_fees_updated':
        await this.handleDoctorFeesUpdated(event, client);
        break;
      case 'doctor_department_assigned':
        await this.handleDoctorDepartmentAssigned(event, client);
        break;
      case 'doctor_location_assigned':
        await this.handleDoctorLocationAssigned(event, client);
        break;
      case 'doctor_location_removed':
        await this.handleDoctorLocationRemoved(event, client);
        break;
      case 'doctor_status_changed':
        await this.handleDoctorStatusChanged(event, client);
        break;
      case 'doctor_activated':
        await this.handleDoctorActivated(event, client);
        break;
      case 'doctor_deactivated':
        await this.handleDoctorDeactivated(event, client);
        break;
      default:
        logger.warn('Unknown event type for doctor profile projection', {
          event_type: event.event_type,
        });
    }
  }

  /**
   * Handle doctor_profile_created event
   *
   * Creates a new doctor profile record in the doctor_profiles table
   */
  private async handleDoctorProfileCreated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO doctor_profiles (
        id,
        hospital_id,
        user_id,
        display_name,
        salutation,
        bio,
        profile_image_url,
        years_of_experience,
        registration_number,
        license_number,
        license_expiry_date,
        license_verified,
        specialties,
        qualifications,
        languages,
        consultation_modes,
        status,
        is_bookable,
        accepts_online_bookings,
        public_profile_visible,
        bookability_score,
        consultation_fee,
        follow_up_fee,
        tele_consultation_fee,
        tags,
        current_version,
        last_event_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )`,
      [
        event.aggregate_id,
        event.hospital_id,
        data.user_id,
        data.display_name,
        data.salutation,
        data.bio,
        data.profile_image_url,
        data.years_of_experience,
        data.registration_number,
        data.license_number,
        data.license_expiry_date,
        false, // license_verified
        JSON.stringify(data.specialties || []),
        JSON.stringify(data.qualifications || []),
        data.languages || ['English'],
        data.consultation_modes || ['in_person'],
        data.status || 'draft',
        data.is_bookable || false,
        data.accepts_online_bookings || false,
        data.public_profile_visible || false,
        data.bookability_score || 0.0,
        data.consultation_fee,
        data.follow_up_fee,
        data.tele_consultation_fee,
        data.tags || [],
        event.aggregate_version,
        event.event_id,
      ]
    );

    // Create onboarding state
    await client.query(
      `INSERT INTO doctor_onboarding_states (
        id,
        doctor_profile_id,
        current_stage,
        overall_status,
        stages,
        created_by,
        current_owner
      ) VALUES (
        gen_random_uuid(),
        $1,
        'profile_creation',
        'draft',
        '[]'::jsonb,
        $2,
        $2
      )`,
      [event.aggregate_id, event.caused_by_user_id]
    );

    logger.info('Doctor profile projection created', {
      doctor_profile_id: event.aggregate_id,
      user_id: data.user_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_profile_updated event
   */
  private async handleDoctorProfileUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE query based on provided fields
    if (data.display_name !== undefined) {
      updateFields.push(`display_name = $${paramCount++}`);
      updateValues.push(data.display_name);
    }

    if (data.bio !== undefined) {
      updateFields.push(`bio = $${paramCount++}`);
      updateValues.push(data.bio);
    }

    if (data.profile_image_url !== undefined) {
      updateFields.push(`profile_image_url = $${paramCount++}`);
      updateValues.push(data.profile_image_url);
    }

    if (data.years_of_experience !== undefined) {
      updateFields.push(`years_of_experience = $${paramCount++}`);
      updateValues.push(data.years_of_experience);
    }

    if (updateFields.length > 0) {
      updateFields.push(`current_version = $${paramCount++}`);
      updateValues.push(event.aggregate_version);

      updateFields.push(`last_event_id = $${paramCount++}`);
      updateValues.push(event.event_id);

      updateFields.push(`updated_at = NOW()`);

      updateValues.push(event.aggregate_id);

      await client.query(
        `UPDATE doctor_profiles SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      );
    }

    logger.info('Doctor profile projection updated', {
      doctor_profile_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_fees_updated event
   */
  private async handleDoctorFeesUpdated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE doctor_profiles
       SET
         consultation_fee = COALESCE($1, consultation_fee),
         follow_up_fee = COALESCE($2, follow_up_fee),
         tele_consultation_fee = COALESCE($3, tele_consultation_fee),
         currency = COALESCE($4, currency),
         current_version = $5,
         last_event_id = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        data.consultation_fee,
        data.follow_up_fee,
        data.tele_consultation_fee,
        data.currency,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    logger.info('Doctor fees projection updated', {
      doctor_profile_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_department_assigned event
   */
  private async handleDoctorDepartmentAssigned(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO doctor_department_assignments (
        id,
        doctor_profile_id,
        department_id,
        allocation_percentage,
        is_primary,
        assigned_by
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5
      )
      ON CONFLICT (doctor_profile_id, department_id)
      DO UPDATE SET
        allocation_percentage = EXCLUDED.allocation_percentage,
        is_primary = EXCLUDED.is_primary,
        assigned_at = NOW()`,
      [
        data.doctor_profile_id,
        data.department_id,
        data.allocation_percentage || 100.0,
        data.is_primary || false,
        event.caused_by_user_id,
      ]
    );

    logger.info('Doctor department assignment projection created', {
      doctor_profile_id: data.doctor_profile_id,
      department_id: data.department_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_location_assigned event
   */
  private async handleDoctorLocationAssigned(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `INSERT INTO doctor_location_assignments (
        id,
        doctor_profile_id,
        location_id,
        is_primary,
        assigned_by
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4
      )`,
      [
        data.doctor_profile_id,
        data.location_id,
        data.is_primary || false,
        event.caused_by_user_id,
      ]
    );

    logger.info('Doctor location assignment projection created', {
      doctor_profile_id: data.doctor_profile_id,
      location_id: data.location_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_location_removed event
   */
  private async handleDoctorLocationRemoved(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE doctor_location_assignments
       SET removed_at = NOW()
       WHERE doctor_profile_id = $1 AND location_id = $2 AND removed_at IS NULL`,
      [data.doctor_profile_id, data.location_id]
    );

    logger.info('Doctor location assignment projection removed', {
      doctor_profile_id: data.doctor_profile_id,
      location_id: data.location_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_status_changed event
   */
  private async handleDoctorStatusChanged(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE doctor_profiles
       SET
         status = $1,
         current_version = $2,
         last_event_id = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [data.status, event.aggregate_version, event.event_id, event.aggregate_id]
    );

    logger.info('Doctor status projection updated', {
      doctor_profile_id: event.aggregate_id,
      status: data.status,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_activated event
   */
  private async handleDoctorActivated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    const data = event.event_data;

    await client.query(
      `UPDATE doctor_profiles
       SET
         status = 'active',
         is_bookable = $1,
         accepts_online_bookings = $2,
         public_profile_visible = $3,
         bookability_score = $4,
         current_version = $5,
         last_event_id = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        data.is_bookable !== undefined ? data.is_bookable : true,
        data.accepts_online_bookings !== undefined ? data.accepts_online_bookings : true,
        data.public_profile_visible !== undefined ? data.public_profile_visible : true,
        data.bookability_score !== undefined ? data.bookability_score : 100.0,
        event.aggregate_version,
        event.event_id,
        event.aggregate_id,
      ]
    );

    // Update onboarding state
    await client.query(
      `UPDATE doctor_onboarding_states
       SET
         overall_status = 'active',
         activated_at = NOW()
       WHERE doctor_profile_id = $1`,
      [event.aggregate_id]
    );

    logger.info('Doctor activated projection updated', {
      doctor_profile_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }

  /**
   * Handle doctor_deactivated event
   */
  private async handleDoctorDeactivated(
    event: Event,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `UPDATE doctor_profiles
       SET
         status = 'inactive',
         is_bookable = FALSE,
         accepts_online_bookings = FALSE,
         current_version = $1,
         last_event_id = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [event.aggregate_version, event.event_id, event.aggregate_id]
    );

    logger.info('Doctor deactivated projection updated', {
      doctor_profile_id: event.aggregate_id,
      event_id: event.event_id,
    });
  }
}
