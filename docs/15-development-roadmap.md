# 15 — Development Roadmap (Phase-wise)

## Phase 0 — Foundations (Day 1)

- pnpm monorepo scaffold (`apps/api`, `apps/web`, `packages/shared`)
- docker-compose Postgres
- Prisma schema + first migration
- Seed admin
- Health check
- README with local run instructions

**Exit:** `pnpm dev` runs API + web against local DB

## Phase 1 — Auth & users

- Session login/logout/me
- Password hashing
- Admin create employee/candidate
- Resend invite + set-password
- Disable user + revoke sessions
- Auth middleware

**Exit:** Admin can invite a candidate who sets password and logs in

## Phase 2 — Assignments & scoping

- Assignment CRUD (admin)
- Employee “My Candidates” API scoped by assignment
- Authz tests for cross-access denial

**Exit:** Employee only sees assigned candidates

## Phase 3 — Applications

- Application CRUD
- Auto `submitted_by`
- Candidate sanitized list/detail + stats
- Employee/admin full DTO
- Search/sort/pagination

**Exit:** Sheet workflow replaceable for tracking

## Phase 4 — Dashboards & audit

- Candidate / Employee / Admin dashboard cards
- Audit log writer + admin viewer
- Empty/loading/error states

**Exit:** All three roles usable day-to-day

## Phase 5 — UI polish

- Design system tokens, dark mode
- DataTable quality
- Responsive shell
- Confirm dialogs for destructive actions

**Exit:** Feels premium enough for client-facing candidate login

## Phase 6 — Deploy

- Railway: Postgres + API + env
- Vercel: web + `/api` rewrite to Railway (preferred cookie model)
- Resend domain/from address
- Seed production admin
- Smoke test all roles on production URLs

**Exit:** Live product URLs handed over

## Phase 7 — Hardening (short)

- Rate limit auth routes
- Basic integration authz suite in CI
- Backup note for Railway Postgres
- Ops runbook (invite, disable, reset password)

---

## Suggested sequencing for implementation agents

Do not start Phase 6 until Phases 1–4 are functionally complete.  
Do not add AI/automation modules until MVP exit criteria in the PRD are met.
