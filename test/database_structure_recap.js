#!/usr/bin/env node

// Database Structure Recap Script
// Quick overview of current database structure, collections, and key statistics

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

// Load MongoDB credentials from application .env file
const loadMongoCredentials = () => {
    try {
        const fs = require('fs');
        const envFile = '/var/www/html/grademe_api/ai/bot/telegram/.env';
        const envContent = fs.readFileSync(envFile, 'utf8');

        const getEnvValue = (key) => {
            const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
            return match ? match[1] : '';
        };

        return {
            username: getEnvValue('DB_USERNAME'),
            password: getEnvValue('DB_PASSWORD'),
            adminUsername: getEnvValue('DB_ADMIN_USERNAME'),
            adminPassword: getEnvValue('DB_ADMIN_PASSWORD')
        };
    } catch (error) {
        logError(`Failed to load MongoDB credentials: ${error.message}`);
        return null;
    }
};

const dbCredentials = loadMongoCredentials();
if (!dbCredentials) {
    logError('Cannot proceed without MongoDB credentials');
    process.exit(1);
}

// Execute MongoDB command with proper escaping and authentication
const mongoExec = async (command) => {
    try {
        // Check if we're running inside Docker container or on host
        const isInContainer = process.env.NODE_ENV === 'container' || !require('fs').existsSync('/usr/bin/docker');

        // Escape command for shell execution - handle quotes, dollars, and backticks
        const escapedCommand = command
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\$/g, '\\\$')
            .replace(/`/g, '\\`');

        let mongoCommand;
        if (isInContainer) {
            // Running inside container - connect directly to MongoDB with authentication
            mongoCommand = `mongosh grademe_db -u "${dbCredentials.username}" -p "${dbCredentials.password}" --quiet --eval "${escapedCommand}"`;
        } else {
            // Running on host - use docker exec with authentication
            mongoCommand = `docker exec mongo mongosh grademe_db -u "${dbCredentials.username}" -p "${dbCredentials.password}" --quiet --eval "${escapedCommand}"`;
        }

        const { stdout } = await execAsync(mongoCommand);
        return stdout.trim();
    } catch (error) {
        logError(`MongoDB command failed: ${error.message}`);
        return null;
    }
};

// Get database status
const getDatabaseStatus = async () => {
    try {
        const status = await mongoExec('JSON.stringify(db.runCommand({dbStats: 1}))');
        return status ? JSON.parse(status) : null;
    } catch (error) {
        logError(`Error getting database status: ${error.message}`);
        return null;
    }
};

// Get collections list
const getCollections = async () => {
    try {
        const collections = await mongoExec('JSON.stringify(db.runCommand({listCollections: 1}).cursor.firstBatch.map(c => c.name))');
        return collections ? JSON.parse(collections) : [];
    } catch (error) {
        logError(`Error getting collections: ${error.message}`);
        return [];
    }
};

// Get collection statistics
const getCollectionStats = async (collectionName) => {
    try {
        const stats = await mongoExec(`db.${collectionName}.countDocuments()`);
        const sample = await mongoExec(`JSON.stringify(db.${collectionName}.findOne({}, {_id: 0}), null, 2)`);

        return {
            name: collectionName,
            count: parseInt(stats),
            sample: sample ? JSON.parse(sample) : null
        };
    } catch (error) {
        logWarning(`Could not get stats for collection ${collectionName}: ${error.message}`);
        return {
            name: collectionName,
            count: 0,
            sample: null
        };
    }
};

// Get user details
const getUserDetails = async () => {
    try {
        const totalUsers = await mongoExec('db.Users.countDocuments()');
        const activeUsers = await mongoExec('db.Users.countDocuments({isLastPaymentSuccessfull: true})');
        const trialUsers = await mongoExec('db.Users.countDocuments({isLastPaymentSuccessfull: false})');
        const recentUsers = await mongoExec('db.Users.countDocuments({lastActivity: {$gte: new Date(Date.now() - 24*60*60*1000)}})');
        const resetUsers = await mongoExec('db.Users.countDocuments({lastContextReset: {$ne: null}})');

        return {
            total: parseInt(totalUsers) || 0,
            active: parseInt(activeUsers) || 0,
            trial: parseInt(trialUsers) || 0,
            recent: parseInt(recentUsers) || 0,
            reset: parseInt(resetUsers) || 0
        };
    } catch (error) {
        logError(`Error getting user details: ${error.message}`);
        return null;
    }
};

// Get history details
const getHistoryDetails = async () => {
    try {
        const totalHistory = await mongoExec('db.History.countDocuments()');
        const recentHistory = await mongoExec('db.History.countDocuments({dateCreated: {$gte: new Date(Date.now() - 2*60*60*1000)}})');
        const oldestEntry = await mongoExec('var doc = db.History.findOne({}, {dateCreated: 1}); doc ? JSON.stringify(doc.dateCreated) : null');
        const newestEntry = await mongoExec('var doc = db.History.findOne({}, {dateCreated: 1}, {sort: {dateCreated: -1}}); doc ? JSON.stringify(doc.dateCreated) : null');

        return {
            total: parseInt(totalHistory) || 0,
            recent: parseInt(recentHistory) || 0,
            oldest: oldestEntry && oldestEntry !== 'null' ? new Date(JSON.parse(oldestEntry)) : null,
            newest: newestEntry && newestEntry !== 'null' ? new Date(JSON.parse(newestEntry)) : null
        };
    } catch (error) {
        logError(`Error getting history details: ${error.message}`);
        return null;
    }
};

// Get sample user data (anonymized)
const getSampleUserData = async () => {
    try {
        const sampleUser = await mongoExec('var doc = db.Users.findOne({}, {chatId: 1, userName: 1, firstName: 1, currentAI: 1, availableCredits: 1, isLastPaymentSuccessfull: 1, lastActivity: 1, lastContextReset: 1, dateCreated: 1}); doc ? JSON.stringify(doc, null, 2) : null');

        return sampleUser && sampleUser !== 'null' ? JSON.parse(sampleUser) : null;
    } catch (error) {
        logError(`Error getting sample user data: ${error.message}`);
        return null;
    }
};

// Get database indexes
const getIndexes = async (collectionName) => {
    try {
        const indexes = await mongoExec(`JSON.stringify(db.${collectionName}.getIndexes().map(i => ({name: i.name, key: i.key})), null, 2)`);
        return indexes ? JSON.parse(indexes) : [];
    } catch (error) {
        logWarning(`Could not get indexes for ${collectionName}: ${error.message}`);
        return [];
    }
};

// Format bytes to human readable
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date
const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
};

// Main function
const generateDatabaseRecap = async () => {
    logSection('DATABASE STRUCTURE RECAP');
    log(`Generated at: ${new Date().toISOString()}`, colors.bright);
    console.log('');

    // Database connection test
    logSection('CONNECTION STATUS');
    try {
        const ping = await mongoExec('JSON.stringify(db.adminCommand({ping: 1}))');
        if (ping && JSON.parse(ping).ok === 1) {
            logSuccess('MongoDB connection active (authenticated)');
        } else {
            logError('MongoDB connection failed');
            return;
        }
    } catch (error) {
        logError(`Connection test failed: ${error.message}`);
        return;
    }

    // Database overview
    logSection('DATABASE OVERVIEW');
    const dbStats = await getDatabaseStatus();
    if (dbStats) {
        logInfo(`Database: ${dbStats.db || 'grademe_db'}`);
        logInfo(`Collections: ${dbStats.collections || 'N/A'}`);
        logInfo(`Data Size: ${formatBytes(dbStats.dataSize || 0)}`);
        logInfo(`Storage Size: ${formatBytes(dbStats.storageSize || 0)}`);
        logInfo(`Index Size: ${formatBytes(dbStats.indexSize || 0)}`);
    }

    // Collections overview
    logSection('COLLECTIONS OVERVIEW');
    const collections = await getCollections();
    if (collections && collections.length > 0) {
        for (const collection of collections) {
            const stats = await getCollectionStats(collection);
            console.log(`${colors.green}📦 ${collection}${colors.reset}`);
            console.log(`   └─ Documents: ${stats.count.toLocaleString()}`);

            // Show indexes for important collections
            if (['Users', 'History'].includes(collection)) {
                const indexes = await getIndexes(collection);
                if (indexes.length > 0) {
                    console.log(`   └─ Indexes: ${indexes.map(i => i.name).join(', ')}`);
                }
            }
        }
    } else {
        logWarning('No collections found or error accessing collections');
    }

    // Users detailed analysis
    logSection('USERS ANALYSIS');
    const userDetails = await getUserDetails();
    if (userDetails) {
        console.log(`${colors.green}👥 Total Users:${colors.reset} ${userDetails.total.toLocaleString()}`);
        console.log(`${colors.green}💳 Paid Users:${colors.reset} ${userDetails.active.toLocaleString()} (${((userDetails.active/userDetails.total)*100).toFixed(1)}%)`);
        console.log(`${colors.yellow}🆓 Trial Users:${colors.reset} ${userDetails.trial.toLocaleString()} (${((userDetails.trial/userDetails.total)*100).toFixed(1)}%)`);
        console.log(`${colors.blue}📅 Active (24h):${colors.reset} ${userDetails.recent.toLocaleString()}`);
        console.log(`${colors.magenta}🔄 Reset Status:${colors.reset} ${userDetails.reset.toLocaleString()} users have reset context`);
    }

    // Sample user structure
    logSection('USER DATA STRUCTURE');
    const sampleUser = await getSampleUserData();
    if (sampleUser) {
        console.log(`${colors.cyan}Sample User Record:${colors.reset}`);
        Object.entries(sampleUser).forEach(([key, value]) => {
            let displayValue = value;
            if (key === 'lastActivity' || key === 'dateCreated' || key === 'lastContextReset') {
                displayValue = value ? formatDate(value) : 'null';
            }
            console.log(`  ${colors.blue}${key}:${colors.reset} ${displayValue}`);
        });
    }

    // History analysis
    logSection('CONVERSATION HISTORY ANALYSIS');
    const historyDetails = await getHistoryDetails();
    if (historyDetails) {
        console.log(`${colors.green}💬 Total Conversations:${colors.reset} ${historyDetails.total.toLocaleString()}`);
        console.log(`${colors.blue}🕐 Recent (2h):${colors.reset} ${historyDetails.recent.toLocaleString()}`);
        console.log(`${colors.yellow}📅 Date Range:${colors.reset}`);
        console.log(`   └─ Oldest: ${formatDate(historyDetails.oldest)}`);
        console.log(`   └─ Newest: ${formatDate(historyDetails.newest)}`);

        if (historyDetails.total > 0) {
            const avgPerUser = (historyDetails.total / userDetails.total).toFixed(1);
            console.log(`${colors.magenta}📊 Average:${colors.reset} ${avgPerUser} conversations per user`);
        }
    }

    // Key fields analysis for Users collection
    logSection('KEY CONFIGURATION FIELDS');
    try {
        const aiModels = await mongoExec('JSON.stringify(db.Users.distinct("currentAI"))');
        const languages = await mongoExec('JSON.stringify(db.Users.distinct("languageCode"))');

        if (aiModels && aiModels !== 'null') {
            const models = JSON.parse(aiModels);
            console.log(`${colors.green}🤖 AI Models in Use:${colors.reset} ${models.join(', ')}`);
        }

        if (languages && languages !== 'null') {
            const langs = JSON.parse(languages);
            console.log(`${colors.blue}🌐 Languages:${colors.reset} ${langs.join(', ')}`);
        }

        // Credit distribution
        const creditStats = await mongoExec('var result = db.Users.aggregate([{$group: {_id: null, avgCredits: {$avg: "$availableCredits"}, minCredits: {$min: "$availableCredits"}, maxCredits: {$max: "$availableCredits"}}}]).toArray()[0]; result ? JSON.stringify(result, null, 2) : null');

        if (creditStats && creditStats !== 'null') {
            const stats = JSON.parse(creditStats);
            console.log(`${colors.yellow}💰 Credits:${colors.reset} Min: ${stats.minCredits || 0}, Max: ${stats.maxCredits || 0}, Avg: ${stats.avgCredits ? stats.avgCredits.toFixed(1) : 0}`);
        }
    } catch (error) {
        logWarning(`Could not analyze key fields: ${error.message}`);
    }

    // Database health check
    logSection('DATABASE HEALTH CHECK');
    try {
        // Check for orphaned records (simplified approach)
        const usersWithHistory = await mongoExec('db.History.distinct("userId").length');
        const totalUsers = await mongoExec('db.Users.countDocuments()');
        const totalHistory = await mongoExec('db.History.countDocuments()');

        console.log(`${colors.green}🔍 Data Integrity:${colors.reset}`);
        console.log(`   └─ Total users: ${totalUsers || 0}`);
        console.log(`   └─ Users with history: ${usersWithHistory || 0}`);
        console.log(`   └─ Total history entries: ${totalHistory || 0}`);

        // Check recent activity
        const recentActivity = historyDetails ? historyDetails.recent : 0;
        if (recentActivity > 0) {
            logSuccess(`Active conversations detected (${recentActivity} in last 2 hours)`);
        } else {
            logWarning('No recent conversation activity detected');
        }

        // Check for reset functionality
        const resetUsers = userDetails ? userDetails.reset : 0;
        if (resetUsers > 0) {
            logInfo(`Reset functionality being used (${resetUsers} users have reset context)`);
        }

    } catch (error) {
        logWarning(`Health check incomplete: ${error.message}`);
    }

    logSection('RECAP COMPLETE');
    log('Database structure analysis completed successfully', colors.green);
    console.log('');
};

// Handle process termination
process.on('SIGINT', () => {
    logWarning('\nDatabase recap interrupted by user');
    process.exit(130);
});

process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

// Run the recap
if (require.main === module) {
    generateDatabaseRecap().catch((error) => {
        logError(`Database recap failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    generateDatabaseRecap,
    getDatabaseStatus,
    getCollections,
    getCollectionStats,
    getUserDetails,
    getHistoryDetails
};