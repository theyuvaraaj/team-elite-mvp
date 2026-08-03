# Run

**Prereqs:** Node ≥ 20, pnpm, Docker. From repo root:

```bash
pnpm install
pnpm db:up          # postgres (docker)
pnpm db:migrate     # prisma migrations
pnpm db:seed        # demo users + data
pnpm dev:api        # backend → http://localhost:3001
pnpm dev:web        # frontend → http://localhost:5173
```

(Or `pnpm dev` to run API + web together.)

## Test logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@teamelite.local` | `ChangeMeAdmin123!` |
| Employee | `employee@teamelite.local` | `Employee123!` |
| Candidate | `candidate@teamelite.local` | `Candidate123!` |

## Notes

- Resume optimizer needs a `GEMINI_API_KEY` in `apps/api/.env` (Google AI
  Studio). Without it, dev uses a stub.
- LaTeX PDF downloads need `tectonic` installed (`brew install tectonic`);
  falls back to a plain PDF if absent.
- Tests: `pnpm test` (API) · `pnpm --filter @team-elite/web exec vitest run` (web).
- More detail: [PROGRESS.md](PROGRESS.md).
