# Navigation Restructure Implementation Plan

## 1. Create Navigation State Management
- Create navigation store for managing current mode and badge counts
- Implement badge calculation logic based on user's enrolled and authored courses
- Add reactive updates when course enrollment changes
- _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5_

## 2. Build Student Dashboard Page
- [ ] 2.1 Create student page route and layout structure
  - Set up `/student` route with tab-based interface
  - Implement responsive design for mobile and desktop
  - _Requirements: 2.1, 8.1, 8.2_

- [ ] 2.2 Implement Browse Courses tab
  - Move existing catalogue functionality to Student dashboard
  - Add course enrollment capabilities
  - Implement course filtering and search
  - _Requirements: 2.2, 2.6_

- [ ] 2.3 Implement My Learning tab
  - Display courses user is enrolled in as a student
  - Show learning progress and status
  - Add course continuation functionality
  - _Requirements: 2.3, 2.5_

- [ ] 2.4 Implement Progress tab
  - Create learning statistics dashboard
  - Display achievements and completion status
  - Add progress visualization components
  - _Requirements: 2.4_

## 3. Build Tutor Dashboard Page
- [ ] 3.1 Create tutor page route and layout structure
  - Set up `/tutor` route with tab-based interface
  - Implement responsive design for mobile and desktop
  - _Requirements: 3.1, 8.1, 8.2_

- [ ] 3.2 Implement My Courses tab
  - Display courses user has authored
  - Add course management functionality
  - Show course statistics and enrollment numbers
  - _Requirements: 3.2, 3.6_

- [ ] 3.3 Implement Create Course tab
  - Move existing course creation functionality
  - Add AI-assisted course drafting
  - Implement course publishing workflow
  - _Requirements: 3.3, 3.6_

- [ ] 3.4 Implement Analytics tab
  - Create course performance dashboard
  - Display student engagement metrics
  - Add course improvement suggestions
  - _Requirements: 3.4_

- [ ] 3.5 Implement Students tab
  - Display students enrolled in tutor's courses
  - Show individual student progress
  - Add communication tools
  - _Requirements: 3.5_

## 4. Implement Dual Role Support
- [ ] 4.1 Add self-enrollment functionality
  - Allow course authors to enroll in their own courses
  - Handle dual role permissions and access
  - Update course display logic for author-students
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4.2 Implement role-based course filtering
  - Create methods to distinguish enrolled vs authored courses
  - Handle courses where user has both roles
  - Update course stores with role-aware methods
  - _Requirements: 4.1, 4.2, 4.7_

## 5. Update Header Navigation
- [ ] 5.1 Replace navigation items with Student/Tutor structure
  - Remove Learn, Catalogue, My Courses navigation items
  - Add Student and Tutor navigation with icons
  - Implement active state highlighting
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 7.1, 7.2_

- [ ] 5.2 Add navigation badges and indicators
  - Display course counts for Student and Tutor modes
  - Implement real-time badge updates
  - Add visual highlighting for current mode
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3_

- [ ] 5.3 Implement responsive mobile navigation
  - Create collapsible mobile menu
  - Optimize for touch interaction
  - Ensure badge visibility on mobile
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## 6. Add Visual Design and UX Enhancements
- [ ] 6.1 Implement role-based styling
  - Create distinct visual themes for Student and Tutor modes
  - Add appropriate icons and color schemes
  - Implement smooth transitions between modes
  - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_

- [ ] 6.2 Add accessibility features
  - Implement keyboard navigation support
  - Add ARIA labels and screen reader support
  - Ensure high contrast mode compatibility
  - _Requirements: 7.3_

## 7. Implement Legacy Route Handling
- [ ] 7.1 Add redirect logic for old routes
  - Redirect `/catalogue` to `/student?tab=browse`
  - Redirect `/my-subjects` to `/student?tab=learning`
  - Redirect `/my-courses` to `/tutor?tab=courses`
  - _Requirements: 6.4, 6.5_

- [ ] 7.2 Update internal navigation links
  - Replace old route references throughout the application
  - Update component navigation logic
  - Test all internal link functionality
  - _Requirements: 6.4, 6.5_

## 8. Testing and Quality Assurance
- [ ] 8.1 Write unit tests for navigation components
  - Test navigation state management
  - Test badge calculation logic
  - Test tab switching functionality
  - _Requirements: All requirements_

- [ ] 8.2 Write integration tests for dashboard functionality
  - Test Student dashboard tab interactions
  - Test Tutor dashboard tab interactions
  - Test dual role course management
  - _Requirements: 2.1-2.6, 3.1-3.5, 4.1-4.7_

- [ ] 8.3 Implement E2E tests for complete user journeys
  - Test navigation between Fun, Student, and Tutor modes
  - Test course creation and enrollment workflows
  - Test mobile navigation functionality
  - _Requirements: 1.1-1.5, 8.1-8.5_

## 9. Performance Optimization and Cleanup
- [ ] 9.1 Implement performance optimizations
  - Add lazy loading for tab content
  - Optimize course data fetching and caching
  - Implement virtual scrolling for large lists
  - _Requirements: All requirements_

- [ ] 9.2 Clean up legacy code and components
  - Remove unused navigation components
  - Clean up old route handlers
  - Update documentation and comments
  - _Requirements: 6.1, 6.2, 6.3_