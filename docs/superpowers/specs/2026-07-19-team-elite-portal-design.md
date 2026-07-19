# Team Elite Portal — Consolidated Design Spec

**Date:** 2026-07-19  
**Status:** Awaiting user approval before implementation  

This is the single-file consolidation of the architecture package under `docs/`. Authoritative detail lives in the numbered docs; this file captures the locked design.

## Problem

Shared Google Sheets let candidates see/interact with employees and internal workflow, threatening Team Elite’s business model.

## MVP outcome

Secure portal with three roles, hard data isolation, application tracking, admin-managed users/assignments, audit log, Resend invites. No AI/automation yet.

## Stack

| Layer | Choice |
|-------|--------|
| Web | Vite + React + TypeScript + Tailwind + TanStack Query + React Router |
| API | Fastify + TypeScript + Zod |
| ORM | Prisma |
| DB | PostgreSQL (Railway) |
| Auth | Server-side sessions (httpOnly cookie) — **not JWT** |
| Email | Resend |
| Deploy | Vercel (web) + Railway (api + db); prefer Vercel `/api` rewrite |

## Auth vs authorization

- **Auth simplified:** sessions instead of JWT/refresh  
- **Authorization retained:** ADMIN / EMPLOYEE / CANDIDATE + assignment checks + field redaction — product-critical  

## Domain model (summary)

- `users`, `sessions`, `password_tokens`
- `candidates` (+ optional email, gender, address, phone, primary_role, experience)
- `employees` (+ name, employee_code)
- `assignments` (M:N)
- `applications` (internal comments + submitted_by hidden from candidates)
- `audit_logs`

## Security invariants

1. Candidates never see employee identity, internal comments, or assignments  
2. Employees never access unassigned candidates  
3. Backend enforces all rules; UI guards are UX only  
4. Inactive users cannot keep sessions  

## Delivery phases

Foundations → Auth/users/invites → Assignments → Applications → Dashboards/audit → UI polish → Deploy → Hardening  

## Approval

Review `docs/README.md` and linked documents, then reply **approve architecture** to begin the implementation plan/build.
