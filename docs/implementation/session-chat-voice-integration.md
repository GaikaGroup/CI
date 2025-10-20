# Session Chat Voice Integration

## Overview

This document describes the integration of the session management system with existing voice chat functionality, CatAvatar, and UI components.

## Integration Points

### 1. Voice Mode Integration

The SessionChat component now supports both text and voice modes:

```javascript
// Voice mode state management
let chatMode = 'text'; // 'text' | 'voice'

// Sync voice mode state with chat mode
$: {
  setVoiceModeActive(chatMode === 'voice');
}
```

**Features:**

- Seamless switching between text and voice modes
- Voice mode activates the existing voice services
- CatAvatar displays in voice mode with lip-sync and emotions
- Waiting phrases play during AI processing

### 2. CatAvatar Integration

The CatAvatar component is integrated into the voice mode interface:

```svelte
<CatAvatar
  size="lg"
  speaking={$isSpeaking}
  emotion={$currentEmotion}
  facePositions={catFacePositions}
/>
```

**Features:**

- Displays in voice mode header
- Reacts to speech with lip-sync animation
- Shows emotions based on AI responses
- Uses optimized face positions for the cat image

### 3. Mode Switching (Fun/Learn)

Users can switch between Fun and Learn modes within a session:

```svelte
<select
  value={$sessionStore.currentSession.mode}
  on:change={(e) => toggleSessionMode(e.target.value)}
>
  <option value="fun">Fun Mode</option>
  <option value="learn">Learn Mode</option>
</select>
```

**Features:**

- Mode changes persist to the database
- Session metadata updates automatically
- Chat store syncs with session mode
- Mode affects AI behavior and responses

### 4. Language Preservation

Language settings are preserved in session data:

```javascript
// Language is stored in session
session.language = 'en' | 'es' | 'fr' | 'de' | ...

// Used in API calls
await fetch('/api/chat', {
  body: JSON.stringify({
    content,
    language: $sessionStore.currentSession?.language || $selectedLanguage
  })
});
```

### 5. Voice Recording Integration

Voice recording integrates with the session message system:

```javascript
async function toggleRecording() {
  if (!$isRecording) {
    await startRecording();
  } else {
    const transcription = await stopRecording();

    // Add to chat store
    await chatStore.sendMessage(transcription);

    // Process with voice services
    const response = await sendTranscribedText(transcription);

    // Add AI response
    await chatStore.addAssistantMessage(response);
  }
}
```

**Features:**

- Transcribed text saved to session messages
- AI responses saved to session messages
- Waiting phrases play during processing
- Audio queue status displayed

### 6. Multimedia Support

Images and files can be uploaded in both text and voice modes:

```javascript
function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  const fileObjects = files.map((file) => ({
    url: URL.createObjectURL(file),
    type: file.type,
    name: file.name
  }));
  $selectedImages = [...$selectedImages, ...fileObjects];
}
```

**Features:**

- Image upload button in voice mode
- Images attached to messages
- Metadata stored in message records
- OCR processing for uploaded images

## Component Structure

```
SessionChat.svelte
├── Header
│   ├── Session Title
│   ├── Mode Selector (Fun/Learn)
│   └── Message Count
├── Mode Toggle (Text/Voice)
├── Voice Mode Header (conditional)
│   ├── CatAvatar
│   ├── Status Text
│   └── Waiting Phrase Indicator
├── Messages Container
│   └── Message List
└── Input Area
    ├── Text Mode: Textarea + Send Button
    └── Voice Mode: Image Upload + Record Button
```

## Store Integration

### ChatStore

```javascript
chatStore.initializeSession(sessionId); // Load session messages
chatStore.sendMessage(content, metadata); // Send user message
chatStore.addAssistantMessage(content); // Add AI response
chatStore.setMode(mode); // Update mode
chatStore.setLanguage(language); // Update language
```

### SessionStore

```javascript
sessionStore.updateSession(id, updates); // Update session metadata
sessionStore.currentSession; // Current session data
```

### Voice Services

```javascript
setVoiceModeActive(true / false); // Activate/deactivate voice mode
startRecording(); // Start voice recording
stopRecording(); // Stop and transcribe
sendTranscribedText(text); // Process transcription
```

## API Integration

### Chat API

```javascript
POST /api/chat
{
  content: string,
  images?: string[],
  language: string,
  sessionId: string
}
```

### Session API

```javascript
PUT /api/sessions/:id
{
  mode?: 'fun' | 'learn',
  language?: string,
  title?: string
}
```

## Requirements Satisfied

### Requirement 4.4

✅ Mode switching (Fun/Learn) within chat interface

- Dropdown selector in header
- Persists to session data
- Updates chat store

### Requirement 6.4

✅ Integration with existing voice functionality

- Voice mode toggle
- Voice recording and transcription
- Waiting phrases during processing
- Audio playback for responses

### Requirement 2.2

✅ Mode selection preserved in session

- Mode stored in database
- Synced with chat store
- Used in AI interactions

### Requirement 2.3

✅ Language detection and preservation

- Language stored in session
- Used in API calls
- Synced with i18n store

## Usage Example

```svelte
<script>
  import SessionChat from '$lib/modules/session/components/SessionChat.svelte';

  let sessionId = 'session-123';
</script>

<SessionChat {sessionId} />
```

The component will:

1. Load session data and messages
2. Initialize voice services
3. Display mode toggle (text/voice)
4. Show CatAvatar in voice mode
5. Handle message sending in both modes
6. Preserve mode and language settings
7. Clean up on unmount

## Testing

Integration tests verify:

- Mode switching (text ↔ voice)
- Session mode switching (fun ↔ learn)
- Voice recording and transcription
- Message persistence
- Language preservation
- Cleanup on unmount

See `tests/integration/session/SessionChatIntegration.test.js` for details.

## Future Enhancements

1. **Audio Playback Controls**: Add play/pause/seek for AI responses
2. **Voice Settings**: Allow users to customize voice parameters
3. **Offline Support**: Cache voice data for offline use
4. **Multi-language Voice**: Support multiple voice languages
5. **Voice Commands**: Add voice commands for mode switching
