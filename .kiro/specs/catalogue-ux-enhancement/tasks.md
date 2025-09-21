# Implementation Plan

- [x] 1. Set up catalogue routing and navigation infrastructure
  - Create new `/catalogue` route that replaces `/learn` functionality
  - Implement redirect from `/learn` to `/catalogue` for backward compatibility
  - Update Navigation.svelte to include "Catalogue" link in header
  - Remove obsolete `/admin/subjects` route and navigation links
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3_

- [x] 2. Create enhanced subject tile component with creator permissions
  - Modify SubjectSelection.svelte to show shortened content on tiles
  - Add creator-only edit icon that appears based on user permissions
  - Replace "Take Assessment" and "Learn" buttons with single "Join" button
  - Maintain existing "Report" button functionality
  - Implement permission checking logic for edit icon visibility
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 3.6_

- [x] 3. Implement user enrollment system and "My Subjects" dropdown
  - Create UserEnrollmentService for managing subject enrollments
  - Add enrollment tracking to subject data model
  - Implement "Join" button functionality to enroll users in subjects
  - Create "My Subjects" dropdown component in navigation
  - Add enrollment status tracking and display logic
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 4. Build subject edit mode interface
  - Create SubjectEditMode.svelte component for comprehensive subject editing
  - Implement form validation for subject data updates
  - Add permission checks to ensure only creators can edit their subjects
  - Create routing logic to navigate to edit mode from catalogue tiles
  - Integrate with existing SubjectService for CRUD operations
  - _Requirements: 2.3, 4.1, 4.2, 4.3_

- [x] 5. Develop agent management system with CRUD operations
  - Create AgentManager.svelte component for agent administration
  - Implement agent creation with name and description input fields
  - Build agent editing and deletion functionality
  - Add agent list display with edit/delete options for each agent
  - Create agent validation logic to ensure proper configuration
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_

- [x] 6. Implement orchestration agent auto-management
  - Create logic to automatically create orchestration agent when subject has 2+ agents
  - Implement orchestration agent removal when subject has fewer than 2 agents
  - Add orchestration agent description field for pipeline and behavior configuration
  - Create validation for orchestration agent configuration
  - Integrate orchestration logic with agent CRUD operations
  - _Requirements: 4.7, 4.8, 4.9_

- [x] 7. Build document upload system for RAG materials
  - Create DocumentUploader.svelte component with file input interface
  - Implement file type validation to accept only TXT and PDF files
  - Add upload progress indication and error handling
  - Create file size validation and user feedback
  - Build material list display showing uploaded documents
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Integrate embedding pipeline for uploaded documents
  - Connect document upload to existing embedding service
  - Implement automatic embedding process trigger on file upload
  - Add embedding status tracking and display to users
  - Create error handling for failed embedding processes
  - Integrate with vector database storage for processed embeddings
  - _Requirements: 5.3, 5.4_

- [x] 9. Enhance agent model with instruction fields and communication settings
  - Extend Agent interface to include instructions and systemPrompt fields
  - Add communicationStyle configuration to agent model
  - Implement ragEnabled flag for agents
  - Create agent instruction input fields in AgentManager component
  - Add validation for agent instruction completeness
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 10. Develop RAG-powered agent communication system
  - Create AgentCommunicationService for processing student messages
  - Implement RAG context retrieval from uploaded materials
  - Build single-agent response logic using agent instructions and RAG context
  - Create multi-agent orchestration logic for subjects with multiple agents
  - Integrate agent communication with existing ChatInterface component
  - _Requirements: 5.5_

- [x] 11. Implement orchestration agent routing and coordination
  - Create agent selection logic based on message content and orchestration rules
  - Implement agent coordination system for multi-agent responses
  - Build response synthesis logic to combine multiple agent outputs
  - Add routing rules configuration in orchestration agent setup
  - Create fallback mechanisms for agent communication failures
  - _Requirements: 4.8, 4.9_

- [x] 12. Enhance chat interface with agent-based responses
  - Modify ChatInterface.svelte to integrate with AgentCommunicationService
  - Implement context passing from enrolled subject to chat system
  - Add agent identification in chat responses (show which agent responded)
  - Create seamless integration between text and voice communication modes
  - Ensure RAG context is properly utilized in both text and voice responses
  - _Requirements: 5.5_

- [x] 13. Create comprehensive form validation and error handling
  - Implement client-side validation for all subject edit forms
  - Add server-side validation for agent configurations
  - Create user-friendly error messages for all validation failures
  - Implement error recovery mechanisms for file upload failures
  - Add permission error handling with appropriate user feedback
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 14. Add material management and RAG configuration
  - Create material list component showing uploaded documents with metadata
  - Implement material deletion functionality for subject creators
  - Add RAG configuration options (search threshold, context length, etc.)
  - Create material usage tracking and analytics display
  - Implement material re-processing capabilities for failed embeddings
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 15. Implement comprehensive testing suite
  - Write unit tests for all new components (SubjectEditMode, AgentManager, DocumentUploader)
  - Create integration tests for agent communication and RAG system
  - Add end-to-end tests for complete user workflows (join subject, edit subject, upload materials)
  - Test permission system thoroughly across all user roles
  - Validate file upload and embedding pipeline with various file types and sizes
  - _Requirements: All requirements validation_

- [x] 16. Optimize performance and add accessibility features
  - Implement lazy loading for subject tiles in catalogue view
  - Add keyboard navigation support for all interactive elements
  - Ensure screen reader compatibility for all new components
  - Optimize file upload performance with chunked uploads for large files
  - Add proper ARIA labels and semantic HTML throughout
  - _Requirements: All requirements - performance and accessibility_

- [x] 17. Final integration and cleanup
  - Remove all references to obsolete `/admin/subjects` route
  - Ensure all navigation links point to correct catalogue routes
  - Verify backward compatibility with existing subject data
  - Test complete user journey from catalogue browsing to agent interaction
  - Validate that all agent instructions and RAG materials work correctly in chat
  - _Requirements: 6.1, 6.2, 6.3, and overall system integration_
