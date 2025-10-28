# Design Document - Chat API Refactoring

## Overview

This document outlines the design for refactoring the Chat API endpoint (`src/routes/api/chat/+server.js`) from a monolithic 942-line file into a modular, maintainable architecture. The refactoring will extract responsibilities into focused service classes while maintaining 100% backward compatibility with existing clients.

### Goals

1. **Improve Maintainability**: Break down the monolithic handler into focused, single-responsibility services
2. **Enhance Testability**: Enable comprehensive unit testing of individual components
3. **Maintain Compatibility**: Ensure zero breaking changes to the API contract
4. **Preserve Performance**: Match or improve current response times
5. **Enable Future Extensions**: Create a foundation for easier feature additions

### Non-Goals

- Changing the API request/response format
- Modifying existing business logic behavior
- Adding new features (this is purely a refactoring effort)
- Changing database schema or data models

## Architecture

### Current State Analysis

The current implementation handles multiple responsibilities in a single file:

1. **Request Validation**: Parsing and validating incoming request data
2. **Language Detection**: Detecting user language from message content
3. **Session Management**: Managing language preferences and conversation history
4. **Content Formatting**: Formatting exam profiles, course settings, and documents
5. **Prompt Construction**: Building complex prompts with context, history, and instructions
6. **LLM Communication**: Interfacing with multiple LLM providers (OpenAI, Ollama)
7. **Response Validation**: Validating language consistency in responses
8. **Error Handling**: Managing various error scenarios
9. **Response Building**: Constructing the final API response

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POST /api/chat                           │
│                   (Request Handler)                         │
│                      ~150 lines                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Request    │ │   Language   │ │    Prompt    │
│  Validator   │ │  Management  │ │   Builder    │
│   Service    │ │   Service    │ │   Service    │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Content    │ │     LLM      │ │   Response   │
│  Formatter   │ │   Provider   │ │   Builder    │
│   Service    │ │   Manager    │ │   Service    │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
              ┌──────────────┐
              │    Error     │
              │   Handler    │
              │   Service    │
              └──────────────┘
```

## Component Design

### 1. Content Formatter Service

**Location**: `src/lib/modules/chat/services/ContentFormatterService.js`

**Responsibility**: Format exam profiles, course settings, and mode details into structured text

**Public Interface**:

```javascript
export class ContentFormatterService {
  /**
   * Format course settings into structured text
   * @param {Object} settings - Course settings object
   * @param {string} interfaceLanguageCode - Language code (en, es, ru)
   * @param {string} activeMode - Active mode (exam or practice)
   * @returns {string|null} Formatted settings text
   */
  formatCourseSettings(settings, interfaceLanguageCode, activeMode) {}

  /**
   * Format mode details (practice or exam mode)
   * @param {Object} mode - Mode configuration object
   * @param {string} label - Label for the mode (e.g., "Practice mode")
   * @returns {string|null} Formatted mode details
   */
  formatModeDetails(mode, label) {}

  /**
   * Map interface language code to full language name
   * @param {string} languageCode - Language code (en, es, ru)
   * @returns {string|null} Full language name or null
   */
  mapInterfaceLanguage(languageCode) {}

  /**
   * Get localized value from multilingual object
   * @param {string|Object} value - Value or multilingual object
   * @param {string} languageKey - Preferred language key
   * @returns {string|null} Localized string value
   */
  getLocalizedValue(value, languageKey) {}
}
```

**Design Decisions**:

- **Stateless Service**: All methods are pure functions with no internal state
- **Null Safety**: Returns null for invalid inputs rather than throwing errors
- **Flexible Input**: Handles both string and object values for multilingual content
- **Fallback Strategy**: Falls back to English if preferred language is unavailable

**Dependencies**: None (pure utility service)

### 2. Request Validator Service

**Location**: `src/lib/modules/chat/services/RequestValidatorService.js`

**Responsibility**: Validate and normalize incoming request data

**Public Interface**:

```javascript
export class RequestValidatorService {
  /**
   * Validate chat request
   * @param {Object} requestBody - Raw request body
   * @returns {Object} Validation result { valid: boolean, errors: string[], data: Object }
   */
  validateRequest(requestBody) {}

  /**
   * Validate required fields
   * @param {Object} requestBody - Request body
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateRequiredFields(requestBody) {}

  /**
   * Validate field types
   * @param {Object} requestBody - Request body
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateFieldTypes(requestBody) {}

  /**
   * Normalize request data
   * @param {Object} requestBody - Raw request body
   * @returns {Object} Normalized request data
   */
  normalizeRequest(requestBody) {}
}
```

**Validation Rules**:

1. **Required Fields**: `content`, `sessionContext`
2. **Optional Fields**: `images`, `recognizedText`, `language`, `maxTokens`, `detailLevel`, `minWords`, `examProfile`, `provider`, `model`
3. **Type Validation**:
   - `content`: string
   - `images`: array of strings (base64 data URLs)
   - `sessionContext`: object with `sessionId`, `history`, `documents`, `context`
   - `maxTokens`: positive integer
   - `minWords`: positive integer

**Design Decisions**:

- **Early Validation**: Validate before any processing to fail fast
- **Descriptive Errors**: Return specific error messages for each validation failure
- **Normalization**: Convert data to consistent formats (e.g., trim strings, parse numbers)
- **Backward Compatibility**: Accept all fields from current implementation

### 3. Prompt Builder Service

**Location**: `src/lib/modules/chat/services/PromptBuilderService.js`

**Responsibility**: Construct LLM prompts from user input, context, and configuration

**Public Interface**:

```javascript
export class PromptBuilderService {
  constructor(contentFormatterService) {
    this.contentFormatter = contentFormatterService;
  }

  /**
   * Build complete prompt content
   * @param {Object} params - Prompt parameters
   * @returns {string} Complete prompt content
   */
  buildPromptContent({ content, recognizedText, sessionContext, examProfile, ocrError, images }) {}

  /**
   * Build messages array for LLM
   * @param {Object} params - Message parameters
   * @returns {Array} Messages array for LLM
   */
  buildMessages({
    systemPrompt,
    promptContent,
    sessionContext,
    examProfile,
    detectedLanguage,
    images,
    detailLevel,
    minWords,
    maxHistoryMessages
  }) {}

  /**
   * Format vision model message with images
   * @param {string} content - Text content
   * @param {Array} images - Array of image data URLs
   * @returns {Object} Vision model message object
   */
  formatVisionMessage(content, images) {}

  /**
   * Add language enforcement messages
   * @param {Array} messages - Existing messages array
   * @param {string} detectedLanguage - Detected language code
   * @param {string} targetLanguage - Target language name
   * @returns {Array} Messages with language enforcement
   */
  addLanguageEnforcement(messages, detectedLanguage, targetLanguage) {}
}
```

**Design Decisions**:

- **Dependency Injection**: Receives ContentFormatterService via constructor
- **Separation of Concerns**: Separates content building from message formatting
- **Provider Awareness**: Handles differences between OpenAI and Ollama message formats
- **History Management**: Implements sliding window for conversation history
- **Language Enforcement**: Adds multiple layers of language instructions

**Key Algorithms**:

1. **History Slicing**: Takes most recent N messages based on provider limits
2. **Vision Message Formatting**: Converts images to OpenAI vision format
3. **Language Instruction Layering**: Adds language reminders at multiple points

### 4. Language Management Service

**Location**: `src/lib/modules/chat/services/LanguageManagementService.js`

**Responsibility**: Coordinate language detection, session management, and validation

**Public Interface**:

```javascript
export class LanguageManagementService {
  constructor(languageDetector, sessionLanguageManager, languageConsistencyLogger) {
    this.detector = languageDetector;
    this.sessionManager = sessionLanguageManager;
    this.logger = languageConsistencyLogger;
  }

  /**
   * Detect language from user message
   * @param {Object} params - Detection parameters
   * @returns {Object} { language: string, confidence: number, method: string }
   */
  detectLanguage({ content, sessionId, sessionContext, hasImages, provider }) {}

  /**
   * Handle short message language detection
   * @param {string} content - User message content
   * @param {string} detectedLanguage - Initially detected language
   * @param {number} confidence - Detection confidence
   * @param {Object} sessionContext - Session context with history
   * @returns {Object} { language: string, confidence: number }
   */
  handleShortMessage(content, detectedLanguage, confidence, sessionContext) {}

  /**
   * Validate response language consistency
   * @param {string} response - AI response text
   * @param {string} expectedLanguage - Expected language code
   * @param {string} sessionId - Session ID
   * @param {Object} metadata - Provider and model metadata
   * @returns {Object} Validation result
   */
  validateResponseLanguage(response, expectedLanguage, sessionId, metadata) {}

  /**
   * Get language instructions for prompts
   * @param {string} languageCode - Language code
   * @returns {Object} { systemInstruction, userInstruction, reminder }
   */
  getLanguageInstructions(languageCode) {}
}
```

**Design Decisions**:

- **Facade Pattern**: Provides unified interface to multiple language-related services
- **Smart Detection**: Implements fallback to conversation history for short messages
- **Confidence Tracking**: Maintains confidence scores for language decisions
- **Validation Integration**: Coordinates with existing validation infrastructure

**Special Logic**:

1. **Short Message Handling**: For messages ≤2 words with confidence <0.9, check previous user messages
2. **Session Fallback**: Use stored session language if no content to analyze
3. **Provider-Specific Enforcement**: Extra language instructions for Ollama models

### 5. Response Builder Service

**Location**: `src/lib/modules/chat/services/ResponseBuilderService.js`

**Responsibility**: Construct API response objects

**Public Interface**:

```javascript
export class ResponseBuilderService {
  /**
   * Build success response
   * @param {Object} params - Response parameters
   * @returns {Object} API response object
   */
  buildSuccessResponse({
    aiResponse,
    recognizedText,
    examProfile,
    provider,
    model,
    llmMetadata,
    includeProviderInfo
  }) {}

  /**
   * Build error response
   * @param {Error} error - Error object
   * @param {boolean} isDevelopment - Development mode flag
   * @returns {Object} { response: Object, status: number }
   */
  buildErrorResponse(error, isDevelopment) {}

  /**
   * Determine HTTP status code from error
   * @param {Error} error - Error object
   * @returns {number} HTTP status code
   */
  getErrorStatusCode(error) {}

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} Error message
   */
  getErrorMessage(error) {}
}
```

**Design Decisions**:

- **Consistent Format**: Always returns `{ success, data/error }` structure
- **Conditional Fields**: Includes optional fields based on configuration
- **Error Classification**: Maps error types to appropriate HTTP status codes
- **Development Mode**: Includes stack traces only in development

**Error Status Mapping**:

- 400: Validation errors, bad request
- 401: Authentication required
- 403: Forbidden (authorization)
- 404: Resource not found
- 500: Internal server error
- 503: Service unavailable (LLM not accessible)
- 504: Gateway timeout

### 6. Error Handler Service

**Location**: `src/lib/modules/chat/services/ErrorHandlerService.js`

**Responsibility**: Centralized error handling and logging

**Public Interface**:

```javascript
export class ErrorHandlerService {
  /**
   * Handle API error
   * @param {Error} error - Error object
   * @param {Object} context - Request context
   * @returns {Object} { message: string, statusCode: number, details: Object }
   */
  handleError(error, context) {}

  /**
   * Log error with context
   * @param {Error} error - Error object
   * @param {Object} context - Request context
   */
  logError(error, context) {}

  /**
   * Categorize error type
   * @param {Error} error - Error object
   * @returns {string} Error category
   */
  categorizeError(error) {}

  /**
   * Check if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} True if retryable
   */
  isRetryable(error) {}
}
```

**Error Categories**:

- `validation`: Invalid request data
- `authentication`: Missing or invalid credentials
- `authorization`: Insufficient permissions
- `provider`: LLM provider errors
- `timeout`: Request timeout
- `network`: Network connectivity issues
- `internal`: Unexpected internal errors

**Design Decisions**:

- **Structured Logging**: Includes request context in all error logs
- **Error Classification**: Categorizes errors for monitoring and alerting
- **Retry Logic**: Identifies which errors are safe to retry
- **Security**: Sanitizes error messages in production

### 7. Refactored Request Handler

**Location**: `src/routes/api/chat/+server.js`

**Responsibility**: Orchestrate services to handle chat requests

**Structure** (~150 lines):

```javascript
export async function POST({ request }) {
  try {
    // 1. Parse and validate request
    const requestBody = await request.json();
    const validation = requestValidator.validateRequest(requestBody);

    if (!validation.valid) {
      return responseBuilder.buildErrorResponse(new ValidationError(validation.errors), false);
    }

    // 2. Detect language
    const languageResult = await languageManager.detectLanguage({
      content: validation.data.content,
      sessionId: validation.data.sessionContext.sessionId,
      sessionContext: validation.data.sessionContext,
      hasImages: validation.data.images?.length > 0,
      provider: validation.data.provider
    });

    // 3. Build prompt
    const promptContent = promptBuilder.buildPromptContent({
      content: validation.data.content,
      recognizedText: validation.data.recognizedText,
      sessionContext: validation.data.sessionContext,
      examProfile: validation.data.examProfile,
      images: validation.data.images
    });

    // 4. Build messages
    const messages = promptBuilder.buildMessages({
      promptContent,
      sessionContext: validation.data.sessionContext,
      examProfile: validation.data.examProfile,
      detectedLanguage: languageResult.language,
      images: validation.data.images,
      detailLevel: validation.data.detailLevel,
      minWords: validation.data.minWords
    });

    // 5. Generate LLM response
    const llmResult = await providerManager.generateChatCompletionWithEnhancement(messages, {
      temperature: OPENAI_CONFIG.TEMPERATURE,
      maxTokens: validation.data.maxTokens,
      provider: validation.data.provider,
      model: validation.data.model
    });

    // 6. Validate response language
    const validationResult = await languageManager.validateResponseLanguage(
      llmResult.content,
      languageResult.language,
      validation.data.sessionContext.sessionId,
      { provider: llmResult.provider, model: llmResult.model }
    );

    // 7. Build and return response
    return json(
      responseBuilder.buildSuccessResponse({
        aiResponse: llmResult.content,
        recognizedText: validation.data.recognizedText,
        examProfile: validation.data.examProfile,
        provider: llmResult.provider,
        model: llmResult.model,
        llmMetadata: llmResult.llmMetadata,
        includeProviderInfo: import.meta.env.DEV || LLM_FEATURES.ENABLE_PROVIDER_SWITCHING
      })
    );
  } catch (error) {
    const errorResponse = errorHandler.handleError(error, {
      endpoint: '/api/chat',
      method: 'POST'
    });

    return json(responseBuilder.buildErrorResponse(error, import.meta.env.DEV), {
      status: errorResponse.statusCode
    });
  }
}
```

**Design Decisions**:

- **Linear Flow**: Clear step-by-step processing
- **Service Delegation**: Each responsibility handled by dedicated service
- **Error Boundaries**: Single try-catch with centralized error handling
- **Minimal Logic**: Handler only orchestrates, doesn't implement business logic

## Data Flow

### Request Processing Flow

```
1. Request arrives → RequestValidatorService
   ↓
2. Validation passes → LanguageManagementService
   ↓
3. Language detected → PromptBuilderService
   ↓
4. Prompt built → LLMProviderManager (existing)
   ↓
5. Response generated → LanguageManagementService
   ↓
6. Language validated → ResponseBuilderService
   ↓
7. Response formatted → Return to client
```

### Error Handling Flow

```
Error occurs at any step
   ↓
ErrorHandlerService.handleError()
   ↓
Log error with context
   ↓
Categorize error type
   ↓
ResponseBuilderService.buildErrorResponse()
   ↓
Return error response to client
```

## Testing Strategy

### Unit Tests

Each service will have comprehensive unit tests:

1. **ContentFormatterService**:
   - Test all formatting methods with valid inputs
   - Test null/undefined handling
   - Test multilingual value extraction
   - Test fallback behavior

2. **RequestValidatorService**:
   - Test required field validation
   - Test type validation
   - Test normalization
   - Test error message generation

3. **PromptBuilderService**:
   - Test prompt content building
   - Test message array construction
   - Test vision message formatting
   - Test language enforcement
   - Test history slicing

4. **LanguageManagementService**:
   - Test language detection
   - Test short message handling
   - Test session fallback
   - Test response validation
   - Test instruction generation

5. **ResponseBuilderService**:
   - Test success response building
   - Test error response building
   - Test conditional field inclusion
   - Test status code mapping

6. **ErrorHandlerService**:
   - Test error categorization
   - Test error logging
   - Test retry detection
   - Test message sanitization

### Integration Tests

Test service interactions:

1. **Request Handler Integration**:
   - Test complete request flow
   - Test error propagation
   - Test service coordination
   - Test backward compatibility

2. **Language Flow Integration**:
   - Test detection → validation flow
   - Test session management integration
   - Test consistency logging

3. **Prompt Building Integration**:
   - Test content formatter → prompt builder flow
   - Test exam profile integration
   - Test history management

### Backward Compatibility Tests

Ensure existing tests pass:

1. Run all existing integration tests without modification
2. Verify API response format unchanged
3. Verify error responses unchanged
4. Verify performance characteristics maintained

## Migration Strategy

### Phase 1: Create Services (No Breaking Changes)

1. Create all service classes
2. Write comprehensive unit tests
3. Ensure 80%+ code coverage
4. Services exist alongside current implementation

### Phase 2: Refactor Handler (Gradual Migration)

1. Create new handler function using services
2. Add feature flag to switch between old/new implementation
3. Test new implementation in development
4. Run A/B testing in staging
5. Monitor performance and errors

### Phase 3: Cleanup (Remove Old Code)

1. Remove feature flag
2. Delete old implementation
3. Update documentation
4. Archive old code in git history

### Rollback Plan

- Feature flag allows instant rollback to old implementation
- No database changes, so rollback is safe
- Monitor error rates and response times
- Automated alerts for anomalies

## Performance Considerations

### Optimization Strategies

1. **Service Instantiation**:
   - Create services once at module load
   - Use singleton pattern for stateless services
   - Avoid creating new instances per request

2. **Memory Management**:
   - No memory leaks from closures
   - Proper cleanup of large objects
   - Efficient string concatenation

3. **Async Operations**:
   - Parallel processing where possible
   - Avoid unnecessary awaits
   - Stream large responses if needed

### Performance Targets

- **Request Processing**: ≤ current implementation time
- **Memory Usage**: ≤ current implementation memory
- **CPU Usage**: ≤ current implementation CPU
- **Response Time**: P95 ≤ current P95 + 10ms

## Security Considerations

### Input Validation

- Validate all user inputs before processing
- Sanitize strings to prevent injection
- Limit array sizes to prevent DoS
- Validate image data URLs

### Error Handling

- Never expose internal errors to clients in production
- Sanitize error messages
- Log security-relevant errors
- Rate limit error responses

### Data Privacy

- Don't log sensitive user data
- Redact API keys from logs
- Secure session data
- Follow GDPR requirements

## Monitoring and Observability

### Metrics to Track

1. **Request Metrics**:
   - Request rate
   - Response time (P50, P95, P99)
   - Error rate by category
   - Success rate

2. **Language Metrics**:
   - Detection confidence distribution
   - Validation failure rate
   - Language consistency score
   - Short message handling rate

3. **Service Metrics**:
   - Service call duration
   - Service error rate
   - Cache hit rate (if caching added)

### Logging Strategy

1. **Structured Logging**:
   - Use JSON format
   - Include request ID
   - Include user ID (anonymized)
   - Include timestamp

2. **Log Levels**:
   - ERROR: Service failures, validation errors
   - WARN: Language inconsistencies, fallbacks
   - INFO: Request processing, language detection
   - DEBUG: Detailed service calls (dev only)

3. **Log Retention**:
   - ERROR logs: 90 days
   - WARN logs: 30 days
   - INFO logs: 7 days
   - DEBUG logs: 1 day

## Dependencies

### Existing Dependencies (Reused)

- `languageDetector`: Language detection service
- `sessionLanguageManager`: Session language management
- `promptEnhancer`: Prompt enhancement (may be refactored)
- `languageConsistencyLogger`: Consistency logging
- `container`: Dependency injection container
- `llmProviderManager`: LLM provider management

### New Dependencies (None)

All new services use only standard JavaScript and existing dependencies.

## Open Questions and Future Enhancements

### Open Questions

1. Should we cache formatted course settings?
2. Should we implement request deduplication?
3. Should we add request queuing for rate limiting?
4. Should we implement automatic response regeneration for language inconsistencies?

### Future Enhancements

1. **Caching Layer**: Cache formatted prompts and course settings
2. **Request Queuing**: Queue requests during high load
3. **Response Streaming**: Stream LLM responses for better UX
4. **A/B Testing Framework**: Built-in A/B testing for prompt variations
5. **Analytics Integration**: Detailed analytics on language detection and validation
6. **Auto-Regeneration**: Automatically regenerate responses with language issues

## Success Criteria

### Functional Requirements

- ✅ All existing integration tests pass
- ✅ API contract unchanged
- ✅ Error responses unchanged
- ✅ Language detection behavior preserved
- ✅ Prompt construction logic preserved

### Non-Functional Requirements

- ✅ Code reduced from 942 lines to ~150 lines in handler
- ✅ Unit test coverage ≥ 80%
- ✅ Performance within 10% of current implementation
- ✅ No memory leaks
- ✅ No new dependencies added

### Quality Requirements

- ✅ All services have comprehensive JSDoc comments
- ✅ All services follow single responsibility principle
- ✅ All services are testable in isolation
- ✅ Error handling is consistent across services
- ✅ Logging is structured and consistent

## Conclusion

This refactoring will transform the Chat API from a monolithic handler into a modular, maintainable architecture. By extracting responsibilities into focused services, we'll improve testability, maintainability, and code clarity while maintaining 100% backward compatibility.

The phased migration strategy with feature flags ensures we can safely deploy and rollback if needed. Comprehensive testing at unit, integration, and compatibility levels will ensure the refactoring is successful.

The resulting architecture will provide a solid foundation for future enhancements while making the codebase easier to understand and modify.
