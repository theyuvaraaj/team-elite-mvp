# 05 — Database Schema

PostgreSQL via Prisma. All PKs are UUIDs (`gen_random_uuid()`).

## enums

```sql
enum user_role { ADMIN, EMPLOYEE, CANDIDATE }
```

## users

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | required |
| email | citext/text unique | login identifier |
| password_hash | text null | null until invite completed |
| role | user_role | |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes: unique(email), index(role), index(is_active)

## sessions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | cascade delete |
| token_hash | text unique | hash of session secret |
| expires_at | timestamptz | |
| created_at | timestamptz | |
| revoked_at | timestamptz null | |

Indexes: index(user_id), index(expires_at)

## password_tokens

Invite + admin reset (set-password).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → users | |
| token_hash | text unique | |
| purpose | text | `INVITE` \| `RESET` |
| expires_at | timestamptz | |
| used_at | timestamptz null | |
| created_at | timestamptz | |

## candidates

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid unique FK → users | |
| email | text null | optional profile/contact email |
| phone | text null | |
| gender | text null | optional |
| address | text null | optional free text |
| primary_role | text null | target job role |
| experience | text null | free text / years summary |
| created_at | timestamptz | |

## employees

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid unique FK → users | |
| name | text | display/work name (kept in sync with users.name on write) |
| employee_code | text unique | short code for ops |
| created_at | timestamptz | |

## assignments

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| employee_id | uuid FK → employees | |
| candidate_id | uuid FK → candidates | |
| assigned_by | uuid FK → users | admin who assigned |
| assigned_at | timestamptz | |

Constraints: unique(employee_id, candidate_id)  
Indexes: index(employee_id), index(candidate_id)

## applications

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| candidate_id | uuid FK → candidates | |
| company_name | text | |
| job_link | text | |
| resume_link | text null | URL |
| probability | text null | free text or simple enum later |
| updates | text null | candidate-visible status notes |
| comments_internal | text null | never shown to candidates |
| submitted_by | uuid null FK → users | employee user id |
| applied_date | date | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes: index(candidate_id, applied_date desc), index(submitted_by), index(company_name)

## audit_logs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid null FK → users | actor |
| action | text | e.g. APPLICATION_CREATED |
| entity | text | e.g. application |
| entity_id | text null | |
| metadata | jsonb | before/after summaries (no secrets) |
| created_at | timestamptz | |

Indexes: index(created_at desc), index(entity, entity_id), index(user_id)

## Notes

- Soft-disable users via `is_active`; do not hard-delete users in MVP (breaks audit integrity). Prefer disable.
- Application delete is hard delete + audit row.
- Candidate `email` is optional profile field; authentication email is always `users.email`.
