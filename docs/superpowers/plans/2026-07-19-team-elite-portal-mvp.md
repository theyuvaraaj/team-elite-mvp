# Team Elite Portal MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Team Elite Portal MVP that replaces shared Google Sheets with role-isolated application tracking (Admin / Employee / Candidate), session auth, Resend invites, and deploy wiring for Vercel + Railway.

**Architecture:** pnpm monorepo with `apps/web` (Vite React SPA) and `apps/api` (Fastify + Prisma + PostgreSQL). Auth is server-side sessions (httpOnly cookies). Authorization is enforced in services via role checks + assignment scoping + candidate field redaction. Prefer Vercel `/api` rewrite to Railway so cookies stay same-site.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, TanStack Query, React Router, Fastify, Zod, Prisma, PostgreSQL, Argon2, Resend, pnpm workspaces, Docker Compose (local Postgres).

**Spec:** `docs/README.md` and `docs/superpowers/specs/2026-07-19-team-elite-portal-design.md`

## Global Constraints

- No JWT / refresh tokens in MVP — session cookies only
- Candidates must never receive `commentsInternal`, `submittedBy`, or employee identity fields
- Employees must never access unassigned candidates (backend enforced)
- Resume storage is URL-only (no file uploads)
- No AI, scraping, Gmail, chat, or interview features in MVP
- Candidate optional profile fields: `email`, `gender`, `address` (+ phone, primaryRole, experience)
- Employee profile includes `name` and `employeeCode`
- Cookie name: `te_session`
- Commit message prefix: if branch matches `*/BL-#####*`, prefix commits with `BL-##### `; else conventional `feat:` / `fix:` / `chore:`
- Do not commit secrets; use `.env.example` only

---

## File map (create)

```text
package.json
pnpm-workspace.yaml
.gitignore
README.md
docker-compose.yml
.env.example

apps/api/package.json
apps/api/tsconfig.json
apps/api/prisma/schema.prisma
apps/api/prisma/seed.ts
apps/api/src/server.ts
apps/api/src/app.ts
apps/api/src/config.ts
apps/api/src/lib/{prisma,password,session,mail,errors,audit}.ts
apps/api/src/middleware/{requireAuth,requireRole}.ts
apps/api/src/modules/auth/{routes,schemas,service}.ts
apps/api/src/modules/candidates/{routes,schemas,service,repository,serializers}.ts
apps/api/src/modules/employees/{routes,schemas,service,repository}.ts
apps/api/src/modules/assignments/{routes,schemas,service,repository}.ts
apps/api/src/modules/applications/{routes,schemas,service,repository,serializers}.ts
apps/api/src/modules/stats/{routes,service}.ts
apps/api/src/modules/audit/{routes,service,repository}.ts
apps/api/src/modules/users/repository.ts
apps/api/test/authz.applications.test.ts

apps/web/package.json
apps/web/vite.config.ts
apps/web/tsconfig.json
apps/web/index.html
apps/web/tailwind.config.js
apps/web/postcss.config.js
apps/web/src/main.tsx
apps/web/src/styles/index.css
apps/web/src/app/{router,providers}.tsx
apps/web/src/lib/{api,utils}.ts
apps/web/src/components/ui/*
apps/web/src/components/layout/*
apps/web/src/features/auth/*
apps/web/src/features/candidate/*
apps/web/src/features/employee/*
apps/web/src/features/admin/*

packages/shared/package.json
packages/shared/src/index.ts
packages/shared/src/enums.ts
```

---

### Task 1: Monorepo scaffold + local Postgres

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `docker-compose.yml`, `.env.example`, `README.md`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/server.ts` (hello health)
- Create: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/src/main.tsx`

**Interfaces:**
- Produces: `pnpm --filter api dev`, `pnpm --filter web dev`, Postgres on `localhost:5432`

- [ ] **Step 1: Create workspace root**

Root `package.json`:
```json
{
  "name": "team-elite",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel --filter @team-elite/api --filter @team-elite/web dev",
    "dev:api": "pnpm --filter @team-elite/api dev",
    "dev:web": "pnpm --filter @team-elite/web dev",
    "db:up": "docker compose up -d",
    "db:migrate": "pnpm --filter @team-elite/api db:migrate",
    "db:seed": "pnpm --filter @team-elite/api db:seed",
    "test": "pnpm --filter @team-elite/api test"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20" }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`.gitignore`: include `node_modules`, `dist`, `.env`, `.env.local`, `coverage`, `.DS_Store`

- [ ] **Step 2: Docker Compose Postgres**

```yaml
services:
  db:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: teamelite
      POSTGRES_PASSWORD: teamelite
      POSTGRES_DB: teamelite
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

`.env.example`:
```env
DATABASE_URL=postgresql://teamelite:teamelite@localhost:5432/teamelite
SESSION_SECRET=change-me-to-a-long-random-string
WEB_ORIGIN=http://localhost:5173
API_ORIGIN=http://localhost:3001
RESEND_API_KEY=
EMAIL_FROM=Team Elite <onboarding@resend.dev>
INVITE_TOKEN_TTL_HOURS=72
SESSION_TTL_DAYS=14
SEED_ADMIN_EMAIL=admin@teamelite.local
SEED_ADMIN_PASSWORD=ChangeMeAdmin123!
PORT=3001
NODE_ENV=development
```

- [ ] **Step 3: Scaffold minimal API + web packages**

API deps: `fastify`, `@fastify/cookie`, `@fastify/cors`, `zod`, `@prisma/client`, `argon2`, `resend`, `dotenv`  
API devDeps: `typescript`, `tsx`, `prisma`, `vitest`, `@types/node`

Web deps: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`  
Web devDeps: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`

API health route `GET /api/health` → `{ ok: true }`

- [ ] **Step 4: Install and verify**

```bash
pnpm install
pnpm db:up
pnpm --filter @team-elite/api exec tsx src/server.ts
curl -s http://localhost:3001/api/health
```

Expected: `{"ok":true}`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold Team Elite monorepo

EOF
)"
```

---

### Task 2: Prisma schema + seed admin

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`
- Create: `apps/api/src/lib/prisma.ts`, `apps/api/src/config.ts`
- Modify: `apps/api/package.json` (prisma seed config)

**Interfaces:**
- Produces: Prisma models matching `docs/05-database-schema.md`
- Seed creates one `ADMIN` user from env

- [ ] **Step 1: Write Prisma schema** (match docs exactly)

Models: `User`, `Session`, `PasswordToken`, `Candidate`, `Employee`, `Assignment`, `Application`, `AuditLog`  
Enums: `UserRole { ADMIN EMPLOYEE CANDIDATE }`, `PasswordTokenPurpose { INVITE RESET }`

Critical fields:
- `Candidate.email`, `gender`, `address` optional
- `Employee.name`, `employeeCode` required unique code
- `Assignment` `@@unique([employeeId, candidateId])`
- `Application.commentsInternal`, `submittedById`

- [ ] **Step 2: Migrate**

```bash
cp .env.example apps/api/.env
# ensure DATABASE_URL set
pnpm --filter @team-elite/api exec prisma migrate dev --name init
```

Expected: migration applied, client generated

- [ ] **Step 3: Seed admin**

`seed.ts` upserts admin by `SEED_ADMIN_EMAIL` with Argon2 hash of `SEED_ADMIN_PASSWORD`.

```bash
pnpm db:seed
pnpm --filter @team-elite/api exec prisma studio
```

Expected: one admin user visible

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: add Prisma schema and admin seed

EOF
)"
```

---

### Task 3: Core libs — password, session, errors, audit, mail

**Files:**
- Create: `apps/api/src/lib/password.ts`
- Create: `apps/api/src/lib/session.ts`
- Create: `apps/api/src/lib/errors.ts`
- Create: `apps/api/src/lib/audit.ts`
- Create: `apps/api/src/lib/mail.ts`
- Create: `apps/api/src/middleware/requireAuth.ts`
- Create: `apps/api/src/middleware/requireRole.ts`

**Interfaces:**
```ts
// password.ts
export function hashPassword(password: string): Promise<string>
export function verifyPassword(hash: string, password: string): Promise<boolean>

// session.ts
export const COOKIE_NAME = 'te_session'
export function createSession(userId: string): Promise<{ rawToken: string; expiresAt: Date }>
export function resolveSession(rawToken: string): Promise<AuthUser | null>
export function revokeSession(rawToken: string): Promise<void>
export function revokeAllUserSessions(userId: string): Promise<void>

// errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string)
}

// mail.ts
export function sendInviteEmail(params: { to: string; name: string; setPasswordUrl: string }): Promise<void>

// middleware
export function requireAuth(request, reply): Promise<void> // sets request.user
export function requireRole(...roles: UserRole[])
```

- [ ] **Step 1: Implement password + AppError**
- [ ] **Step 2: Implement session create/resolve/revoke (hash tokens with SHA-256 before storage)**
- [ ] **Step 3: Implement audit.log helper**
- [ ] **Step 4: Implement Resend mailer; if `RESEND_API_KEY` empty in dev, log invite URL to console**
- [ ] **Step 5: Wire Fastify cookie + CORS (`origin: WEB_ORIGIN`, `credentials: true`)**
- [ ] **Step 6: Commit** `feat: add session auth primitives and mail helper`

---

### Task 4: Auth routes (login / logout / me / set-password)

**Files:**
- Create: `apps/api/src/modules/auth/schemas.ts`
- Create: `apps/api/src/modules/auth/service.ts`
- Create: `apps/api/src/modules/auth/routes.ts`
- Modify: `apps/api/src/app.ts` to register routes

**Interfaces:**
```ts
POST /api/auth/login      { email, password } -> { user }
POST /api/auth/logout     -> { ok: true }
GET  /api/auth/me         -> { id, name, email, role, candidateId?, employeeId? }
POST /api/auth/set-password { token, password } -> { ok: true }
```

- [ ] **Step 1: Write failing vitest for inactive user login rejected**

```ts
// apps/api/test/auth.login.test.ts
it('rejects inactive users', async () => {
  // create inactive user with known password
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
  expect(res.statusCode).toBe(403)
  expect(res.json().error.code).toBe('ACCOUNT_DISABLED')
})
```

- [ ] **Step 2: Run test — expect FAIL**
- [ ] **Step 3: Implement auth service + routes**
- [ ] **Step 4: Run test — expect PASS**
- [ ] **Step 5: Manual curl login cookie round-trip**

```bash
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@teamelite.local","password":"ChangeMeAdmin123!"}'
curl -b cookies.txt http://localhost:3001/api/auth/me
```

- [ ] **Step 6: Commit** `feat: implement session login logout me and set-password`

---

### Task 5: Admin user management (candidates + employees + invites)

**Files:**
- Create modules: `candidates/*`, `employees/*`, `users/repository.ts`

**Interfaces:**
```ts
POST /api/candidates  // admin; creates User+Candidate+INVITE token+email
PATCH /api/candidates/:id
POST /api/candidates/:id/disable
GET /api/candidates
GET /api/candidates/:id

POST /api/employees
PATCH /api/employees/:id
POST /api/employees/:id/disable
POST /api/employees/:id/reset-password
GET /api/employees
GET /api/employees/:id
```

Create candidate body:
```ts
{
  name: string
  email: string              // login (users.email)
  contactEmail?: string      // maps to candidates.email
  phone?: string
  gender?: string
  address?: string
  primaryRole?: string
  experience?: string
}
```

Create employee body:
```ts
{ name: string; email: string; employeeCode: string }
```

- [ ] **Step 1: Implement repositories + services (invite token creation shared helper)**
- [ ] **Step 2: Register admin-only routes with `requireRole('ADMIN')`**
- [ ] **Step 3: Manual test: create candidate → console/Resend shows set-password URL → set password → login as candidate**
- [ ] **Step 4: Commit** `feat: admin can create invite candidates and employees`

---

### Task 6: Assignments + employee candidate scope

**Files:**
- Create: `apps/api/src/modules/assignments/*`
- Modify: `candidates/service.ts` for employee scoping

**Interfaces:**
```ts
GET /api/assignments
POST /api/assignments { employeeId, candidateId }
DELETE /api/assignments/:id

// helper used by other modules
assertEmployeeAssigned(employeeId: string, candidateId: string): Promise<void>
```

- [ ] **Step 1: Write failing authz test — employee GET unassigned candidate → 403**
- [ ] **Step 2: Implement assignments + scoping**
- [ ] **Step 3: Tests pass; employee list returns only assigned**
- [ ] **Step 4: Commit** `feat: assignment manager and employee candidate scoping`

---

### Task 7: Applications CRUD + candidate sanitization

**Files:**
- Create: `apps/api/src/modules/applications/*`
- Create: `apps/api/test/authz.applications.test.ts`

**Interfaces:**
```ts
toCandidateApplication(app): CandidateApplicationDTO // NO commentsInternal/submittedBy
toStaffApplication(app): StaffApplicationDTO

GET/POST/PATCH/DELETE /api/applications
```

Serializer rule (hard omit):
```ts
export function toCandidateApplication(a: Application) {
  return {
    id: a.id,
    companyName: a.companyName,
    jobLink: a.jobLink,
    resumeLink: a.resumeLink,
    probability: a.probability,
    updates: a.updates,
    appliedDate: a.appliedDate,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}
```

- [ ] **Step 1: Write failing tests**
  - candidate GET applications JSON must not contain `commentsInternal` or `submittedBy`
  - employee cannot create application for unassigned candidate
- [ ] **Step 2: Implement repository/service/routes/serializers**
- [ ] **Step 3: On create, set `submittedById = request.user.id` for employees**
- [ ] **Step 4: Run tests — PASS**
- [ ] **Step 5: Commit** `feat: applications CRUD with candidate field redaction`

---

### Task 8: Stats + audit log APIs

**Files:**
- Create: `apps/api/src/modules/stats/*`
- Create: `apps/api/src/modules/audit/*`

**Interfaces:**
```ts
GET /api/stats/candidate -> { total, thisWeek, interviewsPlaceholder: 0, pending }
GET /api/stats/employee  -> { assignedCandidates, applicationsToday, pending }
GET /api/stats/admin     -> { totalCandidates, totalEmployees, applicationsToday, activeAssignments }
GET /api/audit-logs?page&pageSize
```

Pending heuristic for MVP: `updates` ILIKE `%pending%` OR null/empty updates count as pending — document in code comment; adjustable later.

- [ ] **Step 1: Implement stats queries with same authz scoping as lists**
- [ ] **Step 2: Ensure mutations already call `audit.log`; add admin list endpoint**
- [ ] **Step 3: Smoke test as each role**
- [ ] **Step 4: Commit** `feat: role dashboards stats and admin audit log API`

---

### Task 9: Web app shell — design system, auth pages, routing

**Files:**
- Create: Tailwind theme tokens, `components/ui/*`, `components/layout/*`
- Create: `features/auth/{LoginPage,SetPasswordPage,RequireAuth,RequireRole,useAuth}`
- Create: `app/router.tsx`, `lib/api.ts` (`credentials: 'include'`)

**UI constraints:**
- Premium minimal dark-mode-capable shell (Linear/Stripe-inspired)
- Avoid purple-gradient cliché; use restrained neutral + one accent (deep teal or ink blue)
- Brand: **Team Elite Portal**

Vite proxy:
```ts
server: {
  proxy: { '/api': 'http://localhost:3001' }
}
```

- [ ] **Step 1: Tailwind base + CSS variables + dark class strategy**
- [ ] **Step 2: api client with credentials**
- [ ] **Step 3: Login + SetPassword pages**
- [ ] **Step 4: Role redirect after login (`/admin` | `/employee` | `/candidate`)**
- [ ] **Step 5: Verify login flow in browser against seeded admin**
- [ ] **Step 6: Commit** `feat: web shell auth pages and role routing`

---

### Task 10: Candidate dashboard UI

**Files:**
- Create: `features/candidate/CandidateDashboardPage.tsx`
- Create: table + stat cards + search/pagination hooks

- [ ] **Step 1: Wire `/api/stats/candidate` cards (Interviews shows em dash / coming soon)**
- [ ] **Step 2: Applications DataTable — columns: Company, Date, Probability, Resume, Job, Updates**
- [ ] **Step 3: Search + sort + pagination**
- [ ] **Step 4: Empty/loading/error states**
- [ ] **Step 5: Commit** `feat: candidate read-only applications dashboard`

---

### Task 11: Employee dashboard UI

**Files:**
- Create: `MyCandidatesPage`, `CandidateDetailPage`, `ApplicationForm`, `QuickAddApplication`

- [ ] **Step 1: List assigned candidates + employee stats cards**
- [ ] **Step 2: Candidate detail with applications table**
- [ ] **Step 3: Create/edit/delete application (includes internal comments field)**
- [ ] **Step 4: Confirm dialog on delete**
- [ ] **Step 5: Commit** `feat: employee my-candidates and application management UI`

---

### Task 12: Admin dashboard UI

**Files:**
- Create: Admin overview, Users (candidates/employees), AssignmentManager, AllApplications, AuditLogPage

- [ ] **Step 1: Stats overview + recent audit snippet**
- [ ] **Step 2: Create/edit/disable candidate & employee dialogs + resend/reset password**
- [ ] **Step 3: Assignment manager UI**
- [ ] **Step 4: Global applications table + audit log table**
- [ ] **Step 5: End-to-end manual path: admin invites → assign → employee applies → candidate sees sanitized row**
- [ ] **Step 6: Commit** `feat: admin users assignments applications and audit UI`

---

### Task 13: Deploy config (Railway + Vercel)

**Files:**
- Create: `apps/api/railway.toml` or Railway docs in README
- Create: `apps/web/vercel.json` with rewrite
- Modify: root `README.md` deploy section

`apps/web/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://YOUR_RAILWAY_API_URL/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Note: after Railway URL known, replace placeholder. Also set `WEB_ORIGIN` to Vercel URL on API.

- [ ] **Step 1: Document Railway service (Dockerfile or Nixpacks Node start: `pnpm --filter @team-elite/api start`)**
- [ ] **Step 2: Add API `Dockerfile` if needed for Railway**
- [ ] **Step 3: Vercel project rooted at `apps/web` (or monorepo settings)**
- [ ] **Step 4: List required env vars in README**
- [ ] **Step 5: Commit** `chore: add Vercel and Railway deploy configuration`

---

### Task 14: Hardening pass

**Files:**
- Modify: auth routes rate limit (`@fastify/rate-limit` on `/api/auth/login` and set-password)
- Modify: ensure all list endpoints clamp `pageSize <= 100`
- Add: `docs/ops-runbook.md` (invite, disable, reset password, rotate session secret)

- [ ] **Step 1: Rate limit auth**
- [ ] **Step 2: Re-run authz test suite**
- [ ] **Step 3: Checklist against `docs/02-functional-requirements.md` — tick each FR**
- [ ] **Step 4: Commit** `chore: rate limit auth and add ops runbook`

---

## Verification matrix (MVP done when)

| Check | How |
|-------|-----|
| Admin login | seed credentials |
| Invite candidate | set-password works |
| Assign employee | employee sees candidate |
| Unassigned denied | API 403 + test |
| Employee CRUD apps | UI + API |
| Candidate sanitized | no internal fields in network response |
| Audit visible | admin audit page |
| Dark mode | toggle persists |
| Deploy ready | README + vercel rewrite + Railway notes |

---

## Out of scope (do not implement)

AI resume, scraper, Gmail, file uploads, JWT, in-app chat, interview tracker, forgot-password public flow (admin reset is enough unless time remains).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-19-team-elite-portal-mvp.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
