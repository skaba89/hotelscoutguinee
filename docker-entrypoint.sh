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
fi

# ── Run Prisma migrations ────────────────────────────────
echo "🔄 Running Prisma DB push (schema sync)..."
npx prisma db push --skip-generate 2>&1 || {
    echo "⚠️  Prisma db push failed. Attempting to continue..."
}

# ── Seed database if empty ───────────────────────────────
# Check if the database has any hotels (indicates it's been seeded)
DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
if [ -f "$DB_PATH" ]; then
    HOTEL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM Hotel;" 2>/dev/null || echo "0")
    if [ "$HOTEL_COUNT" = "0" ] || [ -z "$HOTEL_COUNT" ]; then
        echo "🌱 Database is empty, running seed..."
        npx prisma db seed 2>&1 || echo "⚠️  Seed failed or not configured. Continuing..."
    else
        echo "✅ Database has $HOTEL_COUNT hotels. Skipping seed."
    fi
else
    echo "🌱 No database file found, running seed after push..."
    npx prisma db seed 2>&1 || echo "⚠️  Seed failed or not configured. Continuing..."
fi

# ── Start the application ────────────────────────────────
echo "🎯 Starting HotelScout Guinea on port ${PORT:-3000}..."
exec "$@"
