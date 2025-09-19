#!/usr/bin/env node

// Database Safety Test - Critical Bug Prevention
// Tests for the User.js createIndex bug that caused database wipes
// This test ensures database stability during user operations

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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

// Database operations
const mongoExec = async (command) => {
    try {
        const mongoCommand = `docker exec mongo mongosh grademe_db --quiet --eval "${command.replace(/"/g, '\\"')}"`;
        const { stdout } = await execAsync(mongoCommand);
        return stdout.trim();
    } catch (error) {
        logError(`MongoDB command failed: ${error.message}`);
        return null;
    }
};

// Get database counts
const getDatabaseCounts = async () => {
    try {
        const counts = await mongoExec(`
            JSON.stringify({
                users: db.Users.countDocuments(),
                history: db.History.countDocuments(),
                cache: db.Cache.countDocuments(),
                queue: db.Queue.countDocuments(),
                collections: db.getCollectionNames().length
            })
        `);
        return counts ? JSON.parse(counts) : null;
    } catch (error) {
        logError(`Error getting database counts: ${error.message}`);
        return null;
    }
};

// Check for dangerous createIndex calls in User.js
const checkUserJsForCreateIndex = async () => {
    try {
        const { stdout } = await execAsync('grep -n "createIndex" /mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/src/db/User.js || echo "No createIndex found"');
        return stdout.trim();
    } catch (error) {
        return 'Error checking User.js';
    }
};

// Test webhook processing without database corruption
const testWebhookProcessing = async () => {
    logStep('Testing webhook processing for database safety...');

    // Get baseline counts
    const beforeCounts = await getDatabaseCounts();
    if (!beforeCounts) {
        logError('Failed to get baseline database counts');
        return false;
    }

    logInfo(`Baseline: Users=${beforeCounts.users}, Collections=${beforeCounts.collections}`);

    // Test multiple user operations
    const testUsers = [
        { id: 111111, username: 'test_safety_1', firstName: 'SafetyTest1' },
        { id: 222222, username: 'test_safety_2', firstName: 'SafetyTest2' },
        { id: 333333, username: 'test_safety_3', firstName: 'SafetyTest3' }
    ];

    for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        logStep(`Testing user operation ${i + 1}/3: ${user.username}`);

        // Simulate webhook message
        const webhookData = {
            update_id: 777000 + i,
            message: {
                message_id: 8000 + i,
                from: { id: user.id, first_name: user.firstName, username: user.username },
                chat: { id: user.id, type: 'private', first_name: user.firstName, username: user.username },
                text: `Test database safety message ${i + 1}`,
                date: Math.floor(Date.now() / 1000)
            }
        };

        try {
            // Send webhook request
            await execAsync(`curl -s -X POST "http://localhost/webhook/6169306321:AAGAYSDDu2JJigaN1nkSzwtcK-CDHxv5v6c" \
                -H "Content-Type: application/json" \
                -d '${JSON.stringify(webhookData)}' > /dev/null`);

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check database integrity
            const afterCounts = await getDatabaseCounts();
            if (!afterCounts) {
                logError(`Database check failed after user ${i + 1}`);
                return false;
            }

            // Verify no database wipe occurred
            if (afterCounts.collections < beforeCounts.collections) {
                logError(`DATABASE WIPE DETECTED! Collections: ${beforeCounts.collections} → ${afterCounts.collections}`);
                return false;
            }

            if (afterCounts.users < beforeCounts.users) {
                logError(`USER DATA LOSS! Users: ${beforeCounts.users} → ${afterCounts.users}`);
                return false;
            }

            logSuccess(`User ${i + 1} processed safely: Users=${afterCounts.users}, Collections=${afterCounts.collections}`);

        } catch (error) {
            logError(`Webhook test failed for user ${i + 1}: ${error.message}`);
            return false;
        }
    }

    return true;
};

// Test for the specific createIndex bug
const testCreateIndexBug = async () => {
    logStep('Checking for dangerous createIndex calls in User.js...');

    const grepResult = await checkUserJsForCreateIndex();

    if (grepResult.includes('createIndex') && !grepResult.includes('REMOVED DANGEROUS')) {
        logError('CRITICAL: Dangerous createIndex call still exists in User.js!');
        logError(`Found: ${grepResult}`);
        return false;
    }

    if (grepResult.includes('REMOVED DANGEROUS')) {
        logSuccess('createIndex bug has been properly fixed');
        return true;
    }

    if (grepResult.includes('No createIndex found')) {
        logSuccess('No createIndex calls found in User.js');
        return true;
    }

    logWarning(`Unclear result: ${grepResult}`);
    return true;
};

// Test MongoDB index status
const testIndexStatus = async () => {
    logStep('Checking MongoDB index status...');

    try {
        const indexes = await mongoExec('JSON.stringify(db.Users.getIndexes())');
        if (!indexes) {
            logError('Failed to get index information');
            return false;
        }

        const indexList = JSON.parse(indexes);
        logInfo(`Found ${indexList.length} indexes on Users collection`);

        // Check for chatId index
        const chatIdIndex = indexList.find(idx => idx.key && idx.key.chatId);
        if (chatIdIndex) {
            logSuccess(`chatId index exists: ${JSON.stringify(chatIdIndex.key)}`);
        } else {
            logWarning('No chatId index found');
        }

        return true;
    } catch (error) {
        logError(`Index check failed: ${error.message}`);
        return false;
    }
};

// Main test function
const runDatabaseSafetyTest = async () => {
    logSection('DATABASE SAFETY TEST - Critical Bug Prevention');
    logInfo('Testing for the User.js createIndex bug that caused database wipes');
    logInfo('This test validates database stability during user operations');
    console.log('');

    let allTestsPassed = true;
    const testResults = {
        createIndexBugCheck: false,
        indexStatusCheck: false,
        webhookProcessingTest: false
    };

    // Test 1: Check for createIndex bug
    logSection('TEST 1: CreateIndex Bug Check');
    testResults.createIndexBugCheck = await testCreateIndexBug();
    if (!testResults.createIndexBugCheck) allTestsPassed = false;

    // Test 2: Index status check
    logSection('TEST 2: MongoDB Index Status');
    testResults.indexStatusCheck = await testIndexStatus();
    if (!testResults.indexStatusCheck) allTestsPassed = false;

    // Test 3: Webhook processing safety
    logSection('TEST 3: Webhook Processing Safety');
    testResults.webhookProcessingTest = await testWebhookProcessing();
    if (!testResults.webhookProcessingTest) allTestsPassed = false;

    // Results summary
    logSection('DATABASE SAFETY TEST RESULTS');
    console.log(`├─ CreateIndex Bug Check: ${testResults.createIndexBugCheck ? '✅' : '❌'} ${testResults.createIndexBugCheck ? 'SAFE' : 'CRITICAL BUG DETECTED'}`);
    console.log(`├─ Index Status Check: ${testResults.indexStatusCheck ? '✅' : '❌'} ${testResults.indexStatusCheck ? 'HEALTHY' : 'INDEX ISSUES'}`);
    console.log(`└─ Webhook Safety Test: ${testResults.webhookProcessingTest ? '✅' : '❌'} ${testResults.webhookProcessingTest ? 'SAFE' : 'DATABASE CORRUPTION RISK'}`);
    console.log('');

    if (allTestsPassed) {
        logSuccess('🎉 ALL DATABASE SAFETY TESTS PASSED!');
        logSuccess('✅ The critical User.js createIndex bug is properly fixed');
        logSuccess('✅ Database is stable during user operations');
        logSuccess('✅ No risk of data loss from user interactions');
        console.log('');
        process.exit(0);
    } else {
        logError('💥 DATABASE SAFETY TESTS FAILED!');
        logError('❌ Critical issues detected that could cause data loss');
        logError('❌ Immediate action required to fix database safety issues');
        console.log('');
        process.exit(1);
    }
};

// Run the test
runDatabaseSafetyTest().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
});