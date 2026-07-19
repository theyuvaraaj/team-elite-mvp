# 02 — Functional Requirements

## FR-1 Authentication & account lifecycle

| ID | Requirement |
|----|-------------|
| FR-1.1 | Users log in with email + password |
| FR-1.2 | Sessions use httpOnly secure cookies (server-side sessions) |
| FR-1.3 | Users can log out (session destroyed) |
| FR-1.4 | Inactive users (`is_active=false`) cannot authenticate or keep sessions |
| FR-1.5 | Admin creates employees and candidates |
| FR-1.6 | New users receive a Resend invite email with a set-password link |
| FR-1.7 | Set-password consumes a one-time token and activates credentials |
| FR-1.8 | Admin can reset a user’s password (invalidate sessions + new invite/token) |
| FR-1.9 | No public self-registration |

## FR-2 Candidate

| ID | Requirement |
|----|-------------|
| FR-2.1 | Candidate sees own dashboard only |
| FR-2.2 | Cards: Total Applications, Applications This Week, Interview Calls (placeholder), Pending Responses |
| FR-2.3 | Application table fields: Date, Company Name, Job Link, Resume Link, Probability, Updates |
| FR-2.4 | Hidden forever: Submitted By, Internal Comments, Employee names, Assignment info |
| FR-2.5 | Search, filter, sort, pagination on applications |
| FR-2.6 | Read-only — no create/edit/delete, no messaging |

## FR-3 Employee

| ID | Requirement |
|----|-------------|
| FR-3.1 | Dashboard: My Candidates (assigned only) |
| FR-3.2 | Cards: Assigned Candidates, Applications Today, Pending Applications |
| FR-3.3 | Open candidate profile + application history for assigned candidates |
| FR-3.4 | Create / edit / delete applications for assigned candidates |
| FR-3.5 | Fields writable: company, job link, resume link, probability, updates, status-like updates text, internal comments |
| FR-3.6 | `submitted_by` set automatically to acting employee |
| FR-3.7 | Cannot see unassigned candidates or admin surfaces |

## FR-4 Admin

| ID | Requirement |
|----|-------------|
| FR-4.1 | Dashboard cards: Total Candidates, Total Employees, Applications Today, Active Assignments |
| FR-4.2 | Create / edit / disable employees |
| FR-4.3 | Create / edit / disable candidates (optional profile: email, gender, address; plus phone, primary role, experience) |
| FR-4.4 | Assign one or more employees to a candidate (many-to-many) |
| FR-4.5 | Remove assignments |
| FR-4.6 | View all applications |
| FR-4.7 | View audit logs |
| FR-4.8 | Reset passwords / resend invites |

## FR-5 Applications

| ID | Requirement |
|----|-------------|
| FR-5.1 | Applications belong to exactly one candidate |
| FR-5.2 | Required: company_name, job_link, applied_date (default today) |
| FR-5.3 | Optional: resume_link, probability, updates, comments_internal |
| FR-5.4 | Hard delete in MVP; action audited |
| FR-5.5 | Resume stored as URL only (no uploads) |

## FR-6 Audit

| ID | Requirement |
|----|-------------|
| FR-6.1 | Log login, logout, user create/disable, password reset, assignment changes, application create/update/delete |
| FR-6.2 | Audit entries are append-only for admins to view |

## FR-7 Platform

| ID | Requirement |
|----|-------------|
| FR-7.1 | Role-aware navigation (candidate / employee / admin) |
| FR-7.2 | Loading, empty, and error states on all primary views |
| FR-7.3 | Responsive layouts for desktop-first ops use (usable on tablet/mobile) |
