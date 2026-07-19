# 13 — Wireframes (ASCII)

## Login

```text
┌──────────────────────────────────────────┐
│              TEAM ELITE                  │
│                 Portal                   │
│                                          │
│   Email    [........................]    │
│   Password [........................]    │
│                                          │
│            [ Sign in ]                   │
└──────────────────────────────────────────┘
```

## Candidate dashboard

```text
┌────────────────────────────────────────────────────────────┐
│ Team Elite Portal                    ☾ Dark    Priya ▾    │
├────────────────────────────────────────────────────────────┤
│ Overview                                                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ Total    │ │ This Week│ │ Interviews│ │ Pending │      │
│ │   142    │ │    28    │ │    —     │ │   12    │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                            │
│ Applications                                               │
│ [Search company or updates…    ]  Prob ▾  Date ▾          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Company   │ Date   │ Prob │ Resume │ Job │ Updates   │ │
│ │ Acme Corp │ Jul 18 │ High │ Open   │ Open│ Applied   │ │
│ │ Globex    │ Jul 18 │ Med  │ Open   │ Open│ Screening │ │
│ └────────────────────────────────────────────────────────┘ │
│                             ‹ 1 2 3 ›                      │
└────────────────────────────────────────────────────────────┘
```

## Employee — My Candidates

```text
┌────────────────────────────────────────────────────────────┐
│ Team Elite Portal              Employee · Alex        ▾    │
├───────────────┬────────────────────────────────────────────┤
│ My Candidates │ Assigned 12 │ Today 47 │ Pending 9         │
│               │                                            │
│ • Priya S     │ Priya Sharma                               │
│ • Rahul M     │ Backend · 4y · +91…                        │
│ • …           │ [ + Add Application ]                      │
│               │                                            │
│               │ Company | Date | Prob | Resume | Comments  │
│               │ …table with edit/delete…                   │
└───────────────┴────────────────────────────────────────────┘
```

## Employee — Quick add

```text
┌──────── Add Application ─────────┐
│ Company*   [                  ]  │
│ Job link*  [                  ]  │
│ Resume URL [                  ]  │
│ Probability[ High ▾           ]  │
│ Updates    [ Applied          ]  │
│ Internal   [ recruiter seem…  ]  │  ← never visible to candidate
│ Date       [ 2026-07-19       ]  │
│          [Cancel]  [Save]        │
└──────────────────────────────────┘
```

## Admin — Overview

```text
┌────────────────────────────────────────────────────────────┐
│ Admin                                                      │
│ Candidates 58 │ Employees 24 │ Apps today 610 │ Assign 81  │
│                                                            │
│ [Users] [Assignments] [Applications] [Audit]               │
│                                                            │
│ Recent activity                                            │
│ · Alex added application for Priya — Acme                  │
│ · Admin assigned Alex → Rahul                              │
└────────────────────────────────────────────────────────────┘
```

## Admin — Assignment manager

```text
Candidate: [ Priya Sharma          ▾ ]
Assigned employees:
  [x] Alex (E-014)   [ Remove ]
  [x] Sam  (E-022)   [ Remove ]
Add employee: [ Search employees…     ] [ Assign ]
```
