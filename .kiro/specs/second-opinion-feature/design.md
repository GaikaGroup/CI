# Design Document - Second Opinion Feature

## Overview

The Second Opinion feature enables users to request alternative responses from different LLM models for the same question. This provides multiple perspectives, helps verify answers, and allows users to find the most suitable explanation for their learning needs.

### Key Design Principles

1. **Non-intrusive**: The feature should not disrupt the normal chat flow
2. **Transparent**: Users should always know which model generated which response
3. **Efficient**: Minimize API costs while providing value
4. **Contextual**: Second opinions should use the same context as the primary response
5. **Accessible**: Available in both text and voice modes

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat Message │  │ Second Opinion│  │ Model Selector│      │
│  │  Component   │  │    Button     │  │   (Optional)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Second Opinion Service                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ • Request validation                                  │  │
│  │ • Model selection (automatic or manual)              │  │
│  │ • Context preservation                               │  │
│  │ • Response generation                                │  │
│  │ • Divergence detection                               │  │
│  │ • Feedback collection                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Provider Manager                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   OpenAI     │  │    Ollama    │  │   Future     │      │
│  │   Provider   │  │   Provider   │  │  Providers   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Messages Table (with opinion metadata)               │  │
│  │ SecondOpinions Table (relationships & feedback)      │  │
│  │ OpinionFeedback Table (user preferences)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Frontend Components

#### 1.1 SecondOpinionButton Component

**Location**: `src/lib/modules/chat/components/SecondOpinionButton.svelte`

**Purpose**: Provides UI control for requesting second opinions

**Visual Placement**: The button appears below each assistant message, alongside other message actions (feedback buttons, copy, etc.)

**Example UI Layout**:

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Tutor (GPT-4)                                     │
│                                                         │
│ To solve this quadratic equation, use the formula:     │
│ x = (-b ± √(b²-4ac)) / 2a                              │
│                                                         │
│ ┌──────────┐ ┌──────────┐ ┌─────────────────────────┐ │
│ │ 👍 Helpful│ │ 👎 Not   │ │ 🔄 Get Second Opinion  │ │ ← Button here
│ └──────────┘ └──────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Props**:

```typescript
{
  messageId: string;           // ID of the message to get second opinion for
  primaryProvider: string;     // Provider used for primary response
  availableProviders: string[]; // List of available alternative providers
  disabled: boolean;           // Whether button is disabled
  loading: boolean;            // Loading state
  onRequest: (provider?: string) => Promise<void>; // Callback when requested
}
```

**Features**:

- Shows button only for assistant messages
- Displays loading state during generation
- Shows count of existing opinions
- Provides dropdown for manual model selection (if enabled)
- Disabled when no alternative providers available

#### 1.2 SecondOpinionMessage Component

**Location**: `src/lib/modules/chat/components/SecondOpinionMessage.svelte`

**Purpose**: Displays second opinion responses with clear distinction from primary

**Visual Example**:

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Tutor (GPT-4)                                     │
│                                                         │
│ To solve this quadratic equation, use the formula:     │
│ x = (-b ± √(b²-4ac)) / 2a                              │
│                                                         │
│ [👍 Helpful] [👎] [🔄 Get Second Opinion]              │
└─────────────────────────────────────────────────────────┘
                        ↓ User clicks button
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Tutor (GPT-4)                                     │
│                                                         │
│ To solve this quadratic equation, use the formula:     │
│ x = (-b ± √(b²-4ac)) / 2a                              │
│                                                         │
│ [👍 Helpful] [👎] [🔄 2 opinions]                      │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 💡 Second Opinion (Ollama - Llama 3)            │   │ ← Distinct styling
│ │                                                 │   │
│ │ Another way to approach this: First, identify   │   │
│ │ the coefficients a, b, and c from your         │   │
│ │ equation. Then substitute them into the         │   │
│ │ quadratic formula...                            │   │
│ │                                                 │   │
│ │ ⚠️ Different approach detected                  │   │ ← Divergence alert
│ │                                                 │   │
│ │ [👍 This was helpful] [👎 Not helpful]         │   │ ← Feedback buttons
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Props**:

```typescript
{
  message: Message;            // The second opinion message
  primaryMessage: Message;     // The original primary message
  provider: string;            // Provider that generated this opinion
  model: string;               // Model name
  divergenceLevel: 'low' | 'medium' | 'high' | null; // Detected divergence
  onFeedback: (helpful: boolean) => void; // Feedback callback
}
```

**Features**:

- Distinct visual styling (border, background color)
- Provider/model badge
- Divergence indicator (if applicable)
- Feedback buttons (helpful/not helpful)
- Collapsible in chat history

#### 1.3 ModelSelector Component

**Location**: `src/lib/modules/chat/components/ModelSelector.svelte`

**Purpose**: Allows manual selection of specific model for second opinion

**Props**:

```typescript
{
  availableProviders: Array<{
    name: string;
    displayName: string;
    models: Array<{
      id: string;
      name: string;
      description: string;
      capabilities: string[];
    }>;
  }>;
  excludeProvider: string;     // Provider to exclude (used for primary)
  onSelect: (provider: string, model?: string) => void;
}
```

#### 1.4 DivergenceAlert Component

**Location**: `src/lib/modules/chat/components/DivergenceAlert.svelte`

**Purpose**: Alerts users when responses differ significantly

**Props**:

```typescript
{
  divergenceLevel: 'low' | 'medium' | 'high';
  differences: string[];       // Key differences detected
  suggestedQuestions: string[]; // Follow-up questions
}
```

### 2. Backend Services

#### 2.1 SecondOpinionService

**Location**: `src/lib/modules/chat/services/SecondOpinionService.js`

**Purpose**: Core service for managing second opinion requests

**Methods**:

```javascript
class SecondOpinionService {
  /**
   * Request a second opinion for a message
   * @param {string} messageId - ID of the primary message
   * @param {string} sessionId - Session ID for context
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Second opinion response
   */
  async requestSecondOpinion(messageId, sessionId, options = {}) {
    // 1. Validate request
    // 2. Get primary message and context
    // 3. Select alternative provider
    // 4. Generate second opinion
    // 5. Detect divergence
    // 6. Store in database
    // 7. Return response
  }

  /**
   * Select an alternative provider
   * @param {string} primaryProvider - Provider used for primary response
   * @param {string} manualProvider - Optional manual selection
   * @returns {Promise<string>} Selected provider name
   */
  async selectAlternativeProvider(primaryProvider, manualProvider = null) {
    // 1. If manual selection, validate and return
    // 2. Get available providers
    // 3. Exclude primary provider
    // 4. Apply selection strategy (priority, rotation, cost)
    // 5. Return selected provider
  }

  /**
   * Get message context for second opinion
   * @param {string} messageId - Message ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Context object
   */
  async getMessageContext(messageId, sessionId) {
    // 1. Get message from database
    // 2. Get session history
    // 3. Get course/subject context if applicable
    // 4. Build context object
    // 5. Return context
  }

  /**
   * Detect divergence between responses
   * @param {string} primaryResponse - Primary response text
   * @param {string} secondOpinion - Second opinion text
   * @returns {Object} Divergence analysis
   */
  detectDivergence(primaryResponse, secondOpinion) {
    // 1. Calculate semantic similarity
    // 2. Identify key differences
    // 3. Determine divergence level
    // 4. Generate suggested follow-up questions
    // 5. Return analysis
  }

  /**
   * Record user feedback on opinion
   * @param {string} opinionId - Opinion ID
   * @param {boolean} helpful - Whether opinion was helpful
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async recordFeedback(opinionId, helpful, userId) {
    // 1. Validate opinion exists
    // 2. Store feedback in database
    // 3. Update provider selection weights
    // 4. Return success
  }

  /**
   * Get second opinions for a message
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} List of second opinions
   */
  async getSecondOpinions(messageId) {
    // 1. Query database for opinions
    // 2. Include provider and feedback data
    // 3. Return sorted by creation time
  }

  /**
   * Check rate limits for user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user can request more opinions
   */
  async checkRateLimit(userId) {
    // 1. Get user's opinion count for time period
    // 2. Compare against configured limit
    // 3. Return boolean
  }
}
```

#### 2.2 DivergenceDetector

**Location**: `src/lib/modules/chat/services/DivergenceDetector.js`

**Purpose**: Analyzes semantic differences between responses

**Methods**:

```javascript
class DivergenceDetector {
  /**
   * Analyze divergence between two responses
   * @param {string} response1 - First response
   * @param {string} response2 - Second response
   * @returns {Object} Divergence analysis
   */
  analyze(response1, response2) {
    // 1. Tokenize and normalize texts
    // 2. Calculate cosine similarity
    // 3. Identify contradictions
    // 4. Detect different approaches
    // 5. Classify divergence level
    // 6. Generate difference summary
    // 7. Return analysis object
  }

  /**
   * Calculate semantic similarity
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(text1, text2) {
    // Simple implementation using word overlap
    // Can be enhanced with embeddings in future
  }

  /**
   * Identify key differences
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {Array<string>} List of differences
   */
  identifyDifferences(text1, text2) {
    // 1. Extract key concepts from each text
    // 2. Compare concepts
    // 3. Identify unique concepts in each
    // 4. Return differences
  }

  /**
   * Generate follow-up questions
   * @param {Array<string>} differences - Detected differences
   * @returns {Array<string>} Suggested questions
   */
  generateFollowUpQuestions(differences) {
    // 1. Analyze differences
    // 2. Generate clarifying questions
    // 3. Return questions
  }
}
```

#### 2.3 ProviderSelectionStrategy

**Location**: `src/lib/modules/chat/services/ProviderSelectionStrategy.js`

**Purpose**: Implements strategies for selecting alternative providers

**Strategies**:

1. **Priority-based**: Use configured priority order
2. **Cost-optimized**: Prefer cheaper providers
3. **Performance-based**: Use feedback data to select best performers
4. **Round-robin**: Rotate through available providers
5. **Random**: Random selection for variety

```javascript
class ProviderSelectionStrategy {
  /**
   * Select provider using configured strategy
   * @param {Array<string>} availableProviders - Available providers
   * @param {string} excludeProvider - Provider to exclude
   * @param {Object} context - Selection context (user, session, etc.)
   * @returns {string} Selected provider
   */
  select(availableProviders, excludeProvider, context = {}) {
    const strategy = this.getStrategy();

    switch (strategy) {
      case 'priority':
        return this.selectByPriority(availableProviders, excludeProvider);
      case 'cost':
        return this.selectByCost(availableProviders, excludeProvider);
      case 'performance':
        return this.selectByPerformance(availableProviders, excludeProvider, context);
      case 'round-robin':
        return this.selectRoundRobin(availableProviders, excludeProvider, context);
      case 'random':
        return this.selectRandom(availableProviders, excludeProvider);
      default:
        return this.selectByPriority(availableProviders, excludeProvider);
    }
  }
}
```

### 3. API Endpoints

#### 3.1 POST /api/chat/second-opinion

**Purpose**: Request a second opinion for a message

**Request Body**:

```typescript
{
  messageId: string;           // ID of primary message
  sessionId: string;           // Session ID
  provider?: string;           // Optional manual provider selection
  model?: string;              // Optional manual model selection
}
```

**Response**:

```typescript
{
  success: boolean;
  data: {
    opinionId: string;         // ID of the second opinion
    messageId: string;         // ID of the new message
    content: string;           // Opinion content
    provider: string;          // Provider used
    model: string;             // Model used
    divergence: {
      level: 'low' | 'medium' | 'high';
      differences: string[];
      suggestedQuestions: string[];
    } | null;
    llmMetadata: {             // LLM metadata
      provider: string;
      model: string;
      timestamp: string;
      config: Object;
    };
  };
  error?: string;
}
```

#### 3.2 GET /api/chat/second-opinions/:messageId

**Purpose**: Get all second opinions for a message

**Response**:

```typescript
{
  success: boolean;
  data: {
    opinions: Array<{
      id: string;
      messageId: string;
      content: string;
      provider: string;
      model: string;
      createdAt: string;
      feedback: {
        helpful: number;
        notHelpful: number;
        userFeedback: boolean | null;
      };
    }>;
  };
  error?: string;
}
```

#### 3.3 POST /api/chat/second-opinion/:opinionId/feedback

**Purpose**: Submit feedback on a second opinion

**Request Body**:

```typescript
{
  helpful: boolean; // Whether opinion was helpful
}
```

**Response**:

```typescript
{
  success: boolean;
  data: {
    recorded: boolean;
  };
  error?: string;
}
```

#### 3.4 GET /api/chat/available-providers

**Purpose**: Get available providers for second opinion

**Query Parameters**:

- `excludeProvider`: Provider to exclude

**Response**:

```typescript
{
  success: boolean;
  data: {
    providers: Array<{
      name: string;
      displayName: string;
      available: boolean;
      models: Array<{
        id: string;
        name: string;
        description: string;
        capabilities: string[];
      }>;
    }>;
  };
  error?: string;
}
```

## Data Models

### Database Schema Extensions

#### SecondOpinion Table

```prisma
model SecondOpinion {
  id                String   @id @default(cuid())
  primaryMessageId  String   @map("primary_message_id")
  opinionMessageId  String   @unique @map("opinion_message_id")
  sessionId         String   @map("session_id")
  userId            String   @map("user_id")
  primaryProvider   String   @map("primary_provider") @db.VarChar(50)
  opinionProvider   String   @map("opinion_provider") @db.VarChar(50)
  primaryModel      String?  @map("primary_model") @db.VarChar(100)
  opinionModel      String?  @map("opinion_model") @db.VarChar(100)
  divergenceLevel   String?  @map("divergence_level") @db.VarChar(20) // 'low', 'medium', 'high'
  divergenceData    Json?    @map("divergence_data") // Detailed divergence analysis
  requestType       String   @default("automatic") @map("request_type") @db.VarChar(20) // 'automatic', 'manual'
  createdAt         DateTime @default(now()) @map("created_at")

  // Relations
  primaryMessage    Message  @relation("PrimaryMessage", fields: [primaryMessageId], references: [id], onDelete: Cascade)
  opinionMessage    Message  @relation("OpinionMessage", fields: [opinionMessageId], references: [id], onDelete: Cascade)
  session           Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  feedback          OpinionFeedback[]

  @@index([primaryMessageId])
  @@index([sessionId])
  @@index([userId])
  @@index([createdAt])
  @@map("second_opinions")
}
```

#### OpinionFeedback Table

```prisma
model OpinionFeedback {
  id              String        @id @default(cuid())
  opinionId       String        @map("opinion_id")
  userId          String        @map("user_id")
  helpful         Boolean       // true = helpful, false = not helpful
  comment         String?       @db.Text
  createdAt       DateTime      @default(now()) @map("created_at")

  // Relations
  opinion         SecondOpinion @relation(fields: [opinionId], references: [id], onDelete: Cascade)
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([opinionId, userId]) // One feedback per user per opinion
  @@index([opinionId])
  @@index([userId])
  @@map("opinion_feedback")
}
```

#### Message Table Extension

Add metadata field to store second opinion information:

```typescript
// metadata field in Message table can contain:
{
  isSecondOpinion: boolean;
  primaryMessageId?: string;
  opinionProvider?: string;
  opinionModel?: string;
  divergenceLevel?: 'low' | 'medium' | 'high';
}
```

### Configuration Schema

**Location**: `src/lib/config/secondOpinion.js`

```javascript
export const SECOND_OPINION_CONFIG = {
  // Feature toggle
  ENABLED: true,

  // Selection strategy
  SELECTION_STRATEGY: 'priority', // 'priority', 'cost', 'performance', 'round-robin', 'random'

  // Provider priority order (for priority strategy)
  PROVIDER_PRIORITY: ['ollama', 'openai'],

  // Rate limiting
  RATE_LIMIT: {
    ENABLED: true,
    MAX_REQUESTS_PER_HOUR: 10,
    MAX_REQUESTS_PER_DAY: 50
  },

  // Divergence detection
  DIVERGENCE: {
    ENABLED: true,
    SIMILARITY_THRESHOLD: {
      LOW: 0.8, // > 0.8 = low divergence
      MEDIUM: 0.5, // 0.5-0.8 = medium divergence
      HIGH: 0.5 // < 0.5 = high divergence
    }
  },

  // Manual selection
  ALLOW_MANUAL_SELECTION: true,

  // Voice mode
  VOICE_MODE: {
    ENABLED: true,
    ANNOUNCE_PROVIDER: true // Announce which model is speaking
  },

  // Admin settings
  ADMIN: {
    TRACK_ANALYTICS: true,
    COST_REPORTING: true
  }
};
```

## Error Handling

### Error Types

1. **No Alternative Providers Available**
   - Message: "No alternative models available for second opinion"
   - Action: Disable second opinion button

2. **Rate Limit Exceeded**
   - Message: "You've reached the limit for second opinions. Please try again later."
   - Action: Show rate limit info, disable button temporarily

3. **Provider Unavailable**
   - Message: "Selected model is currently unavailable. Please try another."
   - Action: Fallback to automatic selection

4. **Context Retrieval Failed**
   - Message: "Unable to retrieve message context. Please try again."
   - Action: Retry with exponential backoff

5. **Generation Failed**
   - Message: "Failed to generate second opinion. Please try again."
   - Action: Allow retry, log error for admin

### Error Recovery

```javascript
async function requestSecondOpinionWithRetry(messageId, sessionId, options = {}, retries = 2) {
  try {
    return await SecondOpinionService.requestSecondOpinion(messageId, sessionId, options);
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      console.log(`Retrying second opinion request, ${retries} attempts remaining`);
      await delay(1000 * (3 - retries)); // Exponential backoff
      return requestSecondOpinionWithRetry(messageId, sessionId, options, retries - 1);
    }
    throw error;
  }
}
```

## Testing Strategy

### Unit Tests

1. **SecondOpinionService**
   - Test provider selection logic
   - Test context retrieval
   - Test rate limiting
   - Test error handling

2. **DivergenceDetector**
   - Test similarity calculation
   - Test difference identification
   - Test divergence level classification
   - Test follow-up question generation

3. **ProviderSelectionStrategy**
   - Test each selection strategy
   - Test provider exclusion
   - Test fallback logic

### Integration Tests

1. **API Endpoints**
   - Test second opinion request flow
   - Test feedback submission
   - Test provider listing
   - Test authentication and authorization

2. **Database Operations**
   - Test opinion storage
   - Test feedback recording
   - Test relationship integrity

3. **Provider Integration**
   - Test with multiple providers
   - Test provider fallback
   - Test context preservation

### E2E Tests

1. **User Flows**
   - Request second opinion in text mode
   - Request second opinion in voice mode
   - Manual provider selection
   - Feedback submission
   - View multiple opinions

2. **Edge Cases**
   - No alternative providers available
   - Rate limit reached
   - Provider failure during generation
   - Network interruption

## Performance Considerations

### Optimization Strategies

1. **Caching**
   - Cache available providers list
   - Cache user rate limit status
   - Cache provider performance metrics

2. **Lazy Loading**
   - Load second opinions on demand
   - Defer divergence analysis until needed

3. **Parallel Processing**
   - Generate multiple opinions in parallel (if requested)
   - Process feedback asynchronously

4. **Database Indexing**
   - Index on primaryMessageId for fast lookup
   - Index on userId for rate limiting
   - Index on createdAt for analytics

### Performance Metrics

- Second opinion generation time: < 10 seconds (target)
- API response time: < 500ms (excluding LLM generation)
- Database query time: < 100ms
- Divergence detection time: < 1 second

## Security Considerations

### Access Control

1. **Authentication**
   - Require authenticated user for all operations
   - Validate session ownership

2. **Authorization**
   - Users can only request opinions for their own messages
   - Users can only provide feedback on opinions they requested

3. **Rate Limiting**
   - Prevent abuse through rate limits
   - Track and alert on suspicious patterns

### Data Privacy

1. **Context Handling**
   - Don't include sensitive information in context
   - Sanitize user input before sending to LLM

2. **Storage**
   - Store only necessary metadata
   - Implement data retention policies

## Monitoring and Analytics

### Metrics to Track

1. **Usage Metrics**
   - Number of second opinion requests per day
   - Requests per user
   - Requests per provider
   - Manual vs automatic selection ratio

2. **Performance Metrics**
   - Average generation time per provider
   - Success rate per provider
   - Error rate and types

3. **Quality Metrics**
   - Divergence level distribution
   - Feedback scores per provider
   - User satisfaction ratings

4. **Cost Metrics**
   - API costs per provider
   - Cost per second opinion
   - Total monthly costs

### Analytics Dashboard

Admin interface should display:

- Usage trends over time
- Provider performance comparison
- Cost analysis
- User feedback summary
- Most common divergence patterns

## Migration Plan

### Phase 1: Database Schema

1. Create SecondOpinion table
2. Create OpinionFeedback table
3. Add indexes
4. Run migrations

### Phase 2: Backend Services

1. Implement SecondOpinionService
2. Implement DivergenceDetector
3. Implement ProviderSelectionStrategy
4. Add API endpoints
5. Add tests

### Phase 3: Frontend Components

1. Create SecondOpinionButton component
2. Create SecondOpinionMessage component
3. Create ModelSelector component
4. Create DivergenceAlert component
5. Integrate with chat interface

### Phase 4: Voice Mode Integration

1. Add voice commands
2. Implement TTS for second opinions
3. Add audio cues for model switching
4. Test voice flow

### Phase 5: Admin Features

1. Add configuration interface
2. Implement analytics dashboard
3. Add cost reporting
4. Add rate limit management

### Phase 6: Testing and Rollout

1. Complete unit tests
2. Complete integration tests
3. Complete E2E tests
4. Beta testing with selected users
5. Full rollout
6. Monitor and iterate

## Future Enhancements

### Potential Features

1. **Comparison View**
   - Side-by-side comparison of all opinions
   - Highlight differences visually
   - Export comparison as PDF

2. **Smart Recommendations**
   - Suggest when to request second opinion
   - Recommend best model based on question type

3. **Collaborative Opinions**
   - Share opinions with other users
   - Community voting on best responses

4. **Advanced Divergence Analysis**
   - Use embeddings for better similarity detection
   - Identify factual contradictions
   - Provide confidence scores

5. **Model Ensembling**
   - Combine multiple opinions into one response
   - Weight responses by model performance

6. **Custom Model Preferences**
   - Allow users to set preferred models
   - Remember user's model choices

## Dependencies

### External Libraries

- None required (uses existing dependencies)

### Internal Dependencies

- ProviderManager (existing)
- MessageService (existing)
- SessionStore (existing)
- ChatStore (existing)

### Configuration Dependencies

- LLM provider configuration
- Database connection
- Authentication system

## Rollback Plan

If issues arise after deployment:

1. **Immediate Actions**
   - Disable feature via config flag
   - Revert API endpoints
   - Monitor error logs

2. **Data Preservation**
   - Keep SecondOpinion and OpinionFeedback tables
   - Data can be analyzed later
   - No data loss during rollback

3. **Gradual Re-enable**
   - Fix identified issues
   - Enable for admin users first
   - Gradual rollout to all users

## Success Criteria

The feature will be considered successful if:

1. **Adoption**: 20%+ of users try the feature within first month
2. **Satisfaction**: 70%+ positive feedback on second opinions
3. **Performance**: 95%+ success rate for opinion generation
4. **Cost**: Stays within 20% increase of current LLM costs
5. **Quality**: Divergence detection accuracy > 80%
