import * as XLSX from 'xlsx';
import { logger } from '../../../utils/logger';

export interface ExtractorResult {
  data: Record<string, any>[];
  totalRows: number;
  columns: string[];
  sheets?: string[];
}

export class ExcelExtractor {
  async extract(filePath: string, sheetName?: string): Promise<ExtractorResult> {
    try {
      const workbook = XLSX.readFile(filePath);

      // Get all sheet names
      const sheets = workbook.SheetNames;
      logger.info(`Excel file contains sheets: ${sheets.join(', ')}`);

      // Use specified sheet or first sheet
      const targetSheet = sheetName || sheets[0];

      if (!sheets.includes(targetSheet)) {
        throw new Error(`Sheet "${targetSheet}" not found in workbook`);
      }

      const worksheet = workbook.Sheets[targetSheet];

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        raw: false, // Format dates and numbers as strings
        defval: '', // Default value for empty cells
      });

      // Extract column headers
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const columns: string[] = [];

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          columns.push(String(cell.v));
        }
      }

      // Add row numbers
      const data = jsonData.map((row, index) => ({
        _rowNumber: index + 1,
        ...row
      }));

      logger.info(`Excel extraction complete: ${data.length} rows from sheet "${targetSheet}"`);

      return {
        data,
        totalRows: data.length,
        columns,
        sheets
      };
    } catch (error) {
      logger.error('Excel extraction failed:', error);
      throw error;
    }
  }

  async validate(filePath: string): Promise<boolean> {
    try {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getEstimatedRowCount(filePath: string, sheetName?: string): Promise<number> {
    const result = await this.extract(filePath, sheetName);
    return result.totalRows;
  }

  async getSheetNames(filePath: string): Promise<string[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames;
    } catch (error) {
      logger.error('Failed to read Excel sheet names:', error);
      return [];
    }
  }
}
