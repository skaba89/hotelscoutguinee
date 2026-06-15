# ============================================================
# HotelScout Guinea — Dockerfile multi-stage
# Production-ready Next.js standalone + SQLite + Prisma
# ============================================================

# ---------- Stage 1: Dependencies ----------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* bun.lock* ./

# Install all dependencies (including devDependencies for build)
# Use npm for reliability; fall back to bun if available
RUN if [ -f package-lock.json ]; then \
      npm ci --ignore-scripts; \
    elif [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile; \
    else \
      npm install --ignore-scripts; \
    fi

# ---------- Stage 2: Build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="file:./build-placeholder.db"

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# ---------- Stage 3: Production ----------
FROM node:22-alpine AS runner
WORKDIR /app

# Install sqlite3 for entrypoint DB checks + Prisma runtime
RUN apk add --no-cache sqlite

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema, CLI, engine and generated client for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy seed file for entrypoint seeding
COPY --from=builder --chown=nextjs:nodejs /app/prisma/seed.ts ./prisma/seed.ts

# Install tsx for running TypeScript seed at runtime
RUN npm install -g tsx

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create data directory for SQLite with proper ownership
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats || exit 1

# Volume for persistent SQLite database
VOLUME ["/app/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
