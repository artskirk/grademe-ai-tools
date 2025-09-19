# Reset Command Memory Issue Investigation

**Date**: September 17, 2025
**Status**: Issue Identified - Ready for Fix Tomorrow

## Problem Summary

The `/reset` command is **incorrectly implemented**. Instead of clearing previous memory and starting fresh conversation tracking, it permanently disables conversation memory collection.

## Expected vs Current Behavior

### Expected Behavior (What Should Happen):
1. User executes `/reset` command
2. System **clears previous conversation history**
3. System **immediately starts memorizing NEW conversations** from that point forward
4. User can have new conversations that build memory until the next `/reset`

### Current Broken Behavior:
1. User executes `/reset` command
2. System sets `lastContextReset` timestamp (`2025-09-17T14:50:03.935Z`)
3. System **permanently blocks ALL conversation memory** with message: `"User has context reset at [timestamp], skipping conversation memory"`
4. User cannot build any new conversation memory - AI forgets everything immediately

## Technical Analysis

### Root Cause Location
**File**: `/mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/src/dialog/history/Logger.js`

**Current Logic** (Lines 42-61):
```javascript
if (user && user.lastContextReset) {
    const resetTime = new Date(user.lastContextReset);
    // Logic treats any reset timestamp as permanent memory blocker
    // Missing logic to allow NEW memory collection after reset
}
```

### Evidence from Logs
```
{"level":"info","message":"User 6400a122d2d82b800421c95f has context reset at 2025-09-17T14:50:03.935Z, skipping conversation memory","service":"user-service"}
{"level":"info","message":"No conversation memory found for user: 6400a122d2d82b800421c95f (chatId: 830403309) within 2 hours","service":"user-service"}
```

**User Flow That Demonstrates Bug**:
- 14:50:03 - User executes `/reset`
- 14:58:02 - User asks "What is my name?"
- 14:58:11 - User says "My name is Ivan"
- 14:58:20 - User asks "What is my name?" again
- **Result**: AI doesn't remember "Ivan" because memory collection is blocked

## Files to Investigate Tomorrow

1. **Primary**: `/mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/src/dialog/history/Logger.js:42-61`
   - Contains the faulty reset logic
   - Need to modify to allow NEW memory collection after reset

2. **Secondary**: `/mnt/volume-nbg1-1/grademe_api/ai/bot/telegram/src/processor/CallbackQueryProcessor.js:548`
   - Where `lastContextReset` timestamp is set
   - May need adjustment to properly signal "start fresh"

3. **Database Schema**: Check if we need additional fields to track "reset boundary" vs "memory disabled"

## **CRITICAL CLARIFICATION - CORRECT FIX STRATEGY**

### What "clearing previous history" ACTUALLY means:
- ✅ **Keep all conversation history in database** (for data integrity, analytics, backup)
- ✅ **Use reset timestamp as a "memory boundary"** - only retrieve conversations AFTER the reset
- ❌ **Do NOT physically delete** any conversation records
- ❌ **Do NOT permanently disable** memory collection

### Reset Should Work Like a "Memory Fence"
**Example Timeline:**
```
10:00 - User: "My name is John"
10:05 - User: "I live in Paris"
10:10 - User executes /reset  ← Reset timestamp set
10:15 - User: "My name is Alex"
10:20 - User: "What's my name?"
```

**Expected Behavior:**
- AI should respond "Alex" (uses conversation from 10:15)
- AI should NOT know about "John" or "Paris" (ignores conversations before 10:10)
- Database still contains ALL conversations (nothing deleted)

### Correct Implementation Strategy:

1. **Modify Logger.js logic**:
   - Use `lastContextReset` as **minimum timestamp filter** for conversation retrieval
   - Retrieve conversations WHERE `dateCreated >= lastContextReset`
   - Do NOT block memory collection entirely

2. **Correct Implementation**:
   ```javascript
   if (user && user.lastContextReset) {
       const resetTime = new Date(user.lastContextReset);
       // Use resetTime as minimum boundary - ONLY get conversations AFTER reset
       timeThreshold = Math.max(timeThreshold, resetTime);
       // Continue with normal memory retrieval logic using this boundary
   }
   ```

3. **Key Change**: Remove the "skipping conversation memory" logic completely - just adjust the time filter.

## Test Strategy for Tomorrow
1. Execute `/reset` command
2. Have conversation: "My name is Alex" → "What's my name?"
3. Verify AI remembers "Alex" (should work after fix)
4. Execute another `/reset`
5. Verify previous memory is cleared but new memory collection works

## Current Working Tools Created
- ✅ Enhanced reset test script (`/root/grademe-ai-tools/test/reset_context_test_improved.js`)
- ✅ Database structure recap script (`/root/grademe-ai-tools/test/database_structure_recap.js`)
- ✅ App test suite integration (`/root/grademe-ai-tools/app_test.sh`)

## Next Steps for Tomorrow
1. **Fix the reset logic** in Logger.js
2. **Update reset test** to validate memory boundary behavior
3. **Test the fix** with manual conversation flow
4. **Run enhanced reset test** to validate functionality
5. **Verify no regression** in normal conversation memory

## Key Tomorrow Implementation:
- Remove the "skipping conversation memory" logic entirely
- Use `lastContextReset` as minimum timestamp filter: `timeThreshold = Math.max(timeThreshold, resetTime)`
- Keep all database records intact
- Allow normal memory collection after reset boundary
- **Update reset test** to check memory boundary behavior (conversations after reset should be remembered)

---
**Note**: This is a critical UX bug - users expect conversation memory to work normally after reset, just without previous context.