#!/bin/bash
# ============================================================
# HotelScout Guinea — Dev Environment Switcher
# Switches Prisma between SQLite (local) and PostgreSQL (Neon)
# ============================================================

set -e

SCHEMA_FILE="prisma/schema.prisma"
BACKUP_FILE="prisma/schema.backup.prisma"

case "${1:-help}" in
  sqlite)
    echo "🔄 Switching to SQLite for local development..."
    
    # Backup current schema if it's PostgreSQL
    cp "$SCHEMA_FILE" "$BACKUP_FILE"
    
    # Replace provider
    sed -i 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA_FILE"
    
    # Regenerate client
    npx prisma generate
    npx prisma db push --skip-generate 2>/dev/null || true
    
    # Update .env
    if grep -q "^DATABASE_URL=file:" .env 2>/dev/null; then
      echo "✅ .env already has SQLite URL"
    else
      echo "📝 Updating .env for SQLite..."
      sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:./db/custom.db|' .env
    fi
    
    echo "✅ Switched to SQLite. Run 'bun run dev' to start."
    ;;

  postgres)
    echo "🔄 Switching to PostgreSQL (Neon)..."
    
    # Restore backup if exists
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$SCHEMA_FILE"
      rm "$BACKUP_FILE"
    else
      sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_FILE"
    fi
    
    # Regenerate client
    npx prisma generate
    
    echo "✅ Switched to PostgreSQL."
    echo "📝 Make sure DATABASE_URL in .env points to your Neon database."
    echo "   Run 'npx prisma db push' to sync the schema."
    ;;

  help|*)
    echo "Usage: ./switch-db.sh <command>"
    echo ""
    echo "Commands:"
    echo "  sqlite     Switch to SQLite for local development"
    echo "  postgres   Switch to PostgreSQL (for Neon/production)"
    echo "  help       Show this help"
    echo ""
    echo "Examples:"
    echo "  ./switch-db.sh sqlite     # Use SQLite locally"
    echo "  ./switch-db.sh postgres   # Use PostgreSQL for deploy"
    ;;
esac
