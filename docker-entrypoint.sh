#!/bin/sh
# ============================================================
# HotelScout Guinea — Docker Entrypoint
# Handles database initialization and migrations on container boot
# ============================================================

set -e

echo "🚀 HotelScout Guinea — Starting container..."

# ── Ensure data directory exists ──────────────────────────
DATA_DIR="/app/data"
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# ── Database path resolution ─────────────────────────────
# If DATABASE_URL is not set, default to the persistent volume
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:$DATA_DIR/hotelscout.db"
    echo "📦 DATABASE_URL not set, defaulting to: $DATABASE_URL"
else
    echo "📦 DATABASE_URL already set: $DATABASE_URL"
fi

# ── Run Prisma migrations ────────────────────────────────
echo "🔄 Running Prisma DB push (schema sync)..."
npx prisma db push --skip-generate 2>&1 || {
    echo "⚠️  Prisma db push failed. Attempting to continue..."
}

# ── Seed database if empty ───────────────────────────────
# Use Node.js + Prisma Client for a reliable check
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.hotel.count().then(c => { console.log(c > 0 ? 'no' : 'yes'); db.\$disconnect(); }).catch(() => { console.log('yes'); db.\$disconnect(); });
" 2>/dev/null || echo "yes")

if [ "$NEEDS_SEED" = "yes" ]; then
    echo "🌱 Database is empty, running seed with tsx..."
    npx tsx prisma/seed.ts 2>&1 || {
        echo "⚠️  tsx seed failed. The app will start with empty data."
    }
else
    echo "✅ Database has data. Skipping seed."
fi

# ── Start the application ────────────────────────────────
echo "🎯 Starting HotelScout Guinea on port ${PORT:-3000}..."
exec "$@"
