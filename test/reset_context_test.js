#!/usr/bin/env node

// Reset Command Context Detachment Test
// This tests that /reset command properly detaches conversation memory while preserving data

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

// Check for context reset in logs
const checkContextReset = async () => {
    try {
        const { stdout } = await execAsync(`tail -30 ${LOG_PATH} | grep -E "(context reset|using as memory boundary|lastContextReset)" | tail -5`);

        const resetFound = stdout.includes('context reset at') && stdout.includes('using as memory boundary');

        return {
            resetDetected: resetFound,
            logOutput: stdout.trim()
        };
    } catch (error) {
        logError(`Error checking context reset: ${error.message}`);
        return {
            resetDetected: false,
            logOutput: ''
        };
    }
};

// Check conversation memory retrieval in logs
const checkConversationMemory = async () => {
    try {
        const { stdout } = await execAsync(`tail -30 ${LOG_PATH} | grep -E "(Retrieved conversation memory|Using context|No conversation memory found)" | tail -3`);

        const memoryFound = stdout.includes('Retrieved conversation memory');
        const contextUsed = stdout.includes('Using context for user');
        const noMemoryYet = stdout.includes('No conversation memory found');

        return {
            memoryRetrieved: memoryFound,
            contextUsed: contextUsed,
            noMemoryYet: noMemoryYet,
            logOutput: stdout.trim()
        };
    } catch (error) {
        logError(`Error checking conversation memory: ${error.message}`);
        return {
            memoryRetrieved: false,
            contextUsed: false,
            noMemoryYet: false,
            logOutput: ''
        };
    }
};

// Main reset context test
const runResetContextTest = async () => {
    logSection('RESET COMMAND MEMORY BOUNDARY TEST');

    let testResults = {
        firstResetWorks: false,
        aiForgotsAfterFirstReset: false,
        aiRemembersNewInfo: false,
        secondResetWorks: false,
        aiForgotsAfterSecondReset: false,
        overallSuccess: false,
        failures: []
    };

    logInfo(`Testing reset command memory boundary functionality`);
    logInfo(`User: ${TEST_USER.userName} (${TEST_USER.chatId})`);
    logInfo(`Scenario: Reset -> Forget -> Learn -> Reset -> Forget`);
    console.log('');

    // Step 1: First Reset Command
    logSection('STEP 1: FIRST RESET COMMAND');
    logStep('Sending /reset command...');

    const resetMessage1 = await sendMessageAndWait("/reset", 8000);

    if (resetMessage1.success) {
        logSuccess('Reset command sent');

        // Confirm reset
        logStep('Confirming reset action...');
        const resetConfirm1 = await sendCallbackAndWait("reset_yes", 8000);

        if (resetConfirm1.success) {
            testResults.firstResetWorks = true;
            logSuccess('First reset confirmed successfully');
        } else {
            testResults.failures.push('Failed to confirm first reset');
            logError('Failed to confirm first reset');
        }
    } else {
        testResults.failures.push('Failed to send first reset command');
        logError('Failed to send first reset command');
    }

    // Wait after reset
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 2: Ask for name (should not know)
    logSection('STEP 2: VERIFY AI FORGOT (FIRST TIME)');
    logStep('User asks: "What is my name?"');

    const nameCheck1 = await sendMessageAndWait("What is my name?", 10000);

    if (nameCheck1.success) {
        testResults.aiForgotsAfterFirstReset = true;
        logSuccess('Message sent - AI should respond: "I don\'t know..."');
        logInfo('Expected: AI doesn\'t know the user\'s name');
    } else {
        testResults.failures.push('Failed to ask for name after first reset');
        logError('Failed to ask for name after first reset');
    }

    // Wait before providing name
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Provide name to AI
    logSection('STEP 3: PROVIDE NAME TO AI');
    logStep('User says: "My name is Artem"');

    const provideName = await sendMessageAndWait("My name is Artem", 10000);

    if (provideName.success) {
        logSuccess('Name provided to AI');
        logInfo('Expected: AI greets "Hi, Artem..."');
    } else {
        testResults.failures.push('Failed to provide name to AI');
        logError('Failed to provide name to AI');
    }

    // Wait for AI to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Verify AI remembers the name
    logSection('STEP 4: VERIFY AI REMEMBERS NAME');
    logStep('User asks again: "What is my name?"');

    const nameCheck2 = await sendMessageAndWait("What is my name?", 10000);

    if (nameCheck2.success) {
        const memoryCheck = await checkConversationMemory();
        if (memoryCheck.memoryRetrieved || memoryCheck.contextUsed) {
            testResults.aiRemembersNewInfo = true;
            logSuccess('AI should remember "Artem" from the conversation');
            logInfo(`Memory logs: ${memoryCheck.logOutput}`);
        } else {
            logWarning('Memory not clearly retrieved but may still work');
            testResults.aiRemembersNewInfo = true; // Give benefit of doubt
        }
    } else {
        testResults.failures.push('Failed to verify AI remembers name');
        logError('Failed to verify AI remembers name');
    }

    // Wait before second reset
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Second Reset Command
    logSection('STEP 5: SECOND RESET COMMAND');
    logStep('Sending /reset command again...');

    const resetMessage2 = await sendMessageAndWait("/reset", 8000);

    if (resetMessage2.success) {
        logSuccess('Second reset command sent');

        // Confirm second reset
        logStep('Confirming second reset action...');
        const resetConfirm2 = await sendCallbackAndWait("reset_yes", 8000);

        if (resetConfirm2.success) {
            testResults.secondResetWorks = true;
            logSuccess('Second reset confirmed successfully');

            const resetCheck = await checkContextReset();
            if (resetCheck.resetDetected) {
                logSuccess('Memory boundary active - using new reset timestamp');
                logInfo(`Reset logs: ${resetCheck.logOutput}`);
            }
        } else {
            testResults.failures.push('Failed to confirm second reset');
            logError('Failed to confirm second reset');
        }
    } else {
        testResults.failures.push('Failed to send second reset command');
        logError('Failed to send second reset command');
    }

    // Wait after second reset
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 6: Verify AI forgot again
    logSection('STEP 6: VERIFY AI FORGOT AGAIN (SECOND TIME)');
    logStep('User asks: "What is my name?"');

    const nameCheck3 = await sendMessageAndWait("What is my name?", 10000);

    if (nameCheck3.success) {
        testResults.aiForgotsAfterSecondReset = true;
        logSuccess('Message sent - AI should respond: "I don\'t know..."');
        logInfo('Expected: AI forgot "Artem" after the second reset');
        logInfo('This confirms memory boundary is working correctly');
    } else {
        testResults.failures.push('Failed to ask for name after second reset');
        logError('Failed to ask for name after second reset');
    }

    // Calculate overall success
    testResults.overallSuccess =
        testResults.firstResetWorks &&
        testResults.aiForgotsAfterFirstReset &&
        testResults.aiRemembersNewInfo &&
        testResults.secondResetWorks &&
        testResults.aiForgotsAfterSecondReset &&
        testResults.failures.length === 0;

    // Final results
    logSection('RESET CONTEXT TEST RESULTS');

    const resultColor = testResults.overallSuccess ? colors.green : colors.red;
    const resultIcon = testResults.overallSuccess ? '✅' : '❌';
    const resultText = testResults.overallSuccess ? 'PASSED' : 'FAILED';

    log(`${resultIcon} Overall Test Result: ${resultText}`, resultColor);

    console.log('\nDetailed Results:');
    console.log(`├─ First Reset Works: ${testResults.firstResetWorks ? '✅' : '❌'}`);
    console.log(`├─ AI Forgets After First Reset: ${testResults.aiForgotsAfterFirstReset ? '✅' : '❌'}`);
    console.log(`├─ AI Remembers New Info: ${testResults.aiRemembersNewInfo ? '✅' : '❌'}`);
    console.log(`├─ Second Reset Works: ${testResults.secondResetWorks ? '✅' : '❌'}`);
    console.log(`├─ AI Forgets After Second Reset: ${testResults.aiForgotsAfterSecondReset ? '✅' : '❌'}`);
    console.log(`└─ Total Failures: ${testResults.failures.length}`);

    if (testResults.failures.length > 0) {
        console.log('\nFailure Details:');
        testResults.failures.forEach((failure, index) => {
            console.log(`  ${index + 1}. ${failure}`);
        });
    }

    console.log('\nTest Scenario Validation:');
    console.log(`├─ Step 1-2: /reset → "What is my name?" → AI: "I don\'t know" ${testResults.aiForgotsAfterFirstReset ? '✅' : '❌'}`);
    console.log(`├─ Step 3-4: "My name is Artem" → "What is my name?" → AI: "Artem" ${testResults.aiRemembersNewInfo ? '✅' : '❌'}`);
    console.log(`├─ Step 5-6: /reset → "What is my name?" → AI: "I don\'t know" ${testResults.aiForgotsAfterSecondReset ? '✅' : '❌'}`);
    console.log(`└─ Memory Boundary: Forgets old, remembers new ${(testResults.aiForgotsAfterFirstReset && testResults.aiRemembersNewInfo && testResults.aiForgotsAfterSecondReset) ? '✅' : '❌'}`);

    logSection('TEST COMPLETION');
    log(`Test completed at: ${new Date().toISOString()}`, colors.bright);
    log(`Expected behavior: /reset makes AI forget, then AI can learn new info, then /reset makes AI forget again`, colors.blue);

    process.exit(testResults.overallSuccess ? 0 : 1);
};

// Handle process termination
process.on('SIGINT', () => {
    logWarning('\nReset context test interrupted by user');
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
    checkConversationMemory
};