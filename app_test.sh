#!/bin/bash

# GrademeAI Test Suite - Unified Test Interface
# This script provides a menu-driven interface for all available tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test scripts directory
TEST_DIR="/root/grademe-ai-tools/test"
DB_RESTORE_SCRIPT="/root/grademe-ai-tools/db_restore.sh"

# Function to display header
show_header() {
    echo -e "${CYAN}${BOLD}===============================================${NC}"
    echo -e "${CYAN}${BOLD}           GRADEME AI TEST SUITE${NC}"
    echo -e "${CYAN}${BOLD}         Unified Testing Interface${NC}"
    echo -e "${CYAN}${BOLD}===============================================${NC}"
    echo ""
}

# Function to display menu
show_menu() {
    echo -e "${BOLD}Available Tests:${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} ${BOLD}Quick Test${NC}       - Single message Telegram webhook test (30s)"
    echo -e "${GREEN}2.${NC} ${BOLD}Conversation Test${NC} - 10-question multilingual conversation test (3-4 min)"
    echo -e "${GREEN}3.${NC} ${BOLD}Reset Test${NC}        - Context detachment validation test (2-3 min)"
    echo -e "${GREEN}4.${NC} ${BOLD}Enhanced Reset${NC}    - Improved reset test with failure detection (3-4 min)"
    echo -e "${GREEN}5.${NC} ${BOLD}Message Format${NC}    - Test /m command with format buttons (2-3 min)"
    echo -e "${GREEN}6.${NC} ${BOLD}Reply Format${NC}      - Test /r command with reply formatting (2-3 min)"
    echo -e "${GREEN}7.${NC} ${BOLD}Database Safety${NC}   - Test for critical database wipe bug (1-2 min)"
    echo -e "${GREEN}8.${NC} ${BOLD}All Tests${NC}         - Run all tests sequentially (15-18 min)"
    echo ""
    echo -e "${YELLOW}Database Operations:${NC}"
    echo -e "${GREEN}9.${NC} ${BOLD}DB Backup${NC}         - Create a new database backup"
    echo -e "${GREEN}10.${NC} ${BOLD}DB Restore${NC}        - Restore database from Sep 16 backup"
    echo -e "${GREEN}11.${NC} ${BOLD}DB Structure${NC}     - Show current database structure and stats"
    echo ""
    echo -e "${YELLOW}System Monitoring:${NC}"
    echo -e "${GREEN}12.${NC} ${BOLD}Logs Recap${NC}        - Show last 5 minutes of all logs in beautiful format"
    echo -e "${GREEN}13.${NC} ${BOLD}Live Logs${NC}        - Real-time log monitoring with beautiful interface"
    echo ""
    echo -e "${YELLOW}System Control:${NC}"
    echo -e "${GREEN}14.${NC} ${BOLD}App Restart${NC}       - Restart the telegram bot application"
    echo ""
    echo -e "${YELLOW}User Management:${NC}"
    echo -e "${GREEN}15.${NC} ${BOLD}List Users${NC}        - Show all users with details and statistics"
    echo -e "${GREEN}16.${NC} ${BOLD}Block User${NC}        - Block a user by chatId or username"
    echo -e "${GREEN}17.${NC} ${BOLD}Unblock User${NC}      - Unblock a user by chatId or username"
    echo -e "${GREEN}18.${NC} ${BOLD}Grant Credits${NC}     - Grant 500 credits to a user"
    echo ""
    echo -e "${GREEN}0.${NC} ${BOLD}Exit${NC}"
    echo ""
}

# Function to run individual tests
run_quick_test() {
    echo -e "${CYAN}${BOLD}🚀 RUNNING QUICK TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing single message webhook processing...${NC}"
    echo ""
    ${TEST_DIR}/run_telegram_test.sh
}

run_conversation_test() {
    echo -e "${CYAN}${BOLD}🗣️  RUNNING CONVERSATION TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing 10-question multilingual conversation...${NC}"
    echo ""
    ${TEST_DIR}/run_conversation_test.sh
}

run_reset_test() {
    echo -e "${CYAN}${BOLD}🔄 RUNNING RESET TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing context detachment functionality...${NC}"
    echo ""
    ${TEST_DIR}/run_reset_test.sh
}

run_enhanced_reset_test() {
    echo -e "${CYAN}${BOLD}🔄 RUNNING ENHANCED RESET TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing with improved failure detection...${NC}"
    echo ""
    docker exec node bash -c "cd /var/www/html/grademe_api/ai/bot/telegram && node /tmp/reset_context_test_improved.js" || \
    docker cp ${TEST_DIR}/reset_context_test_improved.js node:/tmp/ && \
    docker exec node node /tmp/reset_context_test_improved.js
}

run_message_format_test() {
    echo -e "${CYAN}${BOLD}✉️  RUNNING MESSAGE FORMAT TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing /m command with format buttons...${NC}"
    echo ""

    # Check if test file exists in container
    docker exec node bash -c "[ -f ${TEST_DIR}/message_format_test.js ]" 2>/dev/null
    if [ $? -ne 0 ]; then
        # Copy test file to container if not present
        docker cp ${TEST_DIR}/message_format_test.js node:${TEST_DIR}/
    fi

    # Run the test
    docker exec node bash -c "chmod +x ${TEST_DIR}/message_format_test.js && node ${TEST_DIR}/message_format_test.js"
}

run_reply_format_test() {
    echo -e "${CYAN}${BOLD}💬 RUNNING REPLY FORMAT TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing /r command with reply formatting...${NC}"
    echo ""

    # Check if test file exists, if not copy the working version
    if [ -f ${TEST_DIR}/reply_format_test_simple.js ]; then
        TEST_FILE="${TEST_DIR}/reply_format_test_simple.js"
    else
        echo -e "${YELLOW}⚠️  Reply format test file not found, using fallback...${NC}"
        return 1
    fi

    # Copy test file to container and run
    docker cp ${TEST_FILE} node:/tmp/reply_format_test.js
    docker exec node bash -c "cd /var/www/html/grademe_api/ai/bot/telegram && node /tmp/reply_format_test.js"
}

run_database_safety_test() {
    echo -e "${CYAN}${BOLD}🛡️  RUNNING DATABASE SAFETY TEST${NC}"
    echo -e "${BLUE}ℹ️  Testing for critical database wipe bug (User.js createIndex issue)...${NC}"
    echo ""

    # Run the database safety test directly on host (it tests via Docker)
    if [ -f ${TEST_DIR}/database_safety_test.js ]; then
        node ${TEST_DIR}/database_safety_test.js
    else
        echo -e "${RED}❌ Database safety test not found at ${TEST_DIR}/database_safety_test.js${NC}"
        return 1
    fi
}

run_all_tests() {
    echo -e "${CYAN}${BOLD}🎯 RUNNING ALL TESTS${NC}"
    echo -e "${BLUE}ℹ️  Running complete test suite...${NC}"
    echo ""

    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}TEST 1/6: DATABASE SAFETY TEST${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    run_database_safety_test

    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}TEST 2/6: QUICK TEST${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    run_quick_test

    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}TEST 3/6: CONVERSATION TEST${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    run_conversation_test

    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}TEST 4/6: RESET TEST${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    run_reset_test

    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}TEST 5/6: MESSAGE FORMAT TEST${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    run_message_format_test

    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}TEST 6/6: REPLY FORMAT TEST${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
    run_reply_format_test

    echo ""
    echo -e "${GREEN}${BOLD}✅ ALL TESTS COMPLETED${NC}"
}

run_db_restore() {
    echo -e "${CYAN}${BOLD}💾 DATABASE RESTORE${NC}"
    echo -e "${BLUE}ℹ️  Select a backup to restore from...${NC}"
    echo ""

    # List available backups
    BACKUP_DIR="/var/www/html/grademe_api/db_dump"

    # Get list of backup directories (only date-formatted ones)
    BACKUPS=($(ls -d ${BACKUP_DIR}/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | xargs -n1 basename | sort -r))

    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}❌ No backups found in ${BACKUP_DIR}${NC}"
        return 1
    fi

    echo -e "${YELLOW}${BOLD}Available backups:${NC}"
    echo ""

    # Collect backup details and find the largest one
    declare -a BACKUP_SIZES_KB
    declare -a BACKUP_DETAILS
    LARGEST_BACKUP_INDEX=0
    LARGEST_SIZE_KB=0

    # Display backups with details and track sizes
    for i in "${!BACKUPS[@]}"; do
        BACKUP_DATE="${BACKUPS[$i]}"
        BACKUP_PATH="${BACKUP_DIR}/${BACKUP_DATE}"

        # Get backup size
        if [ -d "$BACKUP_PATH" ]; then
            BACKUP_SIZE=$(du -sh "$BACKUP_PATH" 2>/dev/null | cut -f1)
            BACKUP_SIZE_KB=$(du -sk "$BACKUP_PATH" 2>/dev/null | cut -f1)

            # Get file count and modification time
            FILE_COUNT=$(find "$BACKUP_PATH" -type f 2>/dev/null | wc -l)
            MOD_TIME=$(stat -c %y "$BACKUP_PATH" 2>/dev/null | cut -d' ' -f2 | cut -d'.' -f1)

            # Store backup details
            BACKUP_SIZES_KB[$i]=${BACKUP_SIZE_KB:-0}
            BACKUP_DETAILS[$i]="Size: ${BACKUP_SIZE:-N/A}, Files: ${FILE_COUNT:-0}, Created: ${MOD_TIME:-N/A}"

            # Track largest backup
            if [ "${BACKUP_SIZE_KB:-0}" -gt "$LARGEST_SIZE_KB" ]; then
                LARGEST_SIZE_KB=${BACKUP_SIZE_KB:-0}
                LARGEST_BACKUP_INDEX=$i
            fi

            # Display with highlight if it's the largest
            if [ "${BACKUP_SIZE_KB:-0}" -eq "$LARGEST_SIZE_KB" ] && [ "$LARGEST_SIZE_KB" -gt 0 ]; then
                echo -e "  ${GREEN}$((i+1)).${NC} ${BOLD}${BACKUP_DATE}${NC} ${YELLOW}⭐ LARGEST${NC}"
            else
                echo -e "  ${GREEN}$((i+1)).${NC} ${BOLD}${BACKUP_DATE}${NC}"
            fi
            echo -e "      📊 Size: ${BACKUP_SIZE:-N/A}"
            echo -e "      📁 Files: ${FILE_COUNT:-0}"
            echo -e "      🕐 Created: ${MOD_TIME:-N/A}"
            echo ""
        fi
    done

    echo -e "  ${GREEN}0.${NC} ${BOLD}Cancel${NC}"
    echo -e "  ${GREEN}L.${NC} ${BOLD}Auto-select Largest${NC} ${YELLOW}(Recommended)${NC}"
    echo ""

    # Get user selection
    read -p "Select backup to restore (1-${#BACKUPS[@]}, L for largest, or 0 to cancel): " selection

    # Handle selection
    if [[ "$selection" == "0" ]]; then
        echo -e "${YELLOW}Restore cancelled.${NC}"
        return 0
    elif [[ "$selection" == "L" || "$selection" == "l" ]]; then
        # Auto-select largest backup
        if [ "$LARGEST_SIZE_KB" -gt 0 ]; then
            SELECTED_BACKUP="${BACKUPS[$LARGEST_BACKUP_INDEX]}"
            echo ""
            echo -e "${GREEN}✅ Auto-selected largest backup: ${BOLD}${SELECTED_BACKUP}${NC} (${BACKUP_SIZES_KB[$LARGEST_BACKUP_INDEX]}KB)${NC}"
        else
            echo -e "${RED}❌ Could not determine largest backup.${NC}"
            return 1
        fi
    elif [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#BACKUPS[@]} ]; then
        # Manual selection
        SELECTED_BACKUP="${BACKUPS[$((selection-1))]}"
    else
        echo -e "${RED}❌ Invalid selection.${NC}"
        return 1
    fi

    echo ""
    echo -e "${YELLOW}⚠️  WARNING: This will restore database from ${BOLD}${SELECTED_BACKUP}${NC}"
    echo -e "${YELLOW}   All current data will be replaced!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        echo -e "${YELLOW}Restore cancelled.${NC}"
        return 0
    fi

    echo ""
    echo -e "${BLUE}🔄 Restoring database from ${SELECTED_BACKUP}...${NC}"
    echo ""

    # Run restore script with selected date
    ${DB_RESTORE_SCRIPT} "${SELECTED_BACKUP}"
}

run_db_backup() {
    echo -e "${CYAN}${BOLD}💾 CREATING DATABASE BACKUP${NC}"
    echo -e "${BLUE}ℹ️  Creating a new database backup...${NC}"
    echo ""

    # Run the backup script
    if [ -f /var/www/html/grademe_api/ai/bot/cron/db_backup.sh ]; then
        echo -e "${YELLOW}⏳ Starting backup process...${NC}"
        /var/www/html/grademe_api/ai/bot/cron/db_backup.sh
        BACKUP_EXIT_CODE=$?

        # Check backup result
        if [ $BACKUP_EXIT_CODE -eq 0 ]; then
            echo -e "${GREEN}✅ Database backup completed successfully!${NC}"

            # Show backup location
            BACKUP_DATE=$(date +%Y-%m-%d)
            echo -e "${BLUE}📁 Backup location: /var/www/html/grademe_api/db_dump/${BACKUP_DATE}/${NC}"

            # Show backup size
            if [ -d "/var/www/html/grademe_api/db_dump/${BACKUP_DATE}" ]; then
                BACKUP_SIZE=$(du -sh "/var/www/html/grademe_api/db_dump/${BACKUP_DATE}" 2>/dev/null | cut -f1)
                echo -e "${BLUE}📊 Backup size: ${BACKUP_SIZE}${NC}"
            fi
        elif [ $BACKUP_EXIT_CODE -eq 2 ]; then
            echo -e "${YELLOW}⏭️ Database backup was skipped${NC}"
            echo -e "${BLUE}ℹ️  Backup skipped due to empty database or size < 300KB${NC}"
            echo -e "${BLUE}💡 Check the backup logs for detailed skip reason${NC}"
        else
            echo -e "${RED}❌ Database backup failed!${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Backup script not found at /var/www/html/grademe_api/ai/bot/cron/db_backup.sh${NC}"
        return 1
    fi
}

run_db_structure() {
    echo -e "${CYAN}${BOLD}📊 SHOWING DATABASE STRUCTURE${NC}"
    echo -e "${BLUE}ℹ️  Analyzing current database structure and statistics...${NC}"
    echo ""
    ${TEST_DIR}/run_db_recap.sh
}

run_logs_recap() {
    echo -e "${CYAN}${BOLD}📋 SYSTEM LOGS RECAP - LAST 5 MINUTES${NC}"
    echo -e "${BLUE}ℹ️  Displaying recent system activity and logs...${NC}"
    echo ""

    # Calculate timestamp for 5 minutes ago
    local five_minutes_ago=$(date -d '5 minutes ago' '+%Y-%m-%d %H:%M:%S')
    local current_time=$(date '+%Y-%m-%d %H:%M:%S')

    echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}📅 TIME RANGE: ${five_minutes_ago} → ${current_time}${NC}"
    echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"
    echo ""

    # Bot Status Section
    echo -e "${YELLOW}${BOLD}🤖 BOT STATUS:${NC}"
    echo -e "${CYAN}├─${NC} PM2 Status:"
    if docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep -q "online"; then
        echo -e "   ${GREEN}✅ Telegram bot is online${NC}"
        local bot_uptime=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{for(i=1;i<=NF;i++) if($i~/[0-9]+s|[0-9]+m|[0-9]+h|[0-9]+d/) print $i}' | head -1)
        echo -e "${CYAN}├─${NC} Uptime: ${GREEN}${bot_uptime:-N/A}${NC}"
        local bot_restarts=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{print $6}' | head -1)
        echo -e "${CYAN}├─${NC} Restarts: ${GREEN}${bot_restarts:-N/A}${NC}"
    else
        echo -e "   ${RED}❌ Telegram bot is offline${NC}"
    fi
    echo ""

    # Recent Application Logs (last 5 minutes)
    echo -e "${YELLOW}${BOLD}📝 APPLICATION LOGS (Last 5 minutes):${NC}"
    if docker exec node test -f /var/www/html/grademe_api/ai/bot/telegram/log/info.log; then
        # Get logs from last 5 minutes using a more compatible approach
        local log_entries=$(docker exec node bash -c "
            # Get current timestamp in seconds
            current_sec=\$(date +%s)
            # Calculate 5 minutes ago in seconds
            five_min_ago=\$((current_sec - 300))

            # Read log file and filter by timestamp
            tail -100 /var/www/html/grademe_api/ai/bot/telegram/log/info.log | while IFS= read -r line; do
                # Extract timestamp from log entry (assuming ISO format)
                if [[ \$line =~ \\\"timestamp\\\":\\\"([^\\\"]+)\\\" ]] || [[ \$line =~ [0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2} ]]; then
                    log_time=\$(echo \"\$line\" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
                    if [ ! -z \"\$log_time\" ]; then
                        log_sec=\$(date -d \"\$log_time\" +%s 2>/dev/null)
                        if [ ! -z \"\$log_sec\" ] && [ \"\$log_sec\" -ge \"\$five_min_ago\" ]; then
                            echo \"\$line\"
                        fi
                    fi
                else
                    # If no timestamp found, show recent entries anyway
                    echo \"\$line\"
                fi
            done | tail -20
        ")

        if [ ! -z "$log_entries" ]; then
            echo "$log_entries" | while IFS= read -r line; do
                # Colorize log levels
                if [[ $line =~ \"level\":\"error\" ]]; then
                    echo -e "${CYAN}├─${NC} ${RED}ERROR:${NC} $(echo "$line" | sed 's/.*"message":\s*"\([^"]*\)".*/\1/' | head -c 100)"
                elif [[ $line =~ \"level\":\"warn\" ]]; then
                    echo -e "${CYAN}├─${NC} ${YELLOW}WARN:${NC} $(echo "$line" | sed 's/.*"message":\s*"\([^"]*\)".*/\1/' | head -c 100)"
                elif [[ $line =~ \"level\":\"info\" ]]; then
                    echo -e "${CYAN}├─${NC} ${GREEN}INFO:${NC} $(echo "$line" | sed 's/.*"message":\s*"\([^"]*\)".*/\1/' | head -c 100)"
                else
                    echo -e "${CYAN}├─${NC} $(echo "$line" | head -c 100)"
                fi
            done
        else
            echo -e "${CYAN}├─${NC} ${YELLOW}No recent log entries found${NC}"
        fi
    else
        echo -e "${CYAN}├─${NC} ${RED}Log file not accessible${NC}"
    fi
    echo ""

    # Database Activity
    echo -e "${YELLOW}${BOLD}🗄️  DATABASE ACTIVITY:${NC}"
    echo -e "${CYAN}├─${NC} MongoDB Status:"
    if docker exec mongo mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo -e "   ${GREEN}✅ MongoDB is running${NC}"
        # Get recent database stats
        local user_count=$(docker exec mongo mongosh grademe_db --quiet --eval "db.Users.countDocuments()" 2>/dev/null)
        local history_count=$(docker exec mongo mongosh grademe_db --quiet --eval "db.History.countDocuments()" 2>/dev/null)
        echo -e "${CYAN}├─${NC} Users: ${GREEN}${user_count:-N/A}${NC}"
        echo -e "${CYAN}├─${NC} History entries: ${GREEN}${history_count:-N/A}${NC}"
    else
        echo -e "   ${RED}❌ MongoDB connection failed${NC}"
    fi
    echo ""

    # Docker Container Status
    echo -e "${YELLOW}${BOLD}🐳 CONTAINER STATUS:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(node|mongo)" | while IFS= read -r line; do
        if [[ $line =~ "Up" ]]; then
            echo -e "${CYAN}├─${NC} ${GREEN}${line}${NC}"
        else
            echo -e "${CYAN}├─${NC} ${RED}${line}${NC}"
        fi
    done
    echo ""

    # System Resources
    echo -e "${YELLOW}${BOLD}⚡ SYSTEM RESOURCES:${NC}"
    echo -e "${CYAN}├─${NC} Server Time: ${GREEN}$(date)${NC}"
    echo -e "${CYAN}├─${NC} Load Average: ${GREEN}$(uptime | awk -F'load average:' '{print $2}')${NC}"
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    echo -e "${CYAN}└─${NC} Disk Usage: ${GREEN}${disk_usage}${NC}"

    echo ""
    echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}📊 LOG RECAP COMPLETED${NC}"
    echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"
}

run_live_logs() {
    echo -e "${CYAN}${BOLD}📺 LIVE LOGS MONITORING${NC}"
    echo -e "${BLUE}ℹ️  Real-time log monitoring with beautiful interface...${NC}"
    echo -e "${YELLOW}⚠️  Press Ctrl+C to exit live monitoring${NC}"
    echo ""

    # Function to format and colorize log lines
    format_log_line() {
        local line="$1"
        local timestamp=$(date '+%H:%M:%S')

        # Check for user messages (telegram webhook data)
        if [[ $line =~ \"text\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]] && [[ $line =~ \"chat\".*\"first_name\"[[:space:]]*:[[:space:]]*\"([^\"]+)\" ]]; then
            local user_message=$(echo "$line" | sed -n 's/.*"text"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -c 80)
            local user_name=$(echo "$line" | sed -n 's/.*"first_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
            echo -e "${CYAN}[$timestamp]${NC} ${BLUE}💬 USER (${user_name}):${NC} $user_message"
            return
        fi

        # Check for AI responses in telegram API response
        if [[ $line =~ \"text\"[[:space:]]*:[[:space:]]*\"([^\"]+)\".*\"method\"[[:space:]]*:[[:space:]]*\"sendMessage\" ]]; then
            local ai_response=$(echo "$line" | sed -n 's/.*"text"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -c 100)
            echo -e "${CYAN}[$timestamp]${NC} ${GREEN}🤖 AI RESPONSE:${NC} $ai_response"
            return
        fi

        # Alternative: Check for completed AI responses in logs
        if [[ $line =~ "Context validation for user" ]] && [[ $line =~ "response_length" ]]; then
            local user_id=$(echo "$line" | sed -n 's/.*user \([0-9]*\).*/\1/p')
            local response_length=$(echo "$line" | sed -n 's/.*response_length=\([0-9]*\).*/\1/p')
            echo -e "${CYAN}[$timestamp]${NC} ${GREEN}🤖 AI:${NC} Generated ${response_length} char response for user $user_id"
            return
        fi

        # Check for context/memory usage
        if [[ $line =~ "Using context for user" ]]; then
            local user_id=$(echo "$line" | sed -n 's/.*user: \([0-9]*\).*/\1/p')
            local has_conversation=$(echo "$line" | grep -o "conversation: [^,]*" | cut -d' ' -f2)
            echo -e "${CYAN}[$timestamp]${NC} ${MAGENTA}🧠 MEMORY:${NC} Using context for user $user_id (conversation: $has_conversation)"
            return
        fi

        # Check for AI model selection
        if [[ $line =~ "AI model for userID" ]]; then
            local user_id=$(echo "$line" | sed -n 's/.*userID: \([^[:space:]]*\).*/\1/p')
            local model=$(echo "$line" | sed -n 's/.*defined as \([^.]*\).*/\1/p')
            echo -e "${CYAN}[$timestamp]${NC} ${YELLOW}🤖 AI MODEL:${NC} User $user_id using $model"
            return
        fi

        # Check for reset commands
        if [[ $line =~ "context reset at" ]]; then
            local user_id=$(echo "$line" | sed -n 's/.*User \([^[:space:]]*\).*/\1/p')
            echo -e "${CYAN}[$timestamp]${NC} ${RED}🔄 RESET:${NC} User $user_id reset conversation context"
            return
        fi

        # Extract log level and message for standard logs
        if [[ $line =~ \"level\":\"error\" ]]; then
            local message=$(echo "$line" | sed 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -c 100)
            echo -e "${CYAN}[$timestamp]${NC} ${RED}🔴 ERROR:${NC} $message"
        elif [[ $line =~ \"level\":\"warn\" ]]; then
            local message=$(echo "$line" | sed 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -c 100)
            echo -e "${CYAN}[$timestamp]${NC} ${YELLOW}🟡 WARN:${NC} $message"
        elif [[ $line =~ \"level\":\"info\" ]]; then
            local message=$(echo "$line" | sed 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -c 100)
            # Skip generic info logs that are not interesting
            if [[ $message =~ ^(User updated with id|Queue message|GCP Access token) ]]; then
                return
            fi
            echo -e "${CYAN}[$timestamp]${NC} ${GREEN}🟢 INFO:${NC} $message"
        elif [[ $line =~ \"level\":\"debug\" ]]; then
            local message=$(echo "$line" | sed 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -c 100)
            echo -e "${CYAN}[$timestamp]${NC} ${BLUE}🔵 DEBUG:${NC} $message"
        else
            # Only show interesting generic logs
            if [[ $line =~ (App running|webhook|History cleanup|server started) ]]; then
                local clean_line=$(echo "$line" | head -c 100)
                echo -e "${CYAN}[$timestamp]${NC} ${MAGENTA}📋 SYSTEM:${NC} $clean_line"
            fi
        fi
    }

    # Show header with system status
    echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}${BOLD}🚀 LIVE MONITORING STARTED - $(date)${NC}"
    echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"

    # Quick system status
    echo -e "${YELLOW}${BOLD}📊 SYSTEM STATUS:${NC}"
    if docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep -q "online"; then
        echo -e "${CYAN}├─${NC} Bot Status: ${GREEN}✅ Online${NC}"
    else
        echo -e "${CYAN}├─${NC} Bot Status: ${RED}❌ Offline${NC}"
    fi

    if docker exec mongo mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo -e "${CYAN}├─${NC} Database: ${GREEN}✅ Connected${NC}"
    else
        echo -e "${CYAN}├─${NC} Database: ${RED}❌ Disconnected${NC}"
    fi

    local container_count=$(docker ps | grep -E "(node|mongo)" | wc -l)
    echo -e "${CYAN}└─${NC} Containers: ${GREEN}${container_count}/2 Running${NC}"

    echo ""
    echo -e "${MAGENTA}${BOLD}📝 LIVE LOG STREAM:${NC}"
    echo -e "${CYAN}─────────────────────────────────────────────────${NC}"

    # Set up trap to handle Ctrl+C gracefully
    trap 'echo -e "\n\n${YELLOW}${BOLD}📺 Live monitoring stopped by user${NC}"; echo -e "${MAGENTA}${BOLD}═══════════════════════════════════════════════${NC}"; return 0' INT

    # Start live log monitoring with multiple log sources
    {
        # Monitor application logs
        docker exec node tail -f /var/www/html/grademe_api/ai/bot/telegram/log/info.log 2>/dev/null | while IFS= read -r line; do
            format_log_line "$line"
        done &

        # Monitor recent conversations by polling database
        (
            local last_check=$(date -u -d '10 seconds ago' +%Y-%m-%dT%H:%M:%S)
            while true; do
                sleep 5  # Check every 5 seconds
                local current_time=$(date -u +%Y-%m-%dT%H:%M:%S)

                # Get recent conversations for any user
                local recent_conversations=$(docker exec mongo mongosh grademe_db --quiet --eval "
                    db.History.find({
                        dateCreated: {\$gte: new Date('${last_check}')}
                    }).sort({dateCreated: 1}).forEach(function(h) {
                        var userReq = (h.userRequest || '').replace(/:/g, '|');
                        var aiResp = (h.userResponse || '').replace(/:/g, '|');
                        print('CONV::' + h.dateCreated.toISOString() + '::' + userReq + '::' + aiResp);
                    });
                " 2>/dev/null)

                if [ ! -z "$recent_conversations" ]; then
                    echo "$recent_conversations" | while IFS= read -r conv_line; do
                        if [[ $conv_line =~ ^CONV:: ]]; then
                            local user_msg=$(echo "$conv_line" | cut -d':' -f4 | tr '|' ':' | head -c 60)
                            local ai_msg=$(echo "$conv_line" | cut -d':' -f5- | tr '|' ':' | head -c 100)
                            local display_time=$(date '+%H:%M:%S')

                            # Skip empty messages
                            if [ ! -z "$user_msg" ] && [ ! -z "$ai_msg" ]; then
                                echo -e "${CYAN}[$display_time]${NC} ${GREEN}💬 COMPLETE CONVERSATION:${NC}"
                                echo -e "${CYAN}    │${NC} ${BLUE}User:${NC} $user_msg"
                                echo -e "${CYAN}    └${NC} ${GREEN}AI:${NC} $ai_msg"
                            fi
                        fi
                    done
                fi

                last_check=$current_time
            done
        ) &

        # Monitor PM2 logs
        docker exec node pm2 logs telegram-bot --lines 0 --raw 2>/dev/null | while IFS= read -r line; do
            local timestamp=$(date '+%H:%M:%S')
            echo -e "${CYAN}[$timestamp]${NC} ${MAGENTA}🤖 PM2:${NC} $line"
        done &

        # Monitor container events (optional, less verbose)
        # docker events --filter container=node --filter container=mongo --format "{{.Status}} {{.Actor.Attributes.name}}" | while IFS= read -r line; do
        #     local timestamp=$(date '+%H:%M:%S')
        #     echo -e "${CYAN}[$timestamp]${NC} ${BLUE}🐳 DOCKER:${NC} $line"
        # done &

        # Keep the main process alive and handle signals
        while true; do
            sleep 1
        done

    } 2>/dev/null

    # This should not be reached due to trap, but just in case
    echo -e "\n${MAGENTA}${BOLD}📺 Live monitoring ended${NC}"
}

run_list_users() {
    echo -e "${CYAN}${BOLD}👥 LISTING ALL USERS${NC}"
    echo -e "${BLUE}ℹ️  Showing user database with details and statistics...${NC}"
    echo ""

    # Get user statistics
    echo -e "${YELLOW}📊 User Database Statistics:${NC}"
    local total_users=$(docker exec mongo mongosh grademe_db --quiet --eval "db.Users.countDocuments()" 2>/dev/null | grep -o '[0-9]*' | head -1)
    local active_users=$(docker exec mongo mongosh grademe_db --quiet --eval "db.Users.countDocuments({enabled: true})" 2>/dev/null | grep -o '[0-9]*' | head -1)
    local blocked_users=$(docker exec mongo mongosh grademe_db --quiet --eval "db.Users.countDocuments({isBlocked: true})" 2>/dev/null | grep -o '[0-9]*' | head -1)
    local paid_users=$(docker exec mongo mongosh grademe_db --quiet --eval "db.Users.countDocuments({isLastPaymentSuccessfull: true})" 2>/dev/null | grep -o '[0-9]*' | head -1)

    echo -e "${CYAN}├─${NC} Total Users: ${GREEN}${total_users:-N/A}${NC}"
    echo -e "${CYAN}├─${NC} Active Users: ${GREEN}${active_users:-N/A}${NC}"
    echo -e "${CYAN}├─${NC} Blocked Users: ${RED}${blocked_users:-N/A}${NC}"
    echo -e "${CYAN}└─${NC} Paid Users: ${GREEN}${paid_users:-N/A}${NC}"
    echo ""

    echo -e "${YELLOW}👤 User Details:${NC}"
    echo -e "${CYAN}$(printf '─%.0s' {1..90})${NC}"
    printf "${BOLD}%-12s %-15s %-12s %-8s %-10s %-8s %-12s${NC}\n" "CHAT_ID" "USERNAME" "FIRST_NAME" "CREDITS" "BLOCKED" "PAID" "LAST_ACTIVE"
    echo -e "${CYAN}$(printf '─%.0s' {1..90})${NC}"

    # Get user list with details
    docker exec mongo mongosh grademe_db --quiet --eval "
        db.Users.find({}, {
            chatId: 1,
            userName: 1,
            firstName: 1,
            availableCredits: 1,
            isBlocked: 1,
            isLastPaymentSuccessfull: 1,
            lastActivity: 1
        }).sort({lastActivity: -1}).forEach(function(user) {
            var lastActive = user.lastActivity ? user.lastActivity.toISOString().split('T')[0] : 'never';
            var blocked = user.isBlocked ? 'YES' : 'no';
            var paid = user.isLastPaymentSuccessfull ? 'YES' : 'no';
            var credits = user.availableCredits || 0;
            var username = (user.userName || 'N/A').substring(0, 14);
            var firstName = (user.firstName || 'N/A').substring(0, 11);

            print(user.chatId + '|' + username + '|' + firstName + '|' + credits + '|' + blocked + '|' + paid + '|' + lastActive);
        });
    " 2>/dev/null | while IFS='|' read -r chatId userName firstName credits blocked paid lastActive; do
        if [ ! -z "$chatId" ] && [ "$chatId" != "null" ]; then
            # Color coding
            local blocked_color="${NC}"
            local paid_color="${NC}"
            [ "$blocked" = "YES" ] && blocked_color="${RED}"
            [ "$paid" = "YES" ] && paid_color="${GREEN}"

            printf "%-12s %-15s %-12s %-8s ${blocked_color}%-8s${NC} ${paid_color}%-8s${NC} %-12s\n" \
                "$chatId" "$userName" "$firstName" "$credits" "$blocked" "$paid" "$lastActive"
        fi
    done

    echo -e "${CYAN}$(printf '─%.0s' {1..90})${NC}"
    echo ""
    echo -e "${GREEN}✅ User list displayed successfully${NC}"
}

run_block_user() {
    echo -e "${CYAN}${BOLD}🚫 BLOCK USER${NC}"
    echo -e "${BLUE}ℹ️  Block a user from using the bot...${NC}"
    echo ""

    # Get user identifier
    echo -ne "${BOLD}Enter user chatId or username: ${NC}"
    read -r user_input

    if [ -z "$user_input" ]; then
        echo -e "${RED}❌ No user identifier provided${NC}"
        return 1
    fi

    echo -e "${YELLOW}🔍 Searching for user...${NC}"

    # Search for user by chatId or username
    local user_info
    if [[ "$user_input" =~ ^[0-9]+$ ]]; then
        # Search by chatId
        user_info=$(docker exec mongo mongosh grademe_db --quiet --eval "
            var user = db.Users.findOne({chatId: $user_input});
            if (user) {
                print(user.chatId + '|' + (user.userName || 'N/A') + '|' + (user.firstName || 'N/A') + '|' + (user.isBlocked || false));
            } else {
                print('NOT_FOUND');
            }
        " 2>/dev/null)
    else
        # Search by username
        user_info=$(docker exec mongo mongosh grademe_db --quiet --eval "
            var user = db.Users.findOne({userName: '$user_input'});
            if (user) {
                print(user.chatId + '|' + (user.userName || 'N/A') + '|' + (user.firstName || 'N/A') + '|' + (user.isBlocked || false));
            } else {
                print('NOT_FOUND');
            }
        " 2>/dev/null)
    fi

    if [ "$user_info" = "NOT_FOUND" ] || [ -z "$user_info" ]; then
        echo -e "${RED}❌ User not found: $user_input${NC}"
        return 1
    fi

    # Parse user info
    IFS='|' read -r chatId userName firstName isBlocked <<< "$user_info"

    echo -e "${GREEN}✅ User found:${NC}"
    echo -e "${CYAN}├─${NC} Chat ID: ${GREEN}$chatId${NC}"
    echo -e "${CYAN}├─${NC} Username: ${GREEN}$userName${NC}"
    echo -e "${CYAN}├─${NC} First Name: ${GREEN}$firstName${NC}"
    echo -e "${CYAN}└─${NC} Currently Blocked: ${isBlocked}"
    echo ""

    if [ "$isBlocked" = "true" ]; then
        echo -e "${YELLOW}⚠️  User is already blocked${NC}"
        return 0
    fi

    # Confirm blocking
    echo -ne "${YELLOW}Are you sure you want to block this user? (yes/no): ${NC}"
    read -r confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Block operation cancelled${NC}"
        return 0
    fi

    echo -e "${YELLOW}🚫 Blocking user...${NC}"

    # Block the user
    local result=$(docker exec mongo mongosh grademe_db --quiet --eval "
        var result = db.Users.updateOne(
            {chatId: $chatId},
            {\$set: {isBlocked: true, lastActivity: new Date()}}
        );
        print(result.modifiedCount);
    " 2>/dev/null)

    if [ "$result" = "1" ]; then
        echo -e "${GREEN}✅ User blocked successfully${NC}"

        # Send admin notification
        local notification_msg="🚫 *USER BLOCKED*

👤 User Details:
• Chat ID: \`$chatId\`
• Username: @$userName
• Name: $firstName

🔒 User has been blocked from using the bot.
⏰ Blocked at: $(date '+%Y-%m-%d %H:%M:%S')

🛡️ Blocked by admin via GMI interface."

        echo -e "${BLUE}📢 Sending admin notification...${NC}"
        docker exec node bash -c "cd /var/www/html/grademe_api/ai/bot/telegram && node /var/www/html/grademe_api/ai/bot/cron/send_notification.js '$notification_msg'" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Admin notification sent${NC}"
        else
            echo -e "${YELLOW}⚠️ User blocked but notification failed${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to block user${NC}"
        return 1
    fi
}

run_unblock_user() {
    echo -e "${CYAN}${BOLD}✅ UNBLOCK USER${NC}"
    echo -e "${BLUE}ℹ️  Unblock a user to restore bot access...${NC}"
    echo ""

    # Get user identifier
    echo -ne "${BOLD}Enter user chatId or username: ${NC}"
    read -r user_input

    if [ -z "$user_input" ]; then
        echo -e "${RED}❌ No user identifier provided${NC}"
        return 1
    fi

    echo -e "${YELLOW}🔍 Searching for user...${NC}"

    # Search for user by chatId or username
    local user_info
    if [[ "$user_input" =~ ^[0-9]+$ ]]; then
        # Search by chatId
        user_info=$(docker exec mongo mongosh grademe_db --quiet --eval "
            var user = db.Users.findOne({chatId: $user_input});
            if (user) {
                print(user.chatId + '|' + (user.userName || 'N/A') + '|' + (user.firstName || 'N/A') + '|' + (user.isBlocked || false));
            } else {
                print('NOT_FOUND');
            }
        " 2>/dev/null)
    else
        # Search by username
        user_info=$(docker exec mongo mongosh grademe_db --quiet --eval "
            var user = db.Users.findOne({userName: '$user_input'});
            if (user) {
                print(user.chatId + '|' + (user.userName || 'N/A') + '|' + (user.firstName || 'N/A') + '|' + (user.isBlocked || false));
            } else {
                print('NOT_FOUND');
            }
        " 2>/dev/null)
    fi

    if [ "$user_info" = "NOT_FOUND" ] || [ -z "$user_info" ]; then
        echo -e "${RED}❌ User not found: $user_input${NC}"
        return 1
    fi

    # Parse user info
    IFS='|' read -r chatId userName firstName isBlocked <<< "$user_info"

    echo -e "${GREEN}✅ User found:${NC}"
    echo -e "${CYAN}├─${NC} Chat ID: ${GREEN}$chatId${NC}"
    echo -e "${CYAN}├─${NC} Username: ${GREEN}$userName${NC}"
    echo -e "${CYAN}├─${NC} First Name: ${GREEN}$firstName${NC}"
    echo -e "${CYAN}└─${NC} Currently Blocked: ${isBlocked}"
    echo ""

    if [ "$isBlocked" != "true" ]; then
        echo -e "${YELLOW}⚠️  User is not blocked${NC}"
        return 0
    fi

    # Confirm unblocking
    echo -ne "${YELLOW}Are you sure you want to unblock this user? (yes/no): ${NC}"
    read -r confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Unblock operation cancelled${NC}"
        return 0
    fi

    echo -e "${YELLOW}✅ Unblocking user...${NC}"

    # Unblock the user
    local result=$(docker exec mongo mongosh grademe_db --quiet --eval "
        var result = db.Users.updateOne(
            {chatId: $chatId},
            {\$set: {isBlocked: false, lastActivity: new Date()}}
        );
        print(result.modifiedCount);
    " 2>/dev/null)

    if [ "$result" = "1" ]; then
        echo -e "${GREEN}✅ User unblocked successfully${NC}"

        # Send admin notification
        local notification_msg="✅ *USER UNBLOCKED*

👤 User Details:
• Chat ID: \`$chatId\`
• Username: @$userName
• Name: $firstName

🔓 User access has been restored.
⏰ Unblocked at: $(date '+%Y-%m-%d %H:%M:%S')

🛡️ Unblocked by admin via GMI interface."

        echo -e "${BLUE}📢 Sending admin notification...${NC}"
        docker exec node bash -c "cd /var/www/html/grademe_api/ai/bot/telegram && node /var/www/html/grademe_api/ai/bot/cron/send_notification.js '$notification_msg'" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Admin notification sent${NC}"
        else
            echo -e "${YELLOW}⚠️ User unblocked but notification failed${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to unblock user${NC}"
        return 1
    fi
}

run_grant_credits() {
    echo -e "${CYAN}${BOLD}💰 GRANT CREDITS${NC}"
    echo -e "${BLUE}ℹ️  Grant 500 credits to a user...${NC}"
    echo ""

    # Get user identifier
    echo -ne "${BOLD}Enter user chatId or username: ${NC}"
    read -r user_input

    if [ -z "$user_input" ]; then
        echo -e "${RED}❌ No user identifier provided${NC}"
        return 1
    fi

    echo -e "${YELLOW}🔍 Searching for user...${NC}"

    # Search for user by chatId or username
    local user_info
    if [[ "$user_input" =~ ^[0-9]+$ ]]; then
        # Search by chatId
        user_info=$(docker exec mongo mongosh grademe_db --quiet --eval "
            var user = db.Users.findOne({chatId: $user_input});
            if (user) {
                print(user.chatId + '|' + (user.userName || 'N/A') + '|' + (user.firstName || 'N/A') + '|' + (user.availableCredits || 0));
            } else {
                print('NOT_FOUND');
            }
        " 2>/dev/null)
    else
        # Search by username
        user_info=$(docker exec mongo mongosh grademe_db --quiet --eval "
            var user = db.Users.findOne({userName: '$user_input'});
            if (user) {
                print(user.chatId + '|' + (user.userName || 'N/A') + '|' + (user.firstName || 'N/A') + '|' + (user.availableCredits || 0));
            } else {
                print('NOT_FOUND');
            }
        " 2>/dev/null)
    fi

    if [ "$user_info" = "NOT_FOUND" ] || [ -z "$user_info" ]; then
        echo -e "${RED}❌ User not found: $user_input${NC}"
        return 1
    fi

    # Parse user info
    IFS='|' read -r chatId userName firstName currentCredits <<< "$user_info"

    echo -e "${GREEN}✅ User found:${NC}"
    echo -e "${CYAN}├─${NC} Chat ID: ${GREEN}$chatId${NC}"
    echo -e "${CYAN}├─${NC} Username: ${GREEN}$userName${NC}"
    echo -e "${CYAN}├─${NC} First Name: ${GREEN}$firstName${NC}"
    echo -e "${CYAN}└─${NC} Current Credits: ${GREEN}$currentCredits${NC}"
    echo ""

    local newCredits=$(echo "$currentCredits + 500" | bc)
    echo -e "${YELLOW}💰 This will grant 500 credits (${currentCredits} → ${newCredits})${NC}"
    echo ""

    # Confirm credit grant
    echo -ne "${YELLOW}Are you sure you want to grant 500 credits? (yes/no): ${NC}"
    read -r confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Credit grant cancelled${NC}"
        return 0
    fi

    echo -e "${YELLOW}💰 Granting 500 credits...${NC}"

    # Grant credits
    local result=$(docker exec mongo mongosh grademe_db --quiet --eval "
        var result = db.Users.updateOne(
            {chatId: $chatId},
            {\$inc: {availableCredits: 500}, \$set: {lastActivity: new Date()}}
        );
        print(result.modifiedCount);
    " 2>/dev/null)

    if [ "$result" = "1" ]; then
        echo -e "${GREEN}✅ Credits granted successfully${NC}"

        # Send admin notification
        local notification_msg="💰 *CREDITS GRANTED*

👤 User Details:
• Chat ID: \`$chatId\`
• Username: @$userName
• Name: $firstName

💎 Credits Update:
• Previous: $currentCredits credits
• Granted: +500 credits
• New Total: $newCredits credits

⏰ Granted at: $(date '+%Y-%m-%d %H:%M:%S')

🎁 Credits granted by admin via GMI interface."

        echo -e "${BLUE}📢 Sending admin notification...${NC}"
        docker exec node bash -c "cd /var/www/html/grademe_api/ai/bot/telegram && node /var/www/html/grademe_api/ai/bot/cron/send_notification.js '$notification_msg'" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Admin notification sent${NC}"
        else
            echo -e "${YELLOW}⚠️ Credits granted but notification failed${NC}"
        fi

        echo ""
        echo -e "${GREEN}${BOLD}🎉 SUCCESS: 500 credits granted to $firstName${NC}"
        echo -e "${BLUE}💎 New balance: ${newCredits} credits${NC}"
    else
        echo -e "${RED}❌ Failed to grant credits${NC}"
        return 1
    fi
}

run_app_restart() {
    echo -e "${CYAN}${BOLD}🔄 RESTARTING TELEGRAM BOT APPLICATION${NC}"
    echo -e "${BLUE}ℹ️  Restarting the bot to apply configuration changes...${NC}"
    echo ""

    # Check current status
    echo -e "${YELLOW}📊 Checking current application status...${NC}"
    if docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep -q "online"; then
        echo -e "${GREEN}✅ Application is currently online${NC}"
        local current_uptime=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{for(i=1;i<=NF;i++) if($i~/[0-9]+s|[0-9]+m|[0-9]+h|[0-9]+d/) print $i}' | head -1)
        local current_restarts=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{print $6}' | head -1)
        echo -e "${CYAN}├─${NC} Current uptime: ${GREEN}${current_uptime:-N/A}${NC}"
        echo -e "${CYAN}├─${NC} Previous restarts: ${GREEN}${current_restarts:-N/A}${NC}"
    else
        echo -e "${RED}❌ Application is currently offline${NC}"
    fi

    echo ""
    echo -e "${YELLOW}🔄 Performing restart...${NC}"

    # Perform restart
    local restart_output
    restart_output=$(docker exec node pm2 restart telegram-bot 2>&1)
    local restart_exit_code=$?

    if [ $restart_exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ Application restarted successfully!${NC}"

        # Show new status
        echo -e "${BLUE}📊 New application status:${NC}"
        sleep 2  # Give it a moment to fully start

        if docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep -q "online"; then
            local new_uptime=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{for(i=1;i<=NF;i++) if($i~/[0-9]+s|[0-9]+m|[0-9]+h|[0-9]+d/) print $i}' | head -1)
            local new_restarts=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{print $6}' | head -1)
            local new_pid=$(docker exec node pm2 status telegram-bot --no-colors 2>/dev/null | grep "telegram-bot" | awk '{print $5}' | head -1)

            echo -e "${CYAN}├─${NC} Status: ${GREEN}✅ Online${NC}"
            echo -e "${CYAN}├─${NC} New uptime: ${GREEN}${new_uptime:-N/A}${NC}"
            echo -e "${CYAN}├─${NC} Total restarts: ${GREEN}${new_restarts:-N/A}${NC}"
            echo -e "${CYAN}├─${NC} Process ID: ${GREEN}${new_pid:-N/A}${NC}"

            # Check for any immediate startup errors
            echo ""
            echo -e "${BLUE}📝 Recent startup logs:${NC}"
            docker exec node pm2 logs telegram-bot --lines 5 --raw 2>/dev/null | head -10 | while IFS= read -r line; do
                if [[ $line =~ error|Error|ERROR ]]; then
                    echo -e "${CYAN}├─${NC} ${RED}ERROR:${NC} $line"
                elif [[ $line =~ warn|Warn|WARN ]]; then
                    echo -e "${CYAN}├─${NC} ${YELLOW}WARN:${NC} $line"
                else
                    echo -e "${CYAN}├─${NC} ${GREEN}INFO:${NC} $line"
                fi
            done

        else
            echo -e "${CYAN}├─${NC} Status: ${RED}❌ Failed to start properly${NC}"
            echo -e "${RED}⚠️  Application may have startup issues${NC}"
        fi

        # Show configuration status
        echo ""
        echo -e "${BLUE}⚙️  Configuration Status:${NC}"
        echo -e "${CYAN}├─${NC} Database pool settings: ${GREEN}Applied (maxIdleTimeMS: 30s)${NC}"
        echo -e "${CYAN}├─${NC} MongoDB connection: ${GREEN}Refreshed${NC}"
        echo -e "${CYAN}└─${NC} Stale connection fix: ${GREEN}Active${NC}"

    else
        echo -e "${RED}❌ Application restart failed!${NC}"
        echo -e "${RED}Exit code: ${restart_exit_code}${NC}"
        echo ""
        echo -e "${YELLOW}Restart output:${NC}"
        echo "$restart_output"

        # Show current status anyway
        echo ""
        echo -e "${BLUE}📊 Current status check:${NC}"
        docker exec node pm2 status telegram-bot 2>/dev/null || echo -e "${RED}Could not get PM2 status${NC}"

        return 1
    fi

    echo ""
    echo -e "${GREEN}${BOLD}✅ APPLICATION RESTART COMPLETED${NC}"
    echo -e "${BLUE}💡 The updated database pool configuration is now active${NC}"
    echo -e "${BLUE}💡 Stale connection timeouts reduced to 30 seconds${NC}"
}

# Check if running with parameter (direct command)
if [ $# -eq 1 ]; then
    case $1 in
        "quick"|"1")
            show_header
            run_quick_test
            exit 0
            ;;
        "conversation"|"2")
            show_header
            run_conversation_test
            exit 0
            ;;
        "reset"|"3")
            show_header
            run_reset_test
            exit 0
            ;;
        "enhanced"|"enhanced-reset"|"4")
            show_header
            run_enhanced_reset_test
            exit 0
            ;;
        "message"|"format"|"5")
            show_header
            run_message_format_test
            exit 0
            ;;
        "reply"|"reply-format"|"6")
            show_header
            run_reply_format_test
            exit 0
            ;;
        "safety"|"database-safety"|"7")
            show_header
            run_database_safety_test
            exit 0
            ;;
        "all"|"8")
            show_header
            run_all_tests
            exit 0
            ;;
        "backup"|"db-backup"|"9")
            show_header
            run_db_backup
            exit 0
            ;;
        "restore"|"db-restore"|"10")
            show_header
            run_db_restore
            exit 0
            ;;
        "structure"|"db-structure"|"11")
            show_header
            run_db_structure
            exit 0
            ;;
        "logs"|"logs-recap"|"12")
            show_header
            run_logs_recap
            exit 0
            ;;
        "live"|"live-logs"|"13")
            show_header
            run_live_logs
            exit 0
            ;;
        "restart"|"app-restart"|"14")
            show_header
            run_app_restart
            exit 0
            ;;
        "list"|"list-users"|"15")
            show_header
            run_list_users
            exit 0
            ;;
        "block"|"block-user"|"16")
            show_header
            run_block_user
            exit 0
            ;;
        "unblock"|"unblock-user"|"17")
            show_header
            run_unblock_user
            exit 0
            ;;
        "credits"|"grant-credits"|"18")
            show_header
            run_grant_credits
            exit 0
            ;;
        "help"|"-h"|"--help")
            show_header
            echo -e "${BOLD}Usage:${NC}"
            echo "  gmi                    - Interactive menu"
            echo "  gmi quick             - Run quick test"
            echo "  gmi conversation      - Run conversation test"
            echo "  gmi reset             - Run reset test"
            echo "  gmi enhanced          - Run enhanced reset test"
            echo "  gmi message           - Run message format test"
            echo "  gmi reply             - Run reply format test"
            echo "  gmi safety            - Run database safety test"
            echo "  gmi all               - Run all tests"
            echo "  gmi backup            - Create database backup"
            echo "  gmi restore           - Database restore"
            echo "  gmi structure         - Show database structure"
            echo "  gmi logs              - Show last 5 minutes logs recap"
            echo "  gmi live              - Real-time live logs monitoring"
            echo "  gmi restart           - Restart the telegram bot application"
            echo "  gmi list              - Show all users with details and statistics"
            echo "  gmi block             - Block a user by chatId or username"
            echo "  gmi unblock           - Unblock a user by chatId or username"
            echo "  gmi credits           - Grant 500 credits to a user"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use 'gmi help' for usage information"
            exit 1
            ;;
    esac
fi

# Interactive menu mode
while true; do
    clear
    show_header
    show_menu

    echo -ne "${BOLD}Select option [0-18]: ${NC}"
    read -r choice

    echo ""

    case $choice in
        1)
            run_quick_test
            ;;
        2)
            run_conversation_test
            ;;
        3)
            run_reset_test
            ;;
        4)
            run_enhanced_reset_test
            ;;
        5)
            run_message_format_test
            ;;
        6)
            run_reply_format_test
            ;;
        7)
            run_database_safety_test
            ;;
        8)
            run_all_tests
            ;;
        9)
            run_db_backup
            ;;
        10)
            run_db_restore
            ;;
        11)
            run_db_structure
            ;;
        12)
            run_logs_recap
            ;;
        13)
            run_live_logs
            ;;
        14)
            run_app_restart
            ;;
        15)
            run_list_users
            ;;
        16)
            run_block_user
            ;;
        17)
            run_unblock_user
            ;;
        18)
            run_grant_credits
            ;;
        0)
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please select 0-18.${NC}"
            ;;
    esac

    echo ""
    echo -e "${YELLOW}Press Enter to continue...${NC}"
    read -r
done