#!/bin/bash
# ============================================================
# HotelScout Guinea — Render Build Script
# Exécuté à chaque déploiement sur Render
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
    echo "⚠️ Prisma db push failed, will retry after build..."
}

# 5. Seeder la base si elle est vide
HOTEL_COUNT=$(sqlite3 "$DATA_DIR/hotelscout.db" "SELECT COUNT(*) FROM Hotel;" 2>/dev/null || echo "0")
if [ "$HOTEL_COUNT" = "0" ] || [ -z "$HOTEL_COUNT" ]; then
    echo "🌱 Database is empty, running seed..."
    npx prisma db seed 2>&1 || echo "⚠️ Seed failed. Continuing..."
else
    echo "✅ Database has $HOTEL_COUNT hotels. Skipping seed."
fi

# 6. Build Next.js
echo "🏗️ Building Next.js..."
npm run build

echo "✅ Build complete!"
