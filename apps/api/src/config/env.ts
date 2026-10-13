import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Robust .env resolution: check local folder, parent monorepo root, etc.
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_PORT: z.coerce.number().default(parseInt(process.env.PORT || '3001')),
  API_HOST: z.string().default('localhost'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID_MONTHLY: z.string().optional(),
  STRIPE_PRO_PRICE_ID_YEARLY: z.string().optional(),
  STRIPE_MASTER_PRICE_ID_MONTHLY: z.string().optional(),
  STRIPE_MASTER_PRICE_ID_YEARLY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CRON_SECRET: z.string().default('looma-cron-secret-local'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
