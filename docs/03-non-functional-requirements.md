# 03 — Non-Functional Requirements

## NFR-1 Security

- All mutating and sensitive GETs require authenticated session
- Authorization enforced in backend services (UI hiding is insufficient)
- Passwords hashed with Argon2 (or bcrypt if Argon2 packaging is painful — Argon2 preferred)
- Session tokens stored hashed at rest; cookies `HttpOnly`, `Secure` (prod), `SameSite=Lax` (or `None`+Secure if cross-site API/web split requires it)
- CORS restricted to the web origin
- Rate-limit login and set-password endpoints
- Never return `comments_internal` or `submitted_by` on candidate-facing serializers
- No enumeration of other candidates’ IDs to candidates

## NFR-2 Performance

- Target p95 API < 300ms for list pages at 2–3× scale on Railway starter resources
- Pagination default page size 20 (max 100)
- Indexes on foreign keys, emails, assignment pair, application candidate_id + applied_date

## NFR-3 Reliability

- Structured error responses `{ error: { code, message } }`
- DB migrations via Prisma Migrate
- Health endpoint for Railway checks

## NFR-4 Maintainability

- TypeScript end-to-end
- Zod validation at API boundary
- Service layer for business rules; repositories for Prisma access
- Feature modules isolatable for future automation

## NFR-5 Operability

- Env-based config (no secrets in repo)
- Seed script for first admin
- Audit log for forensic review
- Deploy: Vercel (SPA) + Railway (API + Postgres)

## NFR-6 Portability

- Prisma abstracting SQL access so hosting (Railway → Neon/AWS RDS) is a URL change
- Future DB engine change should be schema + migration work, not rewrite of UI/services

## NFR-7 Accessibility & UX

- Keyboard-usable primary forms and tables
- Clear empty states; no silent failures
- Dark mode toggle persisted locally
