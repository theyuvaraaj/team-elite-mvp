# PROGRESS — Team Elite Portal

> Orientation for any engineer/agent picking this up. Read this first, then
> `docs/01-prd.md` for product intent and the two spec/plan files under
> `docs/superpowers/` for the resume-optimizer design.

## What this is

Internal multi-tenant ops portal for **Team Elite**, a service that applies to
jobs on behalf of candidates. Three roles, backend-enforced access:

- **ADMIN** — manage users, assignments, applications, audit log.
- **EMPLOYEE** — see/track applications for their **assigned** candidates only.
- **CANDIDATE** — read-only, sanitized view of their own applications. Never
  sees employee identity or internal comments.

Replaces a leaky shared spreadsheet. PRD: `docs/01-prd.md`.

## Stack

- **Monorepo**, pnpm workspaces. Node ≥ 20.
- **API** (`apps/api`): Fastify + Prisma + PostgreSQL, TypeScript **ESM**
  (local imports use `.js` extensions). Session-cookie auth (argon2 hashes,
  sha256 session tokens). Zod validation. Modular: `src/modules/<name>/`.
- **Web** (`apps/web`): React + Vite + TanStack Query + Tailwind v4.
  React Router, role-siloed routes (`/admin/*`, `/employee/*`, `/candidate/*`).
- Design system: **"Ledger"** — records-book aesthetic (warm paper / ink-black,
  monospace figures, hairline rules, one red-ink accent). Full light+dark.
  Tokens + classes in `apps/web/src/styles.css`. Design contract:
  `apps/web/DESIGN.md`.

## Run it locally

```bash
pnpm install
pnpm db:up            # postgres via docker-compose (port 5432)
pnpm db:migrate       # prisma migrate
pnpm db:seed          # purges leftover test users + seeds a real roster
pnpm dev:api          # Fastify on :3001 (tsx watch)
pnpm dev:web          # Vite on :5173
```

Demo logins (after seed):

| Role | Email | Password | Name |
|---|---|---|---|
| Admin | `admin@teamelite.local` | `ChangeMeAdmin123!` | Neha Verma |
| Employee | `employee@teamelite.local` | `Employee123!` | Aarav Mehta |
| Candidate | `candidate@teamelite.local` | `Candidate123!` | Priya Sharma |

Seed also creates employee Kabir Nair + candidates Rohan Iyer, Ananya Rao,
Vikram Singh, with assignments. Real names — do not reintroduce placeholder
"Alex Employee"/"Priya Candidate" names.

## Env (`apps/api/.env`, template in `.env.example`)

Core: `DATABASE_URL`, `SESSION_SECRET`, `WEB_ORIGIN`, `API_ORIGIN`,
`EMAIL_FROM`, `SEED_ADMIN_EMAIL/PASSWORD`, `INVITE_TOKEN_TTL_HOURS`,
`SESSION_TTL_DAYS`, `PORT`, `NODE_ENV`.

Resume optimizer:
- `GEMINI_API_KEY` — Google AI Studio key. **Optional**; without it dev/test use
  a deterministic stub and a keyless **production** deploy returns a clean 503
  (never fabricates). Present in this env.
- `RESUME_OPTIMIZE_MODEL` — default `gemini-flash-latest`. **Do NOT use
  `gemini-2.5-flash`** — it 404s for new API accounts.
- `RESUME_MAX_REFINE_PASSES` (3), `RESUME_SCORE_TARGET` (90),
  `RESUME_MAX_UPLOAD_MB` (5), `RESUME_REQUEST_TIMEOUT_MS` (55000),
  `TECTONIC_BIN` (`tectonic`), `RESUME_LATEX_TIMEOUT_MS` (45000).

## Feature: Resume optimizer (Employees + Admins)

Turn a candidate's base resume + a job description into an ATS-tuned resume,
downloadable as PDF/DOCX, stored under the candidate, staff-only.

Flow: employee finds a job → uploads base resume (drag-drop) → pastes JD →
company → optional enhancements → **Optimize** → score card + downloads.
Applies manually, logs it via the existing Applications section.

Three opt-in enhancements, all OFF by default: align job titles to the JD, add
a Certifications section, add a location (from the JD or entered manually).
There is no "preserve format" mode — parsing only ever yields text, so output
is always our LaTeX/DOCX template.

Pipeline (`apps/api/src/modules/resumes/`):
1. `parse.ts` — PDF (`pdf-parse` v2 class API) / DOCX (`mammoth`) / text → plain
   text. Original binary is discarded.
2. `optimizer.ts` — `getOptimizer()` returns `StubOptimizer` under
   `NODE_ENV=test` (always) or dev-without-key; else `GeminiOptimizer`
   (`@google/generative-ai`). Two prompt **modes**: `rewrite` (full
   restructure, aggressive embellishment) and `content` (keep the base
   resume's structure, only tailor wording). Hard rule: never invent
   employers/titles/dates/degrees; skills + framing may be enriched. Per-call
   timeout (SDK + Promise.race backstop) so a stalled call can't hang.
3. `scorer.ts` — transparent 0–100 heuristic modelled on real ATS scanners:
   keywords 40 (whole-term + JD phrase matching, never substrings), job-title
   match 10, contact completeness 10 (email/phone/location/LinkedIn),
   measurable results 10, sections 10, date formats 5, length 5,
   parseability 10. Scoring runs on the *rendered* text (see
   `markdownToPlainText`), not the markdown source. Target is 95; the refine
   loop feeds named `gaps` back into the next pass.
4. `service.ts` — parse → optimize→score refine loop (keep highest, break at
   target, ≤ passes) → persist markdown in Postgres → audit log.
5. `render.ts` — canonical markdown → DOCX (`docx`) and pdfkit PDF. Inline
   parser converts `**bold**`, strips stray `*`/backticks/links.
6. `latex.ts` — markdown → single-column ATS LaTeX → **Tectonic** compile →
   polished PDF (the "authentic LaTeX resume" look). `format=pdf` uses this;
   **falls back to pdfkit** if Tectonic is missing/errors/times out.

Storage: `OptimizedResume` (markdown text + JD + company + score + author).
No blob storage; downloads render on demand.

API (prefix `/api/candidates`, all `ADMIN`|assigned-`EMPLOYEE`, candidate 403):
- `POST /:id/resumes/optimize` (multipart: `jobDescription`, `companyName`,
  `alignJobTitles`, `addCertifications`, `addLocation`, `location`, then
  `file` — **text fields MUST precede the file** in the stream).
- `GET /:id/resumes` — history.
- `GET /:id/resumes/:rid` — full record (resume, company, JD, score) for the
  detail modal.
- `GET /:id/resumes/:rid/download?format=pdf|docx`.

`:id` accepts **either** the Candidate UUID **or** its short numeric `code`
(see below), resolved by `resolveCandidateId`.

UI: `apps/web/src/features/employee/ResumeOptimizer.tsx`, mounted on the shared
candidate-detail page (employee: `/employee/candidates/:id`, admin:
`/admin/candidates/:id`).

## Candidate short codes

`Candidate.code` is a 4-digit+ sequential reference (Postgres sequence
`candidate_code_seq`, starts at 1000) so staff can navigate by editing the URL:
`/employee/candidates/1042` or `/admin/candidates/1042`. Candidate and resume
routes accept a UUID or a code.

## Key files

- Auth/session: `apps/api/src/lib/session.ts`, `middleware/requireAuth.ts`,
  `middleware/requireRole.ts`, `modules/auth/`.
- Access scoping: `modules/assignments/service.ts` → `assertEmployeeAssigned`.
- Web design: `apps/web/src/styles.css`, `components/ui/*`, `components/layout/*`.
- Web api client: `apps/web/src/lib/api.ts` (FormData-aware).
- Router/paths: `apps/web/src/app/router.tsx`, `paths.ts`.

## Testing

```bash
pnpm --filter @team-elite/api test    # 52 tests (Vitest, needs postgres up)
pnpm --filter @team-elite/web exec vitest run   # 17 tests
pnpm --filter @team-elite/api exec tsc --noEmit
pnpm --filter @team-elite/web exec tsc -b
```

Integration tests use `buildApp()` + `app.inject()` + `createSession`; they run
offline (stub optimizer) and clean up their users in `afterAll`.

## Gotchas (things that bit us)

- **Stale API server on :3001** — `tsx watch` restarts can `EADDRINUSE` and
  silently keep an old process (old code/env). If behavior looks stale:
  `lsof -ti :3001 | xargs kill -9` then restart.
- **Vite dep cache** — after `pnpm add`, restart `dev:web` or Tailwind/utilities
  can render stale ("Re-optimizing dependencies…").
- **Gemini free tier throttles** — under heavy use a single call can take 60–80s
  (times out → clean "try again"). Recovers on its own; billing lifts it.
- **Tectonic cold cache** — first LaTeX compile in a fresh env downloads TeX
  packages (~30–60s, may hit the timeout → pdfkit fallback that once), then fast.
- **Multipart field order** — the optimize route reads text fields from
  `request.file().fields`, which only sees parts **before** the file.
- **Orphaned test users** — killed test runs can leave `res-*`/`stats-*` users;
  `pnpm db:seed` purges them.

## State

- Branch/target: **`main`** (personal remote `theyuvaraaj/team-elite-mvp`,
  SSH host `github-personal`). Latest work is on `main`.
- Not deployed. `apps/api/Dockerfile` installs Tectonic (falls back if absent);
  `apps/web/vercel.json`, `apps/api/railway.toml` present but unconfigured.
- Everything green: 52 api + 17 web tests, both apps typecheck clean.

## Possible next steps

- Auto-retry the optimize call on Gemini timeout/429 (free-tier resilience).
- Configurable LaTeX templates (font/header/photo/section order).
- Candidate-visible optimized resumes (currently staff-only) — if ever wanted.
- Deploy: wire Railway (API + managed Postgres) and Vercel (web), set
  `GEMINI_API_KEY` + origins, enable billing on the Gemini key to avoid throttle.
