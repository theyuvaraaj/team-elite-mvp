# 10 — Backend Architecture

## Style

Clean-ish modular monolith:

```text
HTTP Route → Zod validate → AuthZ → Service → Repository (Prisma) → DB
                              ↘ Audit writer
```

No microservices for MVP.

## Layers

| Layer | Responsibility |
|-------|----------------|
| Routes | HTTP binding, status codes, cookie plumbing |
| Schemas | Request/response Zod |
| Services | Business rules, authorization decisions, orchestrating invites/mail |
| Repositories | Prisma queries only |
| Serializers | Role-aware response shaping |
| Lib | session, password, mail, errors, audit helpers |

## Cross-cutting

- `requireAuth` attaches `request.user`
- `requireRole('ADMIN' | 'EMPLOYEE' | 'CANDIDATE')`
- Assignment checks inside `applications` / `candidates` services
- Central error handler maps `AppError` → HTTP
- Every sensitive mutation calls `audit.log(...)`

## Config (env)

```text
DATABASE_URL
SESSION_SECRET
WEB_ORIGIN                 # CORS + cookie
API_ORIGIN
RESEND_API_KEY
EMAIL_FROM
INVITE_TOKEN_TTL_HOURS
SESSION_TTL_DAYS
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
NODE_ENV
```

## Cookie strategy (split domains)

If web is `portal.example.com` and API is `api.example.com`:

- Prefer proxying `/api` through Vercel rewrites to Railway in MVP to keep same-site cookies simple
- Fallback: cross-site cookies with `SameSite=None; Secure` + explicit CORS credentials

**Preferred MVP:** Vercel rewrite `/api/*` → Railway so browser talks same origin.

## Testing (minimum for MVP)

- Unit: password hashing, serializers (candidate redaction)
- Integration: authz matrix (candidate cannot read internal comments; employee cannot read unassigned)
- Smoke: login + create application + candidate list

## Extensibility hook

Future modules (ai-resume, scraper, gmail) register as new `modules/*` with their own tables; they call into `applicationsService` / `candidatesService` rather than writing ad-hoc SQL into core tables from outside.
