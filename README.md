# Team Elite Portal

pnpm monorepo for the Team Elite Portal MVP.

## Packages

- `apps/api` — Fastify API (port 3001)
- `apps/web` — Vite React SPA (port 5173)

## Prerequisites

- Node.js 20+
- pnpm 9.15+
- Docker (local Postgres)

## Setup

```bash
pnpm install
cp .env.example apps/api/.env
pnpm db:up
```

## Development

```bash
pnpm dev          # API + web in parallel
pnpm dev:api      # API only
pnpm dev:web      # web only
```

## Health check

```bash
curl http://localhost:3001/api/health
# {"ok":true}
```

## Deployment

### Architecture

- **Vercel** — static SPA from `apps/web`
- **Railway** — Fastify API + Postgres from `apps/api` (Docker)

The web app calls `/api/*` on the same origin. The Vercel `/api` rewrite to Railway is **required** for cookie authentication: it keeps browser requests same-site so the session cookie is stored and sent correctly. A direct, cross-origin browser connection to Railway without this rewrite breaks login.

### Railway (API + Postgres)

1. Create a Postgres plugin and attach it to the API service.
2. Set the service **Root Directory** to the repository root.
3. Set **Dockerfile Path** to `apps/api/Dockerfile` (see `apps/api/railway.toml`).
4. Railway injects `DATABASE_URL` from Postgres; set the remaining env vars below.
5. On each deploy, the container runs `prisma migrate deploy` then starts the API.

Local Docker build check:

```bash
docker build -f apps/api/Dockerfile -t team-elite-api .
```

### Vercel (web)

1. Import the repo and set **Root Directory** to `apps/web`.
2. Build command: `pnpm build` (default). Output: `dist`.
3. Before go-live, replace `YOUR_RAILWAY_API_URL` in `apps/web/vercel.json` with the public Railway API host (no trailing slash). Do not deploy the placeholder.
4. Verify that Vercel rewrites `/api/*` to Railway; this is required for same-site cookie authentication.
5. After the first Vercel deploy, set the Railway API `WEB_ORIGIN` to the exact Vercel URL (e.g. `https://your-app.vercel.app`).

> **Cookie-auth warning:** Do not configure the SPA to call the Railway host directly. Without the Vercel `/api` rewrite, requests are cross-origin and login will fail because the browser will not handle the session cookie as the app expects.

### Environment variables

**Railway (API service)**

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | From Railway Postgres |
| `SESSION_SECRET` | yes | Long random string |
| `WEB_ORIGIN` | yes | Exact Vercel app URL; required for CORS and cookie auth |
| `API_ORIGIN` | yes | Public Railway API URL |
| `RESEND_API_KEY` | no | Email invites; empty disables send |
| `EMAIL_FROM` | yes | e.g. `Team Elite <onboarding@resend.dev>` |
| `INVITE_TOKEN_TTL_HOURS` | yes | e.g. `72` |
| `SESSION_TTL_DAYS` | yes | e.g. `14` |
| `SEED_ADMIN_EMAIL` | yes | Used by `pnpm db:seed` only |
| `SEED_ADMIN_PASSWORD` | yes | Used by `pnpm db:seed` only |
| `PORT` | no | Railway sets this automatically |
| `NODE_ENV` | yes | `production` |

**Vercel (web)**

No env vars required for the SPA; API traffic is proxied via `vercel.json`.

### Post-deploy smoke test

```bash
curl https://YOUR_RAILWAY_API_URL/api/health
# {"ok":true}
```

## Docs

See [`docs/README.md`](docs/README.md) for architecture and requirements.

Manual E2E checklist: [`docs/e2e-test-plan.md`](docs/e2e-test-plan.md)
