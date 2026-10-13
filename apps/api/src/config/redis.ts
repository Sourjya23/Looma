import Redis from 'ioredis';
import { env } from './env.js';

let redis: Redis | null = null;

try {
  const client = new Redis(env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 1500,
    retryStrategy(times) {
      if (times > 2) return null;
      return 1000;
    }
  });

  client.on('error', () => {
    // Suppress console spam if Redis is offline in local dev
  });

  client.connect().then(() => {
    console.log('✅ Redis connected successfully.');
    redis = client;
  }).catch(() => {
    console.warn('⚠️ [Redis] Offline, falling back to in-memory mode.');
    redis = null;
  });
} catch (e) {
  console.warn('[Redis] Client initialization skipped.');
  redis = null;
}

export { redis };
