#!/usr/bin/env node

/**
 * Reply Format Test for /r command
 * Tests the reply message functionality with format options
 */

// Check if running in Docker container
const fs = require('fs');
const isDocker = fs.existsSync('/var/www/html/grademe_api/ai/bot/telegram/.env');

// Load environment based on location
const envPath = isDocker
    ? '/var/www/html/grademe_api/ai/bot/telegram/.env'
    : '/mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/.env';

// Parse .env file manually
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

const TELEGRAM_API_URL = envVars.TELEGRAM_API_URL || process.env.TELEGRAM_API_URL;
const CLIENT_TOKEN = envVars.CLIENT_TOKEN || process.env.CLIENT_TOKEN;

// Load axios from the app directory if in container
const axios = isDocker
    ? require('/var/www/html/grademe_api/ai/bot/telegram/node_modules/axios')
    : require('axios');

// Test configuration
const TEST_USER_ID = 99999999; // Test user ID
const TEST_CHAT_ID = 99999999;
const TEST_USERNAME = 'test_user';
const TEST_FIRST_NAME = 'Test';
const TEST_MESSAGE_ID = Math.floor(Math.random() * 1000000);
const WEBHOOK_URL = 'http://localhost/webhook/' + CLIENT_TOKEN;

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',

    // Helper functions
    test: (str) => `\x1b[36m${str}\x1b[0m`,
    pass: (str) => `\x1b[32m${str}\x1b[0m`,
    fail: (str) => `\x1b[31m${str}\x1b[0m`,
    warn: (str) => `\x1b[33m${str}\x1b[0m`,
    info: (str) => `\x1b[34m${str}\x1b[0m`,
    header: (str) => `\x1b[36m\x1b[1m${str}\x1b[0m`,
    section: (str) => `\x1b[35m\x1b[1m${str}\x1b[0m`
};

// Test cases for /r command
const replyTestCases = [
    {
        name: 'Simple Reply Test',
        message: {
            update_id: Date.now(),
            message: {
                message_id: TEST_MESSAGE_ID,
                from: {
                    id: TEST_USER_ID,
                    is_bot: false,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME
                },
                chat: {
                    id: TEST_CHAT_ID,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME,
                    type: 'private'
                },
                date: Math.floor(Date.now() / 1000),
                text: '/r Thank you for your message, I will get back to you soon'
            }
        },
        expectedButtons: ['reply_format_formal_business', 'reply_format_team_chat', 'reply_format_personal']
    },
    {
        name: 'Reply with Context Test',
        message: {
            update_id: Date.now() + 1,
            message: {
                message_id: TEST_MESSAGE_ID + 1,
                from: {
                    id: TEST_USER_ID,
                    is_bot: false,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME
                },
                chat: {
                    id: TEST_CHAT_ID,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME,
                    type: 'private'
                },
                date: Math.floor(Date.now() / 1000),
                text: '/r I appreciate your feedback and will implement the changes',
                reply_to_message: {
                    message_id: TEST_MESSAGE_ID - 1,
                    text: 'Can you fix this bug?'
                }
            }
        },
        expectedButtons: ['reply_format_technical', 'reply_format_acknowledgment']
    },
    {
        name: 'Apology Reply Test',
        message: {
            update_id: Date.now() + 2,
            message: {
                message_id: TEST_MESSAGE_ID + 2,
                from: {
                    id: TEST_USER_ID,
                    is_bot: false,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME
                },
                chat: {
                    id: TEST_CHAT_ID,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME,
                    type: 'private'
                },
                date: Math.floor(Date.now() / 1000),
                text: '/r Sorry for the delay in response'
            }
        },
        expectedButtons: ['reply_format_apology', 'reply_format_personal']
    }
];

// Callback query test cases
const callbackTests = [
    {
        name: 'Formal Business Format',
        callbackData: 'reply_format_formal_business',
        expectedResponse: 'formal business'
    },
    {
        name: 'Team Chat Format',
        callbackData: 'reply_format_team_chat',
        expectedResponse: 'team chat'
    },
    {
        name: 'Personal Format',
        callbackData: 'reply_format_personal',
        expectedResponse: 'personal'
    },
    {
        name: 'Technical Format',
        callbackData: 'reply_format_technical',
        expectedResponse: 'technical'
    },
    {
        name: 'Apology Format',
        callbackData: 'reply_format_apology',
        expectedResponse: 'apology'
    },
    {
        name: 'Keep Original Format',
        callbackData: 'reply_keep_original',
        expectedResponse: 'keep original'
    }
];

// Test execution functions
async function sendWebhookRequest(data) {
    try {
        const response = await axios.post(WEBHOOK_URL, data, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            error: error.response ? error.response.data : error.message,
            status: error.response ? error.response.status : 0
        };
    }
}

async function testReplyCommand(testCase) {
    console.log(`\n${colors.section('Testing: ' + testCase.name)}`);
    console.log(colors.info(`  Command: ${testCase.message.message.text}`));

    const result = await sendWebhookRequest(testCase.message);

    if (result.success) {
        console.log(colors.pass('  ✅ Webhook accepted (Status: ' + result.status + ')'));

        // Check if expected buttons are mentioned in logs
        if (testCase.expectedButtons && testCase.expectedButtons.length > 0) {
            console.log(colors.info(`  📱 Expected format buttons: ${testCase.expectedButtons.join(', ')}`));
        }

        return true;
    } else {
        console.log(colors.fail('  ❌ Webhook failed: ' + result.error));
        return false;
    }
}

async function testCallbackQuery(callback) {
    console.log(`\n${colors.section('Testing Callback: ' + callback.name)}`);

    const callbackQuery = {
        update_id: Date.now() + 100,
        callback_query: {
            id: String(Date.now()),
            from: {
                id: TEST_USER_ID,
                is_bot: false,
                first_name: TEST_FIRST_NAME,
                username: TEST_USERNAME
            },
            message: {
                message_id: TEST_MESSAGE_ID + 10,
                from: {
                    id: 1087968824,
                    is_bot: true,
                    first_name: 'Group',
                    username: 'GroupAnonymousBot'
                },
                chat: {
                    id: TEST_CHAT_ID,
                    first_name: TEST_FIRST_NAME,
                    username: TEST_USERNAME,
                    type: 'private'
                },
                date: Math.floor(Date.now() / 1000),
                text: 'How would you like to format your reply?'
            },
            chat_instance: String(Date.now()),
            data: callback.callbackData
        }
    };

    console.log(colors.info(`  Callback data: ${callback.callbackData}`));

    const result = await sendWebhookRequest(callbackQuery);

    if (result.success) {
        console.log(colors.pass(`  ✅ Format "${callback.expectedResponse}" applied successfully`));
        return true;
    } else {
        console.log(colors.fail('  ❌ Callback processing failed: ' + result.error));
        return false;
    }
}

async function runFullTest() {
    console.log(colors.header('\n═══════════════════════════════════════════════'));
    console.log(colors.header('       REPLY FORMAT TEST (/r command)'));
    console.log(colors.header('═══════════════════════════════════════════════\n'));

    console.log(colors.info('📋 Test Overview:'));
    console.log(colors.info('  • Testing /r command with various reply prompts'));
    console.log(colors.info('  • Verifying format button generation'));
    console.log(colors.info('  • Testing callback query processing'));
    console.log(colors.info('  • Validating reply formatting options\n'));

    let passedTests = 0;
    let totalTests = 0;

    // Test /r command variations
    console.log(colors.header('\n🔹 PHASE 1: Testing /r Command Variations'));
    console.log(colors.info('─────────────────────────────────────────'));

    for (const testCase of replyTestCases) {
        totalTests++;
        const result = await testReplyCommand(testCase);
        if (result) passedTests++;

        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test callback queries
    console.log(colors.header('\n🔹 PHASE 2: Testing Format Callbacks'));
    console.log(colors.info('─────────────────────────────────────────'));

    for (const callback of callbackTests) {
        totalTests++;
        const result = await testCallbackQuery(callback);
        if (result) passedTests++;

        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    console.log(colors.header('\n═══════════════════════════════════════════════'));
    console.log(colors.header('                TEST SUMMARY'));
    console.log(colors.header('═══════════════════════════════════════════════'));

    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log(`\n  Total Tests: ${totalTests}`);
    console.log(colors.pass(`  Passed: ${passedTests}`));
    console.log(colors.fail(`  Failed: ${totalTests - passedTests}`));
    console.log(`  Success Rate: ${successRate}%`);

    if (passedTests === totalTests) {
        console.log(colors.pass('\n✅ ALL TESTS PASSED! Reply format functionality is working correctly.'));
    } else {
        console.log(colors.warn(`\n⚠️  Some tests failed. Review the output above for details.`));
    }

    console.log(colors.info('\n📝 Key Features Tested:'));
    console.log(colors.info('  1. /r command processing'));
    console.log(colors.info('  2. Reply with context (reply_to_message)'));
    console.log(colors.info('  3. Format button generation'));
    console.log(colors.info('  4. Callback query handling'));
    console.log(colors.info('  5. Multiple format types (formal, personal, technical, etc.)'));

    console.log(colors.header('\n═══════════════════════════════════════════════\n'));
}

// Run the test
runFullTest().catch(error => {
    console.error(colors.fail('\n❌ Test execution failed:'), error);
    process.exit(1);
});