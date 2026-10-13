import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';
import { LeaderboardService } from './leaderboard.service.js';

export interface KeepAliveResult {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  database: {
    status: 'connected' | 'error';
    latencyMs: number;
    error?: string;
  };
  redis: {
    status: 'connected' | 'disconnected' | 'disabled';
    latencyMs: number;
    error?: string;
  };
}

export interface DailyMaintenanceResult {
  success: boolean;
  timestamp: string;
  durationMs: number;
  streaksChecked: number;
  streaksReset: number;
  abandonedSessionsCount: number;
  leaderboardSyncedCount: number;
  error?: string;
}

export class CronService {
  /**
   * Keep-Alive Ping
   * Pings Supabase PostgreSQL and Upstash Redis to:
   * 1. Prevent Supabase from auto-pausing after 7 days of inactivity
   * 2. Prevent Render from shutting down idle containers
   */
  static async keepAlivePing(): Promise<KeepAliveResult> {
    const start = Date.now();
    let dbStatus: 'connected' | 'error' = 'connected';
    let dbLatency = 0;
    let dbError: string | undefined;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (err: any) {
      dbStatus = 'error';
      dbError = err.message || 'Database query failed';
      console.error('[Cron] Database keep-alive query failed:', err.message);
    }

    let redisStatus: 'connected' | 'disconnected' | 'disabled' = 'disabled';
    let redisLatency = 0;
    let redisError: string | undefined;

    if (redis) {
      try {
        const redisStart = Date.now();
        await redis.ping();
        redisLatency = Date.now() - redisStart;
        redisStatus = 'connected';
      } catch (err: any) {
        redisStatus = 'disconnected';
        redisError = err.message || 'Redis ping failed';
        console.error('[Cron] Redis keep-alive ping failed:', err.message);
      }
    }

    const isHealthy = dbStatus === 'connected';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        ...(dbError ? { error: dbError } : {}),
      },
      redis: {
        status: redisStatus,
        latencyMs: redisLatency,
        ...(redisError ? { error: redisError } : {}),
      },
    };
  }

  /**
   * Daily Maintenance Tasks
   * 1. Streak Validation: Resets streaks for users who missed consecutive writing days
   * 2. Cleanup: Closes stale/abandoned writing sessions older than 48 hours
   * 3. Leaderboard Sync: Resynchronizes Postgres XP with Redis sorted sets
   */
  static async runDailyMaintenance(): Promise<DailyMaintenanceResult> {
    const startTime = Date.now();
    console.log('[Cron] Starting daily maintenance routine...');

    let streaksChecked = 0;
    let streaksReset = 0;
    let abandonedSessionsCount = 0;
    let leaderboardSyncedCount = 0;

    try {
      const now = new Date();
      // UTC midnight cutoff for missed streaks (users whose last activity was before yesterday)
      const yesterdayUtcMidnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
      );

      // 1. Audit Inactive Streaks
      const activeStreakUsers = await prisma.user.findMany({
        where: {
          currentStreak: { gt: 0 },
          lastActiveDate: { not: null },
        },
        select: {
          id: true,
          currentStreak: true,
          lastActiveDate: true,
        },
      });

      streaksChecked = activeStreakUsers.length;
      const usersToReset: string[] = [];

      for (const u of activeStreakUsers) {
        if (u.lastActiveDate) {
          const lastActiveUtcMidnight = new Date(
            Date.UTC(
              u.lastActiveDate.getUTCFullYear(),
              u.lastActiveDate.getUTCMonth(),
              u.lastActiveDate.getUTCDate()
            )
          );

          // If last active was strictly before yesterday, they missed a day
          if (lastActiveUtcMidnight.getTime() < yesterdayUtcMidnight.getTime()) {
            usersToReset.push(u.id);
          }
        }
      }

      if (usersToReset.length > 0) {
        const updateResult = await prisma.user.updateMany({
          where: { id: { in: usersToReset } },
          data: { currentStreak: 0 },
        });
        streaksReset = updateResult.count;
        console.log(`[Cron] Reset ${streaksReset} broken user streaks.`);
      }

      // 2. Archive abandoned sessions older than 48 hours
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const staleSessions = await prisma.writingSession.updateMany({
        where: {
          status: { in: ['idle', 'in_progress'] },
          createdAt: { lt: fortyEightHoursAgo },
        },
        data: {
          status: 'abandoned',
        },
      });
      abandonedSessionsCount = staleSessions.count;
      if (abandonedSessionsCount > 0) {
        console.log(`[Cron] Archived ${abandonedSessionsCount} abandoned sessions.`);
      }

      // 3. Resync Leaderboard Cache with Database
      if (redis) {
        try {
          leaderboardSyncedCount = await LeaderboardService.rebuildAllTimeLeaderboard();
          console.log(`[Cron] Rebuilt leaderboard cache for ${leaderboardSyncedCount} users.`);
        } catch (err: any) {
          console.warn('[Cron] Leaderboard cache rebuild warning:', err.message);
        }
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Cron] Daily maintenance finished in ${durationMs}ms.`);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        durationMs,
        streaksChecked,
        streaksReset,
        abandonedSessionsCount,
        leaderboardSyncedCount,
      };
    } catch (err: any) {
      console.error('[Cron] Daily maintenance encountered an error:', err);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        streaksChecked,
        streaksReset,
        abandonedSessionsCount,
        leaderboardSyncedCount,
        error: err.message || 'Unknown error during maintenance',
      };
    }
  }

  /**
   * Initialize in-process scheduled cron jobs
   */
  static initScheduler() {
    console.log('  🕒 Initializing automated in-process cron jobs...');

    // 1. Keep-Alive Ping every 10 minutes (0, 10, 20, 30, 40, 50)
    cron.schedule('*/10 * * * *', async () => {
      try {
        const ping = await CronService.keepAlivePing();
        if (ping.status === 'healthy') {
          console.log(
            `[Cron Ping] Keep-alive success — DB: ${ping.database.latencyMs}ms, Redis: ${ping.redis.latencyMs}ms, Uptime: ${ping.uptimeSeconds}s`
          );
        } else {
          console.warn('[Cron Ping] Degraded health during keep-alive ping');
        }
      } catch (err) {
        console.error('[Cron Ping] Error during automated ping:', err);
      }
    });

    // 2. Daily Maintenance at 00:05 UTC every night
    cron.schedule('5 0 * * *', async () => {
      try {
        await CronService.runDailyMaintenance();
      } catch (err) {
        console.error('[Cron Maintenance] Error during scheduled maintenance:', err);
      }
    });

    console.log('  ✅ Automated cron scheduler registered (Keep-Alive: 10m, Daily Maintenance: 00:05 UTC)');
  }
}
