import { Router, Request, Response } from 'express';
import { db } from '../database/pool';
import { eventStore } from '../event-sourcing/event-store';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

/**
 * GET /health
 *
 * Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'mymedic-backend',
  });
});

/**
 * GET /health/detailed
 *
 * Detailed health check including database and event sourcing status
 */
router.get('/detailed', asyncHandler(async (_req: Request, res: Response) => {
  // Check database connection
  let databaseStatus = 'ok';
  let databaseError = null;
  try {
    await db.query('SELECT 1');
  } catch (error: any) {
    databaseStatus = 'error';
    databaseError = error.message;
  }

  // Check projection lag
  let projectionStatus = 'ok';
  let projectionLag: any[] = [];
  try {
    projectionLag = await eventStore.checkProjectionLag();
    const maxLag = Math.max(...projectionLag.map(p => p.lag_events), 0);

    if (maxLag > 5000) {
      projectionStatus = 'degraded';
    } else if (maxLag > 1000) {
      projectionStatus = 'warning';
    }
  } catch (error) {
    projectionStatus = 'unknown';
  }

  // Get database pool stats
  const poolStats = db.getStats();

  // Overall status
  const overallStatus = databaseStatus === 'ok' && projectionStatus !== 'degraded'
    ? 'healthy'
    : 'degraded';

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: databaseStatus,
        error: databaseError,
        pool: poolStats,
      },
      projections: {
        status: projectionStatus,
        lag: projectionLag,
      },
    },
  });
}));

export default router;
