#!/bin/bash

# Telegram UI Test Runner (Docker Container Version)
# This script runs the Telegram UI emulation test inside the Docker container with Node.js v18

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}===============================================${NC}"
echo -e "${CYAN}${BOLD}    TELEGRAM UI EMULATION TEST RUNNER${NC}"
echo -e "${CYAN}${BOLD}        (Docker Container Version)${NC}"
echo -e "${CYAN}${BOLD}===============================================${NC}"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not available${NC}"
    exit 1
fi

# Check if the node container is running
if ! docker ps | grep -q "node"; then
    echo -e "${RED}❌ Docker container 'node' is not running${NC}"
    exit 1
fi

# Check if the test script exists
TEST_SCRIPT="/root/grademe-ai-tools/test/telegram_ui_test.js"
if [ ! -f "$TEST_SCRIPT" ]; then
    echo -e "${RED}❌ Test script not found: $TEST_SCRIPT${NC}"
    exit 1
fi

# Check if the bot is running
echo -e "${BLUE}ℹ️  Checking Telegram bot status...${NC}"
BOT_STATUS=$(docker exec node pm2 status telegram-bot 2>/dev/null | grep "online" || echo "")
if [ -z "$BOT_STATUS" ]; then
    echo -e "${YELLOW}⚠️  Warning: Telegram bot may not be running${NC}"
    docker exec node pm2 list || true
    echo ""
else
    echo -e "${GREEN}✅ Telegram bot is online${NC}"
fi

# Copy test files to container
echo -e "${BLUE}ℹ️  Copying test files to Docker container...${NC}"
docker cp /root/grademe-ai-tools/test/telegram_container_test.js node:/tmp/telegram_container_test.js

# Run the test inside the container
echo -e "${BLUE}ℹ️  Starting Telegram UI emulation test...${NC}"
echo -e "${BLUE}ℹ️  Test user: akirkor (830403309)${NC}"
echo -e "${BLUE}ℹ️  Test message: 'Hello. What is this AI model ?'${NC}"
echo -e "${BLUE}ℹ️  Running inside Docker container with Node.js v18...${NC}"
echo ""

# Execute the test in container and capture exit code
if docker exec node node /tmp/telegram_container_test.js; then
    echo ""
    echo -e "${GREEN}${BOLD}🎉 TEST PASSED! The Telegram bot is responding correctly.${NC}"

    # Cleanup
    docker exec node rm -f /tmp/telegram_container_test.js

    exit 0
else
    EXIT_CODE=$?
    echo ""
    echo -e "${RED}${BOLD}💥 TEST FAILED! The Telegram bot has issues.${NC}"
    echo -e "${YELLOW}ℹ️  Check the logs above for detailed error information.${NC}"

    # Cleanup even on failure
    docker exec node rm -f /tmp/telegram_container_test.js 2>/dev/null || true

    exit $EXIT_CODE
fi