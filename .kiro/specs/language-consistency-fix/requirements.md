# Requirements Document

## Introduction

This specification addresses the critical issue where the AI tutor bot inconsistently switches languages during conversations, specifically switching from Russian to Chinese mid-conversation. This creates a poor user experience and breaks the conversational flow. The system needs to maintain language consistency throughout a conversation session while properly detecting and respecting the user's preferred language.

## Requirements

### Requirement 1

**User Story:** As a user, I want the AI tutor to maintain consistent language of my request throughout our entire conversation, so that I can understand all responses without unexpected language switches.

#### Acceptance Criteria

1. WHEN a user starts a conversation in any language THEN the system SHALL detect that language as the conversation language
2. WHEN the conversation language is detected THEN all subsequent AI responses SHALL be in the same language only
3. WHEN the AI generates a response THEN the system SHALL validate the response language matches the user's language before sending it
4. IF an AI response contains text in a different language THEN the system SHALL either regenerate the response or translate it to the correct language

### Requirement 2

**User Story:** As a user communicating in any language, I want the system to remember my language preference for the entire session, so that I don't experience jarring language switches.

#### Acceptance Criteria

1. WHEN a user's language is detected THEN the system SHALL store this preference for the session duration
2. WHEN generating AI responses THEN the system SHALL include explicit language instructions in the prompt
3. WHEN the AI provider returns a response THEN the system SHALL verify the response matches the expected language
4. IF language inconsistency is detected THEN the system SHALL log the incident for monitoring

### Requirement 3

**User Story:** As a developer, I want the system to enforce language consistency at the prompt level, so that language switching issues are prevented proactively.

#### Acceptance Criteria

1. WHEN sending prompts to AI providers THEN the system SHALL include explicit language instructions
2. WHEN a user's language is detected THEN the system SHALL store this preference for the session
3. WHEN generating responses THEN the system SHALL validate basic language consistency
4. IF language inconsistency is detected THEN the system SHALL log the issue for debugging