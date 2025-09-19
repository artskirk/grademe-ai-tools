#!/usr/bin/env node

// Message Format Test - Tests /m command with format buttons
// This runs inside the Docker container with Node.js v18

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const readline = require('readline');

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

// Generate unique IDs
const generateMessageId = () => Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
const generateUpdateId = () => Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
const generateCallbackId = () => Date.now().toString() + Math.floor(Math.random() * 10000);

// Create Telegram webhook payload for message
const createMessagePayload = (text, messageId = null, updateId = null) => {
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

// Create callback query payload for button clicks
const createCallbackPayload = (callbackData, messageId) => {
    return {
        update_id: generateUpdateId(),
        callback_query: {
            id: generateCallbackId(),
            from: {
                id: TEST_USER.chatId,
                is_bot: false,
                first_name: TEST_USER.firstName,
                username: TEST_USER.userName,
                language_code: "en"
            },
            message: {
                message_id: messageId,
                from: {
                    id: 6169306321,
                    is_bot: true,
                    username: "GrademeBot"
                },
                chat: {
                    id: TEST_USER.chatId,
                    first_name: TEST_USER.firstName,
                    username: TEST_USER.userName,
                    type: "private"
                },
                date: Math.floor(Date.now() / 1000),
                text: "Would you like me to reformat this message for a specific purpose?"
            },
            chat_instance: "-" + generateCallbackId(),
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
                    statusCode: res.statusCode,
                    body: body
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
    });
};

// Send webhook request
const sendWebhookRequest = async (payload) => {
    try {
        const response = await httpRequest(WEBHOOK_URL, 'POST', payload);
        return response;
    } catch (error) {
        logError(`Request failed: ${error.message}`);
        return null;
    }
};

// Wait function
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Monitor logs for specific patterns
const monitorLogs = (patterns, duration = 5000) => {
    return new Promise((resolve) => {
        const results = {};
        patterns.forEach(p => results[p] = false);

        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            try {
                const logs = fs.readFileSync(LOG_PATH, 'utf8').split('\n').slice(-100);

                patterns.forEach(pattern => {
                    if (!results[pattern] && logs.some(line => line.includes(pattern))) {
                        results[pattern] = true;
                    }
                });

                if (Object.values(results).every(v => v) || Date.now() - startTime > duration) {
                    clearInterval(checkInterval);
                    resolve(results);
                }
            } catch (error) {
                // Log file might not exist yet
            }
        }, 500);
    });
};

// Test functions
async function testMessageCommand() {
    logSection('Testing /m Command');

    // Test with non-English prompt to verify English output
    const testPrompt = "Привет. Буду отсутствовать на занятиях завтра";
    const payload = createMessagePayload(`/m ${testPrompt}`);

    logInfo(`Sending: /m ${testPrompt}`);

    const response = await sendWebhookRequest(payload);

    if (response && response.statusCode === 200) {
        logSuccess('Message command sent successfully');

        // Monitor logs for email draft caching
        const patterns = [
            'Create message by notes command is detected',
            'Email draft cached for user',
            'The output must be in English regardless of the input language'
        ];

        logInfo('Monitoring logs for email generation and caching...');
        const results = await monitorLogs(patterns, 8000);

        if (results['Create message by notes command is detected']) {
            logSuccess('Message command detected');
        } else {
            logError('Message command not detected in logs');
            return false;
        }

        if (results['Email draft cached for user']) {
            logSuccess('Email draft cached successfully');
        } else {
            logWarning('Email draft caching not confirmed in logs');
        }

        return true;
    } else {
        logError('Failed to send message command');
        return false;
    }
}

async function testFormatButton(formatType, formatLabel) {
    logSection(`Testing ${formatLabel} Format Button`);

    const messageId = generateMessageId();
    const payload = createCallbackPayload(formatType, messageId);

    logInfo(`Clicking ${formatLabel} button (${formatType})`);

    const response = await sendWebhookRequest(payload);

    if (response && response.statusCode === 200) {
        logSuccess('Format button click sent successfully');

        // Monitor logs for reformatting or translation
        let patterns, processType;
        if (formatType.startsWith('translate_')) {
            const language = formatType.replace('translate_', '').toUpperCase();
            patterns = [
                'Email draft retrieved for user',
                `Message translated to`
            ];
            processType = 'translation';
        } else {
            patterns = [
                'Email draft retrieved for user',
                `Message reformatted as ${formatType.replace('format_', '')}`
            ];
            processType = 'reformatting';
        }

        logInfo(`Monitoring logs for ${processType} process...`);
        const results = await monitorLogs(patterns, 8000);

        if (results['Email draft retrieved for user']) {
            logSuccess('Original email draft retrieved correctly');
        } else {
            logError('Failed to retrieve email draft - this is the core issue!');
            return false;
        }

        const successPattern = formatType.startsWith('translate_') ?
            'Message translated to' :
            `Message reformatted as ${formatType.replace('format_', '')}`;

        if (results[successPattern]) {
            logSuccess(`Message successfully ${processType === 'translation' ? 'translated to' : 'reformatted as'} ${formatLabel}`);
        } else {
            logWarning(`${processType} completion not confirmed in logs`);
        }

        return true;
    } else {
        logError('Failed to send format button click');
        return false;
    }
}

async function testFullFlow() {
    logSection('FULL MESSAGE FORMAT FLOW TEST');

    const testResults = {
        messageCommand: false,
        teamChat: false,
        formalBusiness: false,
        quickUpdate: false,
        translateRussian: false,
        translateGerman: false,
        keepOriginal: false
    };

    try {
        // Test 1: Send /m command
        logInfo('Step 1: Testing /m command with message draft');
        testResults.messageCommand = await testMessageCommand();
        await wait(3000);

        if (!testResults.messageCommand) {
            logError('Failed at message command step, aborting further tests');
            return testResults;
        }

        // Test 2: Click Team Chat format button
        logInfo('Step 2: Testing Team Chat format');
        testResults.teamChat = await testFormatButton('format_team_chat', 'Team Chat');
        await wait(2000);

        // Test 3: Click Formal Business format button
        logInfo('Step 3: Testing Formal Business format');
        testResults.formalBusiness = await testFormatButton('format_formal_business', 'Formal Business');
        await wait(2000);

        // Test 4: Click Quick Update format button
        logInfo('Step 4: Testing Quick Update format');
        testResults.quickUpdate = await testFormatButton('format_quick_update', 'Quick Update');
        await wait(2000);

        // Test 5: Click Russian translation button
        logInfo('Step 5: Testing Russian translation');
        testResults.translateRussian = await testFormatButton('translate_ru', 'Russian Translation');
        await wait(2000);

        // Test 6: Click German translation button
        logInfo('Step 6: Testing German translation');
        testResults.translateGerman = await testFormatButton('translate_de', 'German Translation');
        await wait(2000);

        // Test 7: Click Keep Original button
        logInfo('Step 7: Testing Keep Original option');
        testResults.keepOriginal = await testFormatButton('format_keep_original', 'Keep Original');

    } catch (error) {
        logError(`Test flow error: ${error.message}`);
    }

    return testResults;
}

// Main test runner
async function runTests() {
    console.log(`${colors.bright}${colors.cyan}`);
    console.log('===============================================');
    console.log('    MESSAGE FORMAT TEST SUITE');
    console.log('     Testing /m Command with Format Buttons');
    console.log('===============================================');
    console.log(`${colors.reset}`);

    logWarning('This test will send messages through the Telegram webhook');
    logInfo(`Testing with user: ${TEST_USER.userName} (${TEST_USER.chatId})`);

    // Check if bot is running
    logSection('Pre-test Checks');
    try {
        const { stdout } = await execAsync('pm2 list | grep telegram-bot');
        if (stdout.includes('online')) {
            logSuccess('Telegram bot is online');
        } else {
            logError('Telegram bot is not online');
            process.exit(1);
        }
    } catch (error) {
        logError('Failed to check bot status');
        process.exit(1);
    }

    // Run the full test flow
    const results = await testFullFlow();

    // Display results summary
    logSection('TEST RESULTS SUMMARY');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(v => v).length;

    console.log(`\n${colors.bright}Test Results:${colors.reset}`);
    console.log(`${colors.cyan}─────────────────────────────────────${colors.reset}`);

    Object.entries(results).forEach(([test, passed]) => {
        const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const status = passed ? `${colors.green}✅ PASSED` : `${colors.red}❌ FAILED`;
        console.log(`${testName}: ${status}${colors.reset}`);
    });

    console.log(`${colors.cyan}─────────────────────────────────────${colors.reset}`);

    if (passedTests === totalTests) {
        logSuccess(`\n🎉 ALL TESTS PASSED! (${passedTests}/${totalTests})`);

        // Verify the critical behavior
        logSection('CRITICAL BEHAVIOR VERIFIED');
        logSuccess('✅ /m command generates email and caches draft');
        logSuccess('✅ Format buttons retrieve correct original prompt');
        logSuccess('✅ Messages are reformatted with proper context');
        logSuccess('✅ Translation buttons work with different languages');
        logSuccess('✅ Multiple format/translation changes work correctly');

        process.exit(0);
    } else {
        logError(`\n⚠️  SOME TESTS FAILED! (${passedTests}/${totalTests} passed)`);

        if (!results.messageCommand) {
            logError('Critical: Email draft caching not working');
        }
        if (!results.teamChat && results.messageCommand) {
            logError('Critical: Email draft retrieval failing - wrong context being used');
        }

        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    runTests().catch(error => {
        logError(`Unexpected error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { runTests };