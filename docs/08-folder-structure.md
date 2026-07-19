# 08 — Folder Structure

```text
team-elite/
├── apps/
│   ├── api/                          # Fastify + Prisma (Railway)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── config.ts
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts
│   │   │   │   ├── password.ts
│   │   │   │   ├── session.ts
│   │   │   │   ├── mail.ts           # Resend
│   │   │   │   ├── errors.ts
│   │   │   │   └── audit.ts
│   │   │   ├── middleware/
│   │   │   │   ├── requireAuth.ts
│   │   │   │   └── requireRole.ts
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── candidates/
│   │   │       ├── employees/
│   │   │       ├── assignments/
│   │   │       ├── applications/
│   │   │       ├── stats/
│   │   │       └── audit/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                          # Vite React (Vercel)
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx
│       │   ├── app/
│       │   │   ├── router.tsx
│       │   │   └── providers.tsx
│       │   ├── components/
│       │   │   ├── ui/               # button, input, table, card, modal
│       │   │   └── layout/           # shell, sidebar, topbar
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   ├── candidate/
│       │   │   ├── employee/
│       │   │   └── admin/
│       │   ├── lib/
│       │   │   ├── api.ts
│       │   │   └── utils.ts
│       │   └── styles/
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   └── shared/                       # shared enums + zod schemas (optional)
│       └── src/
├── docs/                             # this package
├── docker-compose.yml                # local Postgres
├── package.json                      # pnpm workspaces
├── pnpm-workspace.yaml
└── README.md
```

Each backend module typically contains:

```text
routes.ts
schemas.ts      # Zod
service.ts
repository.ts
serializers.ts  # role-aware DTOs
```
