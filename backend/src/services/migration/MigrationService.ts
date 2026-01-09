import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { CSVExtractor } from './extractors/CSVExtractor';
import { ExcelExtractor } from './extractors/ExcelExtractor';
import { MigrationValidator, ValidationError } from './validators/MigrationValidator';
import { EventStore } from '../../event-sourcing/EventStore';
import { logger } from '../../utils/logger';

export interface MigrationConfig {
  id: string;
  hospital_id: string;
  initiated_by_user_id: string;
  migration_type: 'csv' | 'excel';
  file_path: string;
  entity_types: string[];
  column_mapping?: Record<string, string>;
  sheet_name?: string;
}

export interface MigrationStatus {
  id: string;
  status: string;
  total_records: number;
  processed_records: number;
  success_count: number;
  error_count: number;
  warning_count: number;
  errors?: ValidationError[];
}

export class MigrationService {
  private csvExtractor: CSVExtractor;
  private excelExtractor: ExcelExtractor;
  private validator: MigrationValidator;

  constructor(
    private db: Pool,
    private eventStore: EventStore
  ) {
    this.csvExtractor = new CSVExtractor();
    this.excelExtractor = new ExcelExtractor();
    this.validator = new MigrationValidator(db);
  }

  async startMigration(config: MigrationConfig): Promise<string> {
    logger.info(`Starting migration ${config.id} of type ${config.migration_type}`);

    // Create migration record
    await this.db.query(
      `INSERT INTO migrations (
        id, hospital_id, initiated_by_user_id, migration_type,
        status, entity_types, source_config, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        config.id,
        config.hospital_id,
        config.initiated_by_user_id,
        config.migration_type,
        'pending',
        config.entity_types,
        JSON.stringify({ file_path: config.file_path, sheet_name: config.sheet_name })
      ]
    );

    // Emit migration_started event
    await this.eventStore.appendEvent({
      aggregate_type: 'migration',
      aggregate_id: config.id,
      event_type: 'migration_started',
      event_data: {
        migration_type: config.migration_type,
        entity_types: config.entity_types
      },
      hospital_id: config.hospital_id,
      caused_by_user_id: config.initiated_by_user_id
    });

    // Start extraction asynchronously
    this.processMigration(config).catch(error => {
      logger.error(`Migration ${config.id} failed:`, error);
      this.markMigrationFailed(config.id, error.message);
    });

    return config.id;
  }

  private async processMigration(config: MigrationConfig): Promise<void> {
    try {
      // Stage 1: Extract data
      await this.updateMigrationStatus(config.id, 'extracting');
      const extractedData = await this.extractData(config);

      // Stage 2: Transform data (apply column mapping)
      await this.updateMigrationStatus(config.id, 'transforming');
      const transformedData = await this.transformData(extractedData, config);

      // Stage 3: Validate data
      await this.updateMigrationStatus(config.id, 'validating');
      const validationResult = await this.validator.validate(
        transformedData,
        config.entity_types[0], // For now, support single entity type
        config.hospital_id
      );

      // Store validation errors
      if (validationResult.errors.length > 0 || validationResult.warnings.length > 0) {
        await this.storeValidationErrors(config.id, [
          ...validationResult.errors,
          ...validationResult.warnings
        ]);
      }

      // Update migration with counts
      await this.db.query(
        `UPDATE migrations SET
          total_records = $1,
          error_count = $2,
          warning_count = $3
         WHERE id = $4`,
        [
          extractedData.length,
          validationResult.errors.length,
          validationResult.warnings.length,
          config.id
        ]
      );

      // If validation has errors, stop here
      if (!validationResult.is_valid) {
        await this.updateMigrationStatus(config.id, 'validation_failed');
        logger.warn(`Migration ${config.id} has validation errors. Waiting for fixes.`);
        return;
      }

      // Stage 4: Import data (generate events)
      await this.importData(config, transformedData);

      // Mark as completed
      await this.updateMigrationStatus(config.id, 'completed');
      logger.info(`Migration ${config.id} completed successfully`);
    } catch (error) {
      logger.error(`Migration ${config.id} processing failed:`, error);
      throw error;
    }
  }

  private async extractData(config: MigrationConfig): Promise<Record<string, any>[]> {
    logger.info(`Extracting data from ${config.file_path}`);

    let result;
    if (config.migration_type === 'csv') {
      result = await this.csvExtractor.extract(config.file_path);
    } else if (config.migration_type === 'excel') {
      result = await this.excelExtractor.extract(config.file_path, config.sheet_name);
    } else {
      throw new Error(`Unsupported migration type: ${config.migration_type}`);
    }

    // Store raw data
    for (const row of result.data) {
      await this.db.query(
        `INSERT INTO migration_raw_data (migration_id, row_number, raw_data)
         VALUES ($1, $2, $3)`,
        [config.id, row._rowNumber, JSON.stringify(row)]
      );
    }

    logger.info(`Extracted ${result.totalRows} rows`);
    return result.data;
  }

  private async transformData(
    data: Record<string, any>[],
    config: MigrationConfig
  ): Promise<Record<string, any>[]> {
    logger.info(`Transforming ${data.length} records`);

    if (!config.column_mapping) {
      return data; // No transformation needed
    }

    const transformed = data.map(row => {
      const newRow: Record<string, any> = { _rowNumber: row._rowNumber };

      // Apply column mapping
      for (const [sourceCol, targetField] of Object.entries(config.column_mapping!)) {
        if (row[sourceCol] !== undefined) {
          newRow[targetField] = row[sourceCol];
        }
      }

      return newRow;
    });

    // Store transformed data
    for (const row of transformed) {
      await this.db.query(
        `INSERT INTO migration_transformed_data (migration_id, entity_type, transformed_data)
         VALUES ($1, $2, $3)`,
        [config.id, config.entity_types[0], JSON.stringify(row)]
      );
    }

    return transformed;
  }

  private async storeValidationErrors(
    migrationId: string,
    errors: ValidationError[]
  ): Promise<void> {
    for (const error of errors) {
      await this.db.query(
        `INSERT INTO migration_validation_errors (
          migration_id, row_number, field_name, severity,
          error_code, error_message, suggested_fix
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          migrationId,
          error.row_number,
          error.field_name,
          error.severity,
          error.error_code,
          error.error_message,
          error.suggested_fix
        ]
      );
    }
  }

  private async importData(
    config: MigrationConfig,
    data: Record<string, any>[]
  ): Promise<void> {
    logger.info(`Importing ${data.length} records as events`);
    await this.updateMigrationStatus(config.id, 'importing');

    let successCount = 0;

    for (const row of data) {
      try {
        // Generate patient_registered event for each row
        const patientId = uuidv4();
        const event = await this.eventStore.appendEvent({
          aggregate_type: 'patient',
          aggregate_id: patientId,
          event_type: 'patient_registered',
          event_data: {
            hospital_id: config.hospital_id,
            mrn: row.mrn || `MIG-${Date.now()}-${successCount}`,
            first_name: row.first_name || row.name?.split(' ')[0] || '',
            last_name: row.last_name || row.name?.split(' ').slice(1).join(' ') || '',
            phone: row.phone || '',
            date_of_birth: row.date_of_birth || row.dob || null,
            gender: row.gender || null,
            email: row.email || null,
            blood_group: row.blood_group || null,
            address: row.address ? { street: row.address } : null,
          },
          hospital_id: config.hospital_id,
          caused_by_user_id: config.initiated_by_user_id,
          event_metadata: {
            migration_id: config.id,
            source_row: row._rowNumber
          }
        });

        // Track event mapping
        await this.db.query(
          `INSERT INTO migration_event_map (migration_id, aggregate_type, aggregate_id, event_id)
           VALUES ($1, $2, $3, $4)`,
          [config.id, 'patient', patientId, event.event_id]
        );

        successCount++;

        // Update progress
        await this.db.query(
          `UPDATE migrations SET processed_records = $1, success_count = $2 WHERE id = $3`,
          [successCount, successCount, config.id]
        );
      } catch (error) {
        logger.error(`Failed to import row ${row._rowNumber}:`, error);
      }
    }

    logger.info(`Import complete: ${successCount} records imported`);
  }

  private async updateMigrationStatus(migrationId: string, status: string): Promise<void> {
    await this.db.query(
      `UPDATE migrations SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, migrationId]
    );
  }

  private async markMigrationFailed(migrationId: string, errorMessage: string): Promise<void> {
    await this.db.query(
      `UPDATE migrations SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [migrationId]
    );

    logger.error(`Migration ${migrationId} marked as failed: ${errorMessage}`);
  }

  async getMigrationStatus(migrationId: string): Promise<MigrationStatus | null> {
    const result = await this.db.query(
      `SELECT id, status, total_records, processed_records, success_count, error_count, warning_count
       FROM migrations WHERE id = $1`,
      [migrationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const migration = result.rows[0];

    // Get validation errors if any
    const errorsResult = await this.db.query(
      `SELECT row_number, field_name, severity, error_code, error_message, suggested_fix
       FROM migration_validation_errors
       WHERE migration_id = $1 AND is_fixed = false
       ORDER BY row_number, severity DESC
       LIMIT 100`,
      [migrationId]
    );

    return {
      ...migration,
      errors: errorsResult.rows
    };
  }

  async fixValidationError(
    migrationId: string,
    errorId: string,
    fixedValue: any
  ): Promise<void> {
    await this.db.query(
      `UPDATE migration_validation_errors
       SET fixed_value = $1, is_fixed = true, fixed_at = NOW()
       WHERE id = $2 AND migration_id = $3`,
      [fixedValue, errorId, migrationId]
    );

    // Check if all errors are fixed
    const remainingErrors = await this.db.query(
      `SELECT COUNT(*) as count FROM migration_validation_errors
       WHERE migration_id = $1 AND severity = 'error' AND is_fixed = false`,
      [migrationId]
    );

    // If all errors fixed, resume migration
    if (parseInt(remainingErrors.rows[0].count) === 0) {
      logger.info(`All errors fixed for migration ${migrationId}. Resuming...`);
      // TODO: Resume migration processing
    }
  }
}
