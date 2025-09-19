# GradeMe AI Tools

This directory contains administrative tools for managing the GradeMe AI Telegram Bot system.

## Available Scripts

### 1. Database Restore Script (`db_restore.sh`)

Restores the MongoDB database from a backup created by the automated backup system.

#### Usage

```bash
# Restore from default date (2025-09-16)
./db_restore.sh

# Restore from specific date
./db_restore.sh 2025-09-17

# List available backups
ls -la /mnt/volume-nbg1-1/grademe_api/db_dump/
```

#### Features

- **Safety Checks**: Verifies backup exists and containers are running
- **Confirmation Prompt**: Requires explicit confirmation before restore
- **Progress Tracking**: Shows before/after document counts
- **Automatic Bot Restart**: Restarts the Telegram bot after restore
- **Colored Output**: Clear visual feedback with colored messages

#### What It Does

1. Validates the backup date and checks if backup exists
2. Verifies MongoDB and Node containers are running
3. Shows current database statistics
4. Copies backup to MongoDB container
5. Performs restore with `--drop` flag (replaces existing data)
6. Verifies restored data counts
7. Restarts the Telegram bot via PM2
8. Cleans up temporary files

#### Important Notes

- **WARNING**: This script will DROP all existing collections and replace them with backup data
- The default restore date is `2025-09-16`
- Backups are located in `/mnt/volume-nbg1-1/grademe_api/db_dump/`
- The script requires Docker containers `mongo` and `node` to be running

#### Collections Restored

- **Users**: User accounts and settings
- **History**: Chat conversation history
- **Cache**: Temporary cached data
- **Queue**: Message queue items

## Directory Structure

```
/root/grademe-ai-tools/
├── README.md           # This file
└── db_restore.sh       # Database restore script
```

## Related Paths

- **Backup Location**: `/mnt/volume-nbg1-1/grademe_api/db_dump/`
- **Bot Application**: `/mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/`
- **Container App Path**: `/var/www/html/grademe_api/ai/bot/telegram/`

## Support

For issues or questions about these tools, check the main application logs:

```bash
# Application logs
tail -f /mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/log/info.log
tail -f /mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/log/error.log

# PM2 process logs
docker exec node pm2 logs telegram-bot
```