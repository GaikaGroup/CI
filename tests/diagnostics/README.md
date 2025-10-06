# Sessions Page Text Mode Diagnostics

This directory contains diagnostic tests to identify issues with the Sessions page text mode functionality.

## Problem Description

The Sessions page has two modes:
- **Voice Mode**: Working correctly ✓
- **Text Mode**: Not working correctly ❌

## Running the Diagnostics

### 1. Run the Diagnostic Script

This will analyze the source code and identify potential issues:

```bash
npm test tests/diagnostics/sessionsPageTextModeDiagnostics.js
```

### 2. Run Integration Tests

These tests will check the actual functionality:

```bash
npm test tests/integration/session/SessionsPageTextMode.test.js
```

### 3. Run E2E Tests

These tests simulate complete user flows:

```bash
npm test tests/e2e/sessionsPageTextMode.test.js
```

## What the Tests Check

### Component Integration
- ✓ MessageInput component is imported and rendered
- ✓ MessageList component is imported and rendered
- ✓ VoiceChat component is hidden in text mode
- ✓ Components are in correct conditional blocks

### Event Handling
- ✓ handleSendMessage function exists
- ✓ MessageInput on:send event is bound
- ✓ handleSendMessage calls sendMessage service
- ✓ Event handlers are properly attached

### Store Integration
- ✓ messages store is imported and used
- ✓ chatMode store controls mode switching
- ✓ Messages are displayed from store
- ✓ Store updates trigger UI updates

### API Integration
- ✓ sendMessage service calls /api/chat
- ✓ Messages are saved to /api/sessions/:id/messages
- ✓ Messages are loaded when session is selected
- ✓ API errors are handled gracefully

### Message Flow
1. User types in MessageInput
2. MessageInput dispatches 'send' event
3. Sessions page handleSendMessage receives event
4. handleSendMessage calls sendMessage service
5. sendMessage adds message to store
6. Message is saved to session API
7. MessageList displays message from store
8. AI response is received and displayed

## Common Issues to Look For

### Issue 1: MessageInput Not Rendering
**Symptom**: Input field not visible in text mode
**Possible Causes**:
- MessageInput not imported
- MessageInput not in text mode conditional
- CSS hiding the component

### Issue 2: Messages Not Sending
**Symptom**: Clicking send or pressing Enter does nothing
**Possible Causes**:
- handleSendMessage not defined
- on:send event not bound
- sendMessage service not called
- sendMessage not awaited

### Issue 3: Messages Not Displaying
**Symptom**: Messages sent but not visible
**Possible Causes**:
- MessageList not rendering
- messages store not connected
- Store not updating
- CSS hiding messages

### Issue 4: Messages Not Persisting
**Symptom**: Messages disappear on page reload
**Possible Causes**:
- saveMessageToSession not called
- API endpoint not working
- Session ID not passed correctly
- Messages not loaded on session select

### Issue 5: Store Synchronization
**Symptom**: Store has messages but UI doesn't update
**Possible Causes**:
- Store not subscribed with $
- Component not reactive
- Store updates not triggering re-render

## Expected Test Output

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
```

## Fixing Issues

Once you identify the issues, refer to the working voice mode implementation as a reference:

1. **Check the conditional rendering**:
   ```svelte
   {#if $chatModeStore === 'text'}
     <MessageList />
     <MessageInput on:send={handleSendMessage} />
   {:else}
     <VoiceChat />
   {/if}
   ```

2. **Verify event handler**:
   ```javascript
   async function handleSendMessage(event) {
     const { content, images } = event.detail;
     await sendMessage(content, images);
   }
   ```

3. **Check store integration**:
   ```javascript
   import { messages, chatMode } from '$modules/chat/stores';
   
   $: currentMessages = $messages;
   ```

4. **Verify API calls**:
   ```javascript
   // Save to session
   await fetch(`/api/sessions/${sessionId}/messages`, {
     method: 'POST',
     body: JSON.stringify({ type: 'user', content })
   });
   ```

## Next Steps

1. Run the diagnostic script to identify issues
2. Review the source code based on findings
3. Compare with voice mode implementation
4. Fix identified issues
5. Re-run tests to verify fixes
6. Test manually in the browser

## Manual Testing Checklist

After fixing issues, manually test:

- [ ] Navigate to /sessions page
- [ ] Verify text mode is active by default
- [ ] Type a message in the input field
- [ ] Press Enter to send
- [ ] Verify message appears in chat
- [ ] Verify AI response appears
- [ ] Create a new session
- [ ] Send messages in new session
- [ ] Switch between sessions
- [ ] Verify messages persist
- [ ] Reload page
- [ ] Verify messages are still there
- [ ] Switch to voice mode
- [ ] Switch back to text mode
- [ ] Verify text mode still works

## Contact

If you need help interpreting the test results or fixing issues, refer to:
- `src/routes/sessions/+page.svelte` - Main sessions page
- `src/lib/modules/chat/components/MessageInput.svelte` - Input component
- `src/lib/modules/chat/components/MessageList.svelte` - List component
- `src/lib/modules/chat/services.js` - Chat services
- `src/lib/modules/chat/stores.js` - Chat stores
