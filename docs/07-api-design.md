# 07 — API Design

Base: `/api`  
Auth: session cookie  
Errors: `{ "error": { "code": "STRING", "message": "Human readable" } }`  
Lists: `?page=1&pageSize=20&q=&sort=&order=asc|desc`

## Auth

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/auth/login` | public | email/password → set session cookie |
| POST | `/auth/logout` | auth | revoke session |
| GET | `/auth/me` | auth | current user + role profile refs |
| POST | `/auth/set-password` | public | `{ token, password }` |
| POST | `/auth/forgot-password` | admin-only via UI alternative | MVP: admin triggers reset instead if simpler; optional public forgot |

### POST /auth/login
Body: `{ email, password }`  
Response: `{ user: PublicUser }` + `Set-Cookie`

### GET /auth/me
Response: `{ id, name, email, role, candidateId?, employeeId? }`

## Candidates

| Method | Path | Roles |
|--------|------|-------|
| GET | `/candidates` | admin; employee→assigned only |
| GET | `/candidates/:id` | admin; employee→assigned; candidate→self |
| POST | `/candidates` | admin |
| PATCH | `/candidates/:id` | admin |
| POST | `/candidates/:id/disable` | admin (sets user inactive) |

Create body includes user fields + profile: name, email (login), optional candidate.email/phone/gender/address/primaryRole/experience.

## Employees

| Method | Path | Roles |
|--------|------|-------|
| GET | `/employees` | admin |
| GET | `/employees/:id` | admin |
| POST | `/employees` | admin |
| PATCH | `/employees/:id` | admin |
| POST | `/employees/:id/disable` | admin |
| POST | `/employees/:id/reset-password` | admin |

Create: name, email, employeeCode → invite email.

## Assignments

| Method | Path | Roles |
|--------|------|-------|
| GET | `/assignments` | admin (`?candidateId` / `?employeeId`) |
| POST | `/assignments` | admin `{ employeeId, candidateId }` |
| DELETE | `/assignments/:id` | admin |

## Applications

| Method | Path | Roles |
|--------|------|-------|
| GET | `/applications` | role-scoped |
| GET | `/applications/:id` | role-scoped |
| POST | `/applications` | employee (assigned), admin |
| PATCH | `/applications/:id` | employee (assigned), admin |
| DELETE | `/applications/:id` | employee (assigned), admin |

### Scoping

- **Candidate:** forced `candidateId = self`; response uses `CandidateApplicationDTO`
- **Employee:** only applications for assigned candidates
- **Admin:** all

### CandidateApplicationDTO (never includes)

`commentsInternal`, `submittedBy`, employee names, assignment metadata

### Employee/Admin Application DTO

Full fields including `commentsInternal`, `submittedBy`

### Stats helpers

| Method | Path | Roles |
|--------|------|-------|
| GET | `/stats/candidate` | candidate |
| GET | `/stats/employee` | employee |
| GET | `/stats/admin` | admin |

## Audit

| Method | Path | Roles |
|--------|------|-------|
| GET | `/audit-logs` | admin |

## Health

| Method | Path | Roles |
|--------|------|-------|
| GET | `/health` | public |
