# Team Elite Portal — E2E Test Plan

Manual end-to-end checklist for the MVP on branch `feat/team-elite-portal-mvp`.

Use this against a **local** run first (`pnpm dev`). Tick each row Pass / Fail and note evidence (screenshot, URL, or API response).

| Meta | Value |
|------|--------|
| App | Team Elite Portal MVP |
| Web | http://localhost:5173 |
| API | http://localhost:3001 |
| Seed admin | `admin@teamelite.local` / `ChangeMeAdmin123!` (from `.env.example`) |
| Tester | |
| Date | |
| Build / commit | |

---

## 0. Environment setup

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 0.1 | `pnpm install` | Completes without error | ☐ |
| 0.2 | `cp .env.example apps/api/.env` (if missing) | `apps/api/.env` exists; no secrets committed | ☐ |
| 0.3 | `pnpm db:up` (or `docker-compose up -d`) | Postgres on `localhost:5432` | ☐ |
| 0.4 | `pnpm db:migrate` | Migrations apply | ☐ |
| 0.5 | `pnpm db:seed` | Admin user seeded | ☐ |
| 0.6 | `pnpm dev` | Web :5173, API :3001 | ☐ |
| 0.7 | `curl http://localhost:3001/api/health` | `{"ok":true}` | ☐ |

**Notes:** Leave `RESEND_API_KEY` empty for local testing. Invite / reset links print in the **API terminal** as:

```text
[invite] <Name> <email>: http://localhost:5173/set-password?token=...
```

---

## 1. Auth — admin

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 1.1 | Open http://localhost:5173/login | Login page shows **Team Elite Portal** | ☐ |
| 1.2 | Wrong password | Error message from API (not a blank/generic-only failure if server sent one) | ☐ |
| 1.3 | Login as seed admin | Redirect to `/admin` | ☐ |
| 1.4 | Refresh page | Still logged in (session cookie) | ☐ |
| 1.5 | Open `/candidate` while admin | Redirected away / cannot use candidate home as admin | ☐ |
| 1.6 | Logout | Back to login; `/admin` requires login again | ☐ |
| 1.7 | Re-login as admin | `/admin` works | ☐ |

---

## 2. Admin — create users + set password

Use unique emails each run, e.g. `cand1+test@example.com`, `emp1+test@example.com`.

### 2A. Candidate invite

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 2.1 | Admin → **Users** (`/admin/users`) | Users page loads | ☐ |
| 2.2 | Create candidate: name, login email, optional phone / gender / address / primary role / experience | Candidate appears in list; active | ☐ |
| 2.3 | Check API terminal for `[invite]` line | Set-password URL logged | ☐ |
| 2.4 | Open set-password URL in **private/incognito** window | Set-password form loads | ☐ |
| 2.5 | Set a strong password and submit | Success; can log in | ☐ |
| 2.6 | Login as candidate | Lands on `/candidate` | ☐ |

### 2B. Employee invite

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 2.7 | As admin, create employee: name, email, employee code (e.g. `E-101`) | Employee appears | ☐ |
| 2.8 | Copy `[invite]` URL from API logs | URL present | ☐ |
| 2.9 | Set password + login as employee | Lands on `/employee` | ☐ |

**Save for later**

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Candidate | | | name: |
| Employee | | | code: |
| Unassigned candidate (optional) | | | for negative tests |

---

## 3. Admin — assignments

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 3.1 | Admin → **Assignments** (`/admin/assignments`) | Page loads | ☐ |
| 3.2 | Assign the employee to the candidate | Assignment appears / success | ☐ |
| 3.3 | As employee, open `/employee` | Candidate appears under My Candidates | ☐ |
| 3.4 | (Optional) Create a second candidate, **do not assign** | Used in §6 | ☐ |

---

## 4. Employee — applications CRUD

Log in as the assigned employee.

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 4.1 | `/employee` shows stats cards | Assigned / Today / Pending visible | ☐ |
| 4.2 | Open candidate detail | Profile + applications section | ☐ |
| 4.3 | Add application: company, job link, resume URL, probability, updates, **internal comments** | Saves successfully | ☐ |
| 4.4 | Edit application: change updates + internal comments | Saves; internal comments still visible to employee | ☐ |
| 4.5 | Delete application → confirm dialog | Row removed after confirm | ☐ |
| 4.6 | Add **2+ applications** again (keep them) | List shows multiple rows | ☐ |
| 4.7 | One app with `updates` empty or containing “pending” | Used for pending stats heuristic | ☐ |

---

## 5. Candidate — sanitized read-only view (critical)

Log in as the assigned candidate (separate browser / private window).

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 5.1 | `/candidate` dashboard loads | Stats: Total, This Week, Interviews (— / placeholder), Pending | ☐ |
| 5.2 | Applications table columns | **Only:** Company, Date, Probability, Resume, Job, Updates | ☐ |
| 5.3 | Network tab: `GET /api/applications` | JSON has **no** `commentsInternal`, `submittedBy`, `submittedById`, employee name/email | ☐ |
| 5.4 | Internal comment text from §4 | **Never** appears in UI or JSON | ☐ |
| 5.5 | Try to invent an edit/delete UI | None — read-only | ☐ |
| 5.6 | Search / sort / pagination | Works on applications list | ☐ |
| 5.7 | Resume + Job links | Open correct URLs | ☐ |

---

## 6. Authorization negatives (critical)

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 6.1 | Employee opens unassigned candidate URL `/employee/candidates/<unassigned-id>` | Error / forbidden — not full profile | ☐ |
| 6.2 | Employee `GET /api/candidates/<unassigned-id>` (DevTools / curl with cookie) | **403** (`CANDIDATE_NOT_ASSIGNED` or equivalent) | ☐ |
| 6.3 | Candidate opens `/admin` or `/employee` | Blocked / redirected | ☐ |
| 6.4 | Candidate `GET /api/employees` or `/api/assignments` | **403** | ☐ |
| 6.5 | Employee opens `/admin` | Blocked / redirected | ☐ |
| 6.6 | Logged-out user hits `/api/auth/me` | **401** | ☐ |

### Cookie helper for curl (optional)

```bash
# After browser login, copy Cookie header, or:
curl -c /tmp/te.txt -X POST http://localhost:3001/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"EMPLOYEE_EMAIL","password":"PASSWORD"}'

curl -b /tmp/te.txt http://localhost:3001/api/candidates/UNASSIGNED_ID
# expect 403
```

---

## 7. Admin — overview, applications, audit

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 7.1 | `/admin` overview cards | Candidates, employees, apps today, assignments look sane | ☐ |
| 7.2 | `/admin/applications` | Sees applications including internal fields / submitter as designed for staff | ☐ |
| 7.3 | `/admin/audit` | Shows recent actions (user create, assignment, application, login, etc.) | ☐ |
| 7.4 | Edit candidate profile fields only (gender/address, no name change) | Saves without error | ☐ |
| 7.5 | Edit employee name / code | Saves | ☐ |

---

## 8. Disable + password reset

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 8.1 | Admin → Reset password / Resend invite for **candidate** | Success; new `[invite]` URL in API logs | ☐ |
| 8.2 | Old set-password token (if still around) | Should fail / be invalid after reset | ☐ |
| 8.3 | Complete new set-password; login works | Pass | ☐ |
| 8.4 | Admin → Reset password for **employee** | New link logged; sessions revoked | ☐ |
| 8.5 | Disable employee | Marked inactive | ☐ |
| 8.6 | Disabled employee login | Rejected (`ACCOUNT_DISABLED` / cannot enter app) | ☐ |
| 8.7 | Disable candidate | Candidate cannot log in | ☐ |

---

## 9. UX smoke

| # | Step | Expected | Pass? |
|---|------|----------|-------|
| 9.1 | Toggle dark mode | Persists after refresh | ☐ |
| 9.2 | Empty states | Sensible empty copy when no apps / no candidates | ☐ |
| 9.3 | Narrow browser width | Layout usable (tables may scroll) | ☐ |

---

## 10. Automated regression (API)

Run from repo root while Postgres is up and `apps/api/.env` is set:

```bash
pnpm --filter @team-elite/api test
```

| # | Check | Expected | Pass? |
|---|-------|----------|-------|
| 10.1 | API test suite | All tests green (currently **26**) | ☐ |
| 10.2 | Web typecheck | `pnpm --filter @team-elite/web exec tsc -b` exits 0 | ☐ |

---

## Sign-off

| Role path | Result |
|-----------|--------|
| Admin happy path | ☐ Pass ☐ Fail |
| Employee happy path | ☐ Pass ☐ Fail |
| Candidate sanitized view | ☐ Pass ☐ Fail |
| Authz negatives | ☐ Pass ☐ Fail |
| Disable / reset | ☐ Pass ☐ Fail |

**Blockers found:**

1.
2.

**Tester sign-off:** __________________  **Date:** __________

---

## Quick reference — routes

| Role | Paths |
|------|--------|
| Public | `/login`, `/set-password?token=...` |
| Admin | `/admin`, `/admin/users`, `/admin/assignments`, `/admin/applications`, `/admin/audit` |
| Employee | `/employee`, `/employee/candidates/:id` |
| Candidate | `/candidate` |

## Known MVP limits (do not fail the build for these)

- No public “forgot password” — admin reset only
- Re-enable disabled users not in MVP UI
- Interview Calls card is a placeholder
- Pending stats use a simple `updates` heuristic
- With empty `RESEND_API_KEY`, email is console-only (by design)


# Sample Credentials

| Role      | Email                   | Password          |
|-----------|-------------------------|-------------------|
| Admin     | admin@teamelite.local   | ChangeMeAdmin123! |
| Employee  | employee@teamelite.local| Employee123!      |
| Candidate | candidate@teamelite.local| Candidate123!     |