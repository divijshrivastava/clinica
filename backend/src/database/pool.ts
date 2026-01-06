import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

class DatabasePool {
  private pool: Pool;
  private static instance: DatabasePool;

  private constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      min: config.database.pool.min,
      max: config.database.pool.max,
      idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err });
    });
  }

  public static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  /**
   * Execute a query with automatic connection handling
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug('Query executed', {
        query: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      logger.error('Query failed', {
        query: text,
        params,
        error,
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transaction handling
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute a function within a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set session variables (for RLS multi-tenancy)
   */
  async setSessionVariables(client: PoolClient, variables: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(variables)) {
      // SET command doesn't support parameterized queries, so we escape the value
      const escapedValue = value.replace(/'/g, "''");
      await client.query(`SET app.${key} = '${escapedValue}'`);
    }
  }

  /**
   * Close all connections in the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const db = DatabasePool.getInstance();
