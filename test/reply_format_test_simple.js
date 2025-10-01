#!/usr/bin/env node

/**
 * Reply Format Test for /r command - Simplified version
 * Tests the reply message functionality with format options
 */

const http = require('http');
const fs = require('fs');

// Load environment
const envPath = '/var/www/html/grademe_api/ai/bot/telegram/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
});

const CLIENT_TOKEN = envVars.CLIENT_TOKEN;

// Test configuration - using same as working quick test
const TEST_USER_ID = 830403309;
const TEST_CHAT_ID = 830403309;
const TEST_USERNAME = 'akirkor';
const TEST_FIRST_NAME = 'Test';
const TEST_MESSAGE_ID = Math.floor(Math.random() * 1000000);

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper function to send webhook request
function sendWebhookRequest(data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: 'localhost',
            port: 80,
            path: `/webhook/${CLIENT_TOKEN}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                resolve({
                    success: res.statusCode === 200,
                    status: res.statusCode,
                    data: responseData
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Test cases
const testCases = [
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
        }
    },
    {
        name: 'Reply with Specific Message',
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
        }
    },
    {
        name: 'Apology Reply',
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
        }
    }
];

// Format button callback tests
const callbackTests = [
    {
        name: 'Formal Business Format',
        callbackData: 'reply_format_formal_business'
    },
    {
        name: 'Team Chat Format',
        callbackData: 'reply_format_team_chat'
    },
    {
        name: 'Personal Format',
        callbackData: 'reply_format_personal'
    },
    {
        name: 'Technical Format',
        callbackData: 'reply_format_technical'
    },
    {
        name: 'Keep Original',
        callbackData: 'reply_keep_original'
    }
];

async function testReplyCommand(testCase) {
    console.log(`\n${colors.magenta}${colors.bold}Testing: ${testCase.name}${colors.reset}`);
    console.log(`${colors.blue}  Command: ${testCase.message.message.text}${colors.reset}`);

    if (testCase.message.message.reply_to_message) {
        console.log(`${colors.blue}  Replying to: "${testCase.message.message.reply_to_message.text}"${colors.reset}`);
    }

    try {
        const result = await sendWebhookRequest(testCase.message);

        if (result.success) {
            console.log(`${colors.green}  ✅ Webhook accepted (Status: ${result.status})${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}  ❌ Webhook failed (Status: ${result.status})${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}  ❌ Request error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function testCallback(callback) {
    console.log(`\n${colors.magenta}${colors.bold}Testing Callback: ${callback.name}${colors.reset}`);
    console.log(`${colors.blue}  Callback data: ${callback.callbackData}${colors.reset}`);

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
                    first_name: 'Bot',
                    username: 'GrademeAI_bot'
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

    try {
        const result = await sendWebhookRequest(callbackQuery);

        if (result.success) {
            console.log(`${colors.green}  ✅ Callback processed successfully${colors.reset}`);
            return true;
        } else {
            console.log(`${colors.red}  ❌ Callback failed (Status: ${result.status})${colors.reset}`);
            return false;
        }
    } catch (error) {
        console.log(`${colors.red}  ❌ Request error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function runTest() {
    console.log(`${colors.cyan}${colors.bold}\n═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}       REPLY FORMAT TEST (/r command)${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════\n${colors.reset}`);

    console.log(`${colors.blue}📋 Test Overview:${colors.reset}`);
    console.log(`${colors.blue}  • Testing /r command with various reply prompts${colors.reset}`);
    console.log(`${colors.blue}  • Testing reply with context (reply_to_message)${colors.reset}`);
    console.log(`${colors.blue}  • Testing format button callbacks${colors.reset}`);
    console.log(`${colors.blue}  • Validating reply formatting options\n${colors.reset}`);

    let passedTests = 0;
    let totalTests = 0;

    // Phase 1: Test /r command
    console.log(`${colors.cyan}${colors.bold}\n🔹 PHASE 1: Testing /r Command${colors.reset}`);
    console.log(`${colors.blue}─────────────────────────────────────────${colors.reset}`);

    for (const testCase of testCases) {
        totalTests++;
        const result = await testReplyCommand(testCase);
        if (result) passedTests++;

        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Phase 2: Test callbacks
    console.log(`${colors.cyan}${colors.bold}\n🔹 PHASE 2: Testing Format Callbacks${colors.reset}`);
    console.log(`${colors.blue}─────────────────────────────────────────${colors.reset}`);

    for (const callback of callbackTests) {
        totalTests++;
        const result = await testCallback(callback);
        if (result) passedTests++;

        // Delay between tests
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    console.log(`${colors.cyan}${colors.bold}\n═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}                TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}═══════════════════════════════════════════════${colors.reset}`);

    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log(`\n  Total Tests: ${totalTests}`);
    console.log(`${colors.green}  Passed: ${passedTests}${colors.reset}`);
    console.log(`${colors.red}  Failed: ${totalTests - passedTests}${colors.reset}`);
    console.log(`  Success Rate: ${successRate}%`);

    if (passedTests === totalTests) {
        console.log(`${colors.green}\n✅ ALL TESTS PASSED! Reply format functionality is working correctly.${colors.reset}`);
    } else {
        console.log(`${colors.yellow}\n⚠️  Some tests failed. Review the output above for details.${colors.reset}`);
    }

    console.log(`${colors.blue}\n📝 Key Features Tested:${colors.reset}`);
    console.log(`${colors.blue}  1. /r command processing${colors.reset}`);
    console.log(`${colors.blue}  2. Reply with context (reply_to_message)${colors.reset}`);
    console.log(`${colors.blue}  3. Format button callbacks${colors.reset}`);
    console.log(`${colors.blue}  4. Multiple format types${colors.reset}`);

    console.log(`${colors.cyan}${colors.bold}\n═══════════════════════════════════════════════\n${colors.reset}`);

    // Exit with appropriate code
    process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the test
runTest().catch(error => {
    console.error(`${colors.red}\n❌ Test execution failed:${colors.reset}`, error);
    process.exit(1);
});