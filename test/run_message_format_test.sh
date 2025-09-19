#!/bin/bash

# Message Format Test Runner
# Tests the /m command with format buttons functionality

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Display header
echo -e "${CYAN}${BOLD}===============================================${NC}"
echo -e "${CYAN}${BOLD}    MESSAGE FORMAT TEST RUNNER${NC}"
echo -e "${CYAN}${BOLD}   Testing /m Command with Format Buttons${NC}"
echo -e "${CYAN}${BOLD}===============================================${NC}"
echo

# Check if we're running in Docker container
if [ -f /.dockerenv ] || [ -f /var/www/html/grademe_api/ai/bot/telegram/index.js ]; then
    echo -e "${GREEN}✅ Running in Docker container environment${NC}"
    NODE_PATH="node"
    TEST_SCRIPT="/root/grademe-ai-tools/test/message_format_test.js"
else
    echo -e "${YELLOW}⚠️  Running outside Docker container${NC}"
    echo -e "${BLUE}ℹ️  Executing test inside Docker container...${NC}"

    # Run test inside container
    docker exec node bash -c "
        if [ ! -f /root/grademe-ai-tools/test/message_format_test.js ]; then
            echo 'Test file not found in container'
            exit 1
        fi
        chmod +x /root/grademe-ai-tools/test/message_format_test.js
        node /root/grademe-ai-tools/test/message_format_test.js
    "
    exit $?
fi

# Make test file executable
chmod +x $TEST_SCRIPT

# Check if bot is running
echo -e "${BLUE}ℹ️  Checking Telegram bot status...${NC}"
BOT_STATUS=$(pm2 list 2>/dev/null | grep telegram-bot | grep -c online)

if [ "$BOT_STATUS" -eq 0 ]; then
    echo -e "${RED}❌ Telegram bot is not running${NC}"
    echo -e "${YELLOW}⚠️  Starting Telegram bot...${NC}"

    cd /var/www/html/grademe_api/ai/bot/telegram
    pm2 start index.js --name telegram-bot
    sleep 3

    BOT_STATUS=$(pm2 list 2>/dev/null | grep telegram-bot | grep -c online)
    if [ "$BOT_STATUS" -eq 0 ]; then
        echo -e "${RED}❌ Failed to start Telegram bot${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Telegram bot is online${NC}"

# Clear recent logs for cleaner test output
echo -e "${BLUE}ℹ️  Clearing recent log entries...${NC}"
LOG_FILE="/var/www/html/grademe_api/ai/bot/telegram/log/info.log"
if [ -f "$LOG_FILE" ]; then
    # Keep only last 100 lines for context
    tail -100 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi

# Run the test
echo -e "${YELLOW}${BOLD}⚠️  IMPORTANT: This test will:${NC}"
echo -e "${YELLOW}  1. Send a /m command with a test message${NC}"
echo -e "${YELLOW}  2. Simulate clicking format buttons${NC}"
echo -e "${YELLOW}  3. Verify correct email draft caching and retrieval${NC}"
echo -e "${YELLOW}  4. Validate reformatting with proper context${NC}"
echo

echo -e "${BLUE}ℹ️  Starting test execution...${NC}"
echo

# Execute the test
$NODE_PATH $TEST_SCRIPT

# Capture exit code
EXIT_CODE=$?

# Display completion message
echo
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}${BOLD}===============================================${NC}"
    echo -e "${GREEN}${BOLD}    TEST COMPLETED SUCCESSFULLY${NC}"
    echo -e "${GREEN}${BOLD}    All format buttons working correctly${NC}"
    echo -e "${GREEN}${BOLD}===============================================${NC}"
else
    echo -e "${RED}${BOLD}===============================================${NC}"
    echo -e "${RED}${BOLD}    TEST FAILED${NC}"
    echo -e "${RED}${BOLD}    Check logs for details${NC}"
    echo -e "${RED}${BOLD}===============================================${NC}"
    echo
    echo -e "${YELLOW}Debug hint: Check /var/www/html/grademe_api/ai/bot/telegram/log/info.log${NC}"
fi

exit $EXIT_CODE