# Team Elite Portal — Architecture Docs

Production MVP architecture for **Team Elite Portal**. Implementation begins only after this package is reviewed and approved.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Stack | Vite + React + Fastify + Prisma + PostgreSQL |
| Auth | Server-side sessions (httpOnly cookies) — not JWT |
| Authorization | Role checks + assignment scoping (required for product) |
| Email | Resend (invite / set-password) |
| Deploy | Vercel (web) + Railway (API + Postgres) |
| Scope | Access control & collaboration only (no AI/automation in MVP) |

## Document index

1. [Product Requirements Document (PRD)](./01-prd.md)
2. [Functional Requirements](./02-functional-requirements.md)
3. [Non-Functional Requirements](./03-non-functional-requirements.md)
4. [User Flows](./04-user-flows.md)
5. [Database Schema](./05-database-schema.md)
6. [Entity Relationship Diagram](./06-erd.md)
7. [API Design](./07-api-design.md)
8. [Folder Structure](./08-folder-structure.md)
9. [Component Architecture](./09-component-architecture.md)
10. [Backend Architecture](./10-backend-architecture.md)
11. [Authentication Flow](./11-authentication-flow.md)
12. [Authorization Strategy](./12-authorization-strategy.md)
13. [Wireframes](./13-wireframes.md)
14. [Future Extensibility Plan](./14-future-extensibility.md)
15. [Development Roadmap](./15-development-roadmap.md)

Consolidated design copy: [superpowers/specs/2026-07-19-team-elite-portal-design.md](./superpowers/specs/2026-07-19-team-elite-portal-design.md)

Implementation plan: [superpowers/plans/2026-07-19-team-elite-portal-mvp.md](./superpowers/plans/2026-07-19-team-elite-portal-mvp.md)

## Status

Architecture **approved** (2026-07-19). Implementation plan written — awaiting execution mode choice.
