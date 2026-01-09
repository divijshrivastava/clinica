import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { EventStore } from '../event-sourcing/EventStore';
import { logger } from '../utils/logger';

export interface CreateChargeCodeCommand {
  hospital_id: string;
  code: string;
  display_name: string;
  description?: string;
  category: string;
  department_id?: string;
  service_type?: 'OPD' | 'IPD' | 'BOTH';
  base_price: number;
  currency?: string;
  unit?: string;
  is_taxable?: boolean;
  tax_rate?: number;
  effective_from?: string;
  effective_until?: string;
  user_id: string;
}

export async function createChargeCode(
  db: Pool,
  eventStore: EventStore,
  command: CreateChargeCodeCommand
): Promise<string> {
  const {
    hospital_id,
    code,
    display_name,
    description,
    category,
    department_id,
    service_type = 'BOTH',
    base_price,
    currency = 'INR',
    unit = 'per_service',
    is_taxable = false,
    tax_rate = 0,
    effective_from,
    effective_until,
    user_id
  } = command;

  // Validate required fields
  if (!hospital_id || !code || !display_name || !category || base_price === undefined) {
    throw new Error('Missing required fields: hospital_id, code, display_name, category, base_price');
  }

  if (base_price < 0) {
    throw new Error('base_price must be >= 0');
  }

  if (tax_rate < 0 || tax_rate > 100) {
    throw new Error('tax_rate must be between 0 and 100');
  }

  // Check if code already exists for this hospital
  const existing = await db.query(
    `SELECT id FROM charge_codes WHERE hospital_id = $1 AND code = $2`,
    [hospital_id, code]
  );

  if (existing.rows.length > 0) {
    throw new Error(`Charge code "${code}" already exists for this hospital`);
  }

  const chargeCodeId = uuidv4();

  // Append event to event store
  await eventStore.appendEvent({
    aggregate_type: 'charge_code',
    aggregate_id: chargeCodeId,
    event_type: 'charge_code_created',
    event_data: {
      hospital_id,
      code,
      display_name,
      description,
      category,
      department_id,
      service_type,
      base_price,
      currency,
      unit,
      is_taxable,
      tax_rate,
      effective_from,
      effective_until
    },
    hospital_id,
    caused_by_user_id: user_id,
    caused_by_command: 'CreateChargeCode'
  });

  logger.info(`Charge code created: ${code} (${chargeCodeId}) for hospital ${hospital_id}`);

  return chargeCodeId;
}
