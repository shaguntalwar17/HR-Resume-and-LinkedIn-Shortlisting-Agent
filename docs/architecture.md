# HireWise AI Architecture

## 1. System Context
HireWise AI is a Next.js 16 full-stack product that supports recruiter workflows from JD intake through candidate ranking, manual review, and report export.

Core goals:
- standardize candidate screening,
- preserve human control,
- maintain explainability and auditability.

## 2. Application Layers

### Frontend
- App Router pages for dashboard, jobs, candidates, evaluations, shortlist, reports, analytics, settings, and responsible AI.
- Protected layout shell with left navigation and role-aware access.
- Responsive enterprise dashboard UI with cards, tables, and charts.

### Access Control
- JWT session cookie auth.
- Role-based authorization in API guards:
  - `ADMIN`
  - `RECRUITER`
  - `HIRING_MANAGER`
  - `VIEWER`
- Request pre-routing guard via `proxy.ts`.

### API Layer
- Node runtime route handlers under `app/api/**`.
- Zod request validation.
- Audit logging for critical workflow actions.
- New health endpoint: `GET /api/health`.
- Rate limits on sensitive endpoints (login and inbound webhooks).

### Domain Services
- `lib/parsers/*`: JD and candidate extraction from files/JSON.
- `lib/scoring/*`: deterministic scoring + optional semantic signal.
- `lib/reporting/*`: JSON/HTML/PDF generation.
- `lib/audit/*`: append-only audit records.

### Data Layer
- Prisma models for organization, users, jobs, candidates, evaluations, reviews, reports, settings, integrations, and webhook logs.
- Additional persistence models for production traceability:
  - `ScoreBreakdown` (dimension-level rubric audit)
  - `ResumeDocument` (file metadata + parsed text)
  - `LinkedInProfileData` (manual/imported profile payload storage)
- Current runtime uses SQLite-backed Prisma.
- Development fallback bootstrap is enabled through `ensure-schema` for environments where Prisma push is unavailable.

## 3. Candidate Evaluation Pipeline
1. Recruiter creates/selects job requisition.
2. JD is parsed into structured requirements.
3. Resumes and LinkedIn JSON are ingested and normalized.
4. Candidate profile is scored against job criteria.
5. Explanations, evidence snippets, risk flags, and dimension-level weighted rubric rows are generated.
6. Recruiter or hiring manager updates status/recommendation and may override with reason.
7. Audit logs and reports preserve decision traceability.

## 4. Responsible AI Controls
- Protected attributes are not used in scoring logic.
- Sensitive attributes detected in resume text are flagged as ignored.
- Human review remains mandatory before final hiring status transitions.
- Overrides require reason text and become part of the immutable review trail.

## 5. Deployment Architecture Decision
Given the current SQLite persistence model, the recommended real-world deployment is:
- containerized deployment on a platform with persistent volumes (Railway, Render, Fly),
- encrypted storage for DB and uploads,
- demo mode disabled in production,
- webhook secret and rate limiting enabled.

This avoids ephemeral-storage failure modes from serverless-only SQLite deployments.

## 6. Production Hardening Implemented
- `proxy.ts` route protection
- security headers and CSP in `next.config.ts`
- `GET /api/health` service checks
- env validation with production-safe defaults (`lib/config/server-env.ts`)
- rate limiting helper (`lib/security/rate-limit.ts`)
- demo mode hard gate for demo bootstrap APIs
- optional managed file storage support via `@vercel/blob`

## 7. Future Architecture Upgrades
- Move persistence default to managed PostgreSQL.
- Add tenant-aware row-level security (RLS) and stricter data retention controls.
- Introduce background job queue for heavy parsing/report tasks.
- Add SIEM integration for enterprise compliance telemetry.
