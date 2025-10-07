# Sessions Page Text Mode - Fixing Guide

This guide provides step-by-step instructions for fixing common issues with text mode.

## Quick Diagnosis

Run this in your browser console on `/sessions` page:

```javascript
// Copy and paste the contents of browserConsoleTest.js
```

Or run the automated tests:

```bash
npm test tests/diagnostics/sessionsPageTextModeDiagnostics.js
```

## Common Issues and Fixes

### Issue 1: MessageInput Component Not Rendering

**Symptoms:**

- No text input field visible in text mode
- Cannot type messages

**Diagnosis:**

```bash
# Check if component is imported
grep -n "MessageInput" src/routes/sessions/+page.svelte
```

**Fix:**

1. Ensure MessageInput is imported:

```svelte
<script>
  import MessageInput from '$modules/chat/components/MessageInput.svelte';
</script>
```

2. Ensure it's rendered in the text mode block:

```svelte
{#if $chatModeStore === 'text'}
  <div class="messages-area">
    <MessageList />
  </div>
  <div class="input-area">
    <MessageInput on:send={handleSendMessage} />
  </div>
{:else}
  <VoiceChat />
{/if}
```

---

### Issue 2: handleSendMessage Not Working

**Symptoms:**

- Clicking send button does nothing
- Pressing Enter does nothing
- No API calls made

**Diagnosis:**

```bash
# Check if function exists
grep -n "handleSendMessage" src/routes/sessions/+page.svelte
```

**Fix:**

1. Ensure handleSendMessage is defined:

```javascript
async function handleSendMessage(event) {
  const { content, images } = event.detail;

  if (!content.trim() && images.length === 0) return;

  try {
    // Import sendMessage dynamically or at top
    const { sendMessage } = await import('$modules/chat/services');

    // Send message to LLM
    await sendMessage(content, images);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
```

2. Ensure it's bound to MessageInput:

```svelte
<MessageInput on:send={handleSendMessage} />
```

---

### Issue 3: Messages Not Displaying

**Symptoms:**

- Messages sent but not visible
- Empty chat area

**Diagnosis:**

```bash
# Check if MessageList is rendered
grep -n "MessageList" src/routes/sessions/+page.svelte
```

**Fix:**

1. Ensure MessageList is imported:

```svelte
<script>
  import MessageList from '$modules/chat/components/MessageList.svelte';
</script>
```

2. Ensure it's in the text mode block:

```svelte
{#if $chatModeStore === 'text'}
  <div class="messages-area">
    <MessageList />
  </div>
{/if}
```

3. Ensure messages store is imported and used:

```javascript
import { messages } from '$modules/chat/stores';

// Messages should be accessible as $messages
```

---

### Issue 4: Messages Not Persisting

**Symptoms:**

- Messages disappear on page reload
- Messages not saved to database

**Diagnosis:**

```bash
# Check if saveMessageToSession exists
grep -n "saveMessageToSession" src/routes/sessions/+page.svelte
```

**Fix:**

1. Add auto-save function:

```javascript
async function saveMessageToSession(message) {
  if (!currentSessionId || !$user || !message.content) return;

  // Don't save system messages or already saved messages
  if (message.type === 'system' || message.saved) return;

  try {
    const response = await fetch(`/api/sessions/${currentSessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: message.type === 'tutor' ? 'assistant' : message.type,
        content: message.content,
        metadata: message.metadata || {}
      })
    });

    if (!response.ok) {
      console.error('Failed to save message');
      return;
    }

    // Mark message as saved
    message.saved = true;
  } catch (error) {
    console.error('Failed to save message:', error);
  }
}
```

2. Subscribe to messages and auto-save:

```javascript
onMount(() => {
  // Subscribe to messages to auto-save them
  let lastProcessedIndex = 0;
  messageUnsubscribe = messages.subscribe(($messages) => {
    for (let i = lastProcessedIndex; i < $messages.length; i++) {
      const message = $messages[i];
      if (message && !message.saved && message.type !== 'system') {
        saveMessageToSession(message);
      }
    }
    lastProcessedIndex = $messages.length;
  });
});
```

---

### Issue 5: Session Not Created

**Symptoms:**

- Error: "No session ID"
- Messages not associated with session

**Fix:**

1. Create session before sending first message:

```javascript
async function handleSendMessage(event) {
  const { content, images } = event.detail;

  if (!content.trim() && images.length === 0) return;

  try {
    // If no current session, create one
    if (!currentSessionId) {
      const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      const session = await sessionStore.createSession(title, 'fun', 'en');
      currentSessionId = session.id;
    }

    // Send message
    const { sendMessage } = await import('$modules/chat/services');
    await sendMessage(content, images);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
}
```

---

### Issue 6: Messages Not Loading on Session Select

**Symptoms:**

- Selecting session shows empty chat
- Previous messages not displayed

**Fix:**

1. Add selectSession function:

```javascript
async function selectSession(session) {
  try {
    await sessionStore.selectSession(session.id);
    currentSessionId = session.id;

    // Load messages for this session
    const response = await fetch(`/api/sessions/${session.id}/messages?limit=200`);
    if (response.ok) {
      const data = await response.json();
      const loadedMessages = data.messages || [];

      // Convert database messages to chat format
      const chatMessages = loadedMessages.map((msg, index) => ({
        id: msg.id || index + 1,
        type: msg.type === 'assistant' ? 'tutor' : msg.type,
        content: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        metadata: msg.metadata || {},
        saved: true
      }));

      messages.set(chatMessages);
    }
  } catch (error) {
    console.error('Failed to select session:', error);
    messages.set([]);
  }
}
```

2. Bind to session click:

```svelte
<button class="session-item" on:click={() => selectSession(session)}>
  {session.title}
</button>
```

---

### Issue 7: Store Not Updating UI

**Symptoms:**

- Messages in store but not in UI
- UI not reactive

**Fix:**

1. Ensure store is imported correctly:

```javascript
import { messages } from '$modules/chat/stores';
```

2. Use reactive statement:

```javascript
$: currentMessages = $messages;
```

3. Or use store directly in template:

```svelte
{#each $messages as message}
  <div>{message.content}</div>
{/each}
```

---

### Issue 8: sendMessage Service Not Called

**Symptoms:**

- No API call to /api/chat
- No AI response

**Fix:**

1. Ensure sendMessage is imported:

```javascript
import { sendMessage } from '$modules/chat/services';
// OR
const { sendMessage } = await import('$modules/chat/services');
```

2. Ensure it's called with correct parameters:

```javascript
await sendMessage(content, images, sessionId);
```

3. Ensure it's awaited:

```javascript
// ❌ Wrong
sendMessage(content, images);

// ✓ Correct
await sendMessage(content, images);
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] Navigate to `/sessions`
- [ ] Text mode is active by default
- [ ] Message input field is visible
- [ ] Can type in input field
- [ ] Send button is visible and clickable
- [ ] Pressing Enter sends message
- [ ] User message appears in chat
- [ ] AI response appears in chat
- [ ] Messages persist on page reload
- [ ] Can create new session
- [ ] Can switch between sessions
- [ ] Messages load when session selected
- [ ] Can switch to voice mode
- [ ] Can switch back to text mode
- [ ] Text mode still works after switching

---

## Testing Commands

```bash
# Run diagnostic tests
npm test tests/diagnostics/sessionsPageTextModeDiagnostics.js

# Run integration tests
npm test tests/integration/session/SessionsPageTextMode.test.js

# Run E2E tests
npm test tests/e2e/sessionsPageTextMode.test.js

# Run all session tests
npm test tests/integration/session/
npm test tests/e2e/sessionsPageTextMode.test.js
```

---

## Debug Mode

Add this to your component for debugging:

```javascript
// Add to <script> section
$: {
  console.log('=== Debug Info ===');
  console.log('Chat mode:', $chatModeStore);
  console.log('Messages count:', $messages.length);
  console.log('Current session:', currentSessionId);
  console.log('Messages:', $messages);
}
```

---

## Still Having Issues?

1. Check browser console for errors
2. Check Network tab for failed API calls
3. Check Elements tab to see if components are rendered
4. Run the browser console test script
5. Compare with working voice mode implementation
6. Check if all imports are correct
7. Verify API endpoints are working

---

## Reference Implementation

See `src/routes/sessions/+page.svelte` for the complete implementation.

Key sections:

- Lines 1-20: Imports
- Lines 30-70: handleSendMessage function
- Lines 100-150: selectSession function
- Lines 200-250: Template with conditional rendering
