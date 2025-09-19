# Telegram UI Emulation Test Suite

This directory contains comprehensive testing tools for the GrademeAI Telegram Bot system.

## Files Created

### 1. `telegram_container_test.js`
- **Purpose**: Complete Telegram UI emulation test that runs inside Docker container
- **Features**:
  - Sends real Telegram webhook requests to the bot
  - Monitors logs in real-time for processing validation
  - Tests conversation memory, Claude API, and context processing
  - Uses native Node.js HTTP (no external dependencies)
  - Validates message flow from webhook to response

### 2. `run_telegram_test.sh`
- **Purpose**: Wrapper script to execute the test from host system
- **Features**:
  - Checks Docker container status
  - Verifies bot is online
  - Copies test script to container and executes with Node.js v18
  - Provides colorized output and detailed reporting
  - Automatic cleanup after test completion

### 3. `conversation_consistency_test.js`
- **Purpose**: Extended conversation test with 10 sequential questions
- **Features**:
  - Tests AI memory retention across multiple exchanges
  - Validates context consistency throughout conversation
  - Monitors keyword context matching
  - Progressive difficulty with layered context
  - Comprehensive scoring system (delivery, retention, keywords)

### 4. `run_conversation_test.sh`
- **Purpose**: Wrapper script for conversation consistency test
- **Features**:
  - User confirmation before starting (3-4 minute duration)
  - Progress tracking and timing
  - Detailed success criteria validation
  - Automatic cleanup and reporting

### 5. `reset_context_test.js`
- **Purpose**: Tests /reset command conversation memory detachment functionality
- **Features**:
  - Establishes conversation context with personal information
  - Executes /reset command with button confirmation
  - Verifies context is detached while preserving database data
  - Monitors logs for reset behavior and memory skipping
  - Tests fresh context after reset (AI should not remember previous info)

### 6. `run_reset_test.sh`
- **Purpose**: Wrapper script for reset context detachment test
- **Features**:
  - User confirmation before context modification
  - 5-step validation process: establish → verify → reset → confirm → test
  - Real-time log monitoring for context reset detection
  - Comprehensive validation of reset behavior

### 5. `telegram_ui_test.js` (Original)
- **Purpose**: Host-based version (not used due to dependency issues)
- **Note**: Kept for reference but `telegram_container_test.js` is the active version

## Usage

### Unified Test Interface (Recommended)
```bash
# Interactive menu with all options
app-test

# Direct commands
app-test quick         # Quick test (30s)
app-test conversation  # 10-question test (3-4 min)
app-test reset         # Reset context test (2-3 min)
app-test all           # All tests sequentially (6-8 min)
app-test db            # Database restore

# Help
app-test help
```

### Legacy Individual Tests (Still Available)
```bash
# Direct script execution
/root/grademe-ai-tools/test/run_telegram_test.sh
/root/grademe-ai-tools/test/run_conversation_test.sh
/root/grademe-ai-tools/test/run_reset_test.sh
```

### Manual Container Test
```bash
# Copy and run directly in container
docker cp /root/grademe-ai-tools/test/telegram_container_test.js node:/tmp/test.js
docker exec node node /tmp/test.js
```

## Test Verification

The test validates the following components:

### ✅ Webhook Processing
- Message reception via HTTP POST to `/webhook/{TOKEN}`
- Proper JSON payload parsing
- User authentication and validation

### ✅ Message Processing Pipeline
- Message queue creation and resolution
- User profile retrieval and updates
- Message routing to appropriate AI service

### ✅ Conversation Memory System
- Context retrieval from last 2 hours
- Memory size management (5MB limit)
- Enhanced context formatting with boundaries

### ✅ Claude API Integration
- SDK request with timeout protection (30s)
- Response reception and processing
- Error handling and logging

### ✅ Context Processing Enhancements
- Language-aware instructions (Russian/English)
- Email context detection and state tracking
- Context validation and adherence monitoring

### ✅ Error Detection
- Real-time error monitoring during processing
- Comprehensive error reporting and categorization

### ✅ Conversation Memory Consistency (10-Question Test)
- Sequential conversation with progressive context building
- Name, profession, location, and travel plan memory testing
- Cross-reference validation (connecting multiple context pieces)
- Temporal context tracking (meetings, times, schedules)
- Final comprehensive memory recall test

### ✅ Reset Command Context Detachment
- Context establishment with personal information
- Reset command execution and confirmation
- Context detachment verification (memory should be skipped)
- Fresh context validation (AI responds as new conversation)
- Database preservation confirmation (no data deletion)

## Test Results Interpretation

### PASSED Result
- All critical components working correctly
- Bot is responding to messages
- Context processing functioning
- No errors detected during processing

### FAILED Result
- One or more critical components failing
- Check detailed logs for specific issues
- Common issues:
  - Claude API timeouts
  - Database connection problems
  - Webhook routing failures

## Test User Configuration

- **User**: akirkor (830403309)
- **Test Message**: "Hello. What is this AI model ?"
- **Expected Response**: AI model identification with conversation context

## Monitoring and Debugging

The test monitors the following log patterns:
- `Retrieved conversation memory for user`
- `Using context for user`
- `Claude SDK request`
- `Claude SDK response received`
- `Context validation for user`
- `Queue message id X was resolved`

## Integration with System

This test suite is designed to work with:
- **Docker Environment**: Node.js v18.17.1 container
- **MongoDB**: Database connection and user management
- **PM2**: Process management for bot instance
- **Log System**: Real-time log monitoring and analysis

## Recent Improvements (September 2025)

1. **Enhanced Context Processing**: 2-hour memory window with structured formatting
2. **Claude API Timeout Protection**: 30-second timeout to prevent hanging
3. **Language-Aware Instructions**: Automatic Russian/English detection
4. **Context Validation**: Real-time monitoring of AI context adherence
5. **Comprehensive Test Coverage**: End-to-end validation of all major components

## Maintenance Notes

- Test script uses hardcoded bot token from environment
- MongoDB access requires container environment
- Log paths are container-specific
- Test timeout set to 45 seconds for processing
- Automatic cleanup prevents container pollution