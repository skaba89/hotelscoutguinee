#!/bin/sh
# ============================================================
# HotelScout Guinea — Docker Helper Scripts
# Usage: ./docker-helper.sh [command]
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_banner() {
    echo "${BLUE}"
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║     HotelScout Guinea — Docker       ║"
    echo "  ╚══════════════════════════════════════╝"
    echo "${NC}"
}

# ── Build ─────────────────────────────────────────────────
build() {
    echo "${YELLOW}🔨 Building Docker image...${NC}"
    docker compose build --no-cache app
    echo "${GREEN}✅ Build complete!${NC}"
}

# ── Start production ──────────────────────────────────────
up() {
    print_banner
    echo "${GREEN}🚀 Starting HotelScout Guinea (production)...${NC}"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo "${YELLOW}📝 Please edit .env with your configuration before deploying.${NC}"
    fi
    
    docker compose up -d
    echo ""
    echo "${GREEN}✅ Services started!${NC}"
    echo "${BLUE}   App:    http://localhost:80${NC}"
    echo "${BLUE}   Direct: http://localhost:3000${NC}"
    echo ""
    echo "Use '${0} logs' to view logs."
}

# ── Start development ─────────────────────────────────────
dev() {
    print_banner
    echo "${GREEN}🛠️  Starting HotelScout Guinea (development)...${NC}"
    
    if [ ! -f .env ]; then
        cp .env.example .env
    fi
    
    docker compose -f docker-compose.dev.yml up -d
    echo ""
    echo "${GREEN}✅ Dev services started!${NC}"
    echo "${BLUE}   App:           http://localhost:3000${NC}"
    echo "${BLUE}   Prisma Studio: http://localhost:5555${NC}"
}

# ── Stop ──────────────────────────────────────────────────
down() {
    echo "${YELLOW}🛑 Stopping services...${NC}"
    docker compose down
    echo "${GREEN}✅ Services stopped.${NC}"
}

# ── Logs ──────────────────────────────────────────────────
logs() {
    docker compose logs -f app
}

# ── Shell into container ──────────────────────────────────
shell() {
    echo "${BLUE}🐚 Opening shell in app container...${NC}"
    docker compose exec app sh
}

# ── Database backup ───────────────────────────────────────
backup() {
    BACKUP_NAME="hotelscout-backup-$(date +%Y%m%d-%H%M%S).db"
    echo "${YELLOW}💾 Backing up database...${NC}"
    docker compose exec app sh -c "cp /app/data/hotelscout.db /app/data/${BACKUP_NAME}"
    echo "${GREEN}✅ Backup created: ${BACKUP_NAME}${NC}"
}

# ── Database restore ──────────────────────────────────────
restore() {
    if [ -z "$1" ]; then
        echo "${RED}❌ Usage: $0 restore <backup-filename>${NC}"
        echo "Available backups:"
        docker compose exec app sh -c "ls -la /app/data/*.db" 2>/dev/null || echo "No backups found"
        exit 1
    fi
    echo "${YELLOW}📥 Restoring database from: $1${NC}"
    docker compose exec app sh -c "cp /app/data/$1 /app/data/hotelscout.db"
    docker compose restart app
    echo "${GREEN}✅ Database restored and app restarted.${NC}"
}

# ── Status ────────────────────────────────────────────────
status() {
    print_banner
    docker compose ps
    echo ""
    echo "${BLUE}📊 Disk usage:${NC}"
    docker system df 2>/dev/null || true
}

# ── Clean ─────────────────────────────────────────────────
clean() {
    echo "${YELLOW}🧹 Cleaning Docker resources...${NC}"
    docker compose down -v --rmi local 2>/dev/null || true
    docker system prune -f
    echo "${GREEN}✅ Clean complete.${NC}"
}

# ── Help ──────────────────────────────────────────────────
help() {
    print_banner
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  build     Build the Docker image"
    echo "  up        Start production (app + Caddy)"
    echo "  dev       Start development (hot-reload + Prisma Studio)"
    echo "  down      Stop all services"
    echo "  logs      Follow app logs"
    echo "  shell     Open a shell in the app container"
    echo "  backup    Create a database backup"
    echo "  restore   Restore database from backup"
    echo "  status    Show running services"
    echo "  clean     Remove all containers, volumes, and images"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 up              # Start production"
    echo "  $0 dev             # Start development"
    echo "  $0 backup          # Backup database"
    echo "  $0 restore backup  # Restore from backup"
}

# ── Main ──────────────────────────────────────────────────
case "${1:-help}" in
    build)   build ;;
    up)      up ;;
    dev)     dev ;;
    down)    down ;;
    logs)    logs ;;
    shell)   shell ;;
    backup)  backup ;;
    restore) restore "$2" ;;
    status)  status ;;
    clean)   clean ;;
    help)    help ;;
    *)       echo "${RED}Unknown command: $1${NC}"; help; exit 1 ;;
esac
