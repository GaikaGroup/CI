# Implementation Plan

- [x] 1. Create base component structure
  - Create directory `src/routes/learn/[courseId]/components/` for new components
  - Set up component file structure with proper imports
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 2. Implement CourseHero component
  - [x] 2.1 Create CourseHero.svelte with props interface
    - Define props: courseName, description, level, language, studentCount, enrolled, onEnroll
    - Implement gradient background with Tailwind classes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Add hero content layout
    - Implement course title with text-5xl typography
    - Add course description with proper text styling
    - Create metadata badges for level and language
    - Add student count display with Users icon
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 2.3 Implement enrollment button
    - Add primary CTA button with conditional text based on enrollment state
    - Implement hover effects and transitions
    - Connect onClick handler to parent component
    - _Requirements: 1.5, 7.1, 7.2_

- [x] 3. Implement CourseInfoSidebar component
  - [x] 3.1 Create CourseInfoSidebar.svelte with sticky positioning
    - Define props: level, language, studentCount, agentCount, enrolled, onEnroll
    - Implement sticky positioning for desktop (sticky top-8)
    - Add responsive behavior for mobile/tablet
    - _Requirements: 2.1, 2.5, 8.1, 8.2_

  - [x] 3.2 Add course information display
    - Create info rows for level, language, students, AI agents
    - Style with proper spacing and borders
    - _Requirements: 2.2_

  - [x] 3.3 Add enrollment button and features list
    - Implement enrollment/continue button
    - Create "What's Included" section with checkmark list
    - _Requirements: 2.3, 2.4_

- [x] 4. Implement InstructorProfiles component
  - [x] 4.1 Create InstructorProfiles.svelte
    - Define props interface for agents array
    - Map course agents to instructor cards
    - _Requirements: 3.1, 3.5_

  - [x] 4.2 Design instructor card layout
    - Create card with gradient background (gray-50 to orange-50)
    - Add icon placeholder with MessageSquare icon
    - Display name, role, description
    - Add tone and formality badges
    - Implement hover effects
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 5. Implement SkillsSection component
  - [x] 5.1 Create SkillsSection.svelte
    - Define props for skills array
    - Implement conditional rendering (hide if no skills)
    - _Requirements: 4.1, 4.5_

  - [x] 5.2 Create skills grid layout
    - Implement responsive grid (2 columns desktop, 1 mobile)
    - Create skill cards with checkmark icons
    - Add orange background and hover effects
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 6. Implement LearningFormatSection component
  - [x] 6.1 Create LearningFormatSection.svelte
    - Implement gradient background section
    - _Requirements: 5.1, 5.5_

  - [x] 6.2 Add feature cards
    - Create three feature cards: AI Assistants, Materials, Practice
    - Add icons for each feature (MessageSquare, FileText, Users)
    - Implement semi-transparent backgrounds with backdrop blur
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 7. Create CourseLandingPage orchestrator component
  - [x] 7.1 Create CourseLandingPage.svelte
    - Define comprehensive props interface
    - Set up component layout structure
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 7.2 Implement responsive layout
    - Create two-column grid for desktop (lg:grid-cols-3)
    - Implement single column for mobile
    - Position sidebar correctly
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.3 Integrate all sub-components
    - Add CourseHero at the top
    - Create main content area with sections
    - Add CourseInfoSidebar
    - Integrate InstructorProfiles, SkillsSection, LearningFormatSection
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 8. Implement navigation bar
  - [x] 8.1 Create navigation component or section
    - Add platform branding with BookOpen icon
    - Create navigation links (Catalog, My Courses, Profile)
    - Implement responsive behavior
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Update main page component with state management
  - [x] 9.1 Add enrollment state to +page.svelte
    - Create enrollment state variable
    - Implement enrollment toggle function
    - Add loading and error states for enrollment
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Implement view state logic
    - Add logic to determine if user is enrolled
    - Create conditional rendering for landing vs chat view
    - Implement state transition on enrollment
    - _Requirements: 7.5, 10.1, 10.4_

  - [x] 9.3 Integrate CourseLandingPage component
    - Import CourseLandingPage component
    - Pass course data as props
    - Connect enrollment handlers
    - _Requirements: 10.2, 10.3_

- [x] 10. Add student count to server data
  - [x] 10.1 Update +page.server.js to fetch student count
    - Add database query to count active enrollments
    - Include studentCount in returned course data
    - Handle query errors gracefully
    - _Requirements: 1.1, 2.2_

- [x] 11. Implement responsive design refinements
  - [x] 11.1 Test and refine mobile layout
    - Verify vertical stacking on mobile
    - Test touch interactions
    - Adjust spacing for mobile screens
    - _Requirements: 8.1, 8.4, 8.5_

  - [x] 11.2 Test and refine tablet layout
    - Verify layout adaptation for medium screens
    - Test sidebar positioning
    - _Requirements: 8.2, 8.3_

  - [x] 11.3 Test and refine desktop layout
    - Verify two-column grid
    - Test sticky sidebar behavior
    - Ensure proper spacing and alignment
    - _Requirements: 2.5, 8.3_

- [x] 12. Apply visual design system
  - [x] 12.1 Implement consistent color palette
    - Apply orange-500 and amber-500 for primary colors
    - Use gray tones for neutral elements
    - Ensure color consistency across all components
    - _Requirements: 9.1_

  - [x] 12.2 Apply consistent spacing and borders
    - Use Tailwind spacing scale consistently
    - Apply rounded corners (rounded-2xl, rounded-xl)
    - Ensure consistent padding across cards
    - _Requirements: 9.2, 9.3_

  - [x] 12.3 Add hover states and transitions
    - Implement hover effects on interactive elements
    - Add smooth transitions for state changes
    - Test all interactive elements
    - _Requirements: 9.4_

  - [x] 12.4 Implement typography hierarchy
    - Apply text-5xl for hero title
    - Use text-3xl for section headings
    - Ensure consistent body text styling
    - _Requirements: 9.5_

- [x] 13. Add footer section
  - [x] 13.1 Create footer component
    - Implement footer with dark background
    - Add copyright text
    - Style with proper spacing
    - _Requirements: 9.1_

- [ ] 14. Integration and testing
  - [x] 14.1 Test enrollment flow
    - Verify landing page displays for unenrolled users
    - Test enrollment button functionality
    - Verify transition to chat interface after enrollment
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 14.2 Test with real course data
    - Test with courses that have multiple agents
    - Test with courses that have no skills
    - Test with different course levels and languages
    - _Requirements: 3.5, 4.5_

  - [x] 14.3 Test responsive behavior
    - Test on mobile devices
    - Test on tablets
    - Test on desktop
    - Verify all breakpoints work correctly
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 14.4 Test navigation and routing
    - Test back navigation to My Courses
    - Test navigation between different courses
    - Verify URL handling
    - _Requirements: 6.2, 6.3_

  - [x] 14.5 Verify chat interface integration
    - Ensure enrolled users can access chat
    - Verify course context is passed correctly
    - Test state persistence
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
