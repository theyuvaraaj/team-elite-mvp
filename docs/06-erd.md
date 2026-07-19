# 06 — Entity Relationship Diagram

```text
┌──────────────┐       ┌──────────────┐
│    users     │       │   sessions   │
│──────────────│       │──────────────│
│ id           │◄──────│ user_id      │
│ name         │       │ token_hash   │
│ email        │       │ expires_at   │
│ password_hash│       └──────────────┘
│ role         │
│ is_active    │       ┌──────────────────┐
└──────┬───────┘       │ password_tokens  │
       │               │──────────────────│
       │               │ user_id ─────────► users
       │               │ purpose, expires │
       │               └──────────────────┘
       │
       │ 1:1                 1:1
       ├──────────────┐   ┌──┴──────────────┐
       ▼              ▼   ▼                 │
┌──────────────┐  ┌──────────────┐          │
│  candidates  │  │  employees   │          │
│──────────────│  │──────────────│          │
│ user_id      │  │ user_id      │          │
│ email?       │  │ name         │          │
│ phone?       │  │ employee_code│          │
│ gender?      │  └──────┬───────┘          │
│ address?     │         │                  │
│ primary_role │         │                  │
│ experience   │         │                  │
└──────┬───────┘         │                  │
       │                 │                  │
       │    ┌────────────┴────────────┐     │
       │    │      assignments        │     │
       │    │─────────────────────────│     │
       ├───►│ candidate_id            │     │
       │    │ employee_id             │◄────┘
       │    │ assigned_by ────────────┼──► users
       │    └─────────────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│   applications   │
│──────────────────│
│ candidate_id     │
│ company_name     │
│ job_link         │
│ resume_link      │
│ probability      │
│ updates          │
│ comments_internal│  ◄── employee/admin only
│ submitted_by ────┼──► users
│ applied_date     │
└──────────────────┘

┌──────────────────┐
│   audit_logs     │
│──────────────────│
│ user_id ─────────┼──► users
│ action           │
│ entity           │
│ entity_id        │
│ metadata         │
└──────────────────┘
```

## Cardinality summary

| Relation | Cardinality |
|----------|-------------|
| user ↔ candidate | 1:0..1 |
| user ↔ employee | 1:0..1 |
| employee ↔ candidate (via assignment) | M:N |
| candidate ↔ application | 1:N |
| user ↔ session | 1:N |
| user ↔ audit_log | 1:N |
