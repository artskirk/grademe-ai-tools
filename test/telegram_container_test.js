#!/usr/bin/env node

// Telegram UI Test - Container Version
// This runs inside the Docker container with Node.js v18

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');

// Configuration - reading environment manually since we're in container
const CLIENT_TOKEN = '6169306321:AAGAYSDDu2JJigaN1nkSzwtcK-CDHxv5v6c'; // From logs
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
    cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = colors.reset) => {
    console.log(`${color}${message}${colors.reset}`);
};

const logSection = (title) => {
    console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    log(`${colors.bright}${title}${colors.reset}`, colors.cyan);
    console.log(`${colors.cyan}${'='.repeat(50)}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);

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

// HTTP request function (replacing axios)
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

// Send message to Telegram webhook
const sendTelegramMessage = async (text) => {
    const payload = createTelegramPayload(text);

    logInfo(`Sending message: "${text}"`);
    logInfo(`Webhook URL: ${WEBHOOK_URL}`);
    logInfo(`User: ${TEST_USER.userName} (${TEST_USER.chatId})`);

    try {
        const response = await httpRequest(WEBHOOK_URL, 'POST', payload);
        logSuccess(`Webhook response: ${response.status} ${response.statusText}`);
        return {
            success: true,
            status: response.status,
            data: response.data,
            messageId: payload.message.message_id,
            updateId: payload.update_id
        };
    } catch (error) {
        logError(`Webhook request failed: ${error.message}`);
        return {
            success: false,
            error: error.message,
            messageId: payload.message.message_id,
            updateId: payload.update_id
        };
    }
};

// Monitor logs for specific patterns
const monitorLogs = async (messageId, timeoutMs = 60000) => {
    const logPatterns = {
        messageReceived: new RegExp(`"message_id":${messageId}`),
        conversationMemory: /Retrieved conversation memory for user/,
        contextUsage: /Using context for user/,
        aiRequest: /AI SDK request/,
        aiResponse: /AI SDK response received/,
        contextValidation: /Context validation for user/,
        queueResolved: new RegExp(`Queue message id ${messageId} was resolved`),
        error: /"level":"error"/
    };

    const results = {
        messageReceived: false,
        conversationMemory: false,
        contextUsage: false,
        aiRequest: false,
        aiResponse: false,
        contextValidation: false,
        queueResolved: false,
        errors: []
    };

    logInfo(`Monitoring logs for message ID: ${messageId} (timeout: ${timeoutMs}ms)`);

    return new Promise((resolve) => {
        let logBuffer = '';
        const timeout = setTimeout(() => {
            logWarning(`Log monitoring timeout after ${timeoutMs}ms`);
            resolve(results);
        }, timeoutMs);

        const logMonitor = exec(`tail -f ${LOG_PATH}`, (error) => {
            if (error && !error.killed) {
                logError(`Log monitoring error: ${error.message}`);
            }
        });

        logMonitor.stdout.on('data', (data) => {
            logBuffer += data;
            const lines = logBuffer.split('\n');
            logBuffer = lines.pop() || '';

            for (const line of lines) {
                if (logPatterns.messageReceived.test(line)) {
                    results.messageReceived = true;
                    logSuccess('✓ Message received by webhook');
                }

                if (logPatterns.conversationMemory.test(line)) {
                    results.conversationMemory = true;
                    logSuccess('✓ Conversation memory retrieved');
                }

                if (logPatterns.contextUsage.test(line)) {
                    results.contextUsage = true;
                    logSuccess('✓ Context processing active');
                }

                if (logPatterns.aiRequest.test(line)) {
                    results.aiRequest = true;
                    logSuccess('✓ AI SDK request sent');
                }

                if (logPatterns.aiResponse.test(line)) {
                    results.aiResponse = true;
                    logSuccess('✓ AI SDK response received');
                }

                if (logPatterns.contextValidation.test(line)) {
                    results.contextValidation = true;
                    logSuccess('✓ Context validation completed');
                }

                if (logPatterns.queueResolved.test(line)) {
                    results.queueResolved = true;
                    logSuccess('✓ Message queue resolved');

                    clearTimeout(timeout);
                    logMonitor.kill('SIGTERM');
                    setTimeout(() => resolve(results), 1000);
                    return;
                }

                if (logPatterns.error.test(line)) {
                    try {
                        const errorLog = JSON.parse(line);
                        results.errors.push(errorLog);
                        logError(`Error detected: ${JSON.stringify(errorLog.message)}`);
                    } catch (e) {
                        results.errors.push({ raw: line });
                        logError(`Error detected: ${line}`);
                    }
                }
            }
        });
    });
};

// Get current AI model info
const getAIModelInfo = async () => {
    try {
        const { stdout } = await execAsync('mongosh --quiet --eval "use grademe_db; db.Users.findOne({chatId: 830403309}, {currentAI: 1, _id: 0})"');
        const result = stdout.trim();
        if (result && result !== 'null') {
            const parsed = JSON.parse(result);
            return parsed.currentAI || 'unknown';
        }
        return 'not found';
    } catch (error) {
        logError(`Failed to get AI model info: ${error.message}`);
        return 'error';
    }
};

// Main test function
const runTelegramUITest = async () => {
    logSection('TELEGRAM UI EMULATION TEST (CONTAINER)');

    const testMessage = "Hello. What is this AI model ?";
    let testResults = {
        webhookSuccess: false,
        messageProcessed: false,
        aiResponseReceived: false,
        contextProcessingWorking: false,
        noErrors: true,
        overallSuccess: false
    };

    try {
        // Step 1: Get current AI model
        logInfo('Getting current AI model information...');
        const currentModel = await getAIModelInfo();
        logInfo(`Current AI model: ${currentModel}`);

        // Step 2: Send test message
        logSection('SENDING TEST MESSAGE');
        const webhookResult = await sendTelegramMessage(testMessage);

        if (!webhookResult.success) {
            logError('Webhook request failed - test cannot continue');
            testResults.overallSuccess = false;
            return testResults;
        }

        testResults.webhookSuccess = true;

        // Step 3: Monitor logs
        logSection('MONITORING PROCESSING LOGS');
        const logResults = await monitorLogs(webhookResult.messageId, 45000);

        // Step 4: Analyze results
        logSection('ANALYZING TEST RESULTS');

        if (logResults.messageReceived && logResults.queueResolved) {
            testResults.messageProcessed = true;
            logSuccess('Message processing: PASS');
        } else {
            logError('Message processing: FAIL');
            if (!logResults.messageReceived) logError('- Message not received by webhook');
            if (!logResults.queueResolved) logError('- Message queue not resolved');
        }

        if (logResults.aiRequest && logResults.aiResponse) {
            testResults.aiResponseReceived = true;
            logSuccess('AI API integration: PASS');
        } else {
            logError('AI API integration: FAIL');
            if (!logResults.aiRequest) logError('- No AI SDK request logged');
            if (!logResults.aiResponse) logError('- No AI SDK response received');
        }

        if (logResults.conversationMemory && logResults.contextUsage) {
            testResults.contextProcessingWorking = true;
            logSuccess('Context processing: PASS');
        } else {
            logWarning('Context processing: PARTIAL');
            if (!logResults.conversationMemory) logWarning('- No conversation memory retrieved');
            if (!logResults.contextUsage) logWarning('- No context usage logged');
        }

        if (logResults.errors.length > 0) {
            testResults.noErrors = false;
            logError(`Found ${logResults.errors.length} error(s) during processing`);
        } else {
            logSuccess('No errors detected: PASS');
        }

        const criticalTests = [
            testResults.webhookSuccess,
            testResults.messageProcessed,
            testResults.aiResponseReceived
        ];

        testResults.overallSuccess = criticalTests.every(test => test === true) && testResults.noErrors;

    } catch (error) {
        logError(`Test execution failed: ${error.message}`);
        testResults.overallSuccess = false;
    }

    // Final results
    logSection('FINAL TEST RESULTS');

    const resultColor = testResults.overallSuccess ? colors.green : colors.red;
    const resultIcon = testResults.overallSuccess ? '✅' : '❌';
    const resultText = testResults.overallSuccess ? 'PASSED' : 'FAILED';

    log(`${resultIcon} Overall Test Result: ${resultText}`, resultColor);

    console.log('\nDetailed Results:');
    console.log(`├─ Webhook Success: ${testResults.webhookSuccess ? '✅' : '❌'}`);
    console.log(`├─ Message Processed: ${testResults.messageProcessed ? '✅' : '❌'}`);
    console.log(`├─ AI Response: ${testResults.aiResponseReceived ? '✅' : '❌'}`);
    console.log(`├─ Context Processing: ${testResults.contextProcessingWorking ? '✅' : '⚠️'}`);
    console.log(`└─ No Errors: ${testResults.noErrors ? '✅' : '❌'}`);

    logSection('TEST COMPLETION');
    log(`Test completed at: ${new Date().toISOString()}`, colors.bright);

    process.exit(testResults.overallSuccess ? 0 : 1);
};

// Run the test
if (require.main === module) {
    runTelegramUITest().catch((error) => {
        logError(`Test failed with error: ${error.message}`);
        process.exit(1);
    });
}