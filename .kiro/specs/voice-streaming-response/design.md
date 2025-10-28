# Design Document: Voice Streaming Response

## Overview

This design transforms the voice mode from a "wait-then-speak" approach to a real-time streaming approach. Currently, the system waits for the complete AI response before starting TTS synthesis, causing 10-15 second delays. The new design implements streaming where TTS begins as soon as the first text chunks arrive, reducing perceived latency by 70%+ and creating a more natural conversation flow.

### Current Flow (Wait-Then-Speak)
```
User speaks → Transcribe → Send to AI → Wait for complete response → Synthesize entire text → Play audio
                                        ↑_____________10-15 seconds_____________↑
```

### New Flow (Streaming)
```
User speaks → Transcribe → Send to AI → Stream chunks → Detect sentence → Synthesize → Play
                                                         ↑____2-3 seconds____↑
                                        (Continue streaming while playing)
```

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Voice Chat UI                             │
│                     (VoiceChat.svelte)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Voice Services Layer                          │
│                   (voiceServices.js)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  sendTranscribedText()                                    │  │
│  │    ↓                                                      │  │
│  │  generateAIResponseStreaming() ← NEW                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Streaming Response Handler ← NEW                │
│                (StreamingResponseHandler.js)                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Receive text chunks from API                          │  │
│  │  • Buffer incomplete sentences                           │  │
│  │  • Detect sentence boundaries                            │  │
│  │  • Queue complete sentences for synthesis                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Streaming TTS Coordinator ← NEW                 │
│                (StreamingTTSCoordinator.js)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Receive complete sentences                            │  │
│  │  • Synthesize sentences in parallel                      │  │
│  │  • Queue audio segments                                  │  │
│  │  • Coordinate sequential playback                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Audio Queue Manager                             │
│                (AudioBufferManager.js - EXISTING)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Queue audio segments                                  │  │
│  │  • Play segments sequentially                            │  │
│  │  • Trigger avatar animations                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### API Layer Changes

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chat API Endpoint                             │
│                 (src/routes/api/chat/+server.js)                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /api/chat                                          │  │
│  │    • Add 'stream' parameter support                      │  │
│  │    • Return ReadableStream when stream=true              │  │
│  │    • Return JSON when stream=false (backward compat)     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LLM Provider Manager                            │
│              (container.resolve('llmProviderManager'))           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  generateChatCompletionWithEnhancement()                 │  │
│  │    • Already supports streaming                          │  │
│  │    • Returns chunks via callback or stream               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. StreamingResponseHandler (NEW)

**Purpose:** Manages incoming text chunks, buffers incomplete sentences, and detects sentence boundaries.

**Location:** `src/lib/modules/chat/StreamingResponseHandler.js`

**Interface:**
```javascript
class StreamingResponseHandler {
  constructor(options = {}) {
    this.textBuffer = '';
    this.onSentenceComplete = options.onSentenceComplete || (() => {});
    this.onStreamComplete = options.onStreamComplete || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Process incoming text chunk
   * @param {string} chunk - Text chunk from streaming API
   */
  processChunk(chunk) {
    this.textBuffer += chunk;
    this._detectAndEmitSentences();
  }

  /**
   * Detect sentence boundaries and emit complete sentences
   * @private
   */
  _detectAndEmitSentences() {
    // Regex for sentence boundaries: . ! ? followed by space or end
    const sentenceRegex = /([.!?]+)(\s+|$)/g;
    
    let match;
    let lastIndex = 0;
    
    while ((match = sentenceRegex.exec(this.textBuffer)) !== null) {
      const sentence = this.textBuffer.substring(lastIndex, match.index + match[0].length).trim();
      
      if (sentence.length > 0) {
        this.onSentenceComplete(sentence);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Keep remaining incomplete text in buffer
    this.textBuffer = this.textBuffer.substring(lastIndex);
  }

  /**
   * Finalize stream - emit any remaining text
   */
  finalize() {
    if (this.textBuffer.trim().length > 0) {
      this.onSentenceComplete(this.textBuffer.trim());
      this.textBuffer = '';
    }
    this.onStreamComplete();
  }

  /**
   * Reset handler state
   */
  reset() {
    this.textBuffer = '';
  }
}
```

### 2. StreamingTTSCoordinator (NEW)

**Purpose:** Coordinates TTS synthesis of streaming sentences and manages audio queue.

**Location:** `src/lib/modules/chat/StreamingTTSCoordinator.js`

**Interface:**
```javascript
class StreamingTTSCoordinator {
  constructor(options = {}) {
    this.synthesisQueue = [];
    this.isActive = false;
    this.onAudioReady = options.onAudioReady || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Queue sentence for synthesis
   * @param {string} sentence - Complete sentence to synthesize
   */
  async queueSentence(sentence) {
    const synthesisTask = {
      id: `sentence_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: sentence,
      status: 'pending',
      startTime: null,
      endTime: null
    };

    this.synthesisQueue.push(synthesisTask);
    
    // Start synthesis immediately
    await this._synthesizeSentence(synthesisTask);
  }

  /**
   * Synthesize a single sentence
   * @private
   * @param {Object} task - Synthesis task
   */
  async _synthesizeSentence(task) {
    task.status = 'synthesizing';
    task.startTime = Date.now();

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task.text,
          language: get(selectedLanguage),
          isWaitingPhrase: false,
          priority: 1,
          streamingSegment: true
        })
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      task.status = 'completed';
      task.endTime = Date.now();

      // Notify that audio is ready
      this.onAudioReady({
        taskId: task.id,
        audioBlob,
        text: task.text,
        synthesisTime: task.endTime - task.startTime
      });

    } catch (error) {
      task.status = 'failed';
      task.error = error;
      this.onError(error, task);
    }
  }

  /**
   * Start coordinator
   */
  start() {
    this.isActive = true;
  }

  /**
   * Stop coordinator and clear queue
   */
  stop() {
    this.isActive = false;
    this.synthesisQueue = [];
  }

  /**
   * Get coordinator status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      queueLength: this.synthesisQueue.length,
      pending: this.synthesisQueue.filter(t => t.status === 'pending').length,
      synthesizing: this.synthesisQueue.filter(t => t.status === 'synthesizing').length,
      completed: this.synthesisQueue.filter(t => t.status === 'completed').length,
      failed: this.synthesisQueue.filter(t => t.status === 'failed').length
    };
  }
}
```

### 3. Modified voiceServices.js

**Changes to existing functions:**

```javascript
/**
 * Generate AI response with streaming support (NEW)
 * @param {string} transcription - User's transcribed text
 * @param {Array} images - Selected images
 * @returns {Promise<string>} - Complete AI response
 */
async function generateAIResponseStreaming(transcription, images) {
  const language = get(selectedLanguage);
  
  // Initialize streaming components
  const streamingHandler = new StreamingResponseHandler({
    onSentenceComplete: async (sentence) => {
      console.log('[Streaming] Complete sentence:', sentence.substring(0, 50));
      await streamingTTSCoordinator.queueSentence(sentence);
    },
    onStreamComplete: () => {
      console.log('[Streaming] Stream complete');
    },
    onError: (error) => {
      console.error('[Streaming] Handler error:', error);
    }
  });

  const streamingTTSCoordinator = new StreamingTTSCoordinator({
    onAudioReady: async (audioData) => {
      console.log('[Streaming] Audio ready:', audioData.taskId);
      
      // Add to audio queue for playback
      await audioBufferManager.bufferAudio(audioData.audioBlob, {
        isWaitingPhrase: false,
        originalText: audioData.text,
        language: language,
        priority: 1,
        streamingSegment: true,
        id: audioData.taskId
      });
    },
    onError: (error, task) => {
      console.error('[Streaming] TTS error:', error, task);
    }
  });

  streamingTTSCoordinator.start();

  try {
    // Make streaming request to chat API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: transcription,
        images: images || [],
        language: language,
        stream: true // Enable streaming
      })
    });

    if (!response.ok) {
      throw new Error(`Chat API error: ${response.status}`);
    }

    // Read stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      
      // Process chunk through streaming handler
      streamingHandler.processChunk(chunk);
    }

    // Finalize stream
    streamingHandler.finalize();

    return fullResponse;

  } catch (error) {
    console.error('[Streaming] Error:', error);
    streamingTTSCoordinator.stop();
    throw error;
  }
}

/**
 * Modified sendTranscribedText to use streaming
 */
export async function sendTranscribedText(transcription, sessionId = null) {
  try {
    if (!get(isVoiceModeActive)) {
      console.log('Activating voice mode for transcribed text processing');
      setVoiceModeActive(true);
    }

    setLoading(true);

    const images = get(selectedImages);
    const messageId = Date.now();

    // Add user message
    addMessage(MESSAGE_TYPES.USER, transcription, images, messageId);

    // Update session title if needed
    if (sessionId && transcription && transcription.trim().length > 0) {
      // ... existing title update logic ...
    }

    // Trigger waiting phrase
    console.log('Triggering waiting phrase for user message...');
    try {
      await triggerWaitingPhrase();
    } catch (waitingPhraseError) {
      console.warn('Waiting phrase failed:', waitingPhraseError);
    }

    // Generate AI response with streaming (NEW)
    const response = await generateAIResponseStreaming(transcription, images);

    // Add AI response to chat
    if (response) {
      addMessage(MESSAGE_TYPES.TUTOR, response);
      determineEmotion(response);
      return response;
    }

    return null;

  } catch (error) {
    console.error('Error processing voice data:', error);
    setError('Failed to process voice data. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
}
```

### 4. Modified Chat API (+server.js)

**Add streaming support:**

```javascript
export async function POST({ request, locals }) {
  try {
    // ... existing authentication and validation ...

    const requestBody = await request.json();
    const { stream = false } = requestBody; // NEW: stream parameter

    // ... existing request processing ...

    if (stream) {
      // Return streaming response
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              const providerManager = container.resolve('llmProviderManager');
              
              // Use streaming completion
              await providerManager.generateChatCompletionWithEnhancement(
                messages,
                {
                  ...options,
                  stream: true,
                  onChunk: (chunk) => {
                    // Send chunk to client
                    controller.enqueue(new TextEncoder().encode(chunk));
                  }
                }
              );

              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        }),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
          }
        }
      );
    } else {
      // Return regular JSON response (existing behavior)
      const result = await providerManager.generateChatCompletionWithEnhancement(messages, options);
      // ... existing response building ...
      return json({ success: true, ...successResponse });
    }

  } catch (error) {
    // ... existing error handling ...
  }
}
```

## Data Models

### Streaming Task
```javascript
{
  id: string,              // Unique task ID
  text: string,            // Sentence text
  status: string,          // 'pending' | 'synthesizing' | 'completed' | 'failed'
  startTime: number,       // Timestamp when synthesis started
  endTime: number,         // Timestamp when synthesis completed
  error: Error             // Error object if failed
}
```

### Audio Segment Metadata
```javascript
{
  isWaitingPhrase: boolean,
  originalText: string,
  language: string,
  priority: number,
  streamingSegment: boolean,  // NEW: indicates this is from streaming
  id: string
}
```

### Streaming Status
```javascript
{
  isActive: boolean,
  queueLength: number,
  pending: number,
  synthesizing: number,
  completed: number,
  failed: number
}
```

## Error Handling

**Design Rationale:** The error handling strategy is designed to ensure graceful degradation and continuity of service. Rather than failing completely, the system attempts to recover or fall back to alternative approaches, maintaining user experience even when technical issues occur.

### 1. Streaming Connection Failure

**Scenario:** Network error during streaming (Requirement 8.2)

**Design Decision:** Implement automatic fallback to non-streaming mode to ensure conversation continuity.

**Handling:**
```javascript
try {
  const reader = response.body.getReader();
  // ... read stream ...
} catch (error) {
  console.error('[Streaming] Connection error:', error);
  
  // Fallback to non-streaming mode (Requirement 8.2)
  console.log('[Streaming] Falling back to non-streaming mode');
  const fallbackResponse = await generateAIResponse(transcription, images);
  await synthesizeSpeech(fallbackResponse, { isWaitingPhrase: false, priority: 1 });
  
  // Provide user feedback (Requirement 8.4)
  setError('Connection issue detected. Using standard response mode.');
}
```

### 2. TTS Synthesis Failure

**Scenario:** Individual sentence synthesis fails (Requirement 8.3)

**Design Decision:** Continue processing subsequent chunks rather than failing the entire response, maximizing the amount of content delivered to the user.

**Handling:**
```javascript
async _synthesizeSentence(task) {
  try {
    // ... synthesis logic ...
  } catch (error) {
    task.status = 'failed';
    task.error = error;
    
    // Log error with context (Requirement 7.3)
    console.error('[Streaming] TTS failed for sentence:', {
      text: task.text.substring(0, 50),
      error: error.message,
      taskId: task.id,
      timestamp: new Date().toISOString()
    });
    
    // Notify error handler
    this.onError(error, task);
    
    // Don't throw - allow other sentences to continue (Requirement 8.3)
  }
}
```

### 3. Interruption During Streaming

**Scenario:** User interrupts while streaming is active (Requirement 4)

**Design Decision:** Implement comprehensive cleanup to ensure no residual state affects subsequent interactions. This includes stopping all active processes, clearing queues, and resetting UI components.

**Handling:**
```javascript
export function handleInterruption() {
  console.log('[Streaming] Interruption detected');
  
  // Stop streaming handler and reset state (Requirement 4.4)
  if (activeStreamingHandler) {
    activeStreamingHandler.reset();
  }
  
  // Stop TTS coordinator and cancel pending operations (Requirement 4.2)
  if (activeStreamingTTSCoordinator) {
    activeStreamingTTSCoordinator.stop();
  }
  
  // Close stream connection if still active (Requirement 4.3)
  if (activeStreamReader) {
    activeStreamReader.cancel();
    activeStreamReader = null;
  }
  
  // Clear audio queue (Requirement 4.1)
  audioBufferManager.clearQueue();
  
  // Stop current audio playback immediately (Requirement 4.1)
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }
  
  // Reset avatar state to neutral (Requirement 3.3)
  avatarStateManager.reset();
}
```

### 4. Incomplete Stream

**Scenario:** Stream ends with incomplete sentence in buffer (Requirement 5.5)

**Design Decision:** Treat remaining buffered text as a complete sentence to ensure all content is delivered to the user, even if it doesn't end with standard punctuation.

**Handling:**
```javascript
finalize() {
  // Emit any remaining text as final sentence (Requirement 5.5)
  if (this.textBuffer.trim().length > 0) {
    console.log('[Streaming] Finalizing with remaining text:', this.textBuffer);
    this.onSentenceComplete(this.textBuffer.trim());
    this.textBuffer = '';
  }
  this.onStreamComplete();
}
```

### 5. Mid-Response Connection Loss

**Scenario:** Streaming connection drops after some audio has been synthesized (Requirement 8.1)

**Design Decision:** Complete playback of already-synthesized segments to provide partial value to the user, then notify them of the issue.

**Handling:**
```javascript
async function handleStreamConnectionLoss(error, synthesizedSegments) {
  console.error('[Streaming] Connection lost mid-response:', error);
  
  // Complete playback of already-synthesized audio (Requirement 8.1)
  console.log(`[Streaming] Playing ${synthesizedSegments.length} completed segments`);
  // Audio queue will continue playing existing segments
  
  // Provide user feedback after playback completes (Requirement 8.4)
  audioBufferManager.onQueueComplete(() => {
    setError('Connection interrupted. Response may be incomplete.');
  });
}
```

## Testing Strategy

### Unit Tests

**StreamingResponseHandler:**
```javascript
describe('StreamingResponseHandler', () => {
  it('should detect complete sentences', () => {
    const sentences = [];
    const handler = new StreamingResponseHandler({
      onSentenceComplete: (s) => sentences.push(s)
    });
    
    handler.processChunk('Hello world. ');
    handler.processChunk('How are you? ');
    
    expect(sentences).toEqual(['Hello world.', 'How are you?']);
  });

  it('should buffer incomplete sentences', () => {
    const sentences = [];
    const handler = new StreamingResponseHandler({
      onSentenceComplete: (s) => sentences.push(s)
    });
    
    handler.processChunk('Hello ');
    handler.processChunk('world');
    
    expect(sentences).toEqual([]);
    expect(handler.textBuffer).toBe('Hello world');
  });

  it('should emit buffered text on finalize', () => {
    const sentences = [];
    const handler = new StreamingResponseHandler({
      onSentenceComplete: (s) => sentences.push(s)
    });
    
    handler.processChunk('Incomplete sentence');
    handler.finalize();
    
    expect(sentences).toEqual(['Incomplete sentence']);
  });
});
```

**StreamingTTSCoordinator:**
```javascript
describe('StreamingTTSCoordinator', () => {
  it('should queue and synthesize sentences', async () => {
    const audioReady = [];
    const coordinator = new StreamingTTSCoordinator({
      onAudioReady: (data) => audioReady.push(data)
    });
    
    coordinator.start();
    await coordinator.queueSentence('Test sentence.');
    
    // Wait for synthesis
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(audioReady.length).toBe(1);
    expect(audioReady[0].text).toBe('Test sentence.');
  });

  it('should handle synthesis errors gracefully', async () => {
    const errors = [];
    const coordinator = new StreamingTTSCoordinator({
      onError: (error, task) => errors.push({ error, task })
    });
    
    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    coordinator.start();
    await coordinator.queueSentence('Test sentence.');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(errors.length).toBe(1);
    expect(errors[0].task.status).toBe('failed');
  });
});
```

### Integration Tests

**End-to-end streaming flow:**
```javascript
describe('Voice Streaming Integration', () => {
  it('should stream response and play audio', async () => {
    // Mock chat API to return streaming response
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/chat') {
        return Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('Hello. ') })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('How are you? ') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });
      }
      
      if (url === '/api/synthesize') {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['audio data']))
        });
      }
    });

    const response = await sendTranscribedText('Test message');
    
    expect(response).toBe('Hello. How are you? ');
    
    // Verify audio was queued
    const queueStatus = getAudioQueueStatus();
    expect(queueStatus.queueLength).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist

- [ ] Start voice chat and speak a question
- [ ] Verify waiting phrase plays immediately
- [ ] Verify first sentence starts playing within 2-3 seconds
- [ ] Verify smooth transitions between sentences
- [ ] Verify cat avatar animates continuously
- [ ] Interrupt during streaming and verify clean stop
- [ ] Test with long responses (multiple sentences)
- [ ] Test with short responses (single sentence)
- [ ] Test with network delays
- [ ] Test fallback to non-streaming mode on error
- [ ] Test in different languages (EN, RU, ES)

## Performance Considerations

**Design Rationale:** Achieving the 70% latency reduction (Requirement 1.4) requires careful optimization at every stage of the pipeline. The design focuses on minimizing wait times through parallel processing, efficient buffering, and immediate action on available data.

### Metrics to Track

1. **Time to First Audio (TTFA) - PRIMARY METRIC (Requirement 1.4)**
   - Current baseline: 10-15 seconds
   - Target: 2-3 seconds (70-80% reduction)
   - Measurement: Time from API request to first audio playback start
   - Components:
     - Time to first chunk arrival
     - Time to first sentence detection
     - Time to first audio synthesis
     - Time to first audio playback

2. **Sentence Synthesis Time (Requirement 1.2)**
   - Target: < 1 second per sentence
   - Measurement: Time from sentence detection to audio ready
   - Critical for maintaining streaming flow

3. **Buffer Utilization**
   - Monitor text buffer size
   - Monitor audio queue length
   - Prevent memory leaks
   - Track buffer overflow events

4. **Error Rate**
   - Track synthesis failures
   - Track streaming connection failures
   - Target: < 1% error rate
   - Monitor recovery success rate

### Latency Reduction Strategy (Requirement 1.4)

**Design Decision:** Implement a multi-stage pipeline where each stage begins processing as soon as data is available, rather than waiting for complete responses.

```
Traditional Flow (10-15 seconds):
┌─────────────────────────────────────────────────────────┐
│ Wait for complete AI response (8-12s)                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Synthesize entire text (2-3s)                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Play audio                                               │
└─────────────────────────────────────────────────────────┘

Streaming Flow (2-3 seconds):
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Chunk 1      │  │ Chunk 2      │  │ Chunk 3      │
│ arrives      │  │ arrives      │  │ arrives      │
│ (0.5s)       │  │ (1.0s)       │  │ (1.5s)       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Detect       │  │ Detect       │  │ Detect       │
│ sentence 1   │  │ sentence 2   │  │ sentence 3   │
│ (0.6s)       │  │ (1.1s)       │  │ (1.6s)       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Synthesize   │  │ Synthesize   │  │ Synthesize   │
│ (parallel)   │  │ (parallel)   │  │ (parallel)   │
│ (1.5s)       │  │ (2.0s)       │  │ (2.5s)       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────┐
│ Play sequentially (starts at 2.1s)              │
└──────────────────────────────────────────────────┘

TTFA: 2.1 seconds (86% reduction from 15s baseline)
```

### Optimization Strategies

**1. Parallel Synthesis (Requirement 1.5)**

**Design Decision:** Synthesize multiple sentences simultaneously while maintaining sequential playback order.

```javascript
class StreamingTTSCoordinator {
  constructor(options = {}) {
    // ... existing code ...
    this.maxParallelSynthesis = 3; // Synthesize up to 3 sentences at once
    this.activeSynthesisTasks = 0;
  }
  
  async queueSentence(sentence) {
    const synthesisTask = {
      id: `sentence_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: sentence,
      status: 'pending',
      queuePosition: this.synthesisQueue.length
    };

    this.synthesisQueue.push(synthesisTask);
    
    // Start synthesis immediately if under parallel limit (Requirement 1.5)
    if (this.activeSynthesisTasks < this.maxParallelSynthesis) {
      this._synthesizeSentence(synthesisTask);
    }
  }
  
  async _synthesizeSentence(task) {
    this.activeSynthesisTasks++;
    task.status = 'synthesizing';
    
    try {
      // ... synthesis logic ...
      
      // When complete, start next pending task
      const nextPending = this.synthesisQueue.find(t => t.status === 'pending');
      if (nextPending) {
        this._synthesizeSentence(nextPending);
      }
    } finally {
      this.activeSynthesisTasks--;
    }
  }
}
```

**2. Immediate Processing (Requirement 1.1, 1.2, 1.3)**

**Design Decision:** Process each chunk immediately upon arrival, detect sentences eagerly, and synthesize as soon as complete sentences are available.

```javascript
// Immediate chunk processing (Requirement 1.1)
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  
  // Process immediately - don't wait for more chunks (Requirement 1.1)
  streamingHandler.processChunk(chunk);
}

// Immediate sentence detection (Requirement 1.2)
_detectAndEmitSentences() {
  // Scan buffer after each chunk
  const sentenceRegex = /([.!?]+)(\s+|$)/g;
  // ... detect and emit immediately (Requirement 1.2)
}

// Immediate synthesis (Requirement 1.2)
onSentenceComplete: async (sentence) => {
  // Synthesize immediately - don't wait for full response (Requirement 1.2)
  await streamingTTSCoordinator.queueSentence(sentence);
}

// Immediate playback (Requirement 1.3)
onAudioReady: async (audioData) => {
  // Play immediately when ready (Requirement 1.3)
  await audioBufferManager.bufferAudio(audioData.audioBlob, metadata);
}
```

**3. Efficient Sentence Boundary Detection**

**Design Decision:** Use optimized regex with minimal backtracking and process only new text.

```javascript
_detectAndEmitSentences() {
  // Efficient regex - no backtracking
  const sentenceRegex = /([.!?]+)(\s+|$)/g;
  
  let match;
  let lastIndex = 0;
  
  // Process only once per chunk
  while ((match = sentenceRegex.exec(this.textBuffer)) !== null) {
    const sentence = this.textBuffer.substring(lastIndex, match.index + match[0].length).trim();
    
    if (sentence.length > 0) {
      this.onSentenceComplete(sentence);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Keep only unprocessed text
  this.textBuffer = this.textBuffer.substring(lastIndex);
}
```

**4. Audio Queue Management (Requirement 1.5)**

**Design Decision:** Use existing AudioBufferManager with priority queuing to ensure sequential playback while allowing parallel synthesis.

```javascript
class AudioBufferManager {
  async bufferAudio(audioBlob, metadata) {
    const segment = {
      audioBlob,
      metadata,
      priority: metadata.priority || 1,
      timestamp: Date.now()
    };
    
    // Add to queue in order (Requirement 1.5)
    this.audioQueue.push(segment);
    
    // Sort by priority and timestamp to maintain order
    this.audioQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });
    
    // Start playback immediately if not already playing (Requirement 1.3)
    if (!this.isPlaying) {
      await this.playNextSegment();
    }
  }
}
```

**5. Memory Management**

**Design Decision:** Aggressively clean up completed tasks and limit queue sizes to prevent memory issues.

```javascript
class StreamingTTSCoordinator {
  async _synthesizeSentence(task) {
    try {
      // ... synthesis logic ...
      
      task.status = 'completed';
      
      // Clean up completed task after audio is queued
      setTimeout(() => {
        const index = this.synthesisQueue.indexOf(task);
        if (index > -1 && task.status === 'completed') {
          this.synthesisQueue.splice(index, 1);
        }
      }, 5000); // Keep for 5 seconds for debugging
      
    } catch (error) {
      // ... error handling ...
    }
  }
  
  stop() {
    // Aggressive cleanup on stop
    this.isActive = false;
    this.synthesisQueue = [];
    this.activeSynthesisTasks = 0;
  }
}
```

### Performance Benchmarks

**Target Performance (Requirement 1.4):**

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Time to First Audio | 10-15s | 2-3s | 70-80% |
| Total Response Time | 15-20s | 5-8s | 60-67% |
| Perceived Latency | High | Low | Significant |

**Breakdown of 2-3 Second TTFA:**
- Chunk arrival: 0.5-1.0s (network + AI generation start)
- Sentence detection: 0.1s (regex processing)
- TTS synthesis: 0.8-1.2s (API call + synthesis)
- Audio buffering: 0.1s (blob creation)
- Playback start: 0.5s (audio element initialization)
- **Total: 2.0-3.0s**

## Migration Strategy

### Phase 1: Add Streaming Components (No Breaking Changes)

1. Create StreamingResponseHandler.js
2. Create StreamingTTSCoordinator.js
3. Add unit tests
4. No changes to existing code

### Phase 2: Add API Streaming Support (Backward Compatible)

1. Add `stream` parameter to /api/chat
2. Return streaming response when stream=true
3. Return JSON response when stream=false (existing behavior)
4. Test both modes

### Phase 3: Integrate Streaming in Voice Mode

1. Add generateAIResponseStreaming() function
2. Modify sendTranscribedText() to use streaming
3. Add feature flag to toggle streaming on/off
4. Test thoroughly

### Phase 4: Enable by Default

1. Enable streaming by default in voice mode
2. Keep non-streaming as fallback
3. Monitor metrics and errors
4. Iterate based on feedback

## Rollback Plan

If streaming causes issues:

1. **Immediate:** Set feature flag to disable streaming
2. **Fallback:** System automatically uses non-streaming mode
3. **Monitoring:** Track error rates and user feedback
4. **Fix:** Address issues and re-enable gradually

## Avatar Animation Integration (Requirement 3)

**Design Rationale:** The cat avatar must provide continuous, synchronized visual feedback during streaming playback. This requires careful coordination between audio segments to maintain natural lip-sync without visible resets or gaps.

### Animation Coordination Strategy

**Design Decision:** Extend the existing AvatarStateManager to handle streaming segments while maintaining continuous animation state across segment boundaries.

### Modified AudioBufferManager Integration

```javascript
class AudioBufferManager {
  // Existing methods...
  
  /**
   * Enhanced for streaming: Maintain animation state across segments
   */
  async bufferAudio(audioBlob, metadata) {
    const segment = {
      audioBlob,
      metadata,
      isStreamingSegment: metadata.streamingSegment || false
    };
    
    this.audioQueue.push(segment);
    
    if (!this.isPlaying) {
      await this.playNextSegment();
    }
  }
  
  /**
   * Play next segment with continuous animation (Requirement 3.2)
   */
  async playNextSegment() {
    if (this.audioQueue.length === 0) {
      // No more segments - return to neutral (Requirement 3.3)
      avatarStateManager.returnToNeutral();
      this.isPlaying = false;
      return;
    }
    
    const segment = this.audioQueue.shift();
    this.isPlaying = true;
    
    // Create audio element
    const audio = new Audio(URL.createObjectURL(segment.audioBlob));
    
    // Start lip-sync animation (Requirement 3.1)
    avatarStateManager.startLipSync(audio, {
      maintainState: segment.isStreamingSegment, // Don't reset between segments
      onPhoneme: (phoneme) => {
        // Update mouth shape in real-time (Requirement 3.4)
        avatarStateManager.updateMouthShape(phoneme);
      }
    });
    
    // Handle segment completion
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      
      // Continue to next segment without resetting animation (Requirement 3.2)
      this.playNextSegment();
    };
    
    audio.play();
  }
}
```

### AvatarStateManager Enhancements

```javascript
class AvatarStateManager {
  constructor() {
    this.currentMouthState = 'neutral';
    this.isAnimating = false;
    this.currentEmotion = 'neutral';
  }
  
  /**
   * Start lip-sync with optional state maintenance (Requirement 3.1, 3.2)
   */
  startLipSync(audio, options = {}) {
    const { maintainState = false, onPhoneme } = options;
    
    if (!maintainState) {
      // Reset to neutral only for non-streaming segments
      this.currentMouthState = 'neutral';
    }
    
    this.isAnimating = true;
    
    // Analyze audio for phonemes (Requirement 3.4)
    this.analyzeAudioForPhonemes(audio, (phoneme) => {
      this.updateMouthShape(phoneme);
      if (onPhoneme) onPhoneme(phoneme);
    });
  }
  
  /**
   * Update mouth shape based on phoneme (Requirement 3.4)
   */
  updateMouthShape(phoneme) {
    // Map phonemes to mouth shapes
    const mouthShapes = {
      'a': 'open',
      'e': 'smile',
      'i': 'narrow',
      'o': 'round',
      'u': 'pucker',
      'silence': 'closed'
    };
    
    const newShape = mouthShapes[phoneme] || 'neutral';
    
    // Smooth transition between shapes
    this.transitionMouthShape(this.currentMouthState, newShape);
    this.currentMouthState = newShape;
  }
  
  /**
   * Apply emotion consistently across segments (Requirement 3.5)
   */
  applyEmotion(emotion) {
    this.currentEmotion = emotion;
    
    // Apply facial expression
    this.updateFacialExpression(emotion);
    
    // Emotion persists across streaming segments
  }
  
  /**
   * Return to neutral state (Requirement 3.3)
   */
  returnToNeutral() {
    this.isAnimating = false;
    this.transitionMouthShape(this.currentMouthState, 'closed');
    this.currentMouthState = 'closed';
  }
  
  /**
   * Reset all state (for interruptions)
   */
  reset() {
    this.isAnimating = false;
    this.currentMouthState = 'neutral';
    this.currentEmotion = 'neutral';
    this.updateFacialExpression('neutral');
    this.updateMouthShape('silence');
  }
}
```

### Seamless Transition Strategy (Requirement 2.1)

**Design Decision:** Use audio crossfading and buffer pre-loading to eliminate gaps between segments.

```javascript
class SeamlessAudioTransitionManager {
  constructor() {
    this.currentAudio = null;
    this.nextAudio = null;
    this.crossfadeDuration = 50; // 50ms crossfade
  }
  
  /**
   * Play audio with seamless transition (Requirement 2.1)
   */
  async playWithTransition(audioBlob) {
    const audio = new Audio(URL.createObjectURL(audioBlob));
    
    // Pre-load next audio
    await audio.load();
    
    if (this.currentAudio && this.currentAudio.paused === false) {
      // Crossfade from current to next
      await this.crossfade(this.currentAudio, audio);
    } else {
      // First segment - just play
      audio.play();
    }
    
    this.currentAudio = audio;
  }
  
  /**
   * Crossfade between audio segments (Requirement 2.1)
   */
  async crossfade(fromAudio, toAudio) {
    const steps = 10;
    const stepDuration = this.crossfadeDuration / steps;
    
    // Start next audio
    toAudio.volume = 0;
    toAudio.play();
    
    // Fade out current, fade in next
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      fromAudio.volume = 1 - progress;
      toAudio.volume = progress;
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    
    // Stop previous audio
    fromAudio.pause();
    fromAudio.currentTime = 0;
  }
}
```

## Voice Consistency (Requirement 2.2)

**Design Rationale:** Maintaining consistent voice characteristics across streaming segments is critical for natural-sounding speech. The TTS API must receive consistent parameters for each segment.

### TTS Parameter Consistency

```javascript
class StreamingTTSCoordinator {
  constructor(options = {}) {
    // ... existing code ...
    
    // Store voice parameters for consistency (Requirement 2.2)
    this.voiceParameters = {
      language: null,
      voice: null,
      speed: 1.0,
      pitch: 1.0,
      emotion: 'neutral'
    };
  }
  
  /**
   * Initialize voice parameters for session
   */
  initializeVoiceParameters(language, emotion = 'neutral') {
    this.voiceParameters = {
      language,
      voice: this.selectVoiceForLanguage(language),
      speed: 1.0,
      pitch: 1.0,
      emotion
    };
  }
  
  /**
   * Synthesize with consistent parameters (Requirement 2.2)
   */
  async _synthesizeSentence(task) {
    task.status = 'synthesizing';
    task.startTime = Date.now();

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task.text,
          // Use consistent voice parameters (Requirement 2.2)
          language: this.voiceParameters.language,
          voice: this.voiceParameters.voice,
          speed: this.voiceParameters.speed,
          pitch: this.voiceParameters.pitch,
          emotion: this.voiceParameters.emotion,
          isWaitingPhrase: false,
          priority: 1,
          streamingSegment: true
        })
      });

      // ... rest of synthesis logic ...
    } catch (error) {
      // ... error handling ...
    }
  }
  
  /**
   * Update emotion for subsequent segments (Requirement 2.5)
   */
  updateEmotion(emotion) {
    this.voiceParameters.emotion = emotion;
    
    // Apply to avatar as well (Requirement 3.5)
    avatarStateManager.applyEmotion(emotion);
  }
}
```

## Dependencies

### Existing Components (Modified for Streaming)

- **AudioBufferManager.js** - Enhanced to handle streaming segments with continuous playback
- **AvatarStateManager.js** - Extended to maintain animation state across segments
- **waitingPhrasesService.js** - No changes required
- **InterruptionDetector.js** - No changes required

### New Components

- **StreamingResponseHandler.js** - Manages text chunk processing and sentence detection
- **StreamingTTSCoordinator.js** - Coordinates TTS synthesis for streaming segments
- **SeamlessAudioTransitionManager.js** - Handles smooth transitions between audio segments
- **StreamingPerformanceMonitor.js** - Tracks metrics and performance

### New Dependencies

- None - uses existing fetch API and Web Streams API

### Browser Compatibility

- ReadableStream API - Supported in all modern browsers
- TextEncoder/TextDecoder - Supported in all modern browsers
- Fetch API - Already used throughout the app
- Web Audio API - Used for phoneme analysis and crossfading

## Language-Agnostic Text Processing (Requirement 5)

**Design Rationale:** The streaming system must handle text in any language without language-specific processing. This ensures the system works correctly for English, Russian, Spanish, and any future languages without modification.

### Universal Sentence Boundary Detection (Requirement 5.1)

**Design Decision:** Use standard Unicode punctuation patterns that work across all languages, rather than language-specific rules.

```javascript
class StreamingResponseHandler {
  /**
   * Detect sentence boundaries using universal punctuation (Requirement 5.1)
   */
  _detectAndEmitSentences() {
    // Universal sentence boundary markers (Requirement 5.1)
    // Matches: . ! ? followed by whitespace or end of string
    // Works for: English, Russian (Cyrillic), Spanish, and other languages
    const sentenceRegex = /([.!?]+)(\s+|$)/g;
    
    let match;
    let lastIndex = 0;
    
    while ((match = sentenceRegex.exec(this.textBuffer)) !== null) {
      const sentence = this.textBuffer.substring(lastIndex, match.index + match[0].length).trim();
      
      if (sentence.length > 0) {
        // Preserve special characters (Requirement 5.4)
        this.onSentenceComplete(sentence);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Keep remaining incomplete text in buffer (Requirement 5.5)
    this.textBuffer = this.textBuffer.substring(lastIndex);
  }
  
  /**
   * Process chunk as UTF-8 string (Requirement 5.2)
   */
  processChunk(chunk) {
    // Treat all text as UTF-8 encoded strings (Requirement 5.2)
    // No language-specific processing
    this.textBuffer += chunk;
    this._detectAndEmitSentences();
  }
}
```

### UTF-8 Text Handling (Requirement 5.2, 5.4)

**Design Decision:** Use native JavaScript string handling which supports UTF-8 by default, preserving all characters including special punctuation and diacritics.

```javascript
// Stream reading with UTF-8 decoding (Requirement 5.2)
const reader = response.body.getReader();
const decoder = new TextDecoder('utf-8'); // Explicit UTF-8 decoding

while (true) {
  const { done, value } = await reader.read();
  
  if (done) break;
  
  // Decode as UTF-8, preserving all characters (Requirement 5.2, 5.4)
  const chunk = decoder.decode(value, { stream: true });
  
  // Process without language-specific modifications
  streamingHandler.processChunk(chunk);
}
```

### Language-Agnostic TTS Integration (Requirement 5.3)

**Design Decision:** Pass complete sentences to TTS engine without modification, allowing the TTS system to handle language-specific pronunciation.

```javascript
async _synthesizeSentence(task) {
  // Send complete sentence as-is to TTS (Requirement 5.3)
  const response = await fetch('/api/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: task.text, // Complete sentence, no modifications
      language: this.voiceParameters.language, // Language code only
      // TTS engine handles language-specific pronunciation
      streamingSegment: true
    })
  });
}
```

### Multi-Language Testing Examples

```javascript
// English
"Hello. How are you? I'm doing great!"
// Detected sentences: ["Hello.", "How are you?", "I'm doing great!"]

// Russian (Cyrillic)
"Привет. Как дела? Я отлично!"
// Detected sentences: ["Привет.", "Как дела?", "Я отлично!"]

// Spanish
"Hola. ¿Cómo estás? ¡Estoy genial!"
// Detected sentences: ["Hola.", "¿Cómo estás?", "¡Estoy genial!"]

// Mixed punctuation and special characters (Requirement 5.4)
"The formula is E=mc². It's Einstein's equation!"
// Detected sentences: ["The formula is E=mc².", "It's Einstein's equation!"]
```

## Security Considerations

1. **Input Validation**
   - Validate stream parameter in API
   - Sanitize text chunks before synthesis
   - Validate UTF-8 encoding to prevent injection attacks

2. **Rate Limiting**
   - Apply existing rate limits to streaming requests
   - Monitor for abuse
   - Limit maximum stream duration per request

3. **Error Information**
   - Don't expose internal errors to client
   - Log detailed errors server-side only
   - Sanitize error messages sent to frontend

4. **Resource Limits**
   - Limit maximum stream duration (e.g., 5 minutes)
   - Limit maximum buffer sizes (e.g., 10KB text buffer)
   - Limit maximum concurrent synthesis operations (e.g., 5 parallel)
   - Prevent memory exhaustion through queue size limits

5. **Content Security**
   - Validate text content doesn't contain malicious scripts
   - Ensure TTS API calls are authenticated
   - Prevent unauthorized access to streaming endpoints

## Monitoring and Logging

**Design Rationale:** Comprehensive monitoring and logging are essential for identifying performance bottlenecks, debugging issues, and ensuring the system meets its latency reduction goals. The logging strategy captures key events and metrics throughout the streaming pipeline.

### Key Metrics (Requirement 7)

```javascript
{
  streamingMetrics: {
    // Performance metrics
    ttfa: number,                    // Time to first audio (ms) - Target: 2-3s
    totalResponseTime: number,       // Total time from request to completion
    streamDuration: number,          // Total stream duration (ms)
    
    // Processing metrics (Requirement 7.2)
    totalSentences: number,          // Total sentences processed
    totalChunks: number,             // Total chunks received
    avgChunkSize: number,            // Average chunk size in characters
    avgProcessingTime: number,       // Average chunk processing time
    avgSynthesisTime: number,        // Average synthesis time per sentence
    
    // Buffer metrics
    bufferPeakSize: number,          // Peak text buffer size
    maxQueueLength: number,          // Maximum audio queue length
    
    // Error metrics
    errorRate: number,               // Percentage of failed syntheses
    failedSentences: number,         // Count of failed synthesis attempts
    connectionErrors: number,        // Count of connection failures
    
    // Timing breakdown (Requirement 7.4)
    firstChunkArrival: number,       // Time to first chunk (ms)
    firstSentenceDetected: number,   // Time to first sentence detection (ms)
    firstAudioReady: number,         // Time to first audio synthesis (ms)
    firstAudioPlaying: number,       // Time to first audio playback (ms)
    audioGaps: Array<{               // Detected gaps in playback
      timestamp: number,
      duration: number
    }>
  }
}
```

### Logging Points (Requirement 7)

**1. Stream Initialization (Requirement 7.1)**
```javascript
console.log('[Streaming] Stream started', {
  timestamp: new Date().toISOString(),
  userMessage: transcription.substring(0, 50),
  language: language,
  sessionId: sessionId
});
```

**2. Chunk Processing (Requirement 7.2)**
```javascript
console.log('[Streaming] Chunk received', {
  chunkNumber: chunkCount,
  chunkSize: chunk.length,
  processingTime: Date.now() - chunkStartTime,
  bufferSize: this.textBuffer.length
});
```

**3. Sentence Detection (Requirement 7.2)**
```javascript
console.log('[Streaming] Sentence detected', {
  sentenceNumber: sentenceCount,
  text: sentence.substring(0, 50),
  detectionTime: Date.now() - streamStartTime
});
```

**4. Synthesis Completion (Requirement 7.2)**
```javascript
console.log('[Streaming] Audio ready', {
  taskId: task.id,
  text: task.text.substring(0, 50),
  synthesisTime: task.endTime - task.startTime,
  queuePosition: audioQueue.length
});
```

**5. Playback Events**
```javascript
console.log('[Streaming] Audio playback started', {
  segmentId: segment.id,
  text: segment.text.substring(0, 50),
  timeFromRequest: Date.now() - requestStartTime
});
```

**6. Error Events (Requirement 7.3)**
```javascript
console.error('[Streaming] Error occurred', {
  errorType: error.name,
  errorMessage: error.message,
  failurePoint: 'synthesis', // or 'connection', 'processing'
  context: {
    taskId: task?.id,
    text: task?.text?.substring(0, 50),
    timestamp: new Date().toISOString()
  },
  recoveryAction: 'continuing with next sentence' // or 'falling back to non-streaming'
});
```

**7. Stream Completion (Requirement 7.5)**
```javascript
console.log('[Streaming] Stream complete', {
  totalSentences: sentenceCount,
  totalChunks: chunkCount,
  duration: Date.now() - streamStartTime,
  ttfa: firstAudioTime - streamStartTime,
  avgSynthesisTime: totalSynthesisTime / sentenceCount,
  errorRate: (failedCount / sentenceCount) * 100,
  timestamp: new Date().toISOString()
});
```

### Example Log Output

```
[Streaming] Stream started { timestamp: "2024-01-15T10:30:00.000Z", userMessage: "What is photosynthesis?", language: "en", sessionId: "sess_123" }
[Streaming] Chunk received { chunkNumber: 1, chunkSize: 45, processingTime: 12, bufferSize: 45 }
[Streaming] Sentence detected { sentenceNumber: 1, text: "Photosynthesis is the process...", detectionTime: 850 }
[Streaming] Audio ready { taskId: "sentence_1234_abc", text: "Photosynthesis is the process...", synthesisTime: 850, queuePosition: 0 }
[Streaming] Audio playback started { segmentId: "sentence_1234_abc", text: "Photosynthesis is the process...", timeFromRequest: 2100 }
[Streaming] Chunk received { chunkNumber: 2, chunkSize: 38, processingTime: 8, bufferSize: 38 }
[Streaming] Sentence detected { sentenceNumber: 2, text: "It occurs in plants...", detectionTime: 1650 }
[Streaming] Audio ready { taskId: "sentence_1234_def", text: "It occurs in plants...", synthesisTime: 920, queuePosition: 1 }
[Streaming] Stream complete { totalSentences: 2, totalChunks: 3, duration: 3200, ttfa: 2100, avgSynthesisTime: 885, errorRate: 0, timestamp: "2024-01-15T10:30:03.200Z" }
```

### Performance Dashboard

**Design Decision:** Create a real-time performance monitoring interface for development and debugging.

```javascript
class StreamingPerformanceMonitor {
  constructor() {
    this.metrics = {
      sessions: [],
      currentSession: null
    };
  }
  
  startSession(sessionId) {
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      chunks: [],
      sentences: [],
      errors: []
    };
  }
  
  recordChunk(chunk) {
    this.currentSession.chunks.push({
      timestamp: Date.now(),
      size: chunk.length
    });
  }
  
  recordSentence(sentence, synthesisTime) {
    this.currentSession.sentences.push({
      timestamp: Date.now(),
      text: sentence,
      synthesisTime
    });
  }
  
  recordError(error, context) {
    this.currentSession.errors.push({
      timestamp: Date.now(),
      error,
      context
    });
  }
  
  endSession() {
    const session = this.currentSession;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.ttfa = session.sentences[0]?.timestamp - session.startTime;
    
    this.metrics.sessions.push(session);
    this.currentSession = null;
    
    return session;
  }
  
  getAverageMetrics() {
    const sessions = this.metrics.sessions;
    return {
      avgTTFA: sessions.reduce((sum, s) => sum + s.ttfa, 0) / sessions.length,
      avgDuration: sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length,
      avgSentences: sessions.reduce((sum, s) => sum + s.sentences.length, 0) / sessions.length,
      errorRate: sessions.reduce((sum, s) => sum + s.errors.length, 0) / sessions.reduce((sum, s) => sum + s.sentences.length, 0)
    };
  }
}
```

## Future Enhancements

### Phase 2 (Post-MVP)

1. **Adaptive Buffering**
   - Adjust buffer size based on network conditions
   - Predict optimal sentence boundaries

2. **Predictive Synthesis**
   - Start synthesizing before sentence is complete
   - Use language models to predict sentence endings

3. **Voice Cloning**
   - Maintain consistent voice across segments
   - Handle emotion transitions smoothly

4. **Multi-language Streaming**
   - Detect language changes mid-stream
   - Switch TTS voices dynamically

### Phase 3 (Advanced)

1. **Real-time Translation**
   - Stream translation alongside original text
   - Synthesize in target language

2. **Emotion-aware Streaming**
   - Detect emotion changes in real-time
   - Apply voice modulation dynamically

3. **Interruption Recovery**
   - Resume from interruption point
   - Maintain conversation context

## Conclusion

This design provides a comprehensive approach to implementing streaming responses in voice mode. The architecture is modular, testable, and backward compatible. The streaming approach will reduce perceived latency by 70%+, creating a more natural and engaging conversation experience.

Key benefits:
- Faster response times (2-3s vs 10-15s)
- Natural conversation flow
- Smooth audio transitions
- Robust error handling
- Backward compatible
- Easy to test and monitor
