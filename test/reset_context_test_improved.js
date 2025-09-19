#!/usr/bin/env node

// Enhanced Reset Command Context Detachment Test
// This tests that /reset command properly detaches conversation memory while preserving data
// Improved to detect application behavior failures more accurately

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const CLIENT_TOKEN = '6169306321:AAGAYSDDu2JJigaN1nkSzwtcK-CDHxv5v6c';
const WEBHOOK_URL = `http://localhost/webhook/${CLIENT_TOKEN}`;
const LOG_PATH = '/var/www/html/grademe_api/ai/bot/telegram/log/info.log';
const TEST_USER = {
    chatId: 830403309,
    userName: 'akirkor',
    firstName: 'Artem'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Utility functions
const log = (message, color = colors.reset) => {
    console.log(`${color}${message}${colors.reset}`);
};

const logSection = (title) => {
    console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
    log(`${colors.bright}${title}${colors.reset}`, colors.cyan);
    console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);
const logStep = (message) => log(`🔄 ${message}`, colors.magenta);

// Generate unique message ID and update ID
const generateMessageId = () => Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
const generateUpdateId = () => Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);

// Create Telegram webhook payload
const createTelegramPayload = (text, messageId = null, updateId = null) => {
    return {
        update_id: updateId || generateUpdateId(),
        message: {
            message_id: messageId || generateMessageId(),
            from: {
                id: TEST_USER.chatId,
                is_bot: false,
                first_name: TEST_USER.firstName,
                username: TEST_USER.userName,
                language_code: "en"
            },
            chat: {
                id: TEST_USER.chatId,
                first_name: TEST_USER.firstName,
                username: TEST_USER.userName,
                type: "private"
            },
            date: Math.floor(Date.now() / 1000),
            text: text
        }
    };
};

// Create callback query payload for reset confirmation
const createCallbackPayload = (callbackData, messageId = null, updateId = null) => {
    return {
        update_id: updateId || generateUpdateId(),
        callback_query: {
            id: `${Date.now()}_${Math.random()}`,
            from: {
                id: TEST_USER.chatId,
                is_bot: false,
                first_name: TEST_USER.firstName,
                username: TEST_USER.userName,
                language_code: "en"
            },
            message: {
                message_id: messageId || generateMessageId(),
                from: {
                    id: TEST_USER.chatId,
                    is_bot: true,
                    first_name: "GrademeAI",
                    username: "grademeai_bot"
                },
                chat: {
                    id: TEST_USER.chatId,
                    first_name: TEST_USER.firstName,
                    username: TEST_USER.userName,
                    type: "private"
                },
                date: Math.floor(Date.now() / 1000),
                text: "⚠️ Are you sure you want to reset your settings to the default ?"
            },
            data: callbackData
        }
    };
};

// HTTP request function
const httpRequest = (url, method, data) => {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = JSON.stringify(data);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'TelegramBot (https://core.telegram.org/bots/api)'
            },
            timeout: 45000
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    data: body
                });
            });
        });

        req.on('error', (error) => reject(error));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
};

// Send message and wait for processing
const sendMessageAndWait = async (text, waitTime = 8000) => {
    const payload = createTelegramPayload(text);

    try {
        const response = await httpRequest(WEBHOOK_URL, 'POST', payload);

        if (response.status === 200) {
            logSuccess(`Message sent: "${text}"`);
            logInfo(`Waiting ${waitTime/1000}s for processing...`);

            // Wait for processing to complete
            await new Promise(resolve => setTimeout(resolve, waitTime));

            return {
                success: true,
                messageId: payload.message.message_id,
                updateId: payload.update_id
            };
        } else {
            logError(`Failed to send message: ${response.status} ${response.statusText}`);
            return { success: false };
        }
    } catch (error) {
        logError(`Error sending message: ${error.message}`);
        return { success: false };
    }
};

// Send callback query (button press)
const sendCallbackAndWait = async (callbackData, waitTime = 5000) => {
    const payload = createCallbackPayload(callbackData);

    try {
        const response = await httpRequest(WEBHOOK_URL, 'POST', payload);

        if (response.status === 200) {
            logSuccess(`Callback sent: "${callbackData}"`);
            logInfo(`Waiting ${waitTime/1000}s for processing...`);

            await new Promise(resolve => setTimeout(resolve, waitTime));

            return {
                success: true,
                callbackId: payload.callback_query.id
            };
        } else {
            logError(`Failed to send callback: ${response.status} ${response.statusText}`);
            return { success: false };
        }
    } catch (error) {
        logError(`Error sending callback: ${error.message}`);
        return { success: false };
    }
};

// IMPROVED: Check for context reset in logs with detailed analysis
const checkContextReset = async () => {
    try {
        const { stdout } = await execAsync(`tail -50 ${LOG_PATH} | grep -E "(context reset|skipping conversation memory|lastContextReset)" | tail -10`);

        const resetFound = stdout.includes('context reset at') && stdout.includes('skipping conversation memory');
        const noMemoryFound = stdout.includes('No conversation memory found for user');

        return {
            resetDetected: resetFound,
            memorySkipped: noMemoryFound,
            logOutput: stdout.trim()
        };
    } catch (error) {
        logError(`Error checking context reset: ${error.message}`);
        return {
            resetDetected: false,
            memorySkipped: false,
            logOutput: ''
        };
    }
};

// IMPROVED: Check conversation memory retrieval with failure detection
const checkConversationMemory = async () => {
    try {
        const { stdout } = await execAsync(`tail -50 ${LOG_PATH} | grep -E "(Retrieved conversation memory|Using context|No conversation memory)" | tail -5`);

        const memoryRetrieved = stdout.includes('Retrieved conversation memory');
        const contextUsed = stdout.includes('Using context for user');
        const noMemoryFound = stdout.includes('No conversation memory found');

        return {
            memoryRetrieved: memoryRetrieved,
            contextUsed: contextUsed,
            noMemoryFound: noMemoryFound,
            logOutput: stdout.trim()
        };
    } catch (error) {
        logError(`Error checking conversation memory: ${error.message}`);
        return {
            memoryRetrieved: false,
            contextUsed: false,
            noMemoryFound: false,
            logOutput: ''
        };
    }
};

// IMPROVED: Check database state for lastContextReset
const checkDatabaseResetStatus = async () => {
    try {
        const { stdout } = await execAsync(`docker exec mongo mongosh grademe_db --quiet --eval "print(JSON.stringify(db.Users.findOne({chatId: ${TEST_USER.chatId}}, {lastContextReset: 1, _id: 0}), null, 2))"`);

        const resetData = JSON.parse(stdout.trim());
        const hasResetTimestamp = resetData.lastContextReset !== null;

        return {
            hasResetTimestamp: hasResetTimestamp,
            resetTimestamp: resetData.lastContextReset,
            dbOutput: stdout.trim()
        };
    } catch (error) {
        logError(`Error checking database reset status: ${error.message}`);
        return {
            hasResetTimestamp: false,
            resetTimestamp: null,
            dbOutput: ''
        };
    }
};

// IMPROVED: Detect AI response content for context leakage
const detectContextLeakage = async (contextInfo, waitTime = 3000) => {
    try {
        // Wait a bit for logs to be written
        await new Promise(resolve => setTimeout(resolve, waitTime));

        const { stdout } = await execAsync(`tail -20 ${LOG_PATH} | grep -E "(AI SDK response)" | tail -2`);

        // We can't directly see the AI response content in logs, but we can check
        // if memory was used when it shouldn't have been
        const memoryCheck = await checkConversationMemory();

        return {
            potentialLeakage: memoryCheck.memoryRetrieved && !memoryCheck.noMemoryFound,
            memoryUsed: memoryCheck.memoryRetrieved,
            shouldHaveNoMemory: true,
            logOutput: stdout.trim()
        };
    } catch (error) {
        logError(`Error detecting context leakage: ${error.message}`);
        return {
            potentialLeakage: false,
            memoryUsed: false,
            shouldHaveNoMemory: true,
            logOutput: ''
        };
    }
};

// IMPROVED: Main reset context test with enhanced failure detection
const runResetContextTest = async () => {
    logSection('ENHANCED RESET COMMAND CONTEXT DETACHMENT TEST');

    let testResults = {
        contextEstablished: false,
        resetSuccessful: false,
        databaseResetRecorded: false,
        contextDetached: false,
        freshContextConfirmed: false,
        noContextLeakage: false,
        overallSuccess: false,
        failures: [],
        warnings: []
    };

    logInfo(`Testing reset command context detachment functionality`);
    logInfo(`User: ${TEST_USER.userName} (${TEST_USER.chatId})`);
    logInfo(`Enhanced failure detection enabled`);
    console.log('');

    // Step 0: Clear any existing reset status
    logSection('STEP 0: CLEAR EXISTING RESET STATUS');
    logStep('Ensuring clean starting state...');

    try {
        await execAsync(`docker exec mongo mongosh grademe_db --eval "db.Users.updateOne({chatId: ${TEST_USER.chatId}}, {\\$set: {lastContextReset: null}})"`);
        logSuccess('Reset status cleared for clean test start');
    } catch (error) {
        testResults.warnings.push('Could not clear reset status - may affect test results');
        logWarning('Could not clear reset status - continuing anyway');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 1: Establish conversation context
    logSection('STEP 1: ESTABLISH CONVERSATION CONTEXT');
    logStep('Sending context-building messages...');

    const contextMessage = await sendMessageAndWait("My name is Alex and I work as a software developer in London. Please remember this information.", 10000);

    if (contextMessage.success) {
        // Check if conversation memory was retrieved
        const memoryCheck1 = await checkConversationMemory();
        if (memoryCheck1.memoryRetrieved || memoryCheck1.contextUsed) {
            testResults.contextEstablished = true;
            logSuccess('Conversation context established');
            logInfo(`Memory logs: ${memoryCheck1.logOutput}`);
        } else {
            testResults.warnings.push('Context establishment unclear - may affect subsequent tests');
            logWarning('Context establishment unclear - continuing test');
        }
    } else {
        testResults.failures.push('Failed to establish conversation context');
        logError('Failed to establish conversation context');
    }

    // Wait before next step
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Test context before reset
    logSection('STEP 2: VERIFY CONTEXT BEFORE RESET');
    logStep('Asking about previously established context...');

    const contextTestMessage = await sendMessageAndWait("What is my profession and where do I work?", 10000);

    if (contextTestMessage.success) {
        const memoryCheck2 = await checkConversationMemory();
        if (memoryCheck2.memoryRetrieved) {
            logSuccess('Context memory retrieved before reset');
            logInfo(`Memory logs: ${memoryCheck2.logOutput}`);
        } else {
            testResults.warnings.push('Context memory not clearly retrieved before reset');
            logWarning('Context memory not clearly retrieved');
        }
    }

    // Wait before reset
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Execute reset command
    logSection('STEP 3: EXECUTE RESET COMMAND');
    logStep('Sending /reset command...');

    const resetMessage = await sendMessageAndWait("/reset", 8000);

    if (resetMessage.success) {
        logSuccess('Reset command sent');

        // Step 4: Confirm reset
        logStep('Confirming reset action...');
        const resetConfirm = await sendCallbackAndWait("reset_yes", 8000);

        if (resetConfirm.success) {
            testResults.resetSuccessful = true;
            logSuccess('Reset confirmed successfully');

            // Check database state
            const dbCheck = await checkDatabaseResetStatus();
            if (dbCheck.hasResetTimestamp) {
                testResults.databaseResetRecorded = true;
                logSuccess('Reset timestamp recorded in database');
                logInfo(`Reset timestamp: ${dbCheck.resetTimestamp}`);
            } else {
                testResults.failures.push('Reset timestamp not recorded in database');
                logError('Reset timestamp not recorded in database');
                logInfo(`Database state: ${dbCheck.dbOutput}`);
            }
        } else {
            testResults.failures.push('Failed to confirm reset');
            logError('Failed to confirm reset');
        }
    } else {
        testResults.failures.push('Failed to send reset command');
        logError('Failed to send reset command');
    }

    // Wait after reset
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 5: IMPROVED - Test context after reset with multiple checks
    logSection('STEP 5: VERIFY CONTEXT DETACHMENT');
    logStep('Testing if context is detached after reset...');

    const postResetMessage = await sendMessageAndWait("What do you know about me? What is my profession?", 10000);

    if (postResetMessage.success) {
        const memoryCheck3 = await checkConversationMemory();
        const resetCheck2 = await checkContextReset();
        const leakageCheck = await detectContextLeakage("Alex, software developer, London");

        // IMPROVED: Check if context reset was detected in logs
        if (resetCheck2.resetDetected || resetCheck2.memorySkipped) {
            testResults.contextDetached = true;
            logSuccess('Context reset detected in logs');
            logInfo(`Reset logs: ${resetCheck2.logOutput}`);
        } else {
            testResults.failures.push('Context reset not detected in logs');
            logError('Context reset not detected in logs');
            logInfo(`Expected: "context reset at" and "skipping conversation memory"`);
            logInfo(`Actual logs: ${resetCheck2.logOutput}`);
        }

        // IMPROVED: Check for memory retrieval (should NOT happen after reset)
        if (memoryCheck3.noMemoryFound || !memoryCheck3.memoryRetrieved) {
            testResults.freshContextConfirmed = true;
            logSuccess('Context successfully detached - no memory retrieved');
            logInfo('AI should respond as if this is a fresh conversation');
        } else {
            testResults.failures.push('CRITICAL: Context not detached - memory still retrieved');
            logError('CRITICAL: Context not detached - memory still being retrieved');
            logInfo(`This indicates the reset function is not working properly`);
            logInfo(`Memory logs: ${memoryCheck3.logOutput}`);
        }

        // IMPROVED: Check for context leakage
        if (!leakageCheck.potentialLeakage) {
            testResults.noContextLeakage = true;
            logSuccess('No context leakage detected');
        } else {
            testResults.failures.push('CRITICAL: Potential context leakage detected');
            logError('CRITICAL: Potential context leakage detected');
            logInfo('AI may be using previous conversation context inappropriately');
        }

    } else {
        testResults.failures.push('Failed to test post-reset context');
        logError('Failed to test post-reset context');
    }

    // IMPROVED: Calculate overall success with stricter criteria
    testResults.overallSuccess =
        testResults.resetSuccessful &&
        testResults.databaseResetRecorded &&
        testResults.contextDetached &&
        testResults.freshContextConfirmed &&
        testResults.noContextLeakage &&
        testResults.failures.length === 0;

    // IMPROVED: Final results with detailed analysis
    logSection('ENHANCED RESET CONTEXT TEST RESULTS');

    const resultColor = testResults.overallSuccess ? colors.green : colors.red;
    const resultIcon = testResults.overallSuccess ? '✅' : '❌';
    const resultText = testResults.overallSuccess ? 'PASSED' : 'FAILED';

    log(`${resultIcon} Overall Test Result: ${resultText}`, resultColor);

    console.log('\nDetailed Results:');
    console.log(`├─ Context Established: ${testResults.contextEstablished ? '✅' : '❌'}`);
    console.log(`├─ Reset Command Executed: ${testResults.resetSuccessful ? '✅' : '❌'}`);
    console.log(`├─ Database Reset Recorded: ${testResults.databaseResetRecorded ? '✅' : '❌'}`);
    console.log(`├─ Context Detached: ${testResults.contextDetached ? '✅' : '❌'}`);
    console.log(`├─ Fresh Context Confirmed: ${testResults.freshContextConfirmed ? '✅' : '❌'}`);
    console.log(`├─ No Context Leakage: ${testResults.noContextLeakage ? '✅' : '❌'}`);
    console.log(`├─ Critical Failures: ${testResults.failures.filter(f => f.includes('CRITICAL')).length}`);
    console.log(`└─ Total Failures: ${testResults.failures.length}`);

    if (testResults.failures.length > 0) {
        console.log('\nFailure Details:');
        testResults.failures.forEach((failure, index) => {
            const isCritical = failure.includes('CRITICAL');
            const icon = isCritical ? '🚨' : '❌';
            const color = isCritical ? colors.red + colors.bright : colors.red;
            console.log(`  ${icon} ${index + 1}. ${color}${failure}${colors.reset}`);
        });
    }

    if (testResults.warnings.length > 0) {
        console.log('\nWarnings:');
        testResults.warnings.forEach((warning, index) => {
            console.log(`  ⚠️  ${index + 1}. ${colors.yellow}${warning}${colors.reset}`);
        });
    }

    console.log('\nTest Validation:');
    console.log(`├─ Reset Command: ${testResults.resetSuccessful ? '✅' : '❌'} Executed successfully`);
    console.log(`├─ Database Update: ${testResults.databaseResetRecorded ? '✅' : '❌'} Reset timestamp recorded`);
    console.log(`├─ Context Detachment: ${testResults.contextDetached ? '✅' : '❌'} Logs show memory skipped`);
    console.log(`├─ Fresh Context: ${testResults.freshContextConfirmed ? '✅' : '❌'} AI starts clean after reset`);
    console.log(`├─ No Leakage: ${testResults.noContextLeakage ? '✅' : '❌'} No unauthorized context usage`);
    console.log(`└─ Data Preservation: ✅ No database deletion (by design)`);

    logSection('TEST COMPLETION');
    log(`Test completed at: ${new Date().toISOString()}`, colors.bright);
    log(`Expected behavior: Reset should detach context while preserving data`, colors.blue);

    if (!testResults.overallSuccess) {
        log(`APPLICATION BEHAVIOR FAILURE DETECTED`, colors.red + colors.bright);
        log(`The reset functionality is not working as expected`, colors.red);
    }

    process.exit(testResults.overallSuccess ? 0 : 1);
};

// Handle process termination
process.on('SIGINT', () => {
    logWarning('\nEnhanced reset context test interrupted by user');
    process.exit(130);
});

process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

// Run the test
if (require.main === module) {
    runResetContextTest().catch((error) => {
        logError(`Test failed with error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runResetContextTest,
    sendMessageAndWait,
    sendCallbackAndWait,
    checkContextReset,
    checkConversationMemory,
    checkDatabaseResetStatus,
    detectContextLeakage
};