#!/bin/bash

# Database Structure Recap Script Runner
# Quick wrapper to execute the database recap from host system

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}===============================================${NC}"
echo -e "${CYAN}${BOLD}         DATABASE STRUCTURE RECAP${NC}"
echo -e "${CYAN}${BOLD}       Quick Database Overview Tool${NC}"
echo -e "${CYAN}${BOLD}===============================================${NC}"
echo ""

# Check if MongoDB container is running
if ! docker ps | grep -q mongo; then
    echo -e "${RED}❌ MongoDB container not running${NC}"
    exit 1
fi

echo -e "${BLUE}ℹ️  Analyzing database structure...${NC}"
echo -e "${BLUE}ℹ️  Running from host system with Docker access...${NC}"
echo ""

# Run the script directly from host (has docker access)
node /root/grademe-ai-tools/test/database_structure_recap.js

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ Database recap completed successfully${NC}"
else
    echo -e "${RED}${BOLD}❌ Database recap failed${NC}"
fi

exit $exit_code