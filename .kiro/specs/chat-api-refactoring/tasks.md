# Implementation Plan - Chat API Refactoring

## Overview

This implementation plan breaks down the refactoring of the Chat API endpoint (`src/routes/api/chat/+server.js`) from a monolithic 942-line file into modular, maintainable services. Each task builds incrementally, ensuring backward compatibility while improving code organization and testability.

## Tasks

- [x] 1. Create Content Formatter Service
  - Create `src/lib/modules/chat/services/ContentFormatterService.js` with methods for formatting exam profiles, course settings, and mode details
  - Implement `formatCourseSettings()`, `formatModeDetails()`, `mapInterfaceLanguage()`, and `getLocalizedValue()` methods
  - Extract and refactor the existing helper functions from the chat API endpoint
  - Ensure all methods are pure functions with no side effects
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Write unit tests for Content Formatter Service
  - Create `tests/unit/chat/services/ContentFormatterService.test.js`
  - Test all formatting methods with valid inputs, null/undefined handling, multilingual value extraction, and fallback behavior
  - Achieve minimum 80% code coverage for the service
  - _Requirements: 2.5, 9.2_

- [x] 2. Create Request Validator Service
  - Create `src/lib/modules/chat/services/RequestValidatorService.js` with validation methods
  - Implement `validateRequest()`, `validateRequiredFields()`, `validateFieldTypes()`, and `normalizeRequest()` methods
  - Validate required fields (content, sessionContext) and optional fields (images, recognizedText, language, maxTokens, etc.)
  - Return descriptive error messages for validation failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.1 Write unit tests for Request Validator Service
  - Create `tests/unit/chat/services/RequestValidatorService.test.js`
  - Test required field validation, type validation, normalization, and error message generation
  - Test with valid and invalid inputs
  - _Requirements: 4.5, 9.4_

- [x] 3. Create Prompt Builder Service
  - Create `src/lib/modules/chat/services/PromptBuilderService.js` with prompt construction methods
  - Implement `buildPromptContent()`, `buildMessages()`, `formatVisionMessage()`, and `addLanguageEnforcement()` methods
  - Inject ContentFormatterService as a dependency via constructor
  - Handle conversation history with sliding window based on provider limits
  - Support both text-only and vision model message formats
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 Write unit tests for Prompt Builder Service
  - Create `tests/unit/chat/services/PromptBuilderService.test.js`
  - Test prompt content building, message array construction, vision message formatting, language enforcement, and history slicing
  - Mock ContentFormatterService dependency
  - _Requirements: 3.5, 9.3_

- [x] 4. Create Language Management Service
  - Create `src/lib/modules/chat/services/LanguageManagementService.js` as a facade for language operations
  - Implement `detectLanguage()`, `handleShortMessage()`, `validateResponseLanguage()`, and `getLanguageInstructions()` methods
  - Inject existing languageDetector, sessionLanguageManager, and languageConsistencyLogger as dependencies
  - Implement smart detection with fallback to conversation history for short messages
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.1 Write unit tests for Language Management Service
  - Create `tests/unit/chat/services/LanguageManagementService.test.js`
  - Test language detection, short message handling, session fallback, response validation, and instruction generation
  - Mock all injected dependencies
  - _Requirements: 7.5, 9.4_

- [x] 5. Create Response Builder Service
  - Create `src/lib/modules/chat/services/ResponseBuilderService.js` with response construction methods
  - Implement `buildSuccessResponse()`, `buildErrorResponse()`, `getErrorStatusCode()`, and `getErrorMessage()` methods
  - Map error types to appropriate HTTP status codes (400, 401, 403, 404, 500, 503, 504)
  - Include conditional fields based on configuration (provider info, exam profile, etc.)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5.1 Write unit tests for Response Builder Service
  - Create `tests/unit/chat/services/ResponseBuilderService.test.js`
  - Test success response building, error response building, conditional field inclusion, and status code mapping
  - _Requirements: 8.5, 9.5_

- [x] 6. Create Error Handler Service
  - Create `src/lib/modules/chat/services/ErrorHandlerService.js` with centralized error handling
  - Implement `handleError()`, `logError()`, `categorizeError()`, and `isRetryable()` methods
  - Categorize errors (validation, authentication, authorization, provider, timeout, network, internal)
  - Include request context in all error logs
  - Sanitize error messages in production mode
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6.1 Write unit tests for Error Handler Service
  - Create `tests/unit/chat/services/ErrorHandlerService.test.js`
  - Test error categorization, error logging, retry detection, and message sanitization
  - _Requirements: 6.5, 9.5_

- [x] 7. Refactor Main Request Handler
  - Update `src/routes/api/chat/+server.js` to use the new service classes
  - Instantiate all services at module load (singleton pattern)
  - Refactor POST handler to orchestrate services in a linear flow
  - Reduce handler to approximately 150 lines by delegating to services
  - Maintain 100% backward compatibility with existing API contract
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7.1 Verify backward compatibility
  - Run all existing integration tests without modification
  - Verify API response format is unchanged
  - Verify error responses match previous implementation
  - Check that language detection behavior is preserved
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 7.2 Update integration tests
  - Update `tests/integration/api/chat.test.js` to test the refactored implementation
  - Ensure all existing test cases still pass
  - Add any new test cases for edge cases discovered during refactoring
  - _Requirements: 1.2, 9.1_

- [x] 8. Performance Verification
  - Measure request processing time before and after refactoring
  - Verify memory usage is not increased
  - Check for memory leaks using performance monitoring
  - Ensure response times are within 10% of original implementation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8.1 Add performance benchmarks
  - Create `tests/integration/api/chat-performance.test.js` to measure performance metrics
  - Compare P50, P95, P99 response times
  - Monitor memory usage during test runs
  - _Requirements: 10.1, 10.5_

- [x] 9. Documentation and Cleanup
  - Add comprehensive JSDoc comments to all service classes
  - Update any relevant documentation files
  - Remove any commented-out code from the refactored handler
  - Verify all services follow single responsibility principle
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

## Implementation Notes

### Service Instantiation Pattern

All services should be instantiated once at module load:

```javascript
// At top of +server.js
const contentFormatter = new ContentFormatterService();
const requestValidator = new RequestValidatorService();
const promptBuilder = new PromptBuilderService(contentFormatter);
const languageManager = new LanguageManagementService(
  languageDetector,
  sessionLanguageManager,
  languageConsistencyLogger
);
const responseBuilder = new ResponseBuilderService();
const errorHandler = new ErrorHandlerService();
```

### Testing Strategy

- Unit tests should mock all external dependencies
- Integration tests should use the actual database and services
- All tests must pass before marking a task as complete
- Aim for 80%+ code coverage on all new services

### Backward Compatibility

- The API contract must remain unchanged
- All existing tests must pass without modification
- Response format must match exactly
- Error messages and status codes must be identical

### Performance Targets

- Request processing time: ≤ current implementation
- Memory usage: ≤ current implementation
- P95 response time: ≤ current P95 + 10ms

## Success Criteria

- ✅ All services created with comprehensive JSDoc comments
- ✅ Unit test coverage ≥ 80% for all services
- ✅ Main handler reduced to ~150 lines
- ✅ All existing integration tests pass
- ✅ Performance within 10% of current implementation
- ✅ No memory leaks detected
- ✅ Code follows single responsibility principle
