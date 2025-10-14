# Implementation Plan

- [x] 1. Create mode mapping utility
  - Create utility function to map app modes to API modes
  - Add comprehensive mapping for 'catalogue' -> 'learn', 'fun' -> 'fun', 'learn' -> 'learn'
  - Include default fallback handling for unknown modes
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 1.1 Write unit tests for mode mapping utility
  - Test all mode mapping combinations
  - Test edge cases and invalid inputs
  - Verify default fallback behavior
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Update session store to use mode mapping
  - Import and integrate mode mapping utility in sessionStore.js
  - Update loadSessions method to use mapped mode for API calls
  - Update searchSessions method to use mapped mode for API calls
  - Ensure all session API calls use proper mode parameter
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [ ]* 2.1 Write unit tests for updated session store
  - Test session loading with different app modes
  - Verify API calls use correct mode parameters
  - Test error handling for invalid modes
  - _Requirements: 1.2, 2.1, 2.2, 2.3_

- [x] 3. Create dynamic course route structure
  - Create `/learn/[courseId]/+page.svelte` for individual course pages
  - Create `/learn/[courseId]/+page.server.js` for server-side course loading
  - Implement course validation and data loading logic
  - Add proper error handling for invalid course IDs
  - _Requirements: 1.1, 3.1, 3.2, 3.4_

- [x] 3.1 Implement course learning page component
  - Create course learning interface with proper session initialization
  - Set correct app mode and load course-specific data
  - Integrate with existing EnhancedChatInterface component
  - Add loading states and error handling
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 3.2 Add course progress route
  - Create `/learn/[courseId]/progress/+page.svelte` for progress tracking
  - Implement progress display and navigation
  - Connect with existing enrollment and progress data
  - _Requirements: 3.1, 3.3_

- [x] 4. Update navigation and error handling
  - Ensure my-courses page navigation works with new routes
  - Add proper error messages and fallback redirects
  - Implement course existence validation
  - Add user-friendly error pages for invalid courses
  - _Requirements: 1.1, 1.3, 3.4_

- [ ]* 4.1 Write integration tests for navigation flow
  - Test complete flow from my-courses to course learning
  - Test error handling for invalid course IDs
  - Test bookmark and direct URL access
  - _Requirements: 1.1, 3.3, 3.4_

- [x] 5. Validate and test the complete solution
  - Test the original error scenario (AdminLogin clicking Continue Learning)
  - Verify API calls use correct mode parameters
  - Test all navigation paths and error scenarios
  - Ensure no regression in existing functionality
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_