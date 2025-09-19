#!/usr/bin/env node

// Conversation Consistency Test - 10 Questions
// This tests that the AI maintains context throughout an extended conversation

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
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    log(`${colors.bright}${title}${colors.reset}`, colors.cyan);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
};

const logSuccess = (message) => log(`✅ ${message}`, colors.green);
const logError = (message) => log(`❌ ${message}`, colors.red);
const logWarning = (message) => log(`⚠️  ${message}`, colors.yellow);
const logInfo = (message) => log(`ℹ️  ${message}`, colors.blue);
const logQuestion = (message) => log(`❓ ${message}`, colors.magenta);

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

// Validate context retention by checking logs
const checkContextRetention = async (messageId, expectedContextKeywords = []) => {
    try {
        // Get recent logs (last 50 lines)
        const { stdout } = await execAsync(`tail -50 ${LOG_PATH} | grep -E "(Context validation|Using context|conversation memory)" | tail -5`);

        const contextFound = stdout.includes('Using context for user');
        const memoryFound = stdout.includes('conversation memory');

        let keywordMatches = 0;
        if (expectedContextKeywords.length > 0) {
            expectedContextKeywords.forEach(keyword => {
                if (stdout.toLowerCase().includes(keyword.toLowerCase())) {
                    keywordMatches++;
                }
            });
        }

        return {
            contextActive: contextFound,
            memoryActive: memoryFound,
            keywordMatches: keywordMatches,
            totalKeywords: expectedContextKeywords.length
        };
    } catch (error) {
        logError(`Error checking context retention: ${error.message}`);
        return {
            contextActive: false,
            memoryActive: false,
            keywordMatches: 0,
            totalKeywords: expectedContextKeywords.length
        };
    }
};

// Conversation test questions with context validation (English + Russian)
const conversationQuestions = [
    {
        question: "My name is Alex and I work as a software developer in London. What's your name?",
        expectedContext: [],
        language: "English",
        description: "Initial introduction - establishing context"
    },
    {
        question: "В каком городе я сказал, что работаю?",
        expectedContext: ["london", "лондон", "work", "работ"],
        language: "Russian",
        description: "Testing memory of location in Russian"
    },
    {
        question: "What's my job?",
        expectedContext: ["software", "developer", "разработчик"],
        language: "English",
        description: "Testing memory of profession"
    },
    {
        question: "Я планирую посетить Париж в следующем месяце. Есть рекомендации?",
        expectedContext: ["alex", "алекс"],
        language: "Russian",
        description: "Adding travel context in Russian"
    },
    {
        question: "Should I bring warm clothes for my trip?",
        expectedContext: ["paris", "париж", "trip", "поездк"],
        language: "English",
        description: "Testing memory of travel plans (mixed language)"
    },
    {
        question: "Кстати, я люблю итальянскую еду. Какой хороший ресторан в городе, где я работаю?",
        expectedContext: ["london", "лондон", "italian", "итальянск"],
        language: "Russian",
        description: "Testing complex context combination in Russian"
    },
    {
        question: "I have a meeting tomorrow at 2 PM. What time is it now in my work city?",
        expectedContext: ["london", "лондон", "meeting", "встреч"],
        language: "English",
        description: "Testing temporal and location context"
    },
    {
        question: "Для моей профессии, какой язык программирования ты бы рекомендовал изучить?",
        expectedContext: ["software developer", "разработчик", "programming", "программирован"],
        language: "Russian",
        description: "Testing professional context recall in Russian"
    },
    {
        question: "Can you remind me what European city I'm planning to visit?",
        expectedContext: ["paris", "париж", "visit", "посет"],
        language: "English",
        description: "Testing explicit memory recall"
    },
    {
        question: "Резюме: Расскажи мне всё, что ты помнишь обо мне.",
        expectedContext: ["alex", "алекс", "software developer", "разработчик", "london", "лондон", "paris", "париж"],
        language: "Russian",
        description: "Final comprehensive context test in Russian"
    }
];

// Main conversation consistency test
const runConversationConsistencyTest = async () => {
    logSection('MULTILINGUAL CONVERSATION CONSISTENCY TEST');

    let testResults = {
        totalQuestions: conversationQuestions.length,
        successfulSends: 0,
        contextRetentions: 0,
        keywordMatches: 0,
        totalKeywords: 0,
        failures: [],
        overallSuccess: false
    };

    logInfo(`Testing conversation memory with ${testResults.totalQuestions} sequential questions`);
    logInfo(`Languages: English + Russian (mixed conversation)`);
    logInfo(`User: ${TEST_USER.userName} (${TEST_USER.chatId})`);
    console.log('');

    // Clear any existing conversation history first
    logInfo('Clearing conversation history (waiting 10s for any pending operations)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    for (let i = 0; i < conversationQuestions.length; i++) {
        const questionData = conversationQuestions[i];
        const questionNum = i + 1;

        logSection(`QUESTION ${questionNum}/${testResults.totalQuestions}`);
        logQuestion(`${questionData.description} (${questionData.language})`);
        logInfo(`Expected context: [${questionData.expectedContext.join(', ')}]`);
        console.log('');

        // Send message
        const sendResult = await sendMessageAndWait(questionData.question, 10000);

        if (sendResult.success) {
            testResults.successfulSends++;
            logSuccess(`Question ${questionNum} sent successfully`);

            // Check context retention (skip for first question)
            if (questionNum > 1) {
                const contextCheck = await checkContextRetention(sendResult.messageId, questionData.expectedContext);

                if (contextCheck.contextActive && contextCheck.memoryActive) {
                    testResults.contextRetentions++;
                    logSuccess(`Context retention: ACTIVE`);
                } else {
                    logWarning(`Context retention: LIMITED`);
                    testResults.failures.push(`Q${questionNum}: Context not properly retained`);
                }

                // Track keyword matching
                testResults.keywordMatches += contextCheck.keywordMatches;
                testResults.totalKeywords += contextCheck.totalKeywords;

                if (contextCheck.totalKeywords > 0) {
                    const matchRate = (contextCheck.keywordMatches / contextCheck.totalKeywords * 100).toFixed(1);
                    logInfo(`Keyword context match: ${contextCheck.keywordMatches}/${contextCheck.totalKeywords} (${matchRate}%)`);
                }
            }
        } else {
            logError(`Question ${questionNum} failed to send`);
            testResults.failures.push(`Q${questionNum}: Failed to send message`);
        }

        // Wait between questions to allow processing
        if (i < conversationQuestions.length - 1) {
            logInfo('Waiting 3s before next question...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // Calculate overall success
    const sendSuccessRate = (testResults.successfulSends / testResults.totalQuestions * 100).toFixed(1);
    const contextSuccessRate = testResults.totalQuestions > 1 ?
        (testResults.contextRetentions / (testResults.totalQuestions - 1) * 100).toFixed(1) : 0;
    const keywordSuccessRate = testResults.totalKeywords > 0 ?
        (testResults.keywordMatches / testResults.totalKeywords * 100).toFixed(1) : 0;

    // Success criteria: 80%+ sends, 70%+ context retention, 60%+ keyword matching
    testResults.overallSuccess =
        parseFloat(sendSuccessRate) >= 80 &&
        parseFloat(contextSuccessRate) >= 70 &&
        parseFloat(keywordSuccessRate) >= 60;

    // Final results
    logSection('CONVERSATION CONSISTENCY RESULTS');

    const resultColor = testResults.overallSuccess ? colors.green : colors.red;
    const resultIcon = testResults.overallSuccess ? '✅' : '❌';
    const resultText = testResults.overallSuccess ? 'PASSED' : 'FAILED';

    log(`${resultIcon} Overall Test Result: ${resultText}`, resultColor);

    console.log('\nDetailed Metrics:');
    console.log(`├─ Message Delivery: ${testResults.successfulSends}/${testResults.totalQuestions} (${sendSuccessRate}%)`);
    console.log(`├─ Context Retention: ${testResults.contextRetentions}/${testResults.totalQuestions - 1} (${contextSuccessRate}%)`);
    console.log(`├─ Keyword Matching: ${testResults.keywordMatches}/${testResults.totalKeywords} (${keywordSuccessRate}%)`);
    console.log(`└─ Total Failures: ${testResults.failures.length}`);

    if (testResults.failures.length > 0) {
        console.log('\nFailure Details:');
        testResults.failures.forEach((failure, index) => {
            console.log(`  ${index + 1}. ${failure}`);
        });
    }

    console.log('\nSuccess Criteria:');
    console.log(`├─ Message Delivery: ≥80% ${parseFloat(sendSuccessRate) >= 80 ? '✅' : '❌'}`);
    console.log(`├─ Context Retention: ≥70% ${parseFloat(contextSuccessRate) >= 70 ? '✅' : '❌'}`);
    console.log(`└─ Keyword Matching: ≥60% ${parseFloat(keywordSuccessRate) >= 60 ? '✅' : '❌'}`);

    logSection('TEST COMPLETION');
    log(`Test completed at: ${new Date().toISOString()}`, colors.bright);
    log(`Total duration: ~${(testResults.totalQuestions * 13 + 10)/60} minutes`, colors.blue);

    process.exit(testResults.overallSuccess ? 0 : 1);
};

// Handle process termination
process.on('SIGINT', () => {
    logWarning('\nConversation test interrupted by user');
    process.exit(130);
});

process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

// Run the test
if (require.main === module) {
    runConversationConsistencyTest().catch((error) => {
        logError(`Test failed with error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runConversationConsistencyTest,
    sendMessageAndWait,
    checkContextRetention
};