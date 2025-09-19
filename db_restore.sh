#!/bin/bash

# GradeMe AI Database Restore Script
# Restores MongoDB database from specified backup date
# Usage: ./db_restore.sh [YYYY-MM-DD]
# Default: Restores from 2025-09-16 if no date specified

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="/mnt/volume-nbg1-1/grademe_api/db_dump"
DEFAULT_BACKUP_DATE="2025-09-16"
DB_NAME="grademe_db"
MONGO_CONTAINER="mongo"
NODE_CONTAINER="node"
TELEGRAM_BOT_NAME="telegram-bot"

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if backup exists
check_backup() {
    local backup_date=$1
    local backup_path="${BACKUP_BASE_DIR}/${backup_date}"

    if [ ! -d "$backup_path" ]; then
        print_message "Error: Backup directory not found: $backup_path" "$RED"
        print_message "Available backups:" "$YELLOW"
        ls -la "$BACKUP_BASE_DIR" | grep "^d" | awk '{print "  - " $9}' | grep -E "[0-9]{4}-[0-9]{2}-[0-9]{2}"
        return 1
    fi

    if [ ! -d "${backup_path}/${DB_NAME}" ]; then
        print_message "Error: Database backup not found: ${backup_path}/${DB_NAME}" "$RED"
        return 1
    fi

    return 0
}

# Function to check container status
check_containers() {
    if ! docker ps | grep -q "$MONGO_CONTAINER"; then
        print_message "Error: MongoDB container '$MONGO_CONTAINER' is not running" "$RED"
        return 1
    fi

    if ! docker ps | grep -q "$NODE_CONTAINER"; then
        print_message "Warning: Node container '$NODE_CONTAINER' is not running" "$YELLOW"
    fi

    return 0
}

# Function to perform database restore
restore_database() {
    local backup_date=$1
    local backup_path="${BACKUP_BASE_DIR}/${backup_date}/${DB_NAME}"

    print_message "Starting database restore from: $backup_date" "$GREEN"

    # Get current document counts before restore
    print_message "\nCurrent database statistics:" "$YELLOW"
    docker exec "$MONGO_CONTAINER" mongosh "$DB_NAME" --quiet --eval "
        print('  Users: ' + db.Users.countDocuments());
        print('  History: ' + db.History.countDocuments());
        print('  Cache: ' + db.Cache.countDocuments());
        print('  Queue: ' + db.Queue.countDocuments());
    " 2>/dev/null || print_message "  Database is empty or doesn't exist" "$YELLOW"

    # Copy backup to MongoDB container
    print_message "\nCopying backup to MongoDB container..." "$GREEN"
    docker cp "${BACKUP_BASE_DIR}/${backup_date}" "${MONGO_CONTAINER}:/tmp/backup-${backup_date}"

    # Perform restore with --drop flag to replace existing data
    print_message "Restoring database (this will drop existing collections)..." "$GREEN"
    docker exec "$MONGO_CONTAINER" mongorestore \
        --host=localhost \
        --port=27017 \
        --db="$DB_NAME" \
        --drop \
        "/tmp/backup-${backup_date}/${DB_NAME}/" 2>&1 | grep -v "deprecated" | grep -v "don't know what to do"

    # Clean up temporary files in container
    docker exec "$MONGO_CONTAINER" rm -rf "/tmp/backup-${backup_date}"

    # Verify restore
    print_message "\nVerifying restored data:" "$GREEN"
    docker exec "$MONGO_CONTAINER" mongosh "$DB_NAME" --quiet --eval "
        print('  Users: ' + db.Users.countDocuments());
        print('  History: ' + db.History.countDocuments());
        print('  Cache: ' + db.Cache.countDocuments());
        print('  Queue: ' + db.Queue.countDocuments());
    "

    return 0
}

# Function to restart telegram bot
restart_bot() {
    if docker ps | grep -q "$NODE_CONTAINER"; then
        print_message "\nRestarting Telegram bot..." "$GREEN"
        docker exec "$NODE_CONTAINER" pm2 restart "$TELEGRAM_BOT_NAME" 2>&1 | grep -E "(Applying|online)" || true
        print_message "Telegram bot restarted successfully" "$GREEN"
    else
        print_message "\nWarning: Node container not running, skipping bot restart" "$YELLOW"
    fi
}

# Main script execution
main() {
    local backup_date="${1:-$DEFAULT_BACKUP_DATE}"

    print_message "========================================" "$GREEN"
    print_message "   GradeMe AI Database Restore Tool" "$GREEN"
    print_message "========================================" "$GREEN"
    print_message ""

    # Validate date format
    if ! echo "$backup_date" | grep -qE "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"; then
        print_message "Error: Invalid date format. Use YYYY-MM-DD" "$RED"
        exit 1
    fi

    # Check prerequisites
    print_message "Checking prerequisites..." "$YELLOW"

    if ! check_backup "$backup_date"; then
        exit 1
    fi

    if ! check_containers; then
        exit 1
    fi

    print_message "Prerequisites check passed ✓" "$GREEN"

    # Confirmation prompt
    print_message "\n⚠️  WARNING: This will replace all current database data!" "$YELLOW"
    print_message "Backup date to restore: $backup_date" "$YELLOW"
    read -p "Are you sure you want to continue? (yes/no): " confirmation

    if [ "$confirmation" != "yes" ]; then
        print_message "Restore cancelled by user" "$RED"
        exit 0
    fi

    # Perform restore
    if restore_database "$backup_date"; then
        print_message "\n✓ Database restored successfully from $backup_date" "$GREEN"

        # Restart bot
        restart_bot

        print_message "\n========================================" "$GREEN"
        print_message "   Restore completed successfully!" "$GREEN"
        print_message "========================================" "$GREEN"
    else
        print_message "\n✗ Database restore failed" "$RED"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"