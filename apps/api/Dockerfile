FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @team-elite/api...

COPY apps/api ./apps/api

RUN pnpm --filter @team-elite/api exec prisma generate

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["pnpm", "--filter", "@team-elite/api", "start:prod"]
