#!/bin/bash
# ─────────────────────────────────────────────────────
#  start.sh — Start the full hospital queue system
#  Usage: chmod +x start.sh && ./start.sh
# ─────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}🏥 Hospital Queue System — Starting up...${NC}\n"

# Check MongoDB
if ! mongosh --eval "db.runCommand({ping:1})" --quiet > /dev/null 2>&1; then
  echo -e "${RED}❌ MongoDB is not running. Start it with: mongod${NC}"
  exit 1
fi
echo -e "${GREEN}✅ MongoDB is running${NC}"

# Install dependencies if needed
[ ! -d "backend/node_modules"  ] && echo "📦 Installing backend deps..."  && (cd backend  && npm install --silent)
[ ! -d "frontend/node_modules" ] && echo "📦 Installing frontend deps..." && (cd frontend && npm install --silent)

# Seed database (safe to re-run)
echo -e "\n${BLUE}🌱 Seeding database...${NC}"
(cd backend && npm run seed)

# Start backend
echo -e "\n${BLUE}🚀 Starting backend on :5001...${NC}"
(cd backend && npm run dev) &

sleep 3

# Start frontend
echo -e "\n${BLUE}⚛️  Starting frontend on :3000...${NC}"
(cd frontend && npm run dev) &

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ System is running!${NC}"
echo -e ""
echo -e "  Patient portal : ${BLUE}http://localhost:3000${NC}"
echo -e "  Admin login    : ${BLUE}http://localhost:3000/admin/login${NC}"
echo -e "  Admin login    : admin@hospital.com / admin123"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

wait
