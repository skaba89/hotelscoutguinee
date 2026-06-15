#!/bin/bash
# ============================================================
# HotelScout Guinea — Render Build Script
# Exécuté à chaque déploiement sur Render (Node runtime)
# NOTE: Si un Dockerfile est présent, Render utilise le Dockerfile à la place
# ============================================================
set -e

echo "🔧 HotelScout Guinea — Build Render..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# 1. Installer les dépendances
echo "📦 Installing dependencies..."
npm install

# 2. Générer le client Prisma
echo "🔄 Generating Prisma client..."
npx prisma generate

# 3. Créer le répertoire data s'il n'existe pas
DATA_DIR="/opt/render/project/data"
mkdir -p "$DATA_DIR"

# 4. Pousser le schéma Prisma dans la base SQLite
echo "🗄️ Pushing Prisma schema to database..."
export DATABASE_URL="file:$DATA_DIR/hotelscout.db"
npx prisma db push --skip-generate 2>&1 || {
    echo "⚠️ Prisma db push failed, will retry on start..."
}

# 5. Seeder la base si elle est vide (using Node.js with tsx)
echo "🌱 Checking if database needs seeding..."
NEEDS_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.hotel.count().then(c => { console.log(c > 0 ? 'no' : 'yes'); db.\$disconnect(); }).catch(() => { console.log('yes'); db.\$disconnect(); });
" 2>/dev/null || echo "yes")

if [ "$NEEDS_SEED" = "yes" ]; then
    echo "🌱 Database is empty, running seed with tsx..."
    npx tsx prisma/seed.ts 2>&1 || {
        echo "⚠️ tsx seed failed, trying with npx ts-node..."
        npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts 2>&1 || {
            echo "⚠️ Seed failed. Will retry on start..."
        }
    }
else
    echo "✅ Database has data. Skipping seed."
fi

# 6. Build Next.js (with standalone output)
echo "🏗️ Building Next.js..."
npm run build

echo "✅ Build complete!"
