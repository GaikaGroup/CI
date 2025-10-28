# Implementation Plan - Second Opinion Feature

## Overview

This implementation plan breaks down the Second Opinion feature into discrete, manageable coding tasks. Each task builds incrementally on previous steps, ensuring the feature is integrated properly into the existing codebase.

## Task List

- [x] 1. Database Schema and Migrations
  - Create database schema for SecondOpinion and OpinionFeedback tables
  - Write Prisma migration files
  - Add necessary indexes for performance
  - Generate Prisma Client with new schema
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 13.1, 13.2_

- [x] 2. Configuration and Constants
  - [x] 2.1 Create second opinion configuration file
    - Define feature toggles and settings
    - Configure rate limits
    - Set up provider selection strategies
    - Define divergence thresholds
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2_

  - [x] 2.2 Add configuration schema validation
    - Create JSON schema for configuration
    - Implement validation logic
    - Add configuration loading utilities
    - _Requirements: 8.1, 8.2_

- [x] 3. Core Backend Services
  - [x] 3.1 Implement DivergenceDetector service
    - Write similarity calculation algorithm
    - Implement difference identification logic
    - Create divergence level classification
    - Add follow-up question generation
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 3.2 Implement ProviderSelectionStrategy service
    - Create base strategy interface
    - Implement priority-based selection
    - Implement cost-optimized selection
    - Implement performance-based selection
    - Implement round-robin selection
    - Implement random selection
    - _Requirements: 2.1, 2.2, 2.3, 10.3_

  - [x] 3.3 Implement SecondOpinionService
    - Create main service class
    - Implement requestSecondOpinion method
    - Implement selectAlternativeProvider method
    - Implement getMessageContext method
    - Implement getSecondOpinions method
    - Implement checkRateLimit method
    - Add error handling and retry logic
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 5.1, 5.2, 5.3, 10.1, 10.2_

  - [x] 3.4 Integrate with existing ProviderManager
    - Extend ProviderManager to support second opinion context
    - Ensure proper metadata tracking for second opinions
    - Add provider availability checks
    - _Requirements: 1.5, 2.1, 2.2_

  - [ ] 3.5 Write unit tests for backend services
    - Test DivergenceDetector with various response pairs
    - Test ProviderSelectionStrategy for all strategies
    - Test SecondOpinionService methods
    - Test rate limiting logic
    - Test error handling and edge cases
    - _Requirements: All backend service requirements_

- [x] 4. API Endpoints
  - [x] 4.1 Create POST /api/chat/second-opinion endpoint
    - Create route file at src/routes/api/chat/second-opinion/+server.js
    - Implement request validation (messageId, sessionId required)
    - Add authentication check using locals.user
    - Call SecondOpinionService.requestSecondOpinion
    - Return formatted response with opinion data
    - Handle errors appropriately with proper status codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

  - [x] 4.2 Create GET /api/chat/second-opinions/[messageId] endpoint
    - Create route file at src/routes/api/chat/second-opinions/[messageId]/+server.js
    - Implement message ID validation from params
    - Add authentication and authorization checks
    - Call SecondOpinionService.getSecondOpinions
    - Include feedback data in response
    - Return formatted response with opinions array
    - _Requirements: 3.4, 13.1, 13.2, 13.3_

  - [x] 4.3 Create POST /api/chat/second-opinion/[opinionId]/feedback endpoint
    - Create route file at src/routes/api/chat/second-opinion/[opinionId]/feedback/+server.js
    - Implement opinion ID validation from params
    - Add authentication check
    - Parse helpful boolean from request body
    - Call SecondOpinionService.recordFeedback
    - Return success response
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 4.4 Create GET /api/chat/available-providers endpoint
    - Create route file at src/routes/api/chat/available-providers/+server.js
    - Get excludeProvider from query params
    - Use ProviderManager to list available providers
    - Filter out excluded provider
    - Check availability for each provider
    - Include model information from provider configs
    - Return formatted response with providers array
    - _Requirements: 2.1, 2.2, 11.2, 11.3_

  - [x] 4.5 Write integration tests for API endpoints
    - Test second opinion request flow
    - Test feedback submission
    - Test provider listing
    - Test authentication and authorization
    - Test error responses
    - _Requirements: All API endpoint requirements_

- [x] 5. Frontend Components - Core UI
  - [x] 5.1 Create SecondOpinionButton component
    - Create file at src/lib/modules/chat/components/SecondOpinionButton.svelte
    - Design button UI with icon and text label ("🔄 Get Second Opinion")
    - Position button below assistant messages alongside feedback buttons
    - Implement click handler that calls POST /api/chat/second-opinion
    - Add loading state with spinner during generation
    - Add provider dropdown for manual selection (if ALLOW_MANUAL_SELECTION enabled)
    - Show opinion count badge when multiple opinions exist
    - Handle disabled state when no alternative providers available
    - Add tooltips explaining the feature
    - Ensure keyboard accessibility (Tab navigation, Enter to activate)
    - Use Tailwind CSS for styling consistent with existing components
    - _Requirements: 1.1, 1.2, 11.1, 11.2, 11.4_

  - [x] 5.2 Create SecondOpinionMessage component
    - Create file at src/lib/modules/chat/components/SecondOpinionMessage.svelte
    - Design distinct visual styling (different border/background from primary)
    - Add provider/model badge at top of message
    - Implement collapsible functionality with expand/collapse button
    - Add divergence indicator (if divergenceLevel exists)
    - Include feedback buttons (helpful/not helpful)
    - Handle animation and transitions using Svelte transitions
    - Use TypewriterMessage component for content display
    - _Requirements: 3.1, 3.2, 3.3, 12.1, 13.3, 13.4_

  - [x] 5.3 Create ModelSelector component
    - Create file at src/lib/modules/chat/components/ModelSelector.svelte
    - Design provider/model selection dropdown UI
    - Fetch available providers from GET /api/chat/available-providers
    - Implement dropdown with search/filter functionality
    - Show model descriptions and capabilities for each option
    - Handle selection callback to parent component
    - Add loading state while fetching providers
    - Add error state if fetch fails
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 5.4 Create DivergenceAlert component
    - Create file at src/lib/modules/chat/components/DivergenceAlert.svelte
    - Design alert UI for different levels (low/medium/high)
    - Use different colors for each level (green/yellow/red)
    - Display key differences from divergenceData
    - Show suggested follow-up questions as clickable items
    - Add dismiss functionality with close button
    - Implement slide-in animation using Svelte transitions
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 5.5 Write component tests
    - Test SecondOpinionButton interactions
    - Test SecondOpinionMessage rendering
    - Test ModelSelector functionality
    - Test DivergenceAlert display
    - Test accessibility features
    - _Requirements: All component requirements_

- [ ] 6. Frontend Integration - Chat Interface
  - [x] 6.1 Integrate SecondOpinionButton into chat messages
    - Modify MessageList.svelte or TypewriterMessage.svelte to include SecondOpinionButton
    - Add button only for assistant messages (type === 'assistant')
    - Wire up click handler to call API endpoint
    - Handle loading state during API call
    - Handle error states with toast notifications
    - Update UI to show new opinion message after successful response
    - Pass messageId, sessionId, and userId to button component
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 6.2 Integrate SecondOpinionMessage into chat display
    - Modify MessageList.svelte to detect second opinion messages
    - Check message.metadata.isSecondOpinion flag
    - Render SecondOpinionMessage component for second opinions
    - Position second opinions below their primary message
    - Maintain visual hierarchy with indentation or styling
    - Handle multiple opinions per message (loop through opinions)
    - Implement collapse/expand state management
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 6.3 Update chat store to handle second opinions
    - Modify chat store (if exists) or create new secondOpinionStore
    - Add state for tracking opinion requests in progress
    - Add state for storing opinions per message
    - Implement action to request second opinion
    - Implement action to fetch existing opinions
    - Implement action to submit feedback
    - Handle opinion messages in chat history
    - Update message relationships (primaryMessageId links)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 6.4 Implement feedback submission flow
    - Wire up feedback buttons in SecondOpinionMessage to API
    - Call POST /api/chat/second-opinion/[opinionId]/feedback
    - Show feedback confirmation (toast or inline message)
    - Update UI to reflect submitted feedback (disable buttons)
    - Handle errors gracefully with error messages
    - Store feedback state locally to prevent duplicate submissions
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 7. Voice Mode Integration
  - [x] 7.1 Add voice command for second opinion
    - Implement voice command recognition
    - Add command to voice command list
    - Handle command in voice flow
    - Provide audio feedback
    - _Requirements: 7.1_

  - [x] 7.2 Implement TTS for second opinions
    - Announce provider before speaking
    - Synthesize second opinion text
    - Add audio cues for model switching
    - Handle interruptions properly
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 7.3 Update voice UI for second opinions
    - Show visual indicator during second opinion
    - Display provider information
    - Add skip/replay controls
    - Handle multiple opinions in voice mode
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.4 Test voice mode integration
    - Test voice command recognition
    - Test TTS for second opinions
    - Test audio cues and transitions
    - Test user experience flow
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8. Multilingual Support
  - [x] 8.1 Add translations for UI elements
    - Translate button labels
    - Translate error messages
    - Translate divergence alerts
    - Translate feedback prompts
    - _Requirements: 15.1, 15.2_

  - [x] 8.2 Ensure language consistency in second opinions
    - Pass language preference to LLM
    - Validate response language
    - Handle language-specific formatting
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 9. Admin Features
  - [x] 9.1 Create admin configuration interface
    - Design settings page
    - Implement feature toggle controls
    - Add provider priority configuration
    - Add rate limit settings
    - Add strategy selection
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 9.2 Implement analytics dashboard
    - Create usage metrics display
    - Add performance metrics charts
    - Show quality metrics
    - Display cost analysis
    - Add date range filtering
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 9.3 Add cost reporting
    - Calculate costs per provider
    - Show cost trends over time
    - Add cost alerts for thresholds
    - Export cost reports
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 9.4 Implement rate limit management
    - Show current rate limits
    - Display user usage statistics
    - Add ability to adjust limits
    - Show rate limit violations
    - _Requirements: 10.1, 10.2_

- [ ] 10. Testing and Quality Assurance
  - [ ] 10.1 Write E2E tests for user flows
    - Test requesting second opinion in text mode
    - Test requesting second opinion in voice mode
    - Test manual provider selection
    - Test feedback submission
    - Test viewing multiple opinions
    - _Requirements: All user-facing requirements_

  - [ ] 10.2 Test edge cases and error scenarios
    - Test with no alternative providers
    - Test rate limit enforcement
    - Test provider failure during generation
    - Test network interruptions
    - Test concurrent requests
    - _Requirements: 2.3, 6.4, 10.1, 10.2_

  - [ ] 10.3 Performance testing
    - Test second opinion generation time
    - Test API response times
    - Test database query performance
    - Test with high concurrent load
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 10.4 Accessibility testing
    - Test keyboard navigation
    - Test screen reader compatibility
    - Test color contrast
    - Test focus management
    - _Requirements: All UI requirements_

- [ ] 11. Documentation and Deployment
  - [ ] 11.1 Write user documentation
    - Create user guide for second opinion feature
    - Add FAQ section
    - Document voice commands
    - Add troubleshooting guide
    - _Requirements: All user-facing requirements_

  - [ ] 11.2 Write developer documentation
    - Document API endpoints
    - Document service interfaces
    - Add code examples
    - Document configuration options
    - _Requirements: All technical requirements_

  - [ ] 11.3 Create migration guide
    - Document database migration steps
    - Add rollback procedures
    - Document configuration changes
    - Add deployment checklist
    - _Requirements: All requirements_

  - [ ] 11.4 Deploy to staging
    - Run database migrations
    - Deploy backend services
    - Deploy frontend changes
    - Configure feature flags
    - Run smoke tests
    - _Requirements: All requirements_

  - [ ] 11.5 Monitor and iterate
    - Monitor error logs
    - Track usage metrics
    - Collect user feedback
    - Identify and fix issues
    - Plan improvements
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

## Implementation Notes

### Dependencies Between Tasks

- Task 1 must be completed before any database operations
- Task 2 must be completed before Task 3
- Task 3 must be completed before Task 4
- Task 4 must be completed before Task 6
- Task 5 can be developed in parallel with Task 3-4
- Task 6 requires Task 4 and Task 5
- Task 7 requires Task 6
- Task 8 can be done in parallel with Task 6-7
- Task 9 requires Task 3-4
- Task 10 requires all previous tasks
- Task 11 is the final phase

### Estimated Timeline

- **Phase 1** (Tasks 1-2): 2-3 days
- **Phase 2** (Task 3): 5-7 days
- **Phase 3** (Task 4): 3-4 days
- **Phase 4** (Tasks 5-6): 5-7 days
- **Phase 5** (Task 7): 3-4 days
- **Phase 6** (Task 8): 2-3 days
- **Phase 7** (Task 9): 4-5 days
- **Phase 8** (Task 10): 3-5 days
- **Phase 9** (Task 11): 2-3 days

**Total Estimated Time**: 29-41 days (approximately 6-8 weeks)

### Risk Mitigation

1. **Provider Availability**: Implement robust fallback logic early
2. **Performance**: Monitor and optimize database queries from the start
3. **Cost**: Implement rate limiting before full rollout
4. **User Experience**: Get feedback early and iterate

### Success Metrics

Track these metrics after deployment:

- Second opinion request rate
- User satisfaction (feedback scores)
- Provider performance comparison
- Cost per second opinion
- Error rate and types

## Next Steps

After completing this implementation plan:

1. Review and approve the plan
2. Set up project tracking (e.g., GitHub issues)
3. Assign tasks to team members
4. Begin with Phase 1 (Database Schema)
5. Regular check-ins and progress reviews
6. Iterate based on feedback and metrics
