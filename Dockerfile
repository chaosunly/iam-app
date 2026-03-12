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

# Server-side placeholders: satisfy module-level env guards at build time.
# Real values must be supplied at runtime via environment variables or secrets.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV ORY_KRATOS_ADMIN_URL="http://placeholder:4434"
ENV ORY_SDK_URL="http://placeholder:4433"
ENV ORY_KETO_READ_URL="http://placeholder:4466"
ENV ORY_KETO_WRITE_URL="http://placeholder:4467"
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time.
# Pass them via --build-arg when running `docker build`.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ORY_SDK_URL
ARG NEXT_PUBLIC_OAUTH2_CLIENT_ID
ARG NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ORY_SDK_URL=$NEXT_PUBLIC_ORY_SDK_URL
ENV NEXT_PUBLIC_OAUTH2_CLIENT_ID=$NEXT_PUBLIC_OAUTH2_CLIENT_ID
ENV NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID=$NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID

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

# Copy full node_modules so the Prisma CLI and all its internal dependencies
# (engines, debug, etc.) are available for `prisma migrate deploy` at startup
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Run database migrations then start the server
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node server.js"]
