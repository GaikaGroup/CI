# Session Multimedia Support

## Overview

The AI Tutor Sessions feature now includes comprehensive multimedia support, allowing users to interact with the AI tutor using voice input, image uploads, and audio playback. All multimedia content is stored as metadata in the session messages, enabling rich, multimodal learning experiences.

## Features

### 1. Voice Input Integration

Users can send voice messages that are automatically transcribed and stored with audio metadata.

**Features:**
- Voice recording with microphone
- Automatic transcription using Whisper API
- Audio metadata storage (duration, language, transcription)
- Voice message indicator in chat history
- Seamless integration with existing voice services

**Metadata Structure:**
```javascript
{
  type: 'voice',
  audioUrl: 'blob:https://example.com/audio-123',
  duration: 5.5,
  language: 'en',
  transcription: 'Hello, this is a voice message',
  timestamp: '2025-05-10T22:00:00.000Z'
}
```

### 2. Image Upload Support

Users can attach images to their messages for visual context.

**Features:**
- Single or multiple image uploads
- Image metadata extraction (dimensions, size, type)
- Image preview in chat
- Click to view full-size image
- Support for common image formats (JPG, PNG, GIF, WebP)

**Metadata Structure:**
```javascript
{
  type: 'image',
  images: [
    {
      url: 'https://example.com/image.jpg',
      type: 'image/jpeg',
      size: 102400,
      dimensions: { width: 800, height: 600 },
      index: 0
    }
  ],
  timestamp: '2025-05-10T22:00:00.000Z'
}
```

### 3. Audio Playback Controls

AI responses can include synthesized audio that users can play back.

**Features:**
- Audio playback controls for AI responses
- Duration display
- Emotion-based synthesis
- Waiting phrase audio
- Support for multiple audio formats

**Metadata Structure:**
```javascript
{
  type: 'audio_response',
  audioUrl: 'https://example.com/response-audio.mp3',
  duration: 7.5,
  language: 'en',
  emotion: 'happy',
  isWaitingPhrase: false,
  timestamp: '2025-05-10T22:00:00.000Z'
}
```

### 4. Mixed Multimedia Messages

Messages can contain multiple types of multimedia content simultaneously.

**Example:**
- Voice message with attached images
- Text message with audio response
- Image with voice description

## Implementation

### Multimedia Helpers

The `multimediaHelpers.js` utility provides functions for creating and managing multimedia metadata:

```javascript
import {
  createVoiceMetadata,
  createImageMetadata,
  createAudioResponseMetadata,
  hasAudio,
  hasImages,
  getAudioUrl,
  getImageUrls
} from '$lib/modules/session/utils/multimediaHelpers.js';

// Create voice metadata
const voiceMetadata = createVoiceMetadata({
  audioUrl: 'blob:https://example.com/audio',
  duration: 5.5,
  language: 'en',
  transcription: 'Hello world'
});

// Create image metadata
const imageMetadata = createImageMetadata({
  imageUrl: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
});

// Check if message has multimedia
if (hasAudio(message)) {
  const audioUrl = getAudioUrl(message.metadata);
  // Play audio
}

if (hasImages(message)) {
  const imageUrls = getImageUrls(message.metadata);
  // Display images
}
```

### SessionChat Component Integration

The `SessionChat.svelte` component has been enhanced to support multimedia:

**Voice Recording:**
```javascript
async function toggleRecording() {
  if (!$isRecording) {
    await startRecording();
  } else {
    const transcription = await stopRecording();
    
    // Create voice metadata
    const voiceMetadata = createVoiceMetadata({
      language: $selectedLanguage,
      transcription: transcription
    });
    
    // Send message with metadata
    await chatStore.sendMessage(transcription, voiceMetadata);
  }
}
```

**Image Upload:**
```javascript
async function handleImageUpload(event) {
  const files = Array.from(event.target.files);
  
  // Extract metadata for each image
  const fileObjects = await Promise.all(
    files.map(async (file) => {
      const metadata = await extractImageMetadata(file);
      return {
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        size: metadata.size,
        dimensions: metadata.dimensions
      };
    })
  );
  
  $selectedImages = [...$selectedImages, ...fileObjects];
}
```

**Sending Messages with Images:**
```javascript
async function handleSendMessage() {
  const content = messageInput.trim();
  const images = $selectedImages;
  
  // Create metadata
  let metadata = null;
  if (images && images.length > 0) {
    metadata = createImageMetadata({
      imageUrl: images.map(img => img.url)
    });
  }
  
  // Send message
  await chatStore.sendMessage(content, metadata);
}
```

### Database Storage

All multimedia metadata is stored in the `messages` table's `metadata` JSONB column:

```sql
CREATE TABLE messages (
  id        String   @id @default(cuid())
  sessionId String   @map("session_id")
  type      String   @db.VarChar(20)
  content   String   @db.Text
  metadata  Json?    -- Stores multimedia metadata
  createdAt DateTime @default(now())
  
  session   Session  @relation(...)
  
  @@index([sessionId, createdAt])
)
```

## Usage Examples

### Example 1: Voice Message with Image

```javascript
// User records voice message and attaches image
const voiceMetadata = createVoiceMetadata({
  audioUrl: 'blob:https://example.com/voice.mp3',
  duration: 3.5,
  language: 'en',
  transcription: 'What is this object?'
});

// Add image to metadata
voiceMetadata.images = ['https://example.com/object.jpg'];

// Send message
await chatStore.sendMessage('What is this object?', voiceMetadata);
```

### Example 2: AI Response with Audio

```javascript
// AI generates response with audio
const audioMetadata = createAudioResponseMetadata({
  audioUrl: 'https://example.com/response.mp3',
  duration: 5.0,
  language: 'en',
  emotion: 'neutral'
});

await chatStore.addAssistantMessage(
  'This appears to be a test object',
  audioMetadata
);
```

### Example 3: Text Message with Multiple Images

```javascript
const imageMetadata = createImageMetadata({
  imageUrl: [
    'https://example.com/img1.jpg',
    'https://example.com/img2.jpg',
    'https://example.com/img3.jpg'
  ]
});

await chatStore.sendMessage('Here are the diagrams', imageMetadata);
```

## UI Components

### Voice Controls

In voice mode, users see:
- Microphone button for recording
- Recording indicator
- Processing status
- Waiting phrase indicator
- Image upload button

### Message Display

Messages with multimedia show:
- Audio playback controls with duration
- Image thumbnails with dimensions
- Voice message indicator
- Click-to-expand images
- Hover effects for better UX

### Responsive Design

All multimedia components are responsive:
- Mobile: Stacked layout with touch-friendly controls
- Tablet: Optimized spacing and sizing
- Desktop: Full-featured layout with hover states

## Testing

### Unit Tests

Test multimedia helper functions:
```bash
npm test -- tests/unit/session/multimediaHelpers.test.js --run
```

### Integration Tests

Test multimedia support in sessions:
```bash
npm test -- tests/integration/session/MultimediaSupport.test.js --run
```

## Performance Considerations

### Audio Handling
- Blob URLs are created for local audio files
- URLs are revoked when no longer needed to free memory
- Audio is buffered for smooth playback
- Waiting phrases are pre-buffered for instant playback

### Image Handling
- Images are lazy-loaded
- Thumbnails are generated for large images
- Blob URLs are managed efficiently
- Image metadata is extracted asynchronously

### Database Storage
- Metadata is stored as JSONB for efficient querying
- Indexes support fast retrieval
- Large files are stored externally (URLs only in DB)
- Pagination prevents loading too much data at once

## Security Considerations

### Input Validation
- File types are validated before upload
- File sizes are checked against limits
- URLs are validated before storage
- Metadata is sanitized

### Access Control
- Users can only access their own multimedia
- Session ownership is verified
- Blob URLs are scoped to the session
- External URLs are validated

## Future Enhancements

Potential improvements:
1. Video support
2. Audio waveform visualization
3. Image editing/annotation
4. Voice-to-voice mode (no text)
5. Real-time collaboration
6. Cloud storage integration
7. Advanced audio effects
8. Image recognition/OCR
9. Automatic captioning
10. Multimedia search

## Troubleshooting

### Audio Not Playing
- Check browser audio permissions
- Verify audio URL is valid
- Check audio format compatibility
- Ensure audio context is initialized

### Images Not Displaying
- Verify image URL is accessible
- Check image format support
- Ensure blob URLs haven't been revoked
- Check browser console for errors

### Voice Recording Issues
- Check microphone permissions
- Verify MediaRecorder API support
- Check network connectivity for transcription
- Ensure audio context is running

## API Reference

See `src/lib/modules/session/utils/multimediaHelpers.js` for complete API documentation.

Key functions:
- `createVoiceMetadata(options)` - Create voice metadata
- `createImageMetadata(options)` - Create image metadata
- `createAudioResponseMetadata(options)` - Create audio response metadata
- `hasAudio(message)` - Check if message has audio
- `hasImages(message)` - Check if message has images
- `getAudioUrl(metadata)` - Extract audio URL
- `getImageUrls(metadata)` - Extract image URLs
- `formatAudioDuration(seconds)` - Format duration for display
- `extractImageMetadata(file)` - Extract image file metadata

## Related Documentation

- [Session Management](./session-creation-management.md)
- [Voice Chat Integration](./session-chat-voice-integration.md)
- [Sessions API](./api/sessions-api.md)
- [Message Service](../src/lib/modules/session/services/MessageService.js)
