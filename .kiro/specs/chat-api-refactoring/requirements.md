# Requirements Document - Chat API Refactoring

## Introduction

The chat API endpoint (`src/routes/api/chat/+server.js`) has grown to 942 lines and handles multiple responsibilities including language detection, prompt construction, LLM provider management, validation, and error handling. This refactoring aims to improve maintainability, testability, and code organization by extracting responsibilities into focused service classes while maintaining all existing functionality.

## Glossary

- **Chat API Endpoint**: The SvelteKit API route handler at `src/routes/api/chat/+server.js`
- **Request Handler**: The main POST function that processes chat requests
- **Language Detection Service**: Module responsible for detecting and managing user language preferences
- **Prompt Builder**: Service that constructs LLM prompts from user input and context
- **Content Formatter**: Utility that formats exam profiles, course settings, and documents
- **Validation Service**: Module that validates LLM responses for language consistency
- **LLM Provider Manager**: Service that manages communication with different LLM providers
- **Session Context**: Object containing conversation history, documents, and user preferences
- **Exam Profile**: Configuration object containing course settings, mode, and instructions

## Requirements

### Requirement 1: Maintain Existing Functionality

**User Story:** As a system administrator, I want the refactored chat API to maintain 100% backward compatibility, so that existing clients continue to work without modifications.

#### Acceptance Criteria

1. WHEN the Chat API Endpoint receives a POST request, THE System SHALL process the request using the same input/output contract as the current implementation
2. WHEN the refactoring is complete, THE System SHALL pass all existing integration tests without modification
3. WHEN a client sends a chat request, THE System SHALL return responses in the same JSON format as before refactoring
4. WHEN error conditions occur, THE System SHALL return the same error messages and status codes as the current implementation
5. WHEN language detection occurs, THE System SHALL use the same detection logic and confidence thresholds as the current implementation

### Requirement 2: Extract Helper Functions into Services

**User Story:** As a developer, I want helper functions extracted into dedicated service classes, so that the code is more maintainable and testable.

#### Acceptance Criteria

1. WHEN the system formats course settings, THE Content Formatter Service SHALL provide a `formatCourseSettings` method that encapsulates the formatting logic
2. WHEN the system formats mode details, THE Content Formatter Service SHALL provide a `formatModeDetails` method with the same behavior as the current function
3. WHEN the system maps interface languages, THE Content Formatter Service SHALL provide a `mapInterfaceLanguage` method
4. WHEN the system retrieves localized values, THE Content Formatter Service SHALL provide a `getLocalizedValue` method
5. WHEN developers write unit tests, THE System SHALL allow testing each service method independently

### Requirement 3: Create Prompt Builder Service

**User Story:** As a developer, I want prompt construction logic separated into a dedicated service, so that prompt building is easier to understand and modify.

#### Acceptance Criteria

1. WHEN the system builds a prompt, THE Prompt Builder Service SHALL construct the full content string from user input, documents, and exam profile
2. WHEN images are attached, THE Prompt Builder Service SHALL format vision model messages with image URLs
3. WHEN exam profiles are active, THE Prompt Builder Service SHALL include course settings and mode configuration in the prompt
4. WHEN conversation history exists, THE Prompt Builder Service SHALL include recent messages respecting provider-specific limits
5. WHEN language instructions are needed, THE Prompt Builder Service SHALL add appropriate language enforcement messages

### Requirement 4: Create Request Validator Service

**User Story:** As a developer, I want request validation logic extracted into a service, so that validation rules are centralized and reusable.

#### Acceptance Criteria

1. WHEN a chat request is received, THE Request Validator Service SHALL validate required fields (content, sessionContext)
2. WHEN request parameters are invalid, THE Request Validator Service SHALL return descriptive error messages
3. WHEN optional parameters are provided, THE Request Validator Service SHALL validate their types and formats
4. WHEN validation fails, THE Request Validator Service SHALL return a validation result object with error details
5. WHEN validation succeeds, THE Request Validator Service SHALL return a normalized request object

### Requirement 5: Simplify Main Request Handler

**User Story:** As a developer, I want the main POST handler to be concise and readable, so that the request flow is easy to understand.

#### Acceptance Criteria

1. WHEN reviewing the POST handler, THE Request Handler SHALL be no more than 150 lines of code
2. WHEN processing a request, THE Request Handler SHALL delegate to service classes for each responsibility
3. WHEN errors occur, THE Request Handler SHALL use a centralized error handling service
4. WHEN logging is needed, THE Request Handler SHALL use structured logging with consistent formats
5. WHEN the request completes, THE Request Handler SHALL construct the response using a response builder service

### Requirement 6: Improve Error Handling

**User Story:** As a developer, I want error handling to be consistent and informative, so that debugging issues is easier.

#### Acceptance Criteria

1. WHEN an error occurs, THE Error Handler Service SHALL categorize the error type (validation, provider, timeout, etc.)
2. WHEN logging errors, THE System SHALL include request context (sessionId, provider, model) in error logs
3. WHEN returning error responses, THE System SHALL use appropriate HTTP status codes (400, 401, 500, 503, 504)
4. WHEN in development mode, THE System SHALL include error stack traces in responses
5. WHEN in production mode, THE System SHALL return user-friendly error messages without exposing internal details

### Requirement 7: Extract Language Management Logic

**User Story:** As a developer, I want language detection and enforcement logic consolidated, so that multilingual support is easier to maintain.

#### Acceptance Criteria

1. WHEN detecting language, THE Language Management Service SHALL handle short messages by checking conversation history
2. WHEN language confidence is low, THE Language Management Service SHALL apply fallback strategies
3. WHEN building prompts, THE Language Management Service SHALL provide language-specific instructions and reminders
4. WHEN validating responses, THE Language Management Service SHALL coordinate with the language detector
5. WHEN language inconsistencies are detected, THE Language Management Service SHALL log issues appropriately

### Requirement 8: Create Response Builder Service

**User Story:** As a developer, I want response construction logic extracted into a service, so that response formatting is consistent.

#### Acceptance Criteria

1. WHEN building a response, THE Response Builder Service SHALL include the AI response content
2. WHEN OCR text is available, THE Response Builder Service SHALL include it in the response
3. WHEN exam profiles are active, THE Response Builder Service SHALL include profile information
4. WHEN provider information should be included, THE Response Builder Service SHALL add provider metadata
5. WHEN LLM metadata exists, THE Response Builder Service SHALL always include it for storage

### Requirement 9: Add Comprehensive Unit Tests

**User Story:** As a developer, I want comprehensive unit tests for all services, so that refactoring is safe and regressions are prevented.

#### Acceptance Criteria

1. WHEN testing services, THE System SHALL have unit tests achieving minimum 80% code coverage
2. WHEN testing the Content Formatter Service, THE System SHALL have tests for all formatting methods
3. WHEN testing the Prompt Builder Service, THE System SHALL have tests for different prompt scenarios
4. WHEN testing the Request Validator Service, THE System SHALL have tests for valid and invalid inputs
5. WHEN testing error handling, THE System SHALL have tests for all error types and status codes

### Requirement 10: Maintain Performance

**User Story:** As a system administrator, I want the refactored API to maintain or improve performance, so that user experience is not degraded.

#### Acceptance Criteria

1. WHEN processing requests, THE System SHALL complete requests in the same time or faster than the current implementation
2. WHEN creating service instances, THE System SHALL use dependency injection to avoid unnecessary object creation
3. WHEN logging, THE System SHALL use appropriate log levels to avoid performance impact
4. WHEN handling large conversation histories, THE System SHALL efficiently slice and process messages
5. WHEN measuring performance, THE System SHALL have no memory leaks or resource retention issues
