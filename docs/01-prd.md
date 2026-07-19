# 01 — Product Requirements Document (PRD)

## Product

**Name:** Team Elite Portal  
**Company:** Team Elite  
**Type:** Internal multi-tenant ops portal (single company, multiple roles)

## Problem

Team Elite applies to ~300 jobs per candidate per day using Google Sheets and shared workflows. Sharing the applications sheet with both employees and candidates causes:

- Candidates messaging employees inside the sheet
- Pressure to modify applications directly
- Attempts to bypass Team Elite
- Risk of bribery / side relationships
- Leakage of internal comments and employee identity

## Goal (MVP)

Replace Google Sheets with a secure portal that:

1. Separates candidates from employees completely
2. Enforces role- and assignment-based access on the backend
3. Lets employees track applications for assigned candidates only
4. Lets candidates view their sanitized application history (read-only)
5. Gives admins full control over users, assignments, and auditability

## Non-goals (MVP)

- AI resume generation / ATS optimization
- Job scraping, JD parsing, browser/LinkedIn automation
- Gmail integration
- File uploads (resume links are URLs only)
- In-app messaging / chat
- Interview tracker / prep portal
- Notifications, analytics, billing

## Users & scale

| Persona | MVP count | Design for (2–3×) |
|---------|-----------|-------------------|
| Admins | 2 | ~10 |
| Employees | 20–30 | ~100 |
| Candidates | ~500 | ~2000 |
| Traffic | Low / operational | Still lightweight SaaS |

## Success metrics

- Zero candidate visibility into employee identity or internal comments
- Employees cannot open unassigned candidates
- Application logging no longer depends on a shared spreadsheet
- Admin can fully manage users and assignments without engineering help
- Invite → set-password → login works for new candidates/employees

## Brand & UX

- Feel: premium, modern, minimal, trustworthy, enterprise-ready
- Inspiration: Linear, Stripe Dashboard, Notion, Vercel, [thesquirrelview.com](https://www.thesquirrelview.com/)
- Dark mode supported
- Beautiful data tables; avoid generic Bootstrap admin aesthetics

## Constraints

- Simple frameworks (small team, light traffic)
- Modular architecture so storage/compute can grow later
- ORM-backed schema so swapping Postgres hosting (or DB engine later) is feasible
- Production-ready MVP, not a demo prototype
