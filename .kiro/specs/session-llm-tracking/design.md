# Design Document

## Overview

This document describes the design for tracking LLM models used in chat sessions and implementing a user feedback system. The system will store model information in message metadata, provide a dislike button for users to submit feedback, and create an administrator interface to review feedback along with model performance data.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
├─────────────────────────────────────────────────────────────────┤
│  Chat Interface          │  Admin Dashboard  │  Stats Page      │
│  - Messages              │  - Sessions View  │  - Dislike Stats │
│  - Dislike Button        │  - Feedback View  │  - Model Metrics │
│  - Feedback Dialog       │  - Model Info     │                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  /api/messages/feedback  │  /api/admin/feedback  │  /api/stats  │
│  - Submit feedback       │  - Get all feedback   │  - Get stats │
│  - Update feedback       │  - Filter by model    │  - By model  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Service Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  MessageService          │  FeedbackService  │  StatsService    │
│  - Store model info      │  - Store feedback │  - Aggregate     │
│  - Retrieve messages     │  - Retrieve       │  - Calculate     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ProviderManager                             │
├─────────────────────────────────────────────────────────────────┤
│  - Track model usage                                             │
│  - Capture model metadata                                        │
│  - Handle fallback scenarios                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Database                                 │
├─────────────────────────────────────────────────────────────────┤
│  Message.metadata = {                                            │
│    llm: { provider, model, version, timestamp, config },         │
│    feedback: { text, timestamp, userId }                         │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema Extension

#### Message Metadata Schema

The `Message.metadata` field (already exists as JSON) will be extended to include:

```typescript
interface MessageMetadata {
  // Existing fields
  audioUrl?: string;
  imageUrl?: string;
  language?: string;
  timestamp?: string;

  // NEW: LLM Model Information
  llm?: {
    provider: string; // 'openai', 'ollama', etc.
    model: string; // 'gpt-4', 'llama-3-8b', etc.
    version?: string; // Model version if available
    timestamp: string; // ISO timestamp of when model was invoked
    config?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    };
    fallback?: {
      attempted: string; // Model that was attempted first
      reason: string; // Reason for fallback
    };
  };

  // NEW: User Feedback
  feedback?: {
    text: string; // User's feedback text
    timestamp: string; // ISO timestamp of feedback submission
    userId: string; // User who submitted feedback
  };
}
```

**Note:** No database migration is required since `metadata` is already a JSON field in the `Message` model.

### 2. ProviderManager Enhancement

**File:** `src/lib/modules/llm/ProviderManager.js`

#### Current Behavior

- Generates chat completions
- Handles provider fallback
- Tracks usage statistics

#### New Behavior

- Capture model metadata during generation
- Return model information with response
- Track fallback scenarios

#### Implementation

```javascript
// In generateChatCompletion method
async generateChatCompletion(messages, options = {}) {
  const startTime = Date.now();
  const providerName = options.provider || (await this.getBestProvider());
  const provider = this.getProvider(providerName);

  let attemptedModel = null;
  let fallbackOccurred = false;
  let fallbackReason = null;

  try {
    // Try the selected provider
    const result = await provider.generateChatCompletion(messages, options);

    // Capture model metadata
    const modelMetadata = {
      provider: result.provider || providerName,
      model: result.model || options.model,
      version: result.version || null,
      timestamp: new Date().toISOString(),
      config: {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt
      }
    };

    // Add fallback info if applicable
    if (fallbackOccurred) {
      modelMetadata.fallback = {
        attempted: attemptedModel,
        reason: fallbackReason
      };
    }

    return {
      ...result,
      llmMetadata: modelMetadata
    };
  } catch (error) {
    // Handle fallback
    attemptedModel = options.model || 'default';
    fallbackOccurred = true;
    fallbackReason = error.message;

    // ... existing fallback logic ...
  }
}
```

### 3. MessageService Enhancement

**File:** `src/lib/modules/session/services/MessageService.js`

#### New Method: `addMessageWithModelInfo`

```javascript
/**
 * Add a message with LLM model information
 * @param {string} sessionId - Session ID
 * @param {string} type - Message type ('user' or 'assistant')
 * @param {string} content - Message content
 * @param {Object} llmMetadata - LLM model metadata from ProviderManager
 * @param {Object} existingMetadata - Other metadata (audio, images, etc.)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created message object
 */
static async addMessageWithModelInfo(
  sessionId,
  type,
  content,
  llmMetadata = null,
  existingMetadata = null,
  userId = null
) {
  // Merge metadata
  const metadata = {
    ...existingMetadata,
    ...(llmMetadata && type === 'assistant' ? { llm: llmMetadata } : {})
  };

  return this.addMessage(sessionId, type, content, metadata, userId);
}
```

### 4. FeedbackService (NEW)

**File:** `src/lib/modules/feedback/services/FeedbackService.js`

```javascript
/**
 * FeedbackService - User feedback management
 */
export class FeedbackService {
  /**
   * Submit feedback for a message
   * @param {string} messageId - Message ID
   * @param {string} feedbackText - User's feedback text
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated message with feedback
   */
  static async submitFeedback(messageId, feedbackText, userId) {
    // Validate inputs
    if (!messageId || !feedbackText || !userId) {
      throw new Error('Message ID, feedback text, and user ID are required');
    }

    // Get existing message
    const message = await MessageService.getMessage(messageId, userId);

    // Check if feedback already exists
    if (message.metadata?.feedback) {
      throw new Error('Feedback already submitted for this message');
    }

    // Add feedback to metadata
    const updatedMetadata = {
      ...message.metadata,
      feedback: {
        text: feedbackText.trim(),
        timestamp: new Date().toISOString(),
        userId
      }
    };

    // Update message
    return MessageService.updateMessage(messageId, { metadata: updatedMetadata }, userId);
  }

  /**
   * Get all feedback for admin review
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Messages with feedback
   */
  static async getAllFeedback(filters = {}) {
    const { page = 1, limit = 50, model = null, dateFrom = null, dateTo = null } = filters;

    // Build query to find messages with feedback
    const where = {
      metadata: {
        path: ['feedback'],
        not: null
      }
    };

    // Add model filter if specified
    if (model) {
      where.metadata = {
        ...where.metadata,
        path: ['llm', 'model'],
        equals: model
      };
    }

    // Query messages with feedback
    const messages = await db.message.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            title: true,
            userId: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    return messages;
  }

  /**
   * Get feedback statistics
   * @returns {Promise<Object>} Feedback statistics
   */
  static async getFeedbackStats() {
    // Count total messages with feedback
    const totalFeedback = await db.message.count({
      where: {
        metadata: {
          path: ['feedback'],
          not: null
        }
      }
    });

    // Get feedback grouped by model
    const messages = await db.message.findMany({
      where: {
        metadata: {
          path: ['feedback'],
          not: null
        }
      },
      select: {
        metadata: true
      }
    });

    // Group by model
    const byModel = {};
    messages.forEach((msg) => {
      const model = msg.metadata?.llm?.model || 'unknown';
      byModel[model] = (byModel[model] || 0) + 1;
    });

    return {
      totalFeedback,
      byModel
    };
  }
}
```

### 5. API Endpoints

#### POST /api/messages/feedback

Submit user feedback for a message.

**Request:**

```json
{
  "messageId": "msg_123",
  "feedback": "The answer was not accurate"
}
```

**Response:**

```json
{
  "success": true,
  "message": {
    "id": "msg_123",
    "content": "...",
    "metadata": {
      "llm": { ... },
      "feedback": {
        "text": "The answer was not accurate",
        "timestamp": "2024-10-22T10:30:00Z",
        "userId": "user_456"
      }
    }
  }
}
```

#### GET /api/admin/feedback

Get all feedback for admin review (admin only).

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Items per page
- `model` (optional): Filter by model name
- `dateFrom` (optional): Filter by date range
- `dateTo` (optional): Filter by date range

**Response:**

```json
{
  "success": true,
  "feedback": [
    {
      "id": "msg_123",
      "content": "...",
      "metadata": {
        "llm": {
          "provider": "openai",
          "model": "gpt-4",
          "timestamp": "2024-10-22T10:25:00Z"
        },
        "feedback": {
          "text": "The answer was not accurate",
          "timestamp": "2024-10-22T10:30:00Z",
          "userId": "user_456"
        }
      },
      "session": {
        "id": "session_789",
        "title": "Math homework help",
        "user": {
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "totalPages": 5,
    "totalCount": 42
  }
}
```

#### GET /api/stats/feedback

Get feedback statistics (admin only).

**Response:**

```json
{
  "success": true,
  "stats": {
    "totalFeedback": 42,
    "byModel": {
      "gpt-4": 25,
      "gpt-3.5-turbo": 12,
      "llama-3-8b": 5
    },
    "trends": {
      "lastWeek": 15,
      "lastMonth": 42
    }
  }
}
```

### 6. UI Components

#### DislikeButton Component

**File:** `src/lib/modules/chat/components/DislikeButton.svelte`

```svelte
<script>
  import { createEventDispatcher } from 'svelte';

  export let messageId;
  export let hasFeedback = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    if (!hasFeedback) {
      dispatch('dislike', { messageId });
    }
  }
</script>

<button
  class="dislike-btn"
  class:disabled={hasFeedback}
  on:click={handleClick}
  disabled={hasFeedback}
  title={hasFeedback ? 'Feedback already submitted' : 'Report issue with this response'}
>
  <svg><!-- Thumbs down icon --></svg>
</button>

<style>
  .dislike-btn {
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .dislike-btn:hover:not(.disabled) {
    opacity: 1;
  }

  .dislike-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
```

#### FeedbackDialog Component

**File:** `src/lib/modules/chat/components/FeedbackDialog.svelte`

```svelte
<script>
  import { createEventDispatcher } from 'svelte';

  export let messageId;
  export let open = false;

  const dispatch = createEventDispatcher();
  let feedbackText = '';
  let submitting = false;

  async function handleSubmit() {
    if (!feedbackText.trim()) return;

    submitting = true;
    try {
      const response = await fetch('/api/messages/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          feedback: feedbackText
        })
      });

      if (response.ok) {
        dispatch('submitted');
        close();
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      submitting = false;
    }
  }

  function close() {
    open = false;
    feedbackText = '';
  }
</script>

{#if open}
  <div class="dialog-overlay" on:click={close}>
    <div class="dialog" on:click|stopPropagation>
      <h3>Provide Feedback</h3>
      <p>Please describe what was wrong with this response:</p>

      <textarea
        bind:value={feedbackText}
        placeholder="The answer was not accurate because..."
        rows="5"
      />

      <div class="actions">
        <button on:click={close} disabled={submitting}>Cancel</button>
        <button
          on:click={handleSubmit}
          disabled={!feedbackText.trim() || submitting}
          class="primary"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
  }

  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin: 1rem 0;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
</style>
```

#### Admin Feedback View

**File:** `src/routes/admin/sessions/[id]/+page.svelte`

Enhancement to existing admin session view to show feedback:

```svelte
<script>
  // ... existing code ...

  function hasFeedback(message) {
    return message.metadata?.feedback != null;
  }

  function getModelInfo(message) {
    return message.metadata?.llm || null;
  }
</script>

<!-- In message display -->
{#each messages as message}
  <div class="message" class:has-feedback={hasFeedback(message)}>
    <div class="content">{message.content}</div>

    {#if hasFeedback(message)}
      <div class="feedback-indicator">
        <svg><!-- Dislike icon --></svg>
        <span>User Feedback</span>
      </div>

      <div class="feedback-details">
        <p><strong>Feedback:</strong> {message.metadata.feedback.text}</p>
        <p>
          <small>Submitted: {new Date(message.metadata.feedback.timestamp).toLocaleString()}</small>
        </p>

        {#if getModelInfo(message)}
          <div class="model-info">
            <p>
              <strong>Model:</strong>
              {getModelInfo(message).provider} / {getModelInfo(message).model}
            </p>
            <p>
              <small>Generated: {new Date(getModelInfo(message).timestamp).toLocaleString()}</small>
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/each}
```

#### Stats Page Enhancement

**File:** `src/routes/stats/+page.svelte`

Add feedback statistics section:

```svelte
<script>
  import { onMount } from 'svelte';

  let feedbackStats = null;

  onMount(async () => {
    const response = await fetch('/api/stats/feedback');
    const data = await response.json();
    feedbackStats = data.stats;
  });
</script>

<!-- Add to stats page -->
{#if feedbackStats}
  <section class="feedback-stats">
    <h2>User Feedback</h2>

    <div class="stat-card">
      <h3>Total Dislikes</h3>
      <p class="big-number">{feedbackStats.totalFeedback}</p>
    </div>

    <div class="stat-card">
      <h3>Dislikes by Model</h3>
      <table>
        {#each Object.entries(feedbackStats.byModel) as [model, count]}
          <tr>
            <td>{model}</td>
            <td>{count}</td>
          </tr>
        {/each}
      </table>
    </div>

    <a href="/admin/feedback" class="btn">View All Feedback</a>
  </section>
{/if}
```

## Data Models

### Message Model (Existing - No Changes)

```prisma
model Message {
  id        String   @id @default(cuid())
  sessionId String   @map("session_id")
  type      String   @db.VarChar(20)
  content   String   @db.Text
  metadata  Json?    // Extended to include llm and feedback
  createdAt DateTime @default(now()) @map("created_at")

  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, createdAt])
  @@map("messages")
}
```

**No database migration required** - we're using the existing `metadata` JSON field.

## Error Handling

### User-Facing Errors

1. **Feedback Already Submitted**
   - Message: "You've already provided feedback for this message"
   - Action: Disable dislike button

2. **Network Error**
   - Message: "Failed to submit feedback. Please try again."
   - Action: Allow retry

3. **Unauthorized Access**
   - Message: "You don't have permission to view this feedback"
   - Action: Redirect to login

### System Errors

1. **Model Metadata Missing**
   - Log warning
   - Continue without model info
   - Display "Unknown model" in admin interface

2. **Database Error**
   - Log error with context
   - Return user-friendly error message
   - Retry with exponential backoff

## Testing Strategy

### Unit Tests

1. **FeedbackService**
   - Test feedback submission
   - Test duplicate feedback prevention
   - Test feedback retrieval with filters
   - Test statistics calculation

2. **MessageService Enhancement**
   - Test storing model metadata
   - Test retrieving messages with model info
   - Test backward compatibility (messages without model info)

3. **ProviderManager Enhancement**
   - Test model metadata capture
   - Test fallback tracking
   - Test metadata format consistency

### Integration Tests

1. **Feedback API**
   - Test POST /api/messages/feedback
   - Test GET /api/admin/feedback with filters
   - Test GET /api/stats/feedback
   - Test authorization (admin vs regular user)

2. **End-to-End Flow**
   - User sends message → Model info stored
   - User clicks dislike → Dialog opens
   - User submits feedback → Feedback stored
   - Admin views feedback → Model info displayed

### E2E Tests

1. **User Feedback Flow**
   - Navigate to chat
   - Send message
   - Click dislike button
   - Submit feedback
   - Verify feedback stored

2. **Admin Review Flow**
   - Login as admin
   - Navigate to /admin/sessions
   - View session with feedback
   - Verify model info displayed
   - Navigate to /stats
   - Verify feedback statistics

## Security Considerations

1. **Authorization**
   - Only message owner can submit feedback
   - Only admins can view all feedback
   - Only admins can access /admin/feedback and detailed stats

2. **Data Privacy**
   - Don't expose API keys in model metadata
   - Don't expose user PII in feedback stats
   - Sanitize feedback text to prevent XSS

3. **Rate Limiting**
   - Limit feedback submissions per user per hour
   - Prevent spam/abuse

## Performance Considerations

1. **Database Queries**
   - Index on `metadata.feedback` for fast filtering
   - Use pagination for feedback lists
   - Cache feedback statistics

2. **Metadata Size**
   - Keep model metadata minimal
   - Don't store full system prompts (only references)
   - Compress large metadata if needed

3. **UI Performance**
   - Lazy load feedback dialog
   - Debounce feedback text input
   - Show loading states during submission

## Backward Compatibility

1. **Existing Messages**
   - Messages without model metadata will display "Unknown model" in admin interface
   - No migration needed - new field is optional

2. **API Compatibility**
   - Existing message APIs continue to work
   - Model metadata is optional in responses
   - Clients can ignore new fields

## Deployment Plan

### Phase 1: Backend Implementation

1. Enhance ProviderManager to capture model metadata
2. Enhance MessageService to store model info
3. Create FeedbackService
4. Create API endpoints

### Phase 2: UI Implementation

1. Add DislikeButton component
2. Add FeedbackDialog component
3. Enhance admin session view
4. Add feedback stats to /stats page

### Phase 3: Testing & Rollout

1. Run all tests
2. Deploy to staging
3. Test with real users
4. Deploy to production
5. Monitor feedback submissions

## Monitoring & Analytics

1. **Track Metrics**
   - Number of feedback submissions per day
   - Feedback rate by model
   - Average feedback text length
   - Time to submit feedback after message

2. **Alerts**
   - Alert if feedback rate exceeds threshold
   - Alert if specific model receives many dislikes
   - Alert on feedback submission errors

3. **Dashboards**
   - Real-time feedback dashboard
   - Model performance comparison
   - Feedback trends over time
