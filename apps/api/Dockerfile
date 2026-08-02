FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Tectonic compiles the LaTeX resume PDFs. If the package is unavailable the
# app still runs — the download route falls back to the pdfkit renderer.
RUN apk add --no-cache tectonic fontconfig \
  || echo "tectonic unavailable; resume PDFs will use the pdfkit fallback"

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
