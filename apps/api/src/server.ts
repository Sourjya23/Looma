import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import morgan from 'morgan';
import { redis } from './config/redis.js';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import challengeRoutes from './routes/challenge.routes.js';
import sessionRoutes from './routes/session.routes.js';
import healthRoutes from './routes/health.routes.js';
import aiRoutes from './routes/ai.routes.js';
import historyRoutes from './routes/history.routes.js';
import profileRoutes from './routes/profile.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';

const app = express();

// ── Middleware ──
app.use(cors({
  origin: env.CORS_ORIGIN.split(','), // Split by comma just in case of multiple origins, otherwise it works for one
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to be loaded cross-origin if needed
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Static files (Avatars, etc.)
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Rate Limiting Config
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'development' ? 99999999 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: redis ? new RedisStore({
    sendCommand: (...args: string[]) => redis!.call(args[0], ...args.slice(1)) as any,
  }) : undefined, // fallback to memory if redis fails
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: env.NODE_ENV === 'development' ? 99999999 : 10,
  passOnStoreError: true,
  store: redis ? new RedisStore({
    sendCommand: (...args: string[]) => redis!.call(args[0], ...args.slice(1)) as any,
  }) : undefined,
});

// ── Routes ──
app.use('/api', limiter); // default limit for all API routes
app.use('/api/challenges/generate', aiLimiter);
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', aiLimiter, aiRoutes); // stricter limit for AI

// ── Error handling ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ──
app.listen(env.API_PORT, '0.0.0.0', () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │  📝 Story Writing API              │
  │  Port: ${env.API_PORT}                        │
  │  Env:  ${env.NODE_ENV}               │
  └─────────────────────────────────────┘
  `);

  // Rebuild leaderboard from DB on startup so Redis is always in sync
  if (redis) {
    import('./services/leaderboard.service.js').then(({ LeaderboardService }) => {
      LeaderboardService.rebuildAllTimeLeaderboard()
        .then((count) => console.log(`  ✅ Rebuilt leaderboard for ${count} users`))
        .catch((err) => console.warn('  ⚠️ Leaderboard rebuild skipped:', err.message));
    });
  }
});

export default app;
