# Deployment Guide

## 1. Provision Infrastructure
- **GPU Server**: Rent a GPU instance (e.g., RunPod RTX 3090/4090).
- **Supabase**: Create a new PostgreSQL database.
- **Upstash**: Create a new Redis instance.
- **Cloudflare**: Create a Cloudflare Pages project.

## 2. Configure DNS
- Add domain `yourdomain.com` to Cloudflare.
- Set `app.yourdomain.com` to point to Cloudflare Pages.
- Set `api.yourdomain.com` to point to the GPU Server IP (proxied via Cloudflare).

## 3. Configure Environments
### Staging
Use Cloudflare Preview deployments and separate staging databases on Supabase/Upstash.
### Production
Set the following environment variables on the GPU Server (`.env`):
```env
NODE_ENV=production
DATABASE_URL=postgres://...
REDIS_URL=rediss://...
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://app.yourdomain.com
AI_SERVICE_URL=http://localhost:8000
OLLAMA_URL=http://localhost:11434
MODEL_NAME=llama3.1:8b-instruct-fp16
```
On Cloudflare Pages, set:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## 4. Run Migrations
Run `npx prisma migrate deploy` in the production environment. Never make manual SQL changes to the schema in production.

## 5. Deploy Backend (GPU Server)
Copy `docker-compose.prod.yml` to the server.
Run:
```bash
docker compose -f docker-compose.prod.yml up -d
```
Ensure Caddy routes `api.yourdomain.com` to the Node.js API (port 3001) and handles HTTPS.

## 6. Deploy Frontend (Cloudflare Pages)
Push to the `main` branch on GitHub. Cloudflare Pages will automatically trigger `npm run build` and deploy the `dist/` directory.

## 7. Security Checks
- Ensure Ollama (11434) and FastAPI (8000) are NOT accessible from the public internet.
- Ensure only the Node.js API is exposed via Caddy.

## 8. Health Check & Smoke Test
- Verify `/api/health` returns 200.
- Create an account, write a short story, and verify all AI feedbacks complete successfully.
- Verify XP and Leaderboard updates.

## 9. Rollback Strategy
If a deployment fails:
1. Revert the frontend deployment to the previous stable commit on Cloudflare Pages.
2. Rollback backend Docker images to the previous stable version.
3. If database changes are breaking, restore from the last Supabase automated backup.
