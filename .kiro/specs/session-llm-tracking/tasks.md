%# Implementation Plan

- [x] 1. Enhance ProviderManager to capture LLM model metadata
  - Modify `generateChatCompletion` method to capture model information (provider, model name, version, timestamp)
  - Add configuration parameters (temperature, maxTokens, systemPrompt) to metadata
  - Implement fallback tracking (attempted model, reason for fallback)
  - Return `llmMetadata` object with the completion result
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 2. Enhance MessageService to store model information
  - [x] 2.1 Create `addMessageWithModelInfo` method
    - Accept `llmMetadata` parameter from ProviderManager
    - Merge llmMetadata into message metadata for assistant messages only
    - Call existing `addMessage` method with merged metadata
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 2.2 Update message retrieval methods to include model info
    - Ensure `getSessionMessages` returns messages with llm metadata
    - Ensure `getMessage` returns message with llm metadata
    - Handle messages without model metadata gracefully (backward compatibility)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Create FeedbackService for managing user feedback
  - [x] 3.1 Implement `submitFeedback` method
    - Validate messageId, feedbackText, and userId
    - Check if feedback already exists for the message
    - Add feedback to message metadata (text, timestamp, userId)
    - Update message using MessageService
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 3.2 Implement `getAllFeedback` method for admin
    - Query messages with feedback in metadata
    - Support filtering by model, date range, user
    - Include session and user information in results
    - Implement pagination
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 3.3 Implement `getFeedbackStats` method
    - Count total messages with feedback
    - Group feedback by LLM model
    - Calculate feedback trends (last week, last month)
    - Return aggregated statistics
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 4. Create API endpoints for feedback
  - [x] 4.1 Create POST /api/messages/feedback endpoint
    - Accept messageId and feedback text in request body
    - Validate user authentication
    - Call FeedbackService.submitFeedback
    - Return updated message with feedback
    - Handle errors (already submitted, not found, unauthorized)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 4.2 Create GET /api/admin/feedback endpoint
    - Require admin authentication
    - Accept query parameters (page, limit, model, dateFrom, dateTo)
    - Call FeedbackService.getAllFeedback with filters
    - Return paginated feedback list with session and user info
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 14.3, 14.5_
  - [x] 4.3 Create GET /api/stats/feedback endpoint
    - Require admin authentication
    - Call FeedbackService.getFeedbackStats
    - Return aggregated statistics
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 14.3, 14.5_

- [x] 5. Create DislikeButton component
  - Create Svelte component with thumbs-down icon
  - Accept messageId and hasFeedback props
  - Emit 'dislike' event when clicked
  - Disable button if feedback already submitted
  - Add hover effects and tooltips
  - _Requirements: 6.1, 6.2_

- [x] 6. Create FeedbackDialog component
  - Create modal dialog with textarea for feedback
  - Accept messageId and open props
  - Implement submit handler that calls POST /api/messages/feedback
  - Show loading state during submission
  - Emit 'submitted' event on success
  - Handle errors and show error messages
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 7. Integrate feedback UI into chat interface
  - Add DislikeButton to each assistant message
  - Add FeedbackDialog component to chat page
  - Handle dislike button click to open dialog
  - Handle dialog submission to refresh message state
  - Update message display to show feedback indicator if submitted
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Enhance admin session view to display feedback
  - [x] 8.1 Update /admin/sessions/[id] page
    - Highlight messages with feedback
    - Display feedback icon indicator
    - Show full feedback text in expandable section
    - Display LLM model information (provider, model, timestamp)
    - Show model configuration parameters if available
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 8.2 Add styling for feedback display
    - Style feedback indicator badge
    - Style feedback details section
    - Style model information display
    - Ensure responsive design
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 9. Add feedback statistics to /stats page
  - [x] 9.1 Create feedback statistics section
    - Display total dislike count
    - Show dislikes grouped by model in table
    - Display trends (last week, last month)
    - Calculate percentage of messages with dislikes
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [x] 9.2 Add link to detailed feedback view
    - Add button/link to /admin/feedback page
    - Show preview of recent feedback
    - _Requirements: 12.5_

- [x] 10. Create admin feedback dashboard page
  - Create /admin/feedback route
  - Display paginated list of all feedback
  - Implement filters (model, date range, user)
  - Show session context for each feedback
  - Link to full session view
  - Require admin authentication
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.3, 14.5_

- [x] 11. Update chat message generation to use model tracking
  - Modify chat API endpoint to use ProviderManager's model metadata
  - Pass llmMetadata to MessageService.addMessageWithModelInfo
  - Ensure model info is captured for all assistant messages
  - Handle cases where model metadata is not available
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

- [x] 12. Implement authorization checks
  - Ensure only message owner can submit feedback
  - Ensure only admins can access /api/admin/feedback
  - Ensure only admins can access /api/stats/feedback
  - Ensure only admins can access /admin/feedback page
  - Add role-based access control middleware
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 13. Add error handling and validation
  - Validate feedback text length (min 10, max 1000 characters)
  - Prevent duplicate feedback submissions
  - Handle network errors gracefully
  - Show user-friendly error messages
  - Log errors for debugging
  - _Requirements: 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14. Ensure backward compatibility
  - Handle messages without llm metadata in UI
  - Display "Unknown model" for old messages in admin interface
  - Ensure existing message APIs continue to work
  - Test with existing sessions and messages
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 15. Add data privacy and security measures
  - Ensure API keys are not stored in model metadata
  - Sanitize feedback text to prevent XSS
  - Implement rate limiting for feedback submissions
  - Ensure PII is not exposed in feedback stats
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 16. Documentation and deployment
  - Update API documentation with new endpoints
  - Document metadata schema for developers
  - Create admin guide for reviewing feedback
  - Update user guide with feedback feature
  - Deploy to staging and test
  - Deploy to production
  - _Requirements: All_
