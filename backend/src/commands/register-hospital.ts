import { v4 as uuidv4 } from 'uuid';
import { Command, CommandHandler, CommandResult, CommandValidationError } from '../event-sourcing/types';
import { eventStore } from '../event-sourcing/event-store';
import { logger } from '../utils/logger';

export interface RegisterHospitalPayload {
  name: string;
  license_number?: string;
  license_type?: string;
  provider_type: 'independent_doctor' | 'small_clinic' | 'medium_clinic' | 'large_hospital';
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
  };
  phone?: string;
  email: string;
  timezone?: string;
  subscription_tier?: 'starter' | 'professional' | 'enterprise';
}

/**
 * Register Hospital Command Handler
 *
 * Creates a new hospital/organization aggregate
 */
export const registerHospitalHandler: CommandHandler<RegisterHospitalPayload> = {
  commandType: 'register-hospital',

  async handle(command: Command<RegisterHospitalPayload>): Promise<CommandResult> {
    // Validate payload
    validatePayload(command.payload);

    // Generate hospital ID
    const hospitalId = command.aggregate_id || uuidv4();

    // Determine subscription tier based on provider type if not provided
    const subscriptionTier = command.payload.subscription_tier || 
      (command.payload.provider_type === 'independent_doctor' ? 'starter' :
       command.payload.provider_type === 'small_clinic' ? 'professional' :
       'enterprise');

    // Set limits based on subscription tier
    const limits = {
      starter: { max_users: 2, max_patients: 100 },
      professional: { max_users: 10, max_patients: 1000 },
      enterprise: { max_users: null, max_patients: null },
    };

    const { max_users, max_patients } = limits[subscriptionTier];

    // Create hospital_created event
    const event = await eventStore.appendEvent({
      aggregate_type: 'hospital',
      aggregate_id: hospitalId,
      aggregate_version: 1,
      event_type: 'hospital_created',
      event_schema_version: 1,
      event_data: {
        name: command.payload.name,
        license_number: command.payload.license_number || null,
        license_type: command.payload.license_type || null,
        provider_type: command.payload.provider_type,
        address: command.payload.address || null,
        phone: command.payload.phone || null,
        email: command.payload.email,
        timezone: command.payload.timezone || 'Asia/Kolkata',
        subscription_tier: subscriptionTier,
        max_users,
        max_patients,
        settings: {
          onboarding_completed: false,
          onboarding_step: 1,
        },
        created_at: new Date().toISOString(),
      },
      event_metadata: {
        command_id: command.command_id,
        ...command.metadata,
      },
      hospital_id: hospitalId, // Hospital is its own tenant
      idempotency_key: command.idempotency_key,
      correlation_id: command.metadata?.correlation_id || command.command_id,
      causation_id: command.command_id,
      caused_by_user_id: command.metadata?.user_id,
      client_ip: command.metadata?.client_ip,
      user_agent: command.metadata?.user_agent,
      device_id: command.metadata?.device_id,
    });

    logger.info('Hospital registered successfully', {
      hospital_id: hospitalId,
      name: command.payload.name,
      provider_type: command.payload.provider_type,
      subscription_tier: subscriptionTier,
      event_id: event.event_id,
    });

    return {
      command_id: command.command_id,
      aggregate_id: hospitalId,
      aggregate_type: 'hospital',
      aggregate_version: 1,
      events: [event],
      status: 'accepted',
      processed_at: new Date(),
    };
  },
};

/**
 * Validate register hospital payload
 */
function validatePayload(payload: RegisterHospitalPayload): void {
  const errors: Array<{ field: string; error: string }> = [];

  // Validate name
  if (!payload.name || payload.name.trim().length === 0) {
    errors.push({ field: 'name', error: 'required' });
  }
  if (payload.name && payload.name.length > 200) {
    errors.push({ field: 'name', error: 'must be 200 characters or less' });
  }

  // Validate email
  if (!payload.email || payload.email.trim().length === 0) {
    errors.push({ field: 'email', error: 'required' });
  } else {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;
    if (!emailRegex.test(payload.email)) {
      errors.push({ field: 'email', error: 'must be a valid email address' });
    }
  }

  // Validate provider_type
  const validProviderTypes = ['independent_doctor', 'small_clinic', 'medium_clinic', 'large_hospital'];
  if (!payload.provider_type || !validProviderTypes.includes(payload.provider_type)) {
    errors.push({
      field: 'provider_type',
      error: `must be one of: ${validProviderTypes.join(', ')}`,
    });
  }

  // Validate subscription_tier if provided
  if (payload.subscription_tier) {
    const validTiers = ['starter', 'professional', 'enterprise'];
    if (!validTiers.includes(payload.subscription_tier)) {
      errors.push({
        field: 'subscription_tier',
        error: `must be one of: ${validTiers.join(', ')}`,
      });
    }
  }

  // Validate address if provided
  if (payload.address) {
    if (!payload.address.line1 || payload.address.line1.trim().length === 0) {
      errors.push({ field: 'address.line1', error: 'required if address is provided' });
    }
    if (!payload.address.city || payload.address.city.trim().length === 0) {
      errors.push({ field: 'address.city', error: 'required if address is provided' });
    }
    if (!payload.address.state || payload.address.state.trim().length === 0) {
      errors.push({ field: 'address.state', error: 'required if address is provided' });
    }
    if (!payload.address.postal_code || payload.address.postal_code.trim().length === 0) {
      errors.push({ field: 'address.postal_code', error: 'required if address is provided' });
    }
  }

  // Validate phone if provided
  if (payload.phone && payload.phone.trim().length > 0) {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(payload.phone)) {
      errors.push({ field: 'phone', error: 'must be a valid phone number' });
    }
  }

  // Validate timezone if provided
  if (payload.timezone) {
    // Basic timezone validation (could be more strict)
    if (payload.timezone.length > 50) {
      errors.push({ field: 'timezone', error: 'must be a valid timezone identifier' });
    }
  }

  if (errors.length > 0) {
    throw new CommandValidationError(errors);
  }
}

