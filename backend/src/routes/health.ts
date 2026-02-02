import { Router, Request, Response, NextFunction } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { config } from '../config';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbConnected = await checkDatabaseConnection();

    const health = {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      services: {
        api: 'up',
        database: dbConnected ? 'connected' : 'disconnected',
      },
      uptime: process.uptime(),
    };

    const statusCode = dbConnected ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/health/live
 * Kubernetes liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /api/health/ready
 * Kubernetes readiness probe
 */
router.get('/ready', async (req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'database disconnected' });
  }
});

export default router;
