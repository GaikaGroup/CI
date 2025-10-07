# Sessions Page Text Mode - Testing & Diagnostics

## Problem Summary

The Sessions page (`/sessions`) has two modes:

- **Voice Mode**: ✅ Working correctly
- **Text Mode**: ❌ Not working correctly

This document provides comprehensive tests and diagnostics to identify and fix the issues.

## Quick Start

### 1. Run Automated Diagnostics

```bash
# Analyze source code for issues
npm test tests/diagnostics/sessionsPageTextModeDiagnostics.js

# Run integration tests
npm test tests/integration/session/SessionsPageTextMode.test.js

# Run E2E tests
npm test tests/e2e/sessionsPageTextMode.test.js
```

### 2. Manual Browser Testing

1. Navigate to `/sessions` in your browser
2. Open browser console (F12)
3. Copy and paste the contents of `tests/diagnostics/browserConsoleTest.js`
4. Review the diagnostic output
5. Run the interactive test functions:
   - `testSendMessage()` - Test sending a message
   - `testModeSwitch()` - Test mode switching
   - `inspectMessageInput()` - Inspect input field
   - `inspectMessages()` - Inspect message elements

## Test Files Created

### 1. Integration Tests

**File**: `tests/integration/session/SessionsPageTextMode.test.js`

Tests the integration between components, stores, and services:

- Message sending functionality
- Message persistence to database
- Chat store integration
- API integration
- Component rendering
- Mode switching
- Error handling

### 2. E2E Tests

**File**: `tests/e2e/sessionsPageTextMode.test.js`

Tests complete user flows:

- Sending messages and receiving responses
- Creating sessions
- Switching between sessions
- Mode switching
- Message persistence across reloads
- Error handling

### 3. Diagnostic Script

**File**: `tests/diagnostics/sessionsPageTextModeDiagnostics.js`

Analyzes source code to identify issues:

- Component imports
- Component rendering
- Event handlers
- Store integration
- API integration
- Message flow
- Comparison with voice mode

### 4. Browser Console Test

**File**: `tests/diagnostics/browserConsoleTest.js`

Interactive browser-based diagnostics:

- DOM element detection
- Event listener verification
- Interactive testing functions
- Real-time issue identification

## What Gets Tested

### Component Integration

- ✓ MessageInput component imported and rendered
- ✓ MessageList component imported and rendered
- ✓ VoiceChat component hidden in text mode
- ✓ Components in correct conditional blocks

### Event Handling

- ✓ handleSendMessage function exists
- ✓ MessageInput on:send event bound
- ✓ handleSendMessage calls sendMessage service
- ✓ Event handlers properly attached

### Store Integration

- ✓ messages store imported and used
- ✓ chatMode store controls mode switching
- ✓ Messages displayed from store
- ✓ Store updates trigger UI updates

### API Integration

- ✓ sendMessage service calls /api/chat
- ✓ Messages saved to /api/sessions/:id/messages
- ✓ Messages loaded when session selected
- ✓ API errors handled gracefully

### Message Flow

1. User types in MessageInput
2. MessageInput dispatches 'send' event
3. Sessions page handleSendMessage receives event
4. handleSendMessage calls sendMessage service
5. sendMessage adds message to store
6. Message saved to session API
7. MessageList displays message from store
8. AI response received and displayed

## Common Issues Detected

### Issue 1: MessageInput Not Rendering

- Component not imported
- Not in text mode conditional
- CSS hiding component

### Issue 2: Messages Not Sending

- handleSendMessage not defined
- on:send event not bound
- sendMessage service not called
- sendMessage not awaited

### Issue 3: Messages Not Displaying

- MessageList not rendering
- messages store not connected
- Store not updating
- CSS hiding messages

### Issue 4: Messages Not Persisting

- saveMessageToSession not called
- API endpoint not working
- Session ID not passed
- Messages not loaded on session select

### Issue 5: Store Synchronization

- Store not subscribed with $
- Component not reactive
- Store updates not triggering re-render

## How to Use the Tests

### Step 1: Run Diagnostics

```bash
npm test tests/diagnostics/sessionsPageTextModeDiagnostics.js
```

This will output:

- ✓ What's working correctly
- ❌ What's broken
- ⚠️ What needs attention

### Step 2: Review Output

Look for lines starting with:

- `❌ ISSUE:` - Critical problems that need fixing
- `⚠️  WARNING:` - Potential issues
- `✓` - Working correctly

### Step 3: Fix Issues

Refer to `tests/diagnostics/FIXING_GUIDE.md` for step-by-step fixes for each issue.

### Step 4: Verify Fixes

```bash
# Run integration tests
npm test tests/integration/session/SessionsPageTextMode.test.js

# Run E2E tests
npm test tests/e2e/sessionsPageTextMode.test.js
```

### Step 5: Manual Testing

Use the browser console test to verify in real browser:

1. Open `/sessions`
2. Run `tests/diagnostics/browserConsoleTest.js` in console
3. Use interactive test functions
4. Verify all functionality works

## Expected Test Results

### Successful Run

```
✓ MessageInput imported: true
✓ MessageList imported: true
✓ sendMessage imported from services: true
✓ MessageInput component tag found: true
✓ MessageInput in text mode conditional: true
✓ handleSendMessage function defined: true
✓ MessageInput on:send event bound: true
✓ handleSendMessage calls sendMessage: true
✓ messages store imported: true
✓ chatMode store used: true
✓ Messages displayed from store: true
✓ Session messages API endpoint used: true
✓ Load messages from API: true
✓ sendMessage calls /api/chat: true

All tests passed! ✓
```

### Failed Run (Example)

```
✓ MessageInput imported: true
✓ MessageList imported: true
❌ ISSUE: sendMessage not properly imported from chat services
✓ MessageInput component tag found: true
❌ ISSUE: MessageInput not in text mode conditional block
✓ handleSendMessage function defined: true
❌ ISSUE: MessageInput on:send event not bound to handleSendMessage
❌ ISSUE: handleSendMessage does not call sendMessage service

3 tests failed ❌
```

## Fixing Issues

Once issues are identified, follow the fixing guide:

1. **Read the error messages** - They tell you exactly what's wrong
2. **Check the fixing guide** - `tests/diagnostics/FIXING_GUIDE.md`
3. **Compare with voice mode** - It's working, so use it as reference
4. **Apply the fix** - Follow the code examples
5. **Re-run tests** - Verify the fix worked
6. **Manual test** - Test in browser to be sure

## Documentation

- **README**: `tests/diagnostics/README.md` - Overview and usage
- **Fixing Guide**: `tests/diagnostics/FIXING_GUIDE.md` - Step-by-step fixes
- **This Document**: Complete testing strategy

## Manual Testing Checklist

After fixing issues, manually verify:

- [ ] Navigate to `/sessions` page
- [ ] Verify text mode is active by default
- [ ] Type a message in the input field
- [ ] Press Enter to send
- [ ] Verify message appears in chat
- [ ] Verify AI response appears
- [ ] Click send button to send
- [ ] Verify message appears
- [ ] Create a new session
- [ ] Send messages in new session
- [ ] Switch between sessions
- [ ] Verify messages persist
- [ ] Reload page
- [ ] Verify messages are still there
- [ ] Switch to voice mode
- [ ] Verify voice mode works
- [ ] Switch back to text mode
- [ ] Verify text mode still works
- [ ] Upload an image
- [ ] Send message with image
- [ ] Verify image appears

## Next Steps

1. ✅ Run the diagnostic script
2. ✅ Identify the issues
3. ⏳ Fix the issues (use FIXING_GUIDE.md)
4. ⏳ Re-run tests to verify
5. ⏳ Manual test in browser
6. ⏳ Deploy and test in production

## Support

If you need help:

1. Check the console for error messages
2. Review the diagnostic output
3. Read the fixing guide
4. Compare with voice mode implementation
5. Check if API endpoints are working
6. Verify database is accessible

## Files to Review

When fixing issues, you'll likely need to modify:

- `src/routes/sessions/+page.svelte` - Main sessions page
- `src/lib/modules/chat/components/MessageInput.svelte` - Input component
- `src/lib/modules/chat/components/MessageList.svelte` - List component
- `src/lib/modules/chat/services.js` - Chat services
- `src/lib/modules/chat/stores.js` - Chat stores

## Summary

These tests will help you:

1. **Identify** what's broken in text mode
2. **Understand** why it's broken
3. **Fix** the issues with guided instructions
4. **Verify** the fixes work correctly
5. **Prevent** regressions in the future

Run the tests, follow the fixing guide, and text mode will be working in no time! 🚀
