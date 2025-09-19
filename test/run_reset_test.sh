#!/bin/bash

# Reset Context Test Runner
# Tests /reset command conversation memory detachment functionality

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
echo -e "${CYAN}${BOLD}      RESET MEMORY BOUNDARY TEST${NC}"
echo -e "${CYAN}${BOLD}   (Conversation Memory Boundary Validation)${NC}"
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
TEST_SCRIPT="/root/grademe-ai-tools/test/reset_context_test.js"
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

# Warning about test behavior
echo -e "${YELLOW}⚠️  IMPORTANT: This test will modify user conversation context${NC}"
echo -e "${YELLOW}⚠️  The test will establish context, reset it, and verify memory boundary${NC}"
echo -e "${BLUE}ℹ️  Test duration: approximately 2-3 minutes${NC}"
echo -e "${BLUE}ℹ️  Test validates: establish context → reset → boundary → new memory${NC}"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with the reset context test? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Test cancelled by user${NC}"
    exit 0
fi

# Copy test files to container
echo -e "${BLUE}ℹ️  Copying test files to Docker container...${NC}"
docker cp "$TEST_SCRIPT" node:/tmp/reset_context_test.js

# Run the test inside the container
echo -e "${BLUE}ℹ️  Starting reset memory boundary test...${NC}"
echo -e "${BLUE}ℹ️  Test user: akirkor (830403309)${NC}"
echo -e "${BLUE}ℹ️  Testing: establish → reset → boundary → new memory${NC}"
echo -e "${BLUE}ℹ️  Running inside Docker container with Node.js v18...${NC}"
echo ""

# Record start time
START_TIME=$(date +%s)

# Execute the test in container and capture exit code
if docker exec node node /tmp/reset_context_test.js; then
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    echo -e "${GREEN}${BOLD}🎉 RESET MEMORY BOUNDARY TEST PASSED!${NC}"
    echo -e "${GREEN}${BOLD}The /reset command correctly creates a memory boundary.${NC}"
    echo -e "${GREEN}✅ Context established before reset${NC}"
    echo -e "${GREEN}✅ Reset command executed successfully${NC}"
    echo -e "${GREEN}✅ Memory boundary active (old context blocked)${NC}"
    echo -e "${GREEN}✅ New conversations are remembered after reset${NC}"
    echo -e "${BLUE}ℹ️  Test duration: ${MINUTES}m ${SECONDS}s${NC}"

    # Cleanup
    docker exec node rm -f /tmp/reset_context_test.js

    exit 0
else
    EXIT_CODE=$?
    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    echo -e "${RED}${BOLD}💥 RESET MEMORY BOUNDARY TEST FAILED!${NC}"
    echo -e "${RED}${BOLD}The /reset command memory boundary has issues.${NC}"
    echo -e "${YELLOW}ℹ️  Check the detailed results above for specific failure points.${NC}"
    echo -e "${YELLOW}Possible issues:${NC}"
    echo -e "${YELLOW}  - Reset command not executed properly${NC}"
    echo -e "${YELLOW}  - Memory boundary not working (old context leaks)${NC}"
    echo -e "${YELLOW}  - New memory not being collected after reset${NC}"
    echo -e "${YELLOW}  - Log monitoring failed${NC}"
    echo -e "${BLUE}ℹ️  Test duration: ${MINUTES}m ${SECONDS}s${NC}"

    # Cleanup even on failure
    docker exec node rm -f /tmp/reset_context_test.js 2>/dev/null || true

    exit $EXIT_CODE
fi