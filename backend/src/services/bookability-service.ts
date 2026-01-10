import { db } from '../database/pool';
import { logger } from '../utils/logger';

/**
 * Bookability Check Result
 */
export interface BookabilityCheck {
  is_bookable: boolean;
  bookability_score: number;
  can_show_in_search: boolean;
  can_patient_book: boolean;
  can_receptionist_book: boolean;
  blockers: string[];
  warnings: string[];
  preconditions: {
    profile_complete: boolean;
    license_verified: boolean;
    fees_configured: boolean;
    location_assigned: boolean;
    specialty_defined: boolean;
    base_schedule_exists: boolean;
    slots_available: boolean;
    no_critical_failures: boolean;
    status_active: boolean;
    no_forced_blocks: boolean;
  };
}

/**
 * Bookability Evaluation Service
 *
 * Evaluates whether a doctor can accept bookings based on 10 preconditions
 */
export class BookabilityService {
  /**
   * Evaluate bookability for a doctor
   */
  async evaluateBookability(doctorProfileId: string, hospitalId: string): Promise<BookabilityCheck> {
    logger.info('Evaluating bookability for doctor', { doctor_profile_id: doctorProfileId });

    // Get doctor profile
    const doctorResult = await db.query(
      `SELECT * FROM doctor_profiles WHERE id = $1 AND hospital_id = $2 AND deleted_at IS NULL`,
      [doctorProfileId, hospitalId]
    );

    if (doctorResult.rows.length === 0) {
      throw new Error(`Doctor profile ${doctorProfileId} not found`);
    }

    const doctor = doctorResult.rows[0];
    const preconditions = await this.checkPreconditions(doctorProfileId, hospitalId, doctor);
    const blockers: string[] = [];
    const warnings: string[] = [];

    // Critical blockers
    if (!preconditions.status_active) {
      blockers.push('Doctor status is not active');
    }

    if (!preconditions.license_verified) {
      blockers.push('Medical license not verified');
    }

    if (!preconditions.no_critical_failures) {
      blockers.push('Critical verification failures exist');
    }

    if (preconditions.no_forced_blocks === false) {
      blockers.push('Active forced block exists');
    }

    // Warnings (not blockers)
    if (!preconditions.profile_complete) {
      warnings.push('Profile is incomplete');
    }

    if (!preconditions.fees_configured) {
      warnings.push('Consultation fees not configured');
    }

    if (!preconditions.location_assigned) {
      warnings.push('No location assigned');
    }

    if (!preconditions.specialty_defined) {
      warnings.push('No specialty defined');
    }

    if (!preconditions.base_schedule_exists) {
      warnings.push('No base schedule configured');
    }

    if (!preconditions.slots_available) {
      warnings.push('No available slots in next 90 days');
    }

    // Calculate bookability score (0-100)
    const score = this.calculateBookabilityScore(preconditions);

    // Determine bookability flags
    const is_bookable = blockers.length === 0 && score >= 60;
    const can_show_in_search = score >= 60 && doctor.public_profile_visible;
    const can_patient_book = is_bookable && doctor.accepts_online_bookings;
    const can_receptionist_book = blockers.length === 0; // Receptionists can book even with warnings

    return {
      is_bookable,
      bookability_score: score,
      can_show_in_search,
      can_patient_book,
      can_receptionist_book,
      blockers,
      warnings,
      preconditions,
    };
  }

  /**
   * Check all 10 preconditions
   */
  private async checkPreconditions(
    doctorProfileId: string,
    hospitalId: string,
    doctor: any
  ): Promise<BookabilityCheck['preconditions']> {
    // 1. Profile complete
    const profile_complete =
      !!doctor.display_name &&
      !!doctor.bio &&
      !!doctor.years_of_experience &&
      doctor.specialties &&
      doctor.specialties.length > 0 &&
      doctor.qualifications &&
      doctor.qualifications.length > 0;

    // 2. License verified
    const license_verified = doctor.license_verified === true;

    // 3. Fees configured
    const fees_configured =
      doctor.consultation_fee !== null && doctor.consultation_fee > 0;

    // 4. At least one location assigned
    const locationResult = await db.query(
      `SELECT COUNT(*) as count FROM doctor_location_assignments
       WHERE doctor_profile_id = $1 AND removed_at IS NULL`,
      [doctorProfileId]
    );
    const location_assigned = parseInt(locationResult.rows[0].count) > 0;

    // 5. At least one specialty defined
    const specialty_defined =
      doctor.specialties && Array.isArray(doctor.specialties) && doctor.specialties.length > 0;

    // 6. Base schedule exists
    const scheduleResult = await db.query(
      `SELECT COUNT(*) as count FROM doctor_schedules
       WHERE doctor_profile_id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
      [doctorProfileId]
    );
    const base_schedule_exists = parseInt(scheduleResult.rows[0].count) > 0;

    // 7. Slots available in next 90 days
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const slotsResult = await db.query(
      `SELECT COUNT(*) as count FROM appointment_slots
       WHERE doctor_profile_id = $1
         AND slot_date BETWEEN $2 AND $3
         AND status = 'available'
         AND hospital_id = $4`,
      [doctorProfileId, today, futureDateStr, hospitalId]
    );
    const slots_available = parseInt(slotsResult.rows[0].count) > 0;

    // 8. No critical verification failures
    const onboardingResult = await db.query(
      `SELECT * FROM doctor_onboarding_states
       WHERE doctor_profile_id = $1`,
      [doctorProfileId]
    );
    const no_critical_failures =
      onboardingResult.rows.length === 0 ||
      onboardingResult.rows[0].overall_status !== 'verification_failed';

    // 9. Status = 'active'
    const status_active = doctor.status === 'active';

    // 10. No active forced blocks
    const forcedBlockResult = await db.query(
      `SELECT COUNT(*) as count FROM schedule_exceptions
       WHERE doctor_profile_id = $1
         AND exception_type = 'forced_block'
         AND NOW()::date BETWEEN start_date AND end_date
         AND deleted_at IS NULL`,
      [doctorProfileId]
    );
    const no_forced_blocks = parseInt(forcedBlockResult.rows[0].count) === 0;

    return {
      profile_complete,
      license_verified,
      fees_configured,
      location_assigned,
      specialty_defined,
      base_schedule_exists,
      slots_available,
      no_critical_failures,
      status_active,
      no_forced_blocks,
    };
  }

  /**
   * Calculate bookability score (0-100)
   * Each precondition contributes 10 points
   */
  private calculateBookabilityScore(preconditions: BookabilityCheck['preconditions']): number {
    let score = 0;

    if (preconditions.profile_complete) score += 10;
    if (preconditions.license_verified) score += 10;
    if (preconditions.fees_configured) score += 10;
    if (preconditions.location_assigned) score += 10;
    if (preconditions.specialty_defined) score += 10;
    if (preconditions.base_schedule_exists) score += 10;
    if (preconditions.slots_available) score += 10;
    if (preconditions.no_critical_failures) score += 10;
    if (preconditions.status_active) score += 10;
    if (preconditions.no_forced_blocks) score += 10;

    return score;
  }

  /**
   * Update bookability score in database
   */
  async updateBookabilityScore(doctorProfileId: string, hospitalId: string): Promise<number> {
    const check = await this.evaluateBookability(doctorProfileId, hospitalId);

    await db.query(
      `UPDATE doctor_profiles
       SET
         is_bookable = $1,
         bookability_score = $2,
         updated_at = NOW()
       WHERE id = $3 AND hospital_id = $4`,
      [check.is_bookable, check.bookability_score, doctorProfileId, hospitalId]
    );

    logger.info('Updated bookability score', {
      doctor_profile_id: doctorProfileId,
      is_bookable: check.is_bookable,
      score: check.bookability_score,
    });

    return check.bookability_score;
  }

  /**
   * Batch update bookability for all doctors
   * Should be run as a daily cron job
   */
  async updateBookabilityForAllDoctors(hospitalId: string): Promise<void> {
    logger.info('Updating bookability for all doctors', { hospital_id: hospitalId });

    const doctors = await db.query(
      `SELECT id FROM doctor_profiles
       WHERE hospital_id = $1 AND deleted_at IS NULL`,
      [hospitalId]
    );

    for (const doctor of doctors.rows) {
      try {
        await this.updateBookabilityScore(doctor.id, hospitalId);
      } catch (error: any) {
        logger.error('Failed to update bookability for doctor', {
          doctor_profile_id: doctor.id,
          error: error.message,
        });
      }
    }

    logger.info('Completed bookability update for all doctors', {
      hospital_id: hospitalId,
      doctor_count: doctors.rows.length,
    });
  }
}

// Export singleton instance
export const bookabilityService = new BookabilityService();
