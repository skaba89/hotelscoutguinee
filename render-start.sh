#!/bin/bash
# ============================================================
# HotelScout Guinea — Render Start Script
# Exécuté au démarrage de chaque instance Render (Node runtime)
# ============================================================

echo "🚀 HotelScout Guinea — Starting..."

# Résoudre le chemin de la base de données
DATA_DIR="/opt/render/project/data"
mkdir -p "$DATA_DIR"

# Si DATABASE_URL n'est pas défini, utiliser le chemin par défaut
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="file:$DATA_DIR/hotelscout.db"
    echo "📦 DATABASE_URL set to: $DATABASE_URL"
else
    echo "📦 DATABASE_URL already set: $DATABASE_URL"
fi

# S'assurer que le schéma est à jour
echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate 2>&1 || echo "⚠️ Schema sync warning (non-fatal)"

# Vérifier si la base a besoin de seeding
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.hotel.count().then(c => { console.log(c > 0 ? 'no' : 'yes'); db.\$disconnect(); }).catch(() => { console.log('yes'); db.\$disconnect(); });
" 2>/dev/null || echo "yes")

if [ "$NEEDS_SEED" = "yes" ]; then
    echo "🌱 Database is empty, seeding with tsx..."
    npx tsx prisma/seed.ts 2>&1 || {
        echo "⚠️ tsx seed failed, trying npx ts-node..."
        npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts 2>&1 || {
            echo "⚠️ Seed failed. The app will start with empty data."
        }
    }
else
    echo "✅ Database ready"
fi

# Démarrer le serveur Next.js standalone
echo "🎯 Starting server on port ${PORT:-10000}..."

if [ -f ".next/standalone/server.js" ]; then
    echo "Using standalone server..."
    # Copy Prisma engine files to standalone dir if needed
    cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null || true
    cp -r node_modules/@prisma .next/standalone/node_modules/@prisma 2>/dev/null || true

    # Set DATABASE_URL for the standalone server
    export DATABASE_URL="${DATABASE_URL}"

    node .next/standalone/server.js
else
    echo "Standalone not found, using next start..."
    npx next start -p ${PORT:-10000}
fi
