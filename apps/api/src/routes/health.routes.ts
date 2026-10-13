import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    dbOk = false;
  }

  if (redis) {
    try {
      await redis.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
  }

  res.json({
    success: true,
    data: {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      services: {
        database: dbOk ? 'up' : 'down',
        redis: redis ? (redisOk ? 'up' : 'down') : 'not_configured',
      },
    },
  });
});

export default router;
