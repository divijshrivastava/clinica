/**
 * Core Event Sourcing Types
 * Based on schema.sql event store design
 */

// Aggregate Types (from schema.sql ENUM)
export type AggregateType =
  | "patient"
  | "visit"
  | "medical_note"
  | "document"
  | "appointment"
  | "prescription"
  | "whatsapp_message"
  | "user"
  | "hospital";

// Event Types (from schema.sql ENUM)
export type EventType =
  // Patient Events
  | "patient_registered"
  | "patient_demographics_updated"
  | "patient_contact_updated"
  | "patient_consent_granted"
  | "patient_consent_revoked"
  | "patient_deleted"
  // Visit Events
  | "visit_scheduled"
  | "visit_started"
  | "vitals_recorded"
  | "examination_recorded"
  | "diagnosis_recorded"
  | "treatment_plan_recorded"
  | "visit_completed"
  | "visit_cancelled"
  // Appointment Events
  | "appointment_scheduled"
  | "appointment_confirmed"
  | "appointment_rescheduled"
  | "appointment_reminder_sent"
  | "appointment_completed"
  | "appointment_no_show_recorded"
  | "appointment_cancelled"
  // Prescription Events
  | "prescription_issued"
  | "prescription_signed"
  | "prescription_dispensed"
  | "prescription_cancelled"
  // Medical Note Events
  | "note_created"
  | "note_content_updated"
  | "note_image_uploaded"
  | "note_ocr_completed"
  | "note_signed"
  // Document Events
  | "document_uploaded"
  | "document_categorized"
  | "document_shared"
  | "document_deleted"
  // Communication Events
  | "whatsapp_message_queued"
  | "whatsapp_message_sent"
  | "whatsapp_message_delivered"
  | "whatsapp_message_read"
  | "whatsapp_message_failed"
  // User/Hospital Events
  | "user_registered"
  | "user_updated"
  | "user_activated"
  | "user_role_changed"
  | "user_deactivated"
  | "hospital_created"
  | "hospital_settings_updated";

/**
 * Base Event structure stored in event_store table
 */
export interface Event<T = any> {
  event_id: string;
  event_number: number;
  aggregate_type: AggregateType;
  aggregate_id: string;
  aggregate_version: number;
  event_type: EventType;
  event_schema_version: number;
  event_timestamp: Date;
  event_data: T;
  event_metadata: EventMetadata;
  hospital_id: string;
  idempotency_key?: string;
  correlation_id?: string;
  causation_id?: string;
  caused_by_user_id?: string;
  client_ip?: string;
  user_agent?: string;
  device_id?: string;
}

/**
 * Event metadata for tracing and debugging
 */
export interface EventMetadata {
  [key: string]: any;
}

/**
 * Command structure for write operations
 */
export interface Command<T = any> {
  command_id: string;
  command_type: string;
  aggregate_id?: string;
  aggregate_type: AggregateType;
  expected_version?: number;
  idempotency_key?: string;
  payload: T;
  metadata?: CommandMetadata;
}

/**
 * Command metadata
 */
export interface CommandMetadata {
  device_id?: string;
  initiated_at?: Date;
  user_id?: string;
  hospital_id?: string;
  client_ip?: string;
  user_agent?: string;
  [key: string]: any;
}

/**
 * Command result after processing
 */
export interface CommandResult {
  command_id: string;
  aggregate_id: string;
  aggregate_type: AggregateType;
  aggregate_version: number;
  events: Event[];
  status: "accepted" | "rejected";
  processed_at: Date;
}

/**
 * Base Aggregate interface
 */
export interface Aggregate {
  id: string;
  type: AggregateType;
  version: number;
  apply(event: Event): void;
}

/**
 * Event Handler interface for projections
 */
export interface EventHandler<T = any> {
  eventType: EventType;
  handle(event: Event<T>): Promise<void>;
}

/**
 * Command Handler interface
 */
export interface CommandHandler<TPayload = any, TResult = CommandResult> {
  commandType: string;
  handle(command: Command<TPayload>): Promise<TResult>;
}

/**
 * Snapshot structure
 */
export interface Snapshot<T = any> {
  snapshot_id: string;
  aggregate_type: AggregateType;
  aggregate_id: string;
  aggregate_version: number;
  snapshot_data: T;
  event_number: number;
  snapshot_timestamp: Date;
  created_by: string;
}

/**
 * Projection State tracking
 */
export interface ProjectionState {
  projection_name: string;
  last_processed_event_number: number;
  last_processed_at?: Date;
  is_rebuilding: boolean;
  rebuild_started_at?: Date;
  rebuild_progress_pct?: number;
  error_count: number;
  last_error?: string;
  last_error_at?: Date;
}

/**
 * Concurrency conflict error
 */
export class ConcurrencyConflictError extends Error {
  constructor(
    public expectedVersion: number,
    public actualVersion: number,
    public aggregateId: string
  ) {
    super(
      `Expected version ${expectedVersion}, but aggregate is at version ${actualVersion}`
    );
    this.name = "ConcurrencyConflictError";
  }
}

/**
 * Idempotency key conflict (not an error, returns original result)
 */
export class IdempotencyKeyConflictError extends Error {
  constructor(
    public idempotencyKey: string,
    public originalResult: CommandResult
  ) {
    super(`Command with idempotency key ${idempotencyKey} already processed`);
    this.name = "IdempotencyKeyConflictError";
  }
}

/**
 * Command validation error
 */
export class CommandValidationError extends Error {
  constructor(public validationErrors: ValidationError[]) {
    super("Command validation failed");
    this.name = "CommandValidationError";
  }
}

export interface ValidationError {
  field: string;
  error: string;
}
