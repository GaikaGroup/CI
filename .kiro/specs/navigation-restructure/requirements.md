# Navigation Restructure Requirements

## Introduction

This specification outlines the restructuring of the main navigation to implement a clear Student/Tutor role-based approach. The goal is to eliminate navigation duplication and provide intuitive access to course-related functionality based on user roles.

## Requirements

### Requirement 1: Student/Tutor Navigation Structure

**User Story:** As a user, I want clear navigation that separates my learning activities from my teaching activities, so that I can easily access the appropriate functionality for each role.

#### Acceptance Criteria

1. WHEN I view the main navigation THEN I SHALL see the structure: [Fun] [Student] [Tutor] [Sessions] [Console ▼] [User ▼]
2. WHEN I click on "Student" THEN I SHALL access student-focused functionality
3. WHEN I click on "Tutor" THEN I SHALL access tutor/teaching-focused functionality
4. WHEN I am in Fun mode THEN the system SHALL use high temperature AI responses without content verification
5. WHEN I am in Student/Tutor modes THEN the system SHALL use structured, verified educational content

### Requirement 2: Student Mode Functionality

**User Story:** As a student, I want to browse available courses and manage my learning progress, so that I can effectively learn new subjects.

#### Acceptance Criteria

1. WHEN I access Student mode THEN I SHALL see a page with tabs: [Browse Courses] [My Learning] [Progress]
2. WHEN I click "Browse Courses" THEN I SHALL see all available courses in the catalog
3. WHEN I click "My Learning" THEN I SHALL see courses I am enrolled in as a student
4. WHEN I click "Progress" THEN I SHALL see my learning statistics and achievements
5. WHEN I enroll in a course THEN it SHALL appear in "My Learning"
6. WHEN I view a course in Browse Courses THEN I SHALL see enrollment options and course details

### Requirement 3: Tutor Mode Functionality

**User Story:** As a tutor, I want to create and manage my courses and monitor student progress, so that I can effectively teach and improve my content.

#### Acceptance Criteria

1. WHEN I access Tutor mode THEN I SHALL see a page with tabs: [My Courses] [Create Course] [Analytics] [Students]
2. WHEN I click "My Courses" THEN I SHALL see courses I have authored
3. WHEN I click "Create Course" THEN I SHALL access the course creation interface
4. WHEN I click "Analytics" THEN I SHALL see statistics about my courses and student engagement
5. WHEN I click "Students" THEN I SHALL see students enrolled in my courses
6. WHEN I create a course THEN it SHALL appear in "My Courses"
7. WHEN I am the author of a course THEN I SHALL be able to enroll in it as a student

### Requirement 4: Dual Role Support

**User Story:** As a user who is both a student and tutor, I want to seamlessly switch between roles and access my own courses as a student, so that I can test and experience my content from a learner's perspective.

#### Acceptance Criteria

1. WHEN I am the author of a course THEN I SHALL be able to enroll in my own course
2. WHEN I enroll in my own course THEN it SHALL appear in both "My Courses" (Tutor) and "My Learning" (Student)
3. WHEN I view my own course as a student THEN I SHALL have the same experience as other students
4. WHEN I switch between Student and Tutor modes THEN the interface SHALL clearly indicate my current role
5. WHEN I have courses in both roles THEN navigation badges SHALL show counts for each role

### Requirement 5: Navigation Badges and Indicators

**User Story:** As a user, I want to see visual indicators of my activity in each role, so that I can quickly understand my current status and activity levels.

#### Acceptance Criteria

1. WHEN I have enrolled courses THEN the Student navigation SHALL show a badge with the count
2. WHEN I have authored courses THEN the Tutor navigation SHALL show a badge with the count
3. WHEN I have no activity in a role THEN no badge SHALL be displayed
4. WHEN I am currently in a specific mode THEN that navigation item SHALL be visually highlighted
5. WHEN badges are displayed THEN they SHALL update in real-time as I enroll/create courses

### Requirement 6: Legacy Navigation Removal

**User Story:** As a user, I want a clean navigation without duplicate functionality, so that I can navigate efficiently without confusion.

#### Acceptance Criteria

1. WHEN the new navigation is implemented THEN the "Learn" and "Catalogue" navigation items SHALL be removed
2. WHEN the new navigation is implemented THEN the "My Courses" navigation item SHALL be removed
3. WHEN existing routes are accessed THEN they SHALL redirect to appropriate Student/Tutor sections
4. WHEN I access legacy URLs THEN I SHALL be redirected to the equivalent new navigation structure
5. WHEN the migration is complete THEN no duplicate navigation functionality SHALL exist

### Requirement 7: Visual Design and UX

**User Story:** As a user, I want visually distinct and intuitive navigation that clearly communicates the purpose of each section, so that I can navigate confidently.

#### Acceptance Criteria

1. WHEN I view the navigation THEN Student and Tutor sections SHALL have distinct visual styling
2. WHEN I view the navigation THEN appropriate icons SHALL be used (🎓 for Student, 👨‍🏫 for Tutor)
3. WHEN I hover over navigation items THEN helpful tooltips SHALL be displayed
4. WHEN I am in Student mode THEN the interface SHALL use student-focused colors and terminology
5. WHEN I am in Tutor mode THEN the interface SHALL use tutor-focused colors and terminology
6. WHEN I switch between modes THEN the transition SHALL be smooth and intuitive

### Requirement 8: Mobile Responsiveness

**User Story:** As a mobile user, I want the navigation to work effectively on small screens, so that I can access all functionality regardless of device.

#### Acceptance Criteria

1. WHEN I view the navigation on mobile THEN it SHALL collapse into a responsive menu
2. WHEN I access Student/Tutor modes on mobile THEN tabs SHALL be accessible and usable
3. WHEN I use the navigation on mobile THEN all functionality SHALL remain available
4. WHEN I switch between modes on mobile THEN the experience SHALL be optimized for touch interaction
5. WHEN badges are displayed on mobile THEN they SHALL remain visible and readable