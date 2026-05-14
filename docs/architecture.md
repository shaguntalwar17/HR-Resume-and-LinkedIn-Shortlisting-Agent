# HireWise AI Architecture

## 1) System Overview
HireWise AI is a full-stack Next.js application that supports HR teams in resume and LinkedIn shortlisting through:
- deterministic parsing + scoring fallback (no API keys required),
- optional LLM-enhanced justifications,
- ranked recommendations,
- human override audit trail,
- downloadable reports.

The app is optimized for Vercel deployment and demo-readiness.

## 2) Frontend Architecture
- Framework: Next.js App Router + TypeScript.
- UI: Tailwind CSS + reusable component primitives (`components/ui`).
- UX flow:
  1. JD ingestion/parsing
  2. Candidate ingestion/parsing
  3. Evaluation run
  4. Ranking + detail explainability + overrides
  5. Analytics + report exports
- Key pages:
  - `/`: landing/product overview
  - `/workspace`: end-to-end evaluation console
  - `/reports`: export center
  - `/methodology`: rubric + responsible AI explanation

## 3) Backend/API Architecture
All backend logic is implemented through Next.js route handlers (`app/api/**`) with Node runtime.

Core endpoints:
- `POST /api/jd/parse`: parses JD text/file into structured requirements.
- `POST /api/candidates/parse`: parses resume files (PDF/DOCX/TXT) + LinkedIn JSON.
- `POST /api/evaluate`: computes weighted scores, ranking, and optional AI enhancement.
- `POST /api/override`: applies recruiter override with full audit logging.
- `POST /api/notes`: stores recruiter notes for candidates.
- `POST /api/demo`: loads prebuilt demo dataset instantly.
- `GET /api/reports/{json|html|pdf}`: downloadable report generation.
- `GET /api/runs`: fetches recent runs/history.

## 4) Parsing Pipeline
### JD parsing
- Inputs: plain text and/or uploaded JD file.
- Extracts:
  - role title
  - required/preferred skills
  - minimum experience
  - domain/industry
  - education requirements
  - certifications
  - responsibilities
  - nice-to-have qualifications

### Candidate parsing
- Resume files: parsed by extension
  - PDF: `pdf-parse`
  - DOCX: `mammoth`
  - TXT: UTF-8 text
- LinkedIn: manual JSON payload parsing.
- Candidate profile extraction includes:
  - identity/contact fields
  - role/experience
  - skills/tools
  - education/certs
  - projects/work experience
  - communication indicators
  - sensitive-attribute warning signals

## 5) Scoring Pipeline
The scoring engine computes all mandatory dimensions with explicit weights:
- Skills Match: 30%
- Experience Relevance: 25%
- Education & Certs: 15%
- Project / Portfolio: 20%
- Communication Quality: 10%

Computation:
`total_score = (Σ raw_dimension_score * weight) * 10`

Each dimension returns:
- raw score out of 10
- weighted contribution
- one-line justification
- evidence snippet(s)

Outputs:
- total score out of 100
- recommendation band
- confidence level
- key strengths/gaps
- risk flags

## 6) AI Layer
`lib/ai/provider.ts` provides a pluggable enhancement layer.
- Default mode: deterministic engine (always available).
- Optional mode: OpenAI-compatible chat completion via env variables.
- AI enhancement only refines justifications/confidence/summary; deterministic scoring remains robust fallback.

## 7) Audit & Persistence
- Current persistence: JSON-file + in-memory fallback (`lib/store/session-store.ts`).
- Stored entities:
  - evaluation runs
  - candidates
  - scores
  - override history
  - recruiter notes
- Designed to be replaceable with Supabase/Postgres adapter later.

## 8) Reporting Pipeline
Generated report formats:
- JSON: full machine-readable artifact
- HTML: narrative report with ranking and candidate breakdown
- PDF: lightweight printable summary generated server-side (`pdf-lib`)

Report sections:
- JD summary
- evaluation methodology
- ranked shortlist table
- candidate-level breakdown
- override logs
- responsible AI disclaimer

## 9) Analytics Pipeline
Dashboard metrics built from evaluation outputs:
- total candidates
- average score
- top candidate
- recommendation breakdown
- score distribution
- skill-gap distribution
- most common missing skills
- candidate comparison dimensions

## 10) Deployment Notes
- Vercel-compatible runtime and packages.
- Works without any secret keys (demo + deterministic scoring).
- AI key adds enhancement quality but is optional.
