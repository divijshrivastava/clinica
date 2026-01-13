#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}          MyMedic - Development Server                     ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if ports are already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}⚠ Port 3000 (backend) is already in use${NC}"
    echo -e "${YELLOW}Would you like to kill existing processes? (y/n)${NC}"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./restart.sh
        exit 0
    else
        echo -e "${RED}Exiting...${NC}"
        exit 1
    fi
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}⚠ Port 5173 (frontend) is already in use${NC}"
    echo -e "${YELLOW}Would you like to kill existing processes? (y/n)${NC}"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./restart.sh
        exit 0
    else
        echo -e "${RED}Exiting...${NC}"
        exit 1
    fi
fi

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
echo -e "   ./stop.sh"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Save PIDs for later reference
mkdir -p .pids
echo $BACKEND_PID > .pids/backend.pid
echo $FRONTEND_PID > .pids/frontend.pid
