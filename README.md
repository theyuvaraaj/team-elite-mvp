# Team Elite Portal

pnpm monorepo: Fastify API (`apps/api`, :3001) + Vite React SPA (`apps/web`, :5173).

## Setup

```bash
pnpm install
cp .env.example apps/api/.env
pnpm db:up
pnpm db:seed
pnpm dev
```

Health: `curl http://localhost:3001/api/health` → `{"ok":true}`

## Creating admins

There is **no “Create admin” UI**. Admins are created only by seed:

1. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `apps/api/.env`
2. Run `pnpm db:seed`
3. Sign in with that email/password → `/admin`

The Users page can invite **employees** and **candidates** only. Extra admins require another seed (different email) or a direct DB insert with role `ADMIN`.

## Demo logins (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@teamelite.local` | `ChangeMeAdmin123!` |
| Employee | `employee@teamelite.local` | `Employee123!` |
| Candidate | `candidate@teamelite.local` | `Candidate123!` |

## Scripts

| Command | What |
|---------|------|
| `pnpm dev` | API + web |
| `pnpm db:up` | Local Postgres (Docker) |
| `pnpm db:seed` | Admin + demo users |

## Deploy

- **Railway** — API + Postgres (`apps/api/Dockerfile`); runs migrations on start
- **Vercel** — SPA (`apps/web`); rewrite `/api/*` → Railway (required for cookie auth)

Set Railway `WEB_ORIGIN` to the Vercel URL. Replace `YOUR_RAILWAY_API_URL` in `apps/web/vercel.json` before go-live.

**API env (Railway):** `DATABASE_URL`, `SESSION_SECRET`, `WEB_ORIGIN`, `API_ORIGIN`, `EMAIL_FROM`, `INVITE_TOKEN_TTL_HOURS`, `SESSION_TTL_DAYS`, `NODE_ENV=production`. Optional: `RESEND_API_KEY`. Seed vars only needed if you run `pnpm db:seed` there.

## Docs

Architecture: [`docs/README.md`](docs/README.md) · E2E checklist: [`docs/e2e-test-plan.md`](docs/e2e-test-plan.md)
