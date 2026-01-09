import { createReadStream } from 'fs';
import * as csvParser from 'csv-parser';
import { logger } from '../../../utils/logger';

export interface ExtractorResult {
  data: Record<string, any>[];
  totalRows: number;
  columns: string[];
}

export class CSVExtractor {
  async extract(filePath: string): Promise<ExtractorResult> {
    return new Promise((resolve, reject) => {
      const data: Record<string, any>[] = [];
      let columns: string[] = [];
      let rowNumber = 0;

      createReadStream(filePath)
        .pipe(csvParser({
          skipEmptyLines: true,
          trim: true,
        }))
        .on('headers', (headers: string[]) => {
          columns = headers;
          logger.info(`CSV headers detected: ${headers.join(', ')}`);
        })
        .on('data', (row) => {
          rowNumber++;
          data.push({
            _rowNumber: rowNumber,
            ...row
          });
        })
        .on('end', () => {
          logger.info(`CSV extraction complete: ${rowNumber} rows`);
          resolve({
            data,
            totalRows: rowNumber,
            columns
          });
        })
        .on('error', (error) => {
          logger.error('CSV extraction failed:', error);
          reject(error);
        });
    });
  }

  async validate(filePath: string): Promise<boolean> {
    try {
      const result = await this.extract(filePath);
      return result.totalRows > 0 && result.columns.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getEstimatedRowCount(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let count = 0;
      createReadStream(filePath)
        .pipe(csvParser())
        .on('data', () => count++)
        .on('end', () => resolve(count))
        .on('error', reject);
    });
  }
}
