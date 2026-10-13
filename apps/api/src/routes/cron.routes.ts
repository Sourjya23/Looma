import { Router, Request, Response } from 'express';
import { CronService } from '../services/cron.service.js';
import { env } from '../config/env.js';

const router = Router();

/**
 * Authentication middleware for cron execution
 */
const verifyCronSecret = (req: Request, res: Response, next: Function) => {
  if (env.NODE_ENV === 'development') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const customHeader = req.headers['x-cron-secret'] as string | undefined;
  const querySecret = req.query.secret as string | undefined;

  const providedSecret = bearerToken || customHeader || querySecret;

  if (!providedSecret || providedSecret !== env.CRON_SECRET) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing cron secret',
    });
    return;
  }

  next();
};

/**
 * @route   GET /api/cron/keep-alive
 * @desc    Keep-alive endpoint to ping PostgreSQL & Redis.
 *          Used by GitHub Actions / UptimeRobot / cron-job.org every 10-14 mins
 *          to prevent Supabase 7-day pause & Render spin-down.
 * @access  Public
 */
router.get('/keep-alive', async (_req: Request, res: Response) => {
  try {
    const result = await CronService.keepAlivePing();
    const statusCode = result.status === 'healthy' ? 200 : 207;
    res.status(statusCode).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Keep-alive ping failed',
    });
  }
});

/**
 * @route   POST /api/cron/daily-tasks (also supports GET for simple webhook triggers)
 * @desc    Daily maintenance tasks: Streak audits, stale session archival, leaderboard cache sync
 * @access  Protected by CRON_SECRET in production
 */
const handleDailyTasks = async (_req: Request, res: Response) => {
  try {
    const result = await CronService.runDailyMaintenance();
    res.json({
      success: result.success,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Daily maintenance failed',
    });
  }
};

router.post('/daily-tasks', verifyCronSecret, handleDailyTasks);
router.get('/daily-tasks', verifyCronSecret, handleDailyTasks);

export default router;
