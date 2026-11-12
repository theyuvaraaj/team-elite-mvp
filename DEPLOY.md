# Deploy

API and database on Railway, web app on Vercel. The web app calls `/api` on its
own domain and Vercel forwards those requests to Railway, so the session cookie
stays first-party.

## 1. Railway: database and API

1. New project, then add a **PostgreSQL** database.
2. Add a service from the GitHub repo `theyuvaraaj/team-elite-mvp`.
   - Root directory: the repo root (not `apps/api`).
   - `apps/api/railway.toml` selects the Dockerfile and the health check.
3. Set the service variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | reference the Postgres plugin: `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | any long random string |
| `WEB_ORIGIN` | the Vercel URL, for example `https://team-elite.vercel.app` |
| `API_ORIGIN` | this service's Railway URL |
| `SEED_ADMIN_EMAIL` | the first admin's login email |
| `SEED_ADMIN_PASSWORD` | a new strong password (not the one in `RUN.md`) |
| `GEMINI_API_KEY` | a key with billing enabled |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | an address on a domain verified in Resend |
| `INVITE_TOKEN_TTL_HOURS` | `72` |
| `SESSION_TTL_DAYS` | `14` |

   The `RESUME_*` values in `apps/api/.env.example` all have working defaults.
4. Generate a public domain for the service. Check `https://<domain>/api/health`
   returns `{"ok":true}`.

On start the container applies database migrations, and on a database with no
admin it creates one from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Never run
`pnpm db:seed` against production: it refuses, because it creates demo accounts
with published passwords.

## 2. Vercel: web app

1. Put the Railway domain into `apps/web/vercel.json` in place of
   `YOUR_RAILWAY_API_URL`, commit and push.
2. Import the repo in Vercel with root directory `apps/web` (framework: Vite,
   build `pnpm build`, output `dist`).
3. Once Vercel gives you the URL, make sure Railway's `WEB_ORIGIN` matches it
   exactly, then redeploy the API.

## 3. Smoke test

1. Sign in as the admin and change the profile name.
2. Invite an employee and a candidate; confirm both emails arrive and the
   set-password links work.
3. Assign the candidate to the employee.
4. As the employee, run one resume optimisation and download the PDF and DOCX.
   The PDF should have the LaTeX layout, not the plain fallback.

## Limits worth knowing

- Vercel cuts a proxied request off at 120 seconds. An optimisation stops
  refining at `RESUME_TOTAL_BUDGET_MS` (105 seconds) and returns its best draft.
- Each user may start `RESUME_OPTIMIZE_PER_HOUR` (20) optimisations an hour.
- Login attempts are limited to 5 a minute per account.
