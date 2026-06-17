#!/bin/sh
# ============================================================
# HotelScout Guinea — Docker Entrypoint
# Handles data directory setup on container boot.
#
# Note: Schema creation and admin user seeding are handled at runtime
# by src/lib/db.ts (ensureSchema + ensureAdminUser), which is more
# reliable than running prisma CLI / tsx in the production image
# (where those binaries may not be available).
# ============================================================

set -e

echo "🚀 HotelScout Guinea — Starting container..."

# ── Ensure data directory exists (for SQLite fallback) ──
DATA_DIR="/app/data"
if [ ! -d "$DATA_DIR" ]; then
    echo "📁 Creating data directory: $DATA_DIR"
    mkdir -p "$DATA_DIR"
fi

# ── Database URL handling ─────────────────────────────────
# If DATABASE_URL is set to a non-SQLite value (e.g. Postgres URL from Render
# env), src/lib/db.ts will detect this at runtime and fall back to a writable
# local SQLite path. We just log what we see for diagnostic purposes.
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:$DATA_DIR/hotelscout.db"
    echo "📦 DATABASE_URL not set, defaulting to: $DATABASE_URL"
elif [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL is not a SQLite URL (got: ${DATABASE_URL#*://*}...)."
    echo "⚠️  The runtime will fall back to a local SQLite file at $DATA_DIR/hotelscout.db."
    echo "⚠️  Note: On Render free tier without a persistent disk, data will be lost on redeploy."
    echo "⚠️  To use the configured database, update prisma/schema.prisma provider to match."
else
    echo "📦 DATABASE_URL already valid: $DATABASE_URL"
fi

# ── Start the application ────────────────────────────────
# Schema creation + admin user seeding are handled by src/lib/db.ts
# at module load time (ensureSchema + ensureAdminUser). No need to
# run prisma CLI or tsx here.
echo "🎯 Starting HotelScout Guinea on port ${PORT:-3000}..."
echo "ℹ️  Schema and admin user will be initialized automatically on first request."
exec "$@"
