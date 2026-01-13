import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://divij@localhost:5432/mymedic_dev',
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN || '10', 10),
      max: parseInt(process.env.DATABASE_POOL_MAX || '50', 10),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
    },
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  eventSourcing: {
    snapshotFrequency: parseInt(process.env.SNAPSHOT_FREQUENCY || '100', 10),
    projectionBatchSize: parseInt(process.env.PROJECTION_BATCH_SIZE || '1000', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  monitoring: {
    enabled: process.env.ENABLE_METRICS === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090', 10),
  },
};
