#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}          MyMedic - Restart Backend & Frontend             ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Kill backend (port 3000)
echo -e "${YELLOW}🔪 Killing backend on port 3000...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend killed${NC}"
else
    echo -e "${YELLOW}⚠ No backend process found on port 3000${NC}"
fi

# Kill frontend (port 5173)
echo -e "${YELLOW}🔪 Killing frontend on port 5173...${NC}"
lsof -ti:5173 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend killed${NC}"
else
    echo -e "${YELLOW}⚠ No frontend process found on port 5173${NC}"
fi

# Also kill any nodemon or vite processes
echo -e "${YELLOW}🔪 Cleaning up any remaining processes...${NC}"
pkill -f "nodemon.*ts-node" 2>/dev/null
pkill -f "vite" 2>/dev/null

sleep 2

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Starting services...${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Start backend
echo -e "${GREEN}🔧 Starting backend...${NC}"
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "   Log: logs/backend.log"
cd ..

# Wait a moment for backend to initialize
sleep 3

# Start frontend
echo -e "${GREEN}🎨 Starting frontend...${NC}"
cd frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "   Log: logs/frontend.log"
cd ..

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Services started successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📡 Endpoints:${NC}"
echo -e "   Backend:  ${BLUE}http://localhost:3000${NC}"
echo -e "   Frontend: ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "   Backend:  tail -f logs/backend.log"
echo -e "   Frontend: tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop services:${NC}"
echo -e "   ./stop.sh  (or kill -9 $BACKEND_PID $FRONTEND_PID)"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Save PIDs for later reference
mkdir -p .pids
echo $BACKEND_PID > .pids/backend.pid
echo $FRONTEND_PID > .pids/frontend.pid
