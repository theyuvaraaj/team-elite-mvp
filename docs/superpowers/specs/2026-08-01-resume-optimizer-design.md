# Resume Optimizer — Design Spec

**Date:** 2026-08-01
**Status:** Approved (design)
**Feature:** JD-based resume optimization for Employees and Admins

## Summary

Let Employees and Admins turn a candidate's base resume plus a job
description into an ATS-friendly, tailored resume they can download (DOCX +
PDF). Each generated resume is stored under the candidate and is visible
**only** to Employees (assigned) and Admins — never to the candidate.

Primary flow: an Employee finds a good job, uploads the candidate's base
resume, pastes the JD, names the company, clicks **Optimize**, downloads the
result, applies manually, then logs the application through the existing
Applications section.

> **Scope note:** This feature intentionally crosses two documented MVP
> non-goals in `docs/01-prd.md` — "AI resume generation / ATS optimization"
> and "File uploads" — as a deliberate post-MVP expansion.

## Decisions (locked)

| Question | Decision |
|---|---|
| Optimization engine | **Google Gemini** (`gemini-2.5-flash`) via `@google/generative-ai`. Free tier for trial, cheapest, strong enough for text rewrite. Behind a `ResumeOptimizer` interface so the provider can be swapped in one file. |
| ATS score | **Real transparent heuristic** 0–100 with a breakdown. Not a universal ATS metric — labeled as our own. |
| Refine loop | optimize → score → if < 90, re-prompt with missing keywords → regenerate, **max 3 passes**, keep best. |
| Download format | **DOCX + PDF**, both rendered from one canonical resume. DOCX via `docx`, PDF via `pdfkit`. |
| Storage | **No blob storage.** Store canonical resume as Markdown text in Postgres; render downloads on demand. |
| Timing | **Synchronous** request (~15–25s) with a client loading state. Job queue deferred to v2. |
| Access | Admin **and** assigned Employee, via a shared candidate-detail route. Candidate role: 403 everywhere. |
| JD input | **Plain text** only for v1. URL/link import deferred to v2. |

## Architecture

New API module: `apps/api/src/modules/resumes/`

```
resumes/
  routes.ts        # endpoints + role/assignment guards
  service.ts       # orchestration: parse → optimize → score → persist
  repository.ts    # Prisma access for OptimizedResume
  schemas.ts       # zod validation
  parse.ts         # PDF/DOCX → plain text
  optimizer.ts     # ResumeOptimizer interface + GeminiOptimizer
  scorer.ts        # pure scoreResume(resumeText, jdText) -> {score, breakdown}
  render.ts        # canonical markdown -> DOCX (docx) + PDF (pdfkit)
```

### Dependencies (new)
- `@fastify/multipart` — file upload
- `pdf-parse` — PDF → text
- `mammoth` — DOCX → text
- `@google/generative-ai` — Gemini client
- `docx` — DOCX generation
- `pdfkit` — PDF generation

### Config (new env)
- `GEMINI_API_KEY` (required for the feature; validated in `config.ts`)
- `RESUME_OPTIMIZE_MODEL` optional, default `gemini-2.5-flash`
- `RESUME_MAX_REFINE_PASSES` optional, default `3`
- `RESUME_SCORE_TARGET` optional, default `90`
- `RESUME_MAX_UPLOAD_MB` optional, default `5`

### Flow

1. **Parse** — detect type by mime/extension; `pdf-parse` or `mammoth` →
   plain text. Reject unsupported types, empty text, or files over the size
   limit. The original binary is never persisted.
2. **Optimize** — `GeminiOptimizer.optimize({ resumeText, jobDescription,
   companyName, missingKeywords? })` returns canonical Markdown with standard
   sections (Contact, Summary, Skills, Experience, Education, etc.). Prompt
   forbids tables/columns/images and instructs single-column, ATS-parseable
   structure with JD-aligned wording (no fabricated facts).
3. **Score** — `scoreResume(markdownText, jobDescription)` → `{ score,
   breakdown }`.
4. **Refine** — if `score < target` and passes remain, re-call the optimizer
   with the missing keywords surfaced by the scorer; keep the highest-scoring
   result.
5. **Persist** — store canonical Markdown + JD + company + score + breakdown
   + author under the candidate. Write an audit-log entry.
6. **Download** — `render.ts` turns canonical Markdown into DOCX or PDF on
   request and streams it.

### Scorer heuristic (transparent breakdown)

| Component | Weight | Check |
|---|---|---|
| Keyword coverage | 40 | % of salient JD keywords present in the resume |
| Section structure | 20 | Standard headings present (contact, experience, education, skills) |
| Parseability | 20 | Plain text, no tables/columns/images/glyphs (inherent to our output) |
| Contact block | 10 | Name + email/phone present |
| Length / density | 10 | Within a sane word-count band; bullet formatting |

`breakdown` returns each component's earned/possible points plus the list of
JD keywords still missing (fed back into the refine loop and shown in the UI).

## Data model (Prisma)

```prisma
model OptimizedResume {
  id             String   @id @default(uuid())
  candidateId    String   @map("candidate_id")
  createdById    String   @map("created_by_id")
  companyName    String   @map("company_name")
  jobDescription String   @map("job_description") @db.Text
  contentMarkdown String  @map("content_markdown") @db.Text
  atsScore       Int      @map("ats_score")
  scoreBreakdown Json     @map("score_breakdown")
  createdAt      DateTime @default(now()) @map("created_at")

  candidate Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  createdBy User      @relation(fields: [createdById], references: [id])

  @@index([candidateId])
  @@map("optimized_resumes")
}
```
Back-relations added to `Candidate` and `User`. New migration.

## API

All endpoints require an authenticated `ADMIN` or `EMPLOYEE`. For `EMPLOYEE`,
`assertEmployeeAssigned(employeeId, candidateId)` must pass. `CANDIDATE` role
is rejected with 403 and the feature is never surfaced in candidate views.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/candidates/:id/resumes/optimize` | multipart: `file`, `jobDescription`, `companyName` → parse→optimize→score→persist → `{ id, atsScore, scoreBreakdown }` |
| `GET` | `/api/candidates/:id/resumes` | list metadata (company, score, author, date) |
| `GET` | `/api/candidates/:id/resumes/:rid/download?format=pdf\|docx` | render + stream file |

Errors: 400 (bad/empty/oversized file, missing fields), 403 (role/assignment),
404 (candidate/resume), 429 (Gemini rate limit — surfaced as "AI service busy,
try again"), 502 (optimizer failure).

## Frontend

- **Shared candidate-detail surface** used by both Employee (assigned) and
  Admin (any candidate). Admin reaches it via a new route linked from
  Admin → Users → candidate row.
- New **"Resume optimizer"** section on that page:
  - Inputs: base-resume file upload (PDF/DOCX), JD textarea, company name.
  - **Optimize** button → loading state (~15–25s).
  - Result: **score card** with the breakdown + missing-keyword chips, and
    **Download DOCX / Download PDF** buttons.
  - **History list**: past optimized resumes for this candidate (company ·
    score · author · date · download).
- Ledger-styled, consistent with the existing design system.
- TanStack Query mutation for optimize; query for the history list.

## Testing

- **Scorer** unit tests (pure): keyword coverage, structure, missing-keyword
  output, boundary lengths.
- **Parse** tests: PDF and DOCX fixtures → text; reject empty/oversized/bad
  type.
- **Optimizer**: interface tested with a stub; a thin Gemini adapter test
  behind a flag/mocked client (no network in CI).
- **Authz** integration tests: candidate → 403; employee not assigned → 403;
  employee assigned → 200; admin → 200; download honors the same guards.
- **Render**: DOCX and PDF produced from canonical markdown are non-empty and
  contain expected section text.

## Out of scope (v2)

- JD import from a URL/link.
- Background job queue + progress polling.
- Persisting/versioning the original uploaded file.
- Candidate-visible view of optimized resumes.
- Multi-provider selection UI (provider is config-swappable but not user-facing).
