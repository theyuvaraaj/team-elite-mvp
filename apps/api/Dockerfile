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

# Bake Tectonic's TeX packages into the image so the first PDF after a deploy
# is fast. The values below only satisfy config validation for this one build
# step; none of them reach the running container. If Tectonic is missing the
# step is skipped and PDFs use the pdfkit fallback.
RUN cd apps/api && DATABASE_URL=postgresql://build SESSION_SECRET=build \
    WEB_ORIGIN=http://localhost API_ORIGIN=http://localhost EMAIL_FROM=build@example.com \
    INVITE_TOKEN_TTL_HOURS=1 SESSION_TTL_DAYS=1 \
    SEED_ADMIN_EMAIL=build@example.com SEED_ADMIN_PASSWORD=build-only-value \
    RESUME_LATEX_TIMEOUT_MS=300000 \
    pnpm exec tsx scripts/warm-latex.ts \
  || echo "LaTeX warm-up skipped; resume PDFs will use the pdfkit fallback"

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["pnpm", "--filter", "@team-elite/api", "start:prod"]
