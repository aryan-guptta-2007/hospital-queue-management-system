#!/bin/bash
# ─────────────────────────────────────────────────────
#  start.sh — Start the full hospital queue system
#  Usage: chmod +x start.sh && ./start.sh
# ─────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[0;33m'; NC='\033[0m'

echo -e "${BLUE}🏥 Hospital Queue System — Starting up...${NC}\n"

# Ports come from the real config, so these messages cannot drift
BACKEND_PORT=$(grep -E '^PORT=' backend/.env 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '\r\n ')
BACKEND_PORT=${BACKEND_PORT:-5001}
FRONTEND_PORT=$(grep -E '^\s*port:' frontend/vite.config.js 2>/dev/null | head -1 | grep -oE '[0-9]+')
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Check MongoDB
if ! mongosh --eval "db.runCommand({ping:1})" --quiet > /dev/null 2>&1; then
  echo -e "${RED}❌ MongoDB is not running. Start it with: mongod${NC}"
  exit 1
fi
echo -e "${GREEN}✅ MongoDB is running${NC}"

# Install dependencies if needed
[ ! -d "backend/node_modules"  ] && echo "📦 Installing backend deps..."  && (cd backend  && npm install --silent)
[ ! -d "frontend/node_modules" ] && echo "📦 Installing frontend deps..." && (cd frontend && npm install --silent)

# No seeding here — it is a one-off, and re-running it on every start is how
# demo data and stale departments creep into a real database.
echo -e "\n${YELLOW}ℹ️  First run? Seed it once:${NC}"
echo -e "   cd backend && npm run seed          # departments + first admin"
echo -e "   cd backend && npm run seed:demo     # optional sample queue"

# Start backend
echo -e "\n${BLUE}🚀 Starting backend on :${BACKEND_PORT}...${NC}"
(cd backend && npm run dev) &

sleep 3

# Start frontend
echo -e "\n${BLUE}⚛️  Starting frontend on :${FRONTEND_PORT}...${NC}"
(cd frontend && npm run dev) &

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ System is running!${NC}"
echo -e ""
echo -e "  Patient portal : ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  Display board  : ${BLUE}http://localhost:${FRONTEND_PORT}/display${NC}"
echo -e "  Admin login    : ${BLUE}http://localhost:${FRONTEND_PORT}/admin/login${NC}"
echo -e "  API            : ${BLUE}http://localhost:${BACKEND_PORT}/api/health${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

wait
