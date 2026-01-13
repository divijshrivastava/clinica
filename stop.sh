#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}          MyMedic - Stop Backend & Frontend                ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Kill backend (port 3000)
echo -e "${YELLOW}🔪 Stopping backend on port 3000...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo -e "${YELLOW}⚠ No backend process found on port 3000${NC}"
fi

# Kill frontend (port 5173)
echo -e "${YELLOW}🔪 Stopping frontend on port 5173...${NC}"
lsof -ti:5173 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo -e "${YELLOW}⚠ No frontend process found on port 5173${NC}"
fi

# Kill any remaining processes
echo -e "${YELLOW}🔪 Cleaning up any remaining processes...${NC}"
pkill -f "nodemon.*ts-node" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Clean up PID files
rm -rf .pids 2>/dev/null

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
