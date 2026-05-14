# Deployment Guide (Production-Ready)

## 1. Deployment Strategy
For this repository's current persistence model (Prisma + SQLite), deploy on a platform that supports **persistent volumes**.

Recommended:
- Railway
- Render
- Fly.io
- Self-hosted Kubernetes/VM with mounted persistent disk

Why:
- SQLite must persist to disk across restarts.
- Resume files must persist outside ephemeral containers.

## 2. Required Environment Variables
Set these in your deployment platform:

```env
APP_URL=https://your-domain.example
AUTH_SECRET=<long-random-secret-32+ chars>
DATABASE_URL=file:./data/hirewise.db

ENABLE_DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
AUTO_BOOTSTRAP_SCHEMA=true

RESUME_STORAGE_PROVIDER=local
MAX_RESUME_FILE_MB=8

LOGIN_RATE_LIMIT_WINDOW_MS=300000
LOGIN_RATE_LIMIT_MAX_REQUESTS=12
WEBHOOK_RATE_LIMIT_WINDOW_MS=60000
WEBHOOK_RATE_LIMIT_MAX_REQUESTS=180
WEBHOOK_SHARED_SECRET=<long-random-webhook-secret>
```

Optional AI enhancement:
```env
OPENAI_API_KEY=
AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
ENABLE_SEMANTIC_EMBEDDINGS=false
EMBEDDING_MODEL=text-embedding-3-small
```

Optional managed file storage:
```env
RESUME_STORAGE_PROVIDER=vercel_blob
BLOB_READ_WRITE_TOKEN=<token>
VERCEL_BLOB_ACCESS=private
```

## 3. Docker Deployment

### Build and run
```bash
docker compose up --build -d
```

### What this gives you
- Next.js production server
- persistent `/app/data` volume for SQLite
- persistent `/app/public/uploads` volume for resume files
- restart policy for service resilience

## 4. Health Monitoring
Use:
- `GET /api/health`

Expected:
- `200` and `status: "ok"` when healthy
- `503` and `status: "degraded"` when critical checks fail

## 5. Security Checklist Before Go-Live
- [ ] `ENABLE_DEMO_MODE=false`
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] strong `AUTH_SECRET`
- [ ] strong `WEBHOOK_SHARED_SECRET`
- [ ] TLS enabled at ingress/load balancer
- [ ] regular encrypted disk backups for DB/upload volumes
- [ ] access logging and alerting configured
- [ ] least-privilege admin accounts for HR operators

## 6. CI/CD
Included workflow:
- `.github/workflows/ci.yml`

Pipeline runs:
- `npm ci`
- `npm run lint`
- `npm run build`

## 7. Vercel Guidance
This project includes Vercel config and can be used for UI/demo workloads.  
However, local SQLite persistence is not suitable for Vercel serverless filesystem in production.

If Vercel is required for production:
1. migrate Prisma datasource to managed Postgres,
2. run schema migrations in CI/CD,
3. keep file uploads on managed object storage.

## 8. Local Development
```bash
npm install
npm run dev
```

Demo login remains available when demo mode is enabled.
