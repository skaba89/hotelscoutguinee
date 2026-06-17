#!/bin/bash
# ============================================================
# HotelScout Guinea — Render Start Script
# Exécuté au démarrage de chaque instance Render (Node runtime)
# ============================================================

echo "🚀 HotelScout Guinea — Starting..."

# Résoudre le chemin de la base de données.
# Render fournit un disque persistant à /opt/render/project/data UNIQUEMENT si configuré.
# Sur le free tier ou sans disque, ce chemin peut ne pas être accessible depuis le
# standalone server. On teste l'accessibilité en écriture, sinon on retombe sur ./data/.
DATA_DIR=""
for candidate in "/opt/render/project/data" "$PWD/data" "/app/data"; do
  if mkdir -p "$candidate" 2>/dev/null && [ -w "$candidate" ]; then
    DATA_DIR="$candidate"
    break
  fi
done
DATA_DIR="${DATA_DIR:-$PWD/data}"
mkdir -p "$DATA_DIR"

# Forcer DATABASE_URL au format SQLite "file:" attendu par Prisma.
# Sur Render, DATABASE_URL peut être défini par erreur à une URL Postgres ou un chemin sans protocole,
# ce qui provoque "Error validating datasource db: the URL must start with the protocol file:".
# On ignore toute valeur non conforme et on utilise le chemin local persistant.
if [ -z "$DATABASE_URL" ] || [ "${DATABASE_URL#file:}" = "$DATABASE_URL" ]; then
  export DATABASE_URL="file:$DATA_DIR/hotelscout.db"
  echo "📦 DATABASE_URL (forced) set to: $DATABASE_URL"
else
  echo "📦 DATABASE_URL already valid: $DATABASE_URL"
fi

# Toucher le fichier DB pour s'assurer qu'il existe et est accessible en écriture
touch "$DATA_DIR/hotelscout.db" 2>/dev/null && echo "✅ DB file writable at $DATA_DIR/hotelscout.db" || echo "⚠️ Cannot write to $DATA_DIR/hotelscout.db"

# S'assurer que le schéma est à jour
echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate 2>&1 || {
  echo "⚠️ Schema sync failed, retrying..."
  sleep 2
  npx prisma db push --skip-generate 2>&1 || echo "⚠️ Schema sync warning (non-fatal)"
}

# Vérifier si la base a besoin de seeding
echo "🌱 Checking if database needs seeding..."
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

# Vérifier que la DB est accessible
echo "🔍 Verifying database connection..."
DB_CHECK=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.hotel.count().then(c => { console.log('ok:' + c); db.\$disconnect(); }).catch(e => { console.log('error:' + e.message); db.\$disconnect(); });
" 2>/dev/null || echo "error:unknown")

echo "📊 Database check: $DB_CHECK"

# Démarrer le serveur Next.js standalone
echo "🎯 Starting server on port ${PORT:-10000}..."

if [ -f ".next/standalone/server.js" ]; then
  echo "Using standalone server..."
  # Copy Prisma engine files to standalone dir if needed
  cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null || true
  cp -r node_modules/@prisma .next/standalone/node_modules/@prisma 2>/dev/null || true
  # Also copy prisma schema for runtime
  mkdir -p .next/standalone/prisma 2>/dev/null || true
  cp -r prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
  cp -r prisma/migrations .next/standalone/prisma/ 2>/dev/null || true

  # Copy .z-ai-config to standalone dir so ZAI SDK can find it
  if [ -f ".z-ai-config" ]; then
    cp .z-ai-config .next/standalone/.z-ai-config
    echo "📋 Copied .z-ai-config to standalone dir"
  fi

  # Set DATABASE_URL for the standalone server
  export DATABASE_URL="${DATABASE_URL}"

  node .next/standalone/server.js
else
  echo "Standalone not found, using next start..."
  npx next start -p ${PORT:-10000}
fi
