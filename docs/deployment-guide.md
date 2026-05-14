# Deployment Guide

## 1) Local Setup
```bash
npm install
npm run dev
```
Open: `http://localhost:3000`

## 2) Environment Variables
Copy `.env.example` to `.env.local`.

Optional AI enhancement:
- `OPENAI_API_KEY` or `AI_API_KEY`
- `AI_MODEL` (default `gpt-4o-mini`)
- `AI_BASE_URL` (default `https://api.openai.com/v1`)

Without keys, the app runs fully in deterministic fallback mode.

## 3) Vercel Deployment
1. Push repository to GitHub.
2. Import project in Vercel dashboard.
3. Framework preset: Next.js.
4. Add environment variables (optional for AI enhancement).
5. Deploy.

The deployed app supports:
- demo mode (no keys needed),
- file uploads,
- evaluation ranking,
- overrides and report export.

## 4) Optional Supabase Setup (Future)
Current project ships with local JSON/in-memory persistence for hackathon/demo speed.

To add Supabase in production:
1. Create Supabase project.
2. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Replace `lib/store/session-store.ts` with Supabase repository implementation.
4. Add SQL migrations for:
   - job_descriptions
   - candidates
   - evaluations
   - overrides
   - recruiter_notes
   - reports

## 5) Build/Lint Validation
```bash
npm run lint
npm run build
```

## 6) GitHub Push Instructions
If repo is local only:
```bash
git remote add origin https://github.com/<username>/hirewise-ai-shortlisting-agent.git
git branch -M main
git push -u origin main
```

If GitHub CLI is authenticated:
```bash
gh repo create hirewise-ai-shortlisting-agent --public --source=. --remote=origin --push
```

## 7) Demo Instructions for Judges
1. Open deployed URL.
2. Click **Try Demo Data** on landing/workspace.
3. Inspect ranked shortlist and analytics.
4. Open a candidate detail panel.
5. Apply manual override with reason.
6. Download JSON/HTML/PDF reports from Reports page.
