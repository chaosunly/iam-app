# syntax=docker/dockerfile:1

# ── Stage 1: install production dependencies ──────────────────────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Install all deps (prisma generate runs via postinstall)
RUN npm ci

# ── Stage 2: build the Next.js application ────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client & build (output: standalone)
# Placeholder values satisfy module-level env guards during build-time page data collection.
# Real values must be supplied at runtime via environment variables or secrets.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV ORY_KRATOS_ADMIN_URL="http://placeholder:4434"
ENV ORY_SDK_URL="http://placeholder:4433"
ENV ORY_KETO_READ_URL="http://placeholder:4466"
ENV ORY_KETO_WRITE_URL="http://placeholder:4467"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 3: minimal production image ─────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma: copy generated client, CLI, engines, and migration files
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/prisma ./prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Run database migrations then start the server
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node server.js"]
