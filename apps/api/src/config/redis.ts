import Redis from 'ioredis';
import { env } from './env.js';

let redis: Redis | null = null;

try {
  redis = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('Redis connection failed after 3 retries, falling back to degraded mode.');
        return null;
      }
      return Math.min(times * 50, 2000);
    }
  });

  redis.on('error', (err) => {
    console.error('Redis Client Error', err);
  });
} catch (e) {
  console.error('Failed to initialize Redis client', e);
}

export { redis };
