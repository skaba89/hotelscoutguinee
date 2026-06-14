#!/usr/bin/env bash
set -euo pipefail

echo "=== HotelScout Guinea — Render + Neon Build ==="

# 1. Switch to PostgreSQL schema for production (Neon)
echo "🔄 Switching to PostgreSQL schema..."
cp prisma/schema.pg.prisma prisma/schema.prisma

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Generate Prisma client with PostgreSQL schema
echo "🔧 Generating Prisma client..."
npx prisma generate

# 4. Run database migrations against Neon (uses DIRECT_URL)
echo "🗄️ Running database migrations against Neon..."
npx prisma migrate deploy

# 5. Build Next.js
echo "🏗️ Building Next.js..."
npx next build

# 6. Copy static files to standalone output
echo "📋 Copying static files..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/ 2>/dev/null || true

# 7. Copy Prisma schema and migrations to standalone (needed at runtime)
cp -r prisma .next/standalone/prisma

echo "✅ Build complete!"
