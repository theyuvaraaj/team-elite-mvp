# Resume Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Employees and Admins turn a candidate's base resume + a job description into an ATS-friendly tailored resume (DOCX + PDF), stored under the candidate and visible only to staff.

**Architecture:** New Fastify module `apps/api/src/modules/resumes/` handles upload→parse→optimize(Gemini)→score(heuristic, refine loop)→persist(Postgres text). Downloads render on demand (`docx`, `pdfkit`). Frontend adds a Resume Optimizer section to a shared candidate-detail page reachable by Employees (assigned) and Admins.

**Tech Stack:** Fastify, Prisma/Postgres, Zod, `@fastify/multipart`, `pdf-parse`, `mammoth`, `@google/generative-ai`, `docx`, `pdfkit`; React + Vite + TanStack Query + Tailwind (ledger design).

## Global Constraints

- Node ≥ 20; pnpm workspace. API is ESM — import local files with `.js` extension.
- Errors thrown as `AppError(statusCode, code, message)` from `apps/api/src/lib/errors.js`; the app error handler serializes them.
- Zod request validation via `parseBody(schema, body)` from `apps/api/src/modules/auth/schemas.js`.
- Prisma ids are `String @db.Uuid @default(dbgenerated("gen_random_uuid()"))`.
- Access rule: `ADMIN` or `EMPLOYEE` only; for `EMPLOYEE` call `assertEmployeeAssigned(employeeId, candidateId)` from `apps/api/src/modules/assignments/service.js`. `CANDIDATE` → 403. Never surface in candidate views.
- Audit each generation via `audit.log({ userId, action, entity, entityId })` from `apps/api/src/lib/audit.js`.
- Tests: Vitest. Integration tests use `buildApp()` + `app.inject()` + `createSession` + `COOKIE_NAME` (pattern in `apps/api/test/authz.applications.test.ts`). Run with `pnpm --filter @team-elite/api test`.
- Offline tests: the optimizer factory returns a deterministic stub when `NODE_ENV==="test"` or `GEMINI_API_KEY` is empty — no network in CI.
- Frontend: `api<T>(path, init)` from `apps/web/src/lib/api.ts`; ledger design tokens/classes already exist (`.eyebrow`, `.led-figure`, `.stat-card`, `.data-table-wrap`, `.panel`, `Button`, `Input`).
- Commit after each task. No Claude/AI attribution in commits.

---

### Task 1: Dependencies, env config, multipart registration

**Files:**
- Modify: `apps/api/package.json` (deps)
- Modify: `apps/api/src/config.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/.env` and `.env.example`

**Interfaces:**
- Produces: `config.GEMINI_API_KEY`, `config.RESUME_OPTIMIZE_MODEL`, `config.RESUME_MAX_REFINE_PASSES`, `config.RESUME_SCORE_TARGET`, `config.RESUME_MAX_UPLOAD_MB` on the exported `config` object.

- [ ] **Step 1: Install dependencies**

Run in `apps/api`:
```bash
pnpm add @fastify/multipart @google/generative-ai pdf-parse mammoth docx pdfkit
pnpm add -D @types/pdfkit
```

- [ ] **Step 2: Add env vars to config schema**

In `apps/api/src/config.ts`, add these keys inside the `z.object({ ... })`:
```ts
  GEMINI_API_KEY: z.string().optional().default(""),
  RESUME_OPTIMIZE_MODEL: z.string().default("gemini-2.5-flash"),
  RESUME_MAX_REFINE_PASSES: z.coerce.number().int().positive().default(3),
  RESUME_SCORE_TARGET: z.coerce.number().int().min(0).max(100).default(90),
  RESUME_MAX_UPLOAD_MB: z.coerce.number().int().positive().default(5),
```

- [ ] **Step 3: Register multipart in the app**

In `apps/api/src/app.ts`, add the import and register it after `cookie` (before routes):
```ts
import multipart from "@fastify/multipart";
// ...inside buildApp, after await app.register(cookie):
await app.register(multipart, {
  limits: { fileSize: config.RESUME_MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});
```

- [ ] **Step 4: Add env to .env and .env.example**

Append to both `apps/api/.env` and `apps/api/.env.example`:
```
GEMINI_API_KEY=
RESUME_OPTIMIZE_MODEL=gemini-2.5-flash
RESUME_MAX_REFINE_PASSES=3
RESUME_SCORE_TARGET=90
RESUME_MAX_UPLOAD_MB=5
```

- [ ] **Step 5: Verify the app still boots**

Run: `pnpm --filter @team-elite/api test`
Expected: existing tests still PASS (no regressions).

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml apps/api/src/config.ts apps/api/src/app.ts apps/api/.env.example
git commit -m "chore(api): add resume-optimizer deps, env config, multipart"
```

---

### Task 2: Prisma model + migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migration via `prisma migrate dev`

**Interfaces:**
- Produces: `OptimizedResume` Prisma model with fields `id, candidateId, createdById, companyName, jobDescription, contentMarkdown, atsScore, scoreBreakdown (Json), createdAt`.

- [ ] **Step 1: Add the model**

Append to `apps/api/prisma/schema.prisma`:
```prisma
model OptimizedResume {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  candidateId     String   @map("candidate_id") @db.Uuid
  createdById     String   @map("created_by_id") @db.Uuid
  companyName     String   @map("company_name")
  jobDescription  String   @map("job_description")
  contentMarkdown String   @map("content_markdown")
  atsScore        Int      @map("ats_score")
  scoreBreakdown  Json     @map("score_breakdown")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  candidate Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  createdBy User      @relation("OptimizedResumeCreatedBy", fields: [createdById], references: [id])

  @@index([candidateId])
  @@map("optimized_resumes")
}
```

- [ ] **Step 2: Add back-relations**

In `model Candidate`, add:
```prisma
  optimizedResumes OptimizedResume[]
```
In `model User`, add:
```prisma
  optimizedResumesCreated OptimizedResume[] @relation("OptimizedResumeCreatedBy")
```

- [ ] **Step 3: Create the migration**

Run in `apps/api`:
```bash
pnpm prisma migrate dev --name add_optimized_resume
```
Expected: migration created + applied, Prisma Client regenerated.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add OptimizedResume model + migration"
```

---

### Task 3: ATS heuristic scorer (pure, TDD)

**Files:**
- Create: `apps/api/src/modules/resumes/scorer.ts`
- Test: `apps/api/src/modules/resumes/scorer.test.ts`

**Interfaces:**
- Produces:
```ts
export interface ScoreComponent { earned: number; possible: number }
export interface ScoreBreakdown {
  keywords: ScoreComponent & { missing: string[] };
  structure: ScoreComponent;
  parseability: ScoreComponent;
  contact: ScoreComponent;
  length: ScoreComponent;
}
export interface ResumeScore { score: number; breakdown: ScoreBreakdown; missingKeywords: string[] }
export function extractKeywords(jobDescription: string): string[]
export function scoreResume(resumeText: string, jobDescription: string): ResumeScore
```

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/resumes/scorer.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { extractKeywords, scoreResume } from "./scorer.js";

describe("extractKeywords", () => {
  it("returns salient lowercase keywords, drops stopwords/short tokens", () => {
    const kw = extractKeywords("We need a Senior TypeScript engineer with Kubernetes and GraphQL.");
    expect(kw).toContain("typescript");
    expect(kw).toContain("kubernetes");
    expect(kw).toContain("graphql");
    expect(kw).not.toContain("with");
    expect(kw).not.toContain("a");
  });
});

describe("scoreResume", () => {
  const jd = "Senior TypeScript engineer. Must know Kubernetes, GraphQL, PostgreSQL, and CI/CD.";

  it("scores a matching, well-structured resume highly", () => {
    const resume = [
      "Jane Doe",
      "jane@example.com | +1 555 0100",
      "Summary",
      "Senior TypeScript engineer.",
      "Skills",
      "TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD",
      "Experience",
      "- Built TypeScript services on Kubernetes with GraphQL and PostgreSQL.",
      "- Owned CI/CD pipelines.",
      "Education",
      "BS Computer Science",
    ].join("\n");
    const result = scoreResume(resume, jd);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.missingKeywords).toHaveLength(0);
  });

  it("reports missing keywords and a lower score when JD terms are absent", () => {
    const resume = "Jane Doe\njane@example.com\nSummary\nEngineer.\nExperience\n- Did things.\nEducation\nBS";
    const result = scoreResume(resume, jd);
    expect(result.score).toBeLessThan(90);
    expect(result.missingKeywords).toContain("kubernetes");
    expect(result.breakdown.keywords.missing.length).toBeGreaterThan(0);
  });

  it("penalizes a missing contact block", () => {
    const withContact = scoreResume("Jane\njane@example.com\nSkills\nTypeScript Kubernetes GraphQL PostgreSQL CI/CD\nExperience\nx\nEducation\ny", jd);
    const without = scoreResume("Jane\nSkills\nTypeScript Kubernetes GraphQL PostgreSQL CI/CD\nExperience\nx\nEducation\ny", jd);
    expect(without.breakdown.contact.earned).toBeLessThan(withContact.breakdown.contact.earned);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/scorer.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the scorer**

Create `apps/api/src/modules/resumes/scorer.ts`:
```ts
export interface ScoreComponent { earned: number; possible: number }
export interface ScoreBreakdown {
  keywords: ScoreComponent & { missing: string[] };
  structure: ScoreComponent;
  parseability: ScoreComponent;
  contact: ScoreComponent;
  length: ScoreComponent;
}
export interface ResumeScore { score: number; breakdown: ScoreBreakdown; missingKeywords: string[] }

const STOPWORDS = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","is","are","be","as",
  "we","you","our","your","must","need","should","will","have","has","this","that",
  "at","by","from","into","who","can","must","also","who","their","they","it","its",
  "experience","years","team","work","working","role","job","strong","good","plus",
  "know","knows","knowledge","using","used","use","ability","able","including","etc",
]);

export function extractKeywords(jobDescription: string): string[] {
  const tokens = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9+#/.\- ]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens));
}

const SECTION_HEADINGS = ["experience", "education", "skills"];

export function scoreResume(resumeText: string, jobDescription: string): ResumeScore {
  const text = resumeText.toLowerCase();
  const keywords = extractKeywords(jobDescription);

  // Keywords (40): share of JD keywords present, capped to top 30 salient terms.
  const salient = keywords.slice(0, 30);
  const present = salient.filter((k) => text.includes(k));
  const missing = salient.filter((k) => !text.includes(k));
  const keywordEarned = salient.length === 0 ? 40 : Math.round((present.length / salient.length) * 40);

  // Structure (20): standard headings present (contact implied elsewhere).
  const headingsHit = SECTION_HEADINGS.filter((h) => text.includes(h)).length;
  const structureEarned = Math.round((headingsHit / SECTION_HEADINGS.length) * 20);

  // Parseability (20): no obvious non-ATS artifacts (tables/images/tab columns).
  const badArtifacts = /\t{2,}|\|\s*\||<img|•\s*•/.test(resumeText);
  const parseEarned = badArtifacts ? 8 : 20;

  // Contact (10): email or phone present.
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  const contactEarned = hasEmail || hasPhone ? 10 : 0;

  // Length (10): sane word count band 150-900.
  const words = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const lengthEarned = words >= 150 && words <= 900 ? 10 : words >= 80 ? 6 : 3;

  const breakdown: ScoreBreakdown = {
    keywords: { earned: keywordEarned, possible: 40, missing },
    structure: { earned: structureEarned, possible: 20 },
    parseability: { earned: parseEarned, possible: 20 },
    contact: { earned: contactEarned, possible: 10 },
    length: { earned: lengthEarned, possible: 10 },
  };
  const score =
    keywordEarned + structureEarned + parseEarned + contactEarned + lengthEarned;

  return { score, breakdown, missingKeywords: missing };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/scorer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/resumes/scorer.ts apps/api/src/modules/resumes/scorer.test.ts
git commit -m "feat(api): add ATS heuristic resume scorer"
```

---

### Task 4: Resume file parser (PDF/DOCX → text)

**Files:**
- Create: `apps/api/src/modules/resumes/parse.ts`
- Test: `apps/api/src/modules/resumes/parse.test.ts`
- Create: `apps/api/src/modules/resumes/__fixtures__/sample.docx` (generated in Step 1)

**Interfaces:**
- Produces:
```ts
export interface UploadedFile { buffer: Buffer; filename: string; mimetype: string }
export async function parseResumeFile(file: UploadedFile): Promise<string>
```
Throws `AppError(400, "UNSUPPORTED_FILE", ...)` for unknown types and `AppError(400, "EMPTY_RESUME", ...)` when no text is extracted.

- [ ] **Step 1: Generate a DOCX fixture**

Run this one-off script from `apps/api` to create the fixture (uses the already-installed `docx`):
```bash
node --input-type=module -e "
import { Document, Packer, Paragraph } from 'docx';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('src/modules/resumes/__fixtures__', { recursive: true });
const doc = new Document({ sections: [{ children: [new Paragraph('Jane Doe'), new Paragraph('jane@example.com'), new Paragraph('Skills: TypeScript Kubernetes')] }] });
const buf = await Packer.toBuffer(doc);
writeFileSync('src/modules/resumes/__fixtures__/sample.docx', buf);
console.log('wrote fixture', buf.length);
"
```

- [ ] **Step 2: Write failing tests**

Create `apps/api/src/modules/resumes/parse.test.ts`:
```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseResumeFile } from "./parse.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("parseResumeFile", () => {
  it("extracts text from a DOCX", async () => {
    const buffer = readFileSync(join(here, "__fixtures__/sample.docx"));
    const text = await parseResumeFile({ buffer, filename: "sample.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    expect(text).toContain("Jane Doe");
    expect(text).toContain("TypeScript");
  });

  it("accepts plain text", async () => {
    const text = await parseResumeFile({ buffer: Buffer.from("Hello World resume"), filename: "r.txt", mimetype: "text/plain" });
    expect(text).toContain("Hello World");
  });

  it("rejects unsupported types", async () => {
    await expect(
      parseResumeFile({ buffer: Buffer.from("x"), filename: "r.png", mimetype: "image/png" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
  });

  it("rejects empty extraction", async () => {
    await expect(
      parseResumeFile({ buffer: Buffer.from("   "), filename: "r.txt", mimetype: "text/plain" }),
    ).rejects.toMatchObject({ code: "EMPTY_RESUME" });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/parse.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement the parser**

Create `apps/api/src/modules/resumes/parse.ts`:
```ts
import mammoth from "mammoth";
import { AppError } from "../../lib/errors.js";

export interface UploadedFile { buffer: Buffer; filename: string; mimetype: string }

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function ext(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export async function parseResumeFile(file: UploadedFile): Promise<string> {
  const type = file.mimetype;
  const e = ext(file.filename);
  let text = "";

  try {
    if (type === "application/pdf" || e === "pdf") {
      // pdf-parse v2 is class-based: `new PDFParse({ data }).getText()`.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
      const result = await parser.getText();
      text = result.text;
    } else if (type === DOCX || e === "docx") {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (type.startsWith("text/") || e === "txt") {
      text = file.buffer.toString("utf8");
    } else {
      throw new AppError(400, "UNSUPPORTED_FILE", "Upload a PDF, DOCX, or text resume");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(400, "RESUME_PARSE_FAILED", "Could not read that file; try exporting it again");
  }

  text = text.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) {
    throw new AppError(400, "EMPTY_RESUME", "Could not read any text from that file");
  }
  return text;
}
```

Also add a PDF fixture + test so the PDF branch is covered. Generate the fixture from `apps/api`:
```bash
node --input-type=module -e "
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
const doc = new PDFDocument();
doc.pipe(createWriteStream('src/modules/resumes/__fixtures__/sample.pdf'));
doc.fontSize(12).text('Jane Doe');
doc.text('jane@example.com');
doc.text('Skills: TypeScript Kubernetes');
doc.end();
"
```
Add to `parse.test.ts`:
```ts
  it("extracts text from a PDF", async () => {
    const buffer = readFileSync(join(here, "__fixtures__/sample.pdf"));
    const text = await parseResumeFile({ buffer, filename: "sample.pdf", mimetype: "application/pdf" });
    expect(text).toContain("Jane Doe");
    expect(text).toContain("TypeScript");
  });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/parse.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/resumes/parse.ts apps/api/src/modules/resumes/parse.test.ts apps/api/src/modules/resumes/__fixtures__/sample.docx
git commit -m "feat(api): add resume file parser (pdf/docx/text)"
```

---

### Task 5: Optimizer interface + Gemini adapter + stub + factory

**Files:**
- Create: `apps/api/src/modules/resumes/optimizer.ts`
- Test: `apps/api/src/modules/resumes/optimizer.test.ts`

**Interfaces:**
- Produces:
```ts
export interface OptimizeInput {
  resumeText: string; jobDescription: string; companyName: string; missingKeywords?: string[];
}
export interface ResumeOptimizer { optimize(input: OptimizeInput): Promise<string> } // returns markdown
export function buildPrompt(input: OptimizeInput): string
export class GeminiOptimizer implements ResumeOptimizer
export class StubOptimizer implements ResumeOptimizer
export function getOptimizer(): ResumeOptimizer
```

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/resumes/optimizer.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildPrompt, StubOptimizer } from "./optimizer.js";

describe("buildPrompt", () => {
  it("includes resume, JD, company, and missing keyword guidance", () => {
    const p = buildPrompt({
      resumeText: "BASE RESUME", jobDescription: "THE JD", companyName: "Acme",
      missingKeywords: ["kubernetes", "graphql"],
    });
    expect(p).toContain("BASE RESUME");
    expect(p).toContain("THE JD");
    expect(p).toContain("Acme");
    expect(p).toContain("kubernetes");
    expect(p.toLowerCase()).toContain("do not invent");
  });
});

describe("StubOptimizer", () => {
  it("returns markdown that folds in company and missing keywords", async () => {
    const md = await new StubOptimizer().optimize({
      resumeText: "Jane Doe\njane@example.com", jobDescription: "Need TypeScript",
      companyName: "Acme", missingKeywords: ["typescript", "kubernetes"],
    });
    expect(md).toContain("Acme");
    expect(md.toLowerCase()).toContain("typescript");
    expect(md.toLowerCase()).toContain("kubernetes");
    expect(md).toContain("Experience");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/optimizer.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the optimizer**

Create `apps/api/src/modules/resumes/optimizer.ts`:
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";

export interface OptimizeInput {
  resumeText: string;
  jobDescription: string;
  companyName: string;
  missingKeywords?: string[];
}
export interface ResumeOptimizer { optimize(input: OptimizeInput): Promise<string> }

export function buildPrompt(input: OptimizeInput): string {
  const missing = input.missingKeywords?.length
    ? `\nThe previous draft was missing these job-description keywords — weave the truthful ones in naturally: ${input.missingKeywords.join(", ")}.`
    : "";
  return [
    "You are an expert resume writer optimizing a resume for a specific job so it passes ATS screening.",
    "Rewrite the BASE RESUME to target the JOB DESCRIPTION at " + input.companyName + ".",
    "Rules:",
    "- Output GitHub-flavored Markdown only, single column, no tables, no images, no columns.",
    "- Use standard headings exactly: Summary, Skills, Experience, Education (add Projects/Certifications only if present in the base).",
    "- Start with the candidate name on line 1 and a contact line (email/phone) on line 2.",
    "- Mirror the job description's terminology and hard skills where the candidate genuinely has them.",
    "- Do NOT invent employers, degrees, dates, or skills the base resume does not support.",
    "- Prefer concise achievement bullets with metrics where the base provides them.",
    missing,
    "",
    "=== BASE RESUME ===",
    input.resumeText,
    "",
    "=== JOB DESCRIPTION ===",
    input.jobDescription,
  ].join("\n");
}

export class GeminiOptimizer implements ResumeOptimizer {
  async optimize(input: OptimizeInput): Promise<string> {
    if (!config.GEMINI_API_KEY) {
      throw new AppError(503, "OPTIMIZER_UNCONFIGURED", "Resume optimization is not configured (missing GEMINI_API_KEY)");
    }
    const client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: config.RESUME_OPTIMIZE_MODEL });
    try {
      const result = await model.generateContent(buildPrompt(input));
      const text = result.response.text().trim();
      if (!text) throw new AppError(502, "OPTIMIZER_EMPTY", "The optimizer returned no content");
      return text;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const status = (error as { status?: number })?.status;
      if (status === 429) throw new AppError(429, "OPTIMIZER_BUSY", "AI service is busy, try again shortly");
      throw new AppError(502, "OPTIMIZER_FAILED", "Resume optimization failed");
    }
  }
}

// Deterministic, offline optimizer for tests / unconfigured envs.
export class StubOptimizer implements ResumeOptimizer {
  async optimize(input: OptimizeInput): Promise<string> {
    const nameLine = input.resumeText.split("\n")[0] || "Candidate Name";
    const kw = (input.missingKeywords ?? ["typescript", "leadership"]).join(", ");
    return [
      nameLine,
      "candidate@example.com | +1 555 0100",
      "",
      "## Summary",
      `Experienced professional targeting the role at ${input.companyName}.`,
      "",
      "## Skills",
      kw,
      "",
      "## Experience",
      `- Delivered results relevant to ${input.companyName} using ${kw}.`,
      "",
      "## Education",
      "BS, University",
    ].join("\n");
  }
}

export function getOptimizer(): ResumeOptimizer {
  if (config.NODE_ENV === "test" || !config.GEMINI_API_KEY) return new StubOptimizer();
  return new GeminiOptimizer();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/optimizer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/resumes/optimizer.ts apps/api/src/modules/resumes/optimizer.test.ts
git commit -m "feat(api): add resume optimizer (gemini + stub + factory)"
```

---

### Task 6: DOCX + PDF renderers

**Files:**
- Create: `apps/api/src/modules/resumes/render.ts`
- Test: `apps/api/src/modules/resumes/render.test.ts`

**Interfaces:**
- Produces:
```ts
export async function renderResumeDocx(markdown: string): Promise<Buffer>
export function renderResumePdf(markdown: string): Promise<Buffer>
```
Both produce single-column, selectable-text documents from the canonical markdown.

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/resumes/render.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { renderResumeDocx, renderResumePdf } from "./render.js";

const md = "Jane Doe\njane@example.com\n\n## Summary\nGreat engineer.\n\n## Skills\nTypeScript, Kubernetes\n\n## Experience\n- Built things.";

describe("renderResumeDocx", () => {
  it("produces a non-empty docx buffer with the zip signature", async () => {
    const buf = await renderResumeDocx(md);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 2).toString("latin1")).toBe("PK"); // docx is a zip
  });
});

describe("renderResumePdf", () => {
  it("produces a non-empty pdf buffer with the pdf header", async () => {
    const buf = await renderResumePdf(md);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/render.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the renderers**

Create `apps/api/src/modules/resumes/render.ts`:
```ts
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";

interface Line { kind: "name" | "heading" | "bullet" | "text"; text: string }

// Parse canonical markdown into a flat, ATS-friendly line list.
function parse(markdown: string): Line[] {
  const raw = markdown.replace(/\r\n/g, "\n").split("\n");
  const lines: Line[] = [];
  let seenContent = false;
  for (const original of raw) {
    const line = original.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      lines.push({ kind: "heading", text: line.replace(/^#+\s*/, "") });
      seenContent = true;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      lines.push({ kind: "bullet", text: line.slice(2) });
      seenContent = true;
    } else if (!seenContent) {
      lines.push({ kind: lines.length === 0 ? "name" : "text", text: line });
    } else {
      lines.push({ kind: "text", text: line });
    }
  }
  return lines;
}

export async function renderResumeDocx(markdown: string): Promise<Buffer> {
  const children = parse(markdown).map((l) => {
    if (l.kind === "name") return new Paragraph({ children: [new TextRun({ text: l.text, bold: true, size: 32 })] });
    if (l.kind === "heading") return new Paragraph({ text: l.text, heading: HeadingLevel.HEADING_2 });
    if (l.kind === "bullet") return new Paragraph({ text: l.text, bullet: { level: 0 } });
    return new Paragraph({ text: l.text });
  });
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export function renderResumePdf(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    for (const l of parse(markdown)) {
      if (l.kind === "name") doc.font("Helvetica-Bold").fontSize(18).text(l.text);
      else if (l.kind === "heading") doc.moveDown(0.5).font("Helvetica-Bold").fontSize(13).text(l.text.toUpperCase());
      else if (l.kind === "bullet") doc.font("Helvetica").fontSize(10.5).text("• " + l.text, { indent: 12 });
      else doc.font("Helvetica").fontSize(10.5).text(l.text);
    }
    doc.end();
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/resumes/render.ts apps/api/src/modules/resumes/render.test.ts
git commit -m "feat(api): render optimized resume to docx + pdf"
```

---

### Task 7: Repository

**Files:**
- Create: `apps/api/src/modules/resumes/repository.ts`

**Interfaces:**
- Consumes: `prisma` from `apps/api/src/lib/prisma.js`; `ScoreBreakdown` from `./scorer.js`.
- Produces:
```ts
export function createOptimizedResume(data: {
  candidateId: string; createdById: string; companyName: string;
  jobDescription: string; contentMarkdown: string; atsScore: number; scoreBreakdown: ScoreBreakdown;
}): Promise<{ id: string; atsScore: number }>
export function listOptimizedResumes(candidateId: string): Promise<Array<{
  id: string; companyName: string; atsScore: number; createdAt: Date;
  createdBy: { id: string; name: string };
}>>
export function findOptimizedResume(candidateId: string, id: string): Promise<{
  id: string; companyName: string; contentMarkdown: string;
} | null>
```

- [ ] **Step 1: Implement the repository**

Create `apps/api/src/modules/resumes/repository.ts`:
```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { ScoreBreakdown } from "./scorer.js";

export function createOptimizedResume(data: {
  candidateId: string; createdById: string; companyName: string;
  jobDescription: string; contentMarkdown: string; atsScore: number; scoreBreakdown: ScoreBreakdown;
}) {
  return prisma.optimizedResume.create({
    data: {
      candidateId: data.candidateId,
      createdById: data.createdById,
      companyName: data.companyName,
      jobDescription: data.jobDescription,
      contentMarkdown: data.contentMarkdown,
      atsScore: data.atsScore,
      scoreBreakdown: data.scoreBreakdown as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, atsScore: true },
  });
}

export function listOptimizedResumes(candidateId: string) {
  return prisma.optimizedResume.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, companyName: true, atsScore: true, createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export function findOptimizedResume(candidateId: string, id: string) {
  return prisma.optimizedResume.findFirst({
    where: { id, candidateId },
    select: { id: true, companyName: true, contentMarkdown: true },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @team-elite/api exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/resumes/repository.ts
git commit -m "feat(api): add optimized-resume repository"
```

---

### Task 8: Service (parse → optimize+score refine loop → persist)

**Files:**
- Create: `apps/api/src/modules/resumes/service.ts`
- Test: `apps/api/src/modules/resumes/service.test.ts`

**Interfaces:**
- Consumes: `parseResumeFile`/`UploadedFile` (Task 4), `getOptimizer`/`ResumeOptimizer` (Task 5), `scoreResume` (Task 3), repository (Task 7), `config`, `audit`.
- Produces:
```ts
export interface OptimizeParams {
  candidateId: string; createdById: string; file: UploadedFile;
  jobDescription: string; companyName: string; optimizer?: ResumeOptimizer;
}
export async function optimizeResume(params: OptimizeParams): Promise<{ id: string; atsScore: number; scoreBreakdown: ScoreBreakdown }>
export function listResumes(candidateId: string): ReturnType<typeof listOptimizedResumes>
export async function getResumeForDownload(candidateId: string, id: string): Promise<{ companyName: string; contentMarkdown: string }>
```

- [ ] **Step 1: Write failing tests (refine loop, pure — inject a stub optimizer + real scorer, mock repo via a passed optimizer and a fake persist)**

Create `apps/api/src/modules/resumes/service.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import type { ResumeOptimizer } from "./optimizer.js";

vi.mock("./repository.js", () => ({
  createOptimizedResume: vi.fn(async (d: { atsScore: number }) => ({ id: "res-1", atsScore: d.atsScore })),
  listOptimizedResumes: vi.fn(),
  findOptimizedResume: vi.fn(),
}));
vi.mock("../../lib/audit.js", () => ({ audit: { log: vi.fn(async () => {}) } }));

const { optimizeResume } = await import("./service.js");
const repo = await import("./repository.js");

const jd = "Need TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD.";
const baseFile = { buffer: Buffer.from("Jane Doe\njane@example.com"), filename: "r.txt", mimetype: "text/plain" };

it("stops refining once the score target is met and persists the best result", async () => {
  // Optimizer that returns a fully-loaded resume immediately.
  const good = [
    "Jane Doe", "jane@example.com | +1 555 0100",
    "## Summary", "Engineer.",
    "## Skills", "TypeScript, Kubernetes, GraphQL, PostgreSQL, CI/CD",
    "## Experience", "- Built TypeScript on Kubernetes with GraphQL and PostgreSQL and CI/CD.",
    "## Education", "BS",
  ].join("\n");
  const optimizer: ResumeOptimizer = { optimize: vi.fn(async () => good) };

  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jd, companyName: "Acme", optimizer,
  });

  expect(result.atsScore).toBeGreaterThanOrEqual(90);
  expect(optimizer.optimize).toHaveBeenCalledTimes(1); // met target on first pass
  expect(repo.createOptimizedResume).toHaveBeenCalledOnce();
});

it("refines up to the pass limit and keeps the highest score", async () => {
  const weak = "Jane\nSummary\nx\nExperience\n- y\nEducation\nz";
  const optimizer: ResumeOptimizer = { optimize: vi.fn(async () => weak) };
  const result = await optimizeResume({
    candidateId: "c1", createdById: "u1", file: baseFile,
    jobDescription: jd, companyName: "Acme", optimizer,
  });
  expect(optimizer.optimize).toHaveBeenCalledTimes(3); // config default RESUME_MAX_REFINE_PASSES
  expect(result.atsScore).toBeLessThan(90);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/service.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the service**

Create `apps/api/src/modules/resumes/service.ts`:
```ts
import { config } from "../../config.js";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { getOptimizer, type ResumeOptimizer } from "./optimizer.js";
import { parseResumeFile, type UploadedFile } from "./parse.js";
import * as repository from "./repository.js";
import { scoreResume, type ScoreBreakdown } from "./scorer.js";

export interface OptimizeParams {
  candidateId: string;
  createdById: string;
  file: UploadedFile;
  jobDescription: string;
  companyName: string;
  optimizer?: ResumeOptimizer;
}

export async function optimizeResume(params: OptimizeParams) {
  const resumeText = await parseResumeFile(params.file);
  const optimizer = params.optimizer ?? getOptimizer();

  let best: { markdown: string; score: number; breakdown: ScoreBreakdown } | null = null;
  let missingKeywords: string[] | undefined;

  for (let pass = 0; pass < config.RESUME_MAX_REFINE_PASSES; pass++) {
    const markdown = await optimizer.optimize({
      resumeText,
      jobDescription: params.jobDescription,
      companyName: params.companyName,
      missingKeywords,
    });
    const scored = scoreResume(markdown, params.jobDescription);
    if (!best || scored.score > best.score) {
      best = { markdown, score: scored.score, breakdown: scored.breakdown };
    }
    if (scored.score >= config.RESUME_SCORE_TARGET) break;
    missingKeywords = scored.missingKeywords;
  }

  if (!best) throw new AppError(502, "OPTIMIZER_FAILED", "Resume optimization produced no result");

  const stored = await repository.createOptimizedResume({
    candidateId: params.candidateId,
    createdById: params.createdById,
    companyName: params.companyName,
    jobDescription: params.jobDescription,
    contentMarkdown: best.markdown,
    atsScore: best.score,
    scoreBreakdown: best.breakdown,
  });

  await audit.log({
    userId: params.createdById,
    action: "RESUME_OPTIMIZED",
    entity: "OptimizedResume",
    entityId: stored.id,
  });

  return { id: stored.id, atsScore: best.score, scoreBreakdown: best.breakdown };
}

export function listResumes(candidateId: string) {
  return repository.listOptimizedResumes(candidateId);
}

export async function getResumeForDownload(candidateId: string, id: string) {
  const resume = await repository.findOptimizedResume(candidateId, id);
  if (!resume) throw new AppError(404, "RESUME_NOT_FOUND", "Optimized resume not found");
  return { companyName: resume.companyName, contentMarkdown: resume.contentMarkdown };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @team-elite/api exec vitest run src/modules/resumes/service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/resumes/service.ts apps/api/src/modules/resumes/service.test.ts
git commit -m "feat(api): resume optimize service with score refine loop"
```

---

### Task 9: Routes + schemas + wiring, with authz integration tests

**Files:**
- Create: `apps/api/src/modules/resumes/schemas.ts`
- Create: `apps/api/src/modules/resumes/routes.ts`
- Modify: `apps/api/src/app.ts` (register)
- Test: `apps/api/test/resumes.authz.test.ts`

**Interfaces:**
- Consumes: service (Task 8), `requireAuth`, `requireRole`, `assertEmployeeAssigned`, `renderResumeDocx`/`renderResumePdf` (Task 6).
- Produces: routes registered at prefix `/api/candidates` (a second plugin on the same prefix as the existing candidate routes is fine — Fastify merges them):
  - `POST /:id/resumes/optimize`
  - `GET /:id/resumes`
  - `GET /:id/resumes/:resumeId/download`

- [ ] **Step 1: Write schemas**

Create `apps/api/src/modules/resumes/schemas.ts`:
```ts
import { z } from "zod";

export const optimizeFieldsSchema = z.object({
  jobDescription: z.string().min(30, "Paste the full job description"),
  companyName: z.string().min(1, "Company name is required").max(200),
});

export const downloadQuerySchema = z.object({
  format: z.enum(["pdf", "docx"]).default("pdf"),
});
```

- [ ] **Step 2: Write the failing authz test**

Create `apps/api/test/resumes.authz.test.ts` (mirrors `authz.applications.test.ts` setup; note `NODE_ENV==="test"` makes the service use `StubOptimizer`, so no network):
```ts
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { COOKIE_NAME, createSession } from "../src/lib/session.js";

describe("resume optimizer authorization", () => {
  let app: FastifyInstance;
  let adminCookie: string, employeeCookie: string, otherEmployeeCookie: string, candidateCookie: string;
  let candidateId: string, employeeId: string;
  const s = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const emails = {
    admin: `res-admin-${s}@teamelite.local`,
    emp: `res-emp-${s}@teamelite.local`,
    other: `res-other-${s}@teamelite.local`,
    cand: `res-cand-${s}@teamelite.local`,
  };

  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { name: "Res Admin", email: emails.admin, role: "ADMIN" } });
    const cand = await prisma.user.create({ data: { name: "Res Cand", email: emails.cand, role: "CANDIDATE", candidate: { create: {} } }, include: { candidate: true } });
    candidateId = cand.candidate!.id;
    const emp = await prisma.user.create({ data: { name: "Res Emp", email: emails.emp, role: "EMPLOYEE", employee: { create: { name: "Res Emp", employeeCode: `RES-${s}` } } }, include: { employee: true } });
    employeeId = emp.employee!.id;
    const other = await prisma.user.create({ data: { name: "Res Other", email: emails.other, role: "EMPLOYEE", employee: { create: { name: "Res Other", employeeCode: `RESO-${s}` } } } });
    await prisma.assignment.create({ data: { employeeId, candidateId, assignedById: admin.id } });

    adminCookie = `${COOKIE_NAME}=${(await createSession(admin.id)).rawToken}`;
    employeeCookie = `${COOKIE_NAME}=${(await createSession(emp.id)).rawToken}`;
    otherEmployeeCookie = `${COOKIE_NAME}=${(await createSession(other.id)).rawToken}`;
    candidateCookie = `${COOKIE_NAME}=${(await createSession(cand.id)).rawToken}`;
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
  });

  function optimize(cookie: string) {
    const form = new FormData();
    form.append("jobDescription", "We need a TypeScript engineer with Kubernetes and GraphQL and PostgreSQL and CI/CD experience for our team.");
    form.append("companyName", "Acme");
    form.append("file", new Blob(["Jane Doe\njane@example.com\nSkills: TypeScript"], { type: "text/plain" }), "resume.txt");
    return app.inject({ method: "POST", url: `/api/candidates/${candidateId}/resumes/optimize`, headers: { cookie }, payload: form });
  }

  it("rejects candidates", async () => {
    expect((await optimize(candidateCookie)).statusCode).toBe(403);
  });
  it("rejects employees not assigned", async () => {
    expect((await optimize(otherEmployeeCookie)).statusCode).toBe(403);
  });
  it("allows an assigned employee and stores the resume", async () => {
    const res = await optimize(employeeCookie);
    expect(res.statusCode).toBe(201);
    expect(res.json().atsScore).toBeGreaterThan(0);
    const list = await app.inject({ method: "GET", url: `/api/candidates/${candidateId}/resumes`, headers: { cookie: employeeCookie } });
    expect(list.json().resumes.length).toBeGreaterThan(0);
  });
  it("allows an admin and can download docx + pdf", async () => {
    const created = await optimize(adminCookie);
    const id = created.json().id;
    const pdf = await app.inject({ method: "GET", url: `/api/candidates/${candidateId}/resumes/${id}/download?format=pdf`, headers: { cookie: adminCookie } });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    const docx = await app.inject({ method: "GET", url: `/api/candidates/${candidateId}/resumes/${id}/download?format=docx`, headers: { cookie: adminCookie } });
    expect(docx.statusCode).toBe(200);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @team-elite/api exec vitest run test/resumes.authz.test.ts`
Expected: FAIL (routes 404).

- [ ] **Step 4: Implement routes**

Create `apps/api/src/modules/resumes/routes.ts`:
```ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import type { AuthUser } from "../../lib/session.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireRole } from "../../middleware/requireRole.js";
import { assertEmployeeAssigned } from "../assignments/service.js";
import { parseBody } from "../auth/schemas.js";
import { renderResumeDocx, renderResumePdf } from "./render.js";
import { downloadQuerySchema, optimizeFieldsSchema } from "./schemas.js";
import * as service from "./service.js";

const idSchema = z.object({ id: z.string().uuid(), resumeId: z.string().uuid().optional() });

function ids(params: unknown) {
  const r = idSchema.safeParse(params);
  if (!r.success) throw new AppError(400, "VALIDATION_ERROR", "Invalid id");
  return r.data;
}

async function assertCanAccessCandidate(user: AuthUser, candidateId: string) {
  if (user.role === "ADMIN") return;
  if (user.role === "EMPLOYEE") {
    if (!user.employeeId) throw new AppError(403, "FORBIDDEN", "Employee profile not linked");
    await assertEmployeeAssigned(user.employeeId, candidateId);
    return;
  }
  throw new AppError(403, "FORBIDDEN", "Not permitted");
}

export async function resumeRoutes(app: FastifyInstance): Promise<void> {
  const staffOnly = [requireAuth, requireRole("ADMIN", "EMPLOYEE")];

  app.post("/:id/resumes/optimize", { preHandler: staffOnly }, async (request, reply) => {
    const { id } = ids(request.params);
    const user = request.user!;
    await assertCanAccessCandidate(user, id);

    const file = await request.file();
    if (!file) throw new AppError(400, "NO_FILE", "Upload a base resume file");
    const buffer = await file.toBuffer();
    const fields = parseBody(optimizeFieldsSchema, {
      jobDescription: (file.fields.jobDescription as { value?: string })?.value,
      companyName: (file.fields.companyName as { value?: string })?.value,
    });

    const result = await service.optimizeResume({
      candidateId: id,
      createdById: user.id,
      file: { buffer, filename: file.filename, mimetype: file.mimetype },
      jobDescription: fields.jobDescription,
      companyName: fields.companyName,
    });
    return reply.status(201).send(result);
  });

  app.get("/:id/resumes", { preHandler: staffOnly }, async (request) => {
    const { id } = ids(request.params);
    await assertCanAccessCandidate(request.user!, id);
    return { resumes: await service.listResumes(id) };
  });

  app.get("/:id/resumes/:resumeId/download", { preHandler: staffOnly }, async (request, reply) => {
    const { id, resumeId } = ids(request.params);
    await assertCanAccessCandidate(request.user!, id);
    const q = downloadQuerySchema.safeParse(request.query);
    if (!q.success) throw new AppError(400, "VALIDATION_ERROR", "Invalid format");
    const resume = await service.getResumeForDownload(id, resumeId!);
    const safe = resume.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    if (q.data.format === "docx") {
      const buf = await renderResumeDocx(resume.contentMarkdown);
      return reply
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .header("Content-Disposition", `attachment; filename="resume-${safe}.docx"`)
        .send(buf);
    }
    const buf = await renderResumePdf(resume.contentMarkdown);
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="resume-${safe}.pdf"`)
      .send(buf);
  });
}
```

- [ ] **Step 5: Register the plugin**

In `apps/api/src/app.ts`, import and register at the same prefix as candidate routes:
```ts
import { resumeRoutes } from "./modules/resumes/routes.js";
// ...after candidateRoutes registration:
await app.register(resumeRoutes, { prefix: "/api/candidates" });
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @team-elite/api exec vitest run test/resumes.authz.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the full API suite**

Run: `pnpm --filter @team-elite/api test`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/resumes/schemas.ts apps/api/src/modules/resumes/routes.ts apps/api/src/app.ts apps/api/test/resumes.authz.test.ts
git commit -m "feat(api): resume optimizer routes + authz"
```

---

### Task 10: Frontend API client (FormData guard, hooks, download)

**Files:**
- Modify: `apps/web/src/lib/api.ts` (skip JSON content-type for FormData)
- Create: `apps/web/src/features/employee/resumeApi.ts`

**Interfaces:**
- Produces:
```ts
export interface ResumeScoreComponent { earned: number; possible: number }
export interface ResumeScoreBreakdown {
  keywords: ResumeScoreComponent & { missing: string[] };
  structure: ResumeScoreComponent; parseability: ResumeScoreComponent;
  contact: ResumeScoreComponent; length: ResumeScoreComponent;
}
export interface OptimizedResumeSummary {
  id: string; companyName: string; atsScore: number; createdAt: string;
  createdBy: { id: string; name: string };
}
export function useCandidateResumes(candidateId?: string): UseQueryResult<{ resumes: OptimizedResumeSummary[] }>
export function useOptimizeResume(candidateId: string) // mutation → { id; atsScore; scoreBreakdown }
export function downloadResume(candidateId: string, resumeId: string, format: "pdf" | "docx"): Promise<void>
```

- [ ] **Step 1: Guard FormData in the api client**

In `apps/web/src/lib/api.ts`, change the content-type block to not set JSON for FormData bodies:
```ts
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
```

- [ ] **Step 2: Create the resume API hooks**

Create `apps/web/src/features/employee/resumeApi.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export interface ResumeScoreComponent { earned: number; possible: number }
export interface ResumeScoreBreakdown {
  keywords: ResumeScoreComponent & { missing: string[] };
  structure: ResumeScoreComponent;
  parseability: ResumeScoreComponent;
  contact: ResumeScoreComponent;
  length: ResumeScoreComponent;
}
export interface OptimizedResumeSummary {
  id: string; companyName: string; atsScore: number; createdAt: string;
  createdBy: { id: string; name: string };
}
export interface OptimizeResult { id: string; atsScore: number; scoreBreakdown: ResumeScoreBreakdown }

export function useCandidateResumes(candidateId?: string) {
  return useQuery({
    queryKey: ["candidate", candidateId, "resumes"],
    queryFn: () => api<{ resumes: OptimizedResumeSummary[] }>(`/api/candidates/${candidateId}/resumes`),
    enabled: Boolean(candidateId),
  });
}

export function useOptimizeResume(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; jobDescription: string; companyName: string }) => {
      const form = new FormData();
      // Text fields MUST be appended before the file: the API reads them from
      // `request.file().fields`, which only sees parts that precede the file
      // in the multipart stream.
      form.append("jobDescription", input.jobDescription);
      form.append("companyName", input.companyName);
      form.append("file", input.file);
      return api<OptimizeResult>(`/api/candidates/${candidateId}/resumes/optimize`, {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId, "resumes"] }),
  });
}

export async function downloadResume(candidateId: string, resumeId: string, format: "pdf" | "docx") {
  const res = await fetch(`/api/candidates/${candidateId}/resumes/${resumeId}/download?format=${format}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resume.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Verify existing web tests + typecheck**

Run: `pnpm --filter @team-elite/web exec tsc -b --pretty false`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/employee/resumeApi.ts
git commit -m "feat(web): resume optimizer api hooks + FormData support"
```

---

### Task 11: ResumeOptimizer UI component

**Files:**
- Create: `apps/web/src/features/employee/ResumeOptimizer.tsx`

**Interfaces:**
- Consumes: hooks from `resumeApi.ts` (Task 10), `Button`, `Input`, ledger classes.
- Produces: `export function ResumeOptimizer({ candidateId }: { candidateId: string })`.

- [ ] **Step 1: Implement the component**

Create `apps/web/src/features/employee/ResumeOptimizer.tsx`:
```tsx
import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api";
import {
  downloadResume,
  useCandidateResumes,
  useOptimizeResume,
  type OptimizeResult,
} from "./resumeApi";

export function ResumeOptimizer({ candidateId }: { candidateId: string }) {
  const optimize = useOptimizeResume(candidateId);
  const history = useCandidateResumes(candidateId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("");
  const [jd, setJd] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Upload a base resume (PDF or DOCX).");
    try {
      const res = await optimize.mutateAsync({ file, jobDescription: jd, companyName: company });
      setResult(res);
      setLastId(res.id);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Optimization failed. Try again.");
    }
  }

  return (
    <section aria-labelledby="resume-optimizer" className="space-y-6">
      <div>
        <h2 id="resume-optimizer" className="font-display text-lg text-foreground">
          Resume optimizer
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the base resume, paste the job description, and generate an ATS-tuned resume.
        </p>
      </div>

      <form onSubmit={submit} className="panel grid gap-5 p-6">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Base resume (PDF or DOCX)
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,text/plain"
            className="rounded-[4px] border border-border bg-surface px-3.5 py-2.5 text-sm file:mr-3 file:rounded-[3px] file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-accent-foreground"
          />
        </label>
        <Input
          label="Company name"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Job description
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={8}
            required
            placeholder="Paste the full job description…"
            className="rounded-[4px] border border-border bg-surface px-3.5 py-3 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/18"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={optimize.isPending}>
            {optimize.isPending ? "Optimizing…" : "Optimize resume"}
          </Button>
          {optimize.isPending ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Tailoring &amp; scoring — this can take ~20s
            </span>
          ) : null}
        </div>
      </form>

      {result ? (
        <div className="stat-card p-5 pt-6">
          <p className="eyebrow">ATS score</p>
          <p className="led-figure mt-2 text-[2rem] font-semibold text-foreground">
            {result.atsScore}
            <span className="text-base text-muted-foreground"> / 100</span>
          </p>
          <ul className="mt-4 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Keywords: {result.scoreBreakdown.keywords.earned}/{result.scoreBreakdown.keywords.possible}</li>
            <li>Structure: {result.scoreBreakdown.structure.earned}/{result.scoreBreakdown.structure.possible}</li>
            <li>Parseable: {result.scoreBreakdown.parseability.earned}/{result.scoreBreakdown.parseability.possible}</li>
            <li>Contact: {result.scoreBreakdown.contact.earned}/{result.scoreBreakdown.contact.possible}</li>
          </ul>
          {result.scoreBreakdown.keywords.missing.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Still missing: {result.scoreBreakdown.keywords.missing.join(", ")}
            </p>
          ) : null}
          {lastId ? (
            <div className="mt-5 flex gap-3">
              <Button type="button" variant="secondary" onClick={() => void downloadResume(candidateId, lastId, "docx")}>
                Download DOCX
              </Button>
              <Button type="button" variant="secondary" onClick={() => void downloadResume(candidateId, lastId, "pdf")}>
                Download PDF
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <h3 className="eyebrow mb-3">Previous optimizations</h3>
        <div className="data-table-wrap">
          {history.data?.resumes.length ? (
            <ul className="divide-y divide-border">
              {history.data.resumes.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{r.companyName}</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                      {r.createdBy.name} ·{" "}
                      {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(r.createdAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="led-figure text-sm text-foreground">{r.atsScore}/100</span>
                    <button type="button" onClick={() => void downloadResume(candidateId, r.id, "docx")} className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand hover:underline">DOCX</button>
                    <button type="button" onClick={() => void downloadResume(candidateId, r.id, "pdf")} className="font-mono text-[11px] uppercase tracking-[0.1em] text-brand hover:underline">PDF</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No optimized resumes yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @team-elite/web exec tsc -b --pretty false`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/employee/ResumeOptimizer.tsx
git commit -m "feat(web): resume optimizer UI component"
```

---

### Task 12: Wire into candidate detail + admin route + role-aware back link

**Files:**
- Modify: `apps/web/src/features/employee/CandidateDetailPage.tsx` (render `<ResumeOptimizer>`, role-aware back link)
- Modify: `apps/web/src/app/router.tsx` (admin candidate-detail route)
- Modify: `apps/web/src/app/paths.ts` (`candidateDetailPath` helper)
- Modify: `apps/web/src/features/admin/AdminUsersPage.tsx` (link candidate rows)

**Interfaces:**
- Consumes: `ResumeOptimizer` (Task 11), `useAuth` for role.
- Produces: `export function candidateDetailPath(role: UserRole, candidateId: string): string` in `paths.ts`.

- [ ] **Step 1: Add a path helper**

In `apps/web/src/app/paths.ts`, add:
```ts
export function candidateDetailPath(role: UserRole, candidateId: string): string {
  const base = role === "ADMIN" ? "/admin/candidates" : "/employee/candidates";
  return `${base}/${candidateId}`;
}
```

- [ ] **Step 2: Add the admin route**

In `apps/web/src/app/router.tsx`, inside `AdminRoutes`'s `<Routes>`, add before the catch-all:
```tsx
      <Route path="candidates/:candidateId" element={<CandidateDetailPage />} />
```

- [ ] **Step 3: Make CandidateDetailPage role-aware + render the optimizer**

In `apps/web/src/features/employee/CandidateDetailPage.tsx`:
- Import: `import { useAuth } from "../auth/useAuth";`, `import { ResumeOptimizer } from "./ResumeOptimizer";`, and `import { roleHomePath } from "../../app/paths";`
- Replace the back link `to="/employee"` with a role-aware target:
```tsx
  const { user } = useAuth();
  const backTo = user ? roleHomePath(user.role) : "/";
```
  and use `to={backTo}` on the back `<Link>`; change its label to `← Back` (works for both roles).
- Render the optimizer once `candidateId` is known, after the applications section (inside the same page container):
```tsx
  {candidateId ? (
    <div className="mt-12 border-t border-border pt-10">
      <ResumeOptimizer candidateId={candidateId} />
    </div>
  ) : null}
```
(`candidateId` comes from `useParams()` — already read on this page.)

- [ ] **Step 4: Link admin candidate rows to the detail page**

In `apps/web/src/features/admin/AdminUsersPage.tsx`, in the Candidates table, wrap each candidate's name cell in a link:
```tsx
import { Link } from "react-router-dom";
// ...render the candidate name as:
<Link to={`/admin/candidates/${candidate.id}`} className="font-semibold text-foreground hover:text-brand hover:underline">
  {candidate.user.name}
</Link>
```
(Use the candidate's `id` — the Candidate id, not the user id — since the API is candidate-scoped. Confirm the row object exposes `candidate.id`; the admin users list returns candidate records with `id`.)

- [ ] **Step 5: Run the app and manually verify**

Run the stack (`pnpm db:up`, `pnpm dev:api`, `pnpm dev:web`), then:
- As employee → open an assigned candidate → Resume optimizer section renders; upload a text/pdf/docx, paste a JD, company → Optimize → score card + downloads work; history lists the entry.
- As admin → Users → click a candidate → same section works.
- As candidate → confirm no optimizer UI anywhere and `/api/candidates/:id/resumes` returns 403.

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @team-elite/web exec tsc -b --pretty false`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/employee/CandidateDetailPage.tsx apps/web/src/app/router.tsx apps/web/src/app/paths.ts apps/web/src/features/admin/AdminUsersPage.tsx
git commit -m "feat(web): wire resume optimizer into candidate detail (employee + admin)"
```

---

## Self-Review Notes (addressed)

- **Spec coverage:** engine (Task 5), scorer + refine loop (Tasks 3, 8), DOCX+PDF (Task 6), no-blob text storage (Tasks 2, 7), sync endpoints + authz (Task 9), shared admin/employee UI (Tasks 11–12), candidate 403 + never-surfaced (Tasks 9, 12 Step 5), audit (Task 8), env/config (Task 1), v2 cuts untouched.
- **FormData caveat:** the shared `api()` helper would otherwise force `application/json`; Task 10 Step 1 fixes it. Downloads use raw `fetch` + Blob (Task 10 Step 2).
- **Offline tests:** `getOptimizer()` returns `StubOptimizer` under `NODE_ENV==="test"` so integration tests never hit Gemini.
- **Runtime prerequisite:** the feature needs a real `GEMINI_API_KEY` in `apps/api/.env` to produce genuine output; without it the endpoint returns `503 OPTIMIZER_UNCONFIGURED` (clear message).
