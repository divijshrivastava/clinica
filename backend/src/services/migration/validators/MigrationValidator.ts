import { Pool } from 'pg';
import { logger } from '../../../utils/logger';

export interface ValidationRule {
  entity_type: string;
  field_name: string;
  rule_type: 'required' | 'regex' | 'range' | 'unique' | 'reference' | 'email' | 'phone';
  rule_config: Record<string, any>;
  severity: 'error' | 'warning';
  error_message: string;
}

export interface ValidationError {
  row_number: number;
  field_name: string;
  severity: 'error' | 'warning';
  error_code: string;
  error_message: string;
  suggested_fix?: string;
  current_value?: any;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validated_count: number;
}

export class MigrationValidator {
  constructor(private db: Pool) {}

  async getValidationRules(entityType: string): Promise<ValidationRule[]> {
    const result = await this.db.query(
      `SELECT entity_type, field_name, rule_type, rule_config, severity, error_message
       FROM migration_validation_rules
       WHERE entity_type = $1 AND is_active = true`,
      [entityType]
    );
    return result.rows;
  }

  async validate(
    data: Record<string, any>[],
    entityType: string,
    hospitalId: string
  ): Promise<ValidationResult> {
    const rules = await this.getValidationRules(entityType);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    logger.info(`Validating ${data.length} records of type ${entityType} with ${rules.length} rules`);

    for (const record of data) {
      const rowNumber = record._rowNumber || 0;

      for (const rule of rules) {
        const fieldValue = record[rule.field_name];
        const validationError = await this.applyRule(rule, fieldValue, rowNumber, record, hospitalId);

        if (validationError) {
          if (validationError.severity === 'error') {
            errors.push(validationError);
          } else {
            warnings.push(validationError);
          }
        }
      }
    }

    logger.info(`Validation complete: ${errors.length} errors, ${warnings.length} warnings`);

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      validated_count: data.length
    };
  }

  private async applyRule(
    rule: ValidationRule,
    value: any,
    rowNumber: number,
    record: Record<string, any>,
    hospitalId: string
  ): Promise<ValidationError | null> {
    switch (rule.rule_type) {
      case 'required':
        return this.validateRequired(rule, value, rowNumber);

      case 'regex':
        return this.validateRegex(rule, value, rowNumber);

      case 'email':
        return this.validateEmail(rule, value, rowNumber);

      case 'phone':
        return this.validatePhone(rule, value, rowNumber);

      case 'range':
        return this.validateRange(rule, value, rowNumber);

      case 'unique':
        return await this.validateUnique(rule, value, rowNumber, hospitalId);

      case 'reference':
        return await this.validateReference(rule, value, rowNumber, hospitalId);

      default:
        return null;
    }
  }

  private validateRequired(rule: ValidationRule, value: any, rowNumber: number): ValidationError | null {
    if (value === null || value === undefined || value === '') {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'REQUIRED_FIELD_MISSING',
        error_message: rule.error_message,
        current_value: value
      };
    }
    return null;
  }

  private validateRegex(rule: ValidationRule, value: any, rowNumber: number): ValidationError | null {
    if (!value) return null;

    const pattern = new RegExp(rule.rule_config.pattern);
    if (!pattern.test(String(value))) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'REGEX_VALIDATION_FAILED',
        error_message: rule.error_message,
        current_value: value,
        suggested_fix: rule.rule_config.example
      };
    }
    return null;
  }

  private validateEmail(rule: ValidationRule, value: any, rowNumber: number): ValidationError | null {
    if (!value) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(value))) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'INVALID_EMAIL',
        error_message: rule.error_message,
        current_value: value
      };
    }
    return null;
  }

  private validatePhone(rule: ValidationRule, value: any, rowNumber: number): ValidationError | null {
    if (!value) return null;

    // Indian phone number format: +91XXXXXXXXXX or XXXXXXXXXX
    const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
    const cleanedPhone = String(value).replace(/[\s\-()]/g, '');

    if (!phoneRegex.test(cleanedPhone)) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'INVALID_PHONE',
        error_message: rule.error_message,
        current_value: value,
        suggested_fix: '+91' + cleanedPhone.replace(/^\+91/, '')
      };
    }
    return null;
  }

  private validateRange(rule: ValidationRule, value: any, rowNumber: number): ValidationError | null {
    if (!value) return null;

    const numValue = typeof value === 'number' ? value : parseFloat(String(value));

    if (isNaN(numValue)) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'INVALID_NUMBER',
        error_message: 'Value must be a number',
        current_value: value
      };
    }

    const min = rule.rule_config.min;
    const max = rule.rule_config.max;

    if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'VALUE_OUT_OF_RANGE',
        error_message: rule.error_message,
        current_value: value
      };
    }

    return null;
  }

  private async validateUnique(
    rule: ValidationRule,
    value: any,
    rowNumber: number,
    hospitalId: string
  ): Promise<ValidationError | null> {
    if (!value) return null;

    const tableName = rule.rule_config.table;
    const columnName = rule.rule_config.column;

    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM ${tableName}
       WHERE ${columnName} = $1 AND hospital_id = $2 AND deleted_at IS NULL`,
      [value, hospitalId]
    );

    if (parseInt(result.rows[0].count) > 0) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'DUPLICATE_VALUE',
        error_message: rule.error_message,
        current_value: value
      };
    }

    return null;
  }

  private async validateReference(
    rule: ValidationRule,
    value: any,
    rowNumber: number,
    hospitalId: string
  ): Promise<ValidationError | null> {
    if (!value) return null;

    const tableName = rule.rule_config.table;
    const columnName = rule.rule_config.column;

    const result = await this.db.query(
      `SELECT COUNT(*) as count FROM ${tableName}
       WHERE ${columnName} = $1 AND hospital_id = $2 AND deleted_at IS NULL`,
      [value, hospitalId]
    );

    if (parseInt(result.rows[0].count) === 0) {
      return {
        row_number: rowNumber,
        field_name: rule.field_name,
        severity: rule.severity,
        error_code: 'REFERENCE_NOT_FOUND',
        error_message: rule.error_message,
        current_value: value
      };
    }

    return null;
  }
}
