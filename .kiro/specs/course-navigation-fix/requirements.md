# Requirements Document

## Introduction

This feature addresses a critical navigation issue where users clicking "Continue Learning" from the my-courses page encounter a 400 Bad Request error due to invalid mode parameter handling. The system currently uses 'catalogue' as an app mode but the sessions API only accepts 'fun' or 'learn' modes, causing a mismatch that breaks the user experience.

## Requirements

### Requirement 1

**User Story:** As a user, I want to click "Continue Learning" from my courses page and successfully navigate to the course learning interface, so that I can seamlessly continue my learning journey without encountering errors.

#### Acceptance Criteria

1. WHEN a user clicks "Continue Learning" from the my-courses page THEN the system SHALL navigate to the appropriate course learning interface without API errors
2. WHEN the system loads sessions for course learning THEN it SHALL use a valid mode parameter ('learn' instead of 'catalogue') for API calls
3. WHEN navigating to a course learning page THEN the system SHALL maintain proper app mode state for the learning context

### Requirement 2

**User Story:** As a developer, I want the app mode and API mode parameters to be properly mapped, so that the system maintains consistency between UI state and backend API calls.

#### Acceptance Criteria

1. WHEN the app mode is set to 'catalogue' THEN session API calls SHALL use 'learn' as the mode parameter
2. WHEN the app mode is 'fun' THEN session API calls SHALL use 'fun' as the mode parameter  
3. WHEN the app mode is 'learn' THEN session API calls SHALL use 'learn' as the mode parameter
4. IF an invalid mode parameter is passed to the sessions API THEN the system SHALL return a clear error message

### Requirement 3

**User Story:** As a user, I want proper course-specific navigation routes, so that I can directly access individual courses and bookmark them for future reference.

#### Acceptance Criteria

1. WHEN a user navigates to `/learn/[courseId]` THEN the system SHALL display the appropriate course learning interface
2. WHEN a course-specific URL is accessed THEN the system SHALL load the correct course context and session data
3. WHEN a user bookmarks a course URL THEN they SHALL be able to return directly to that course
4. IF a course ID is invalid or not found THEN the system SHALL redirect to the catalogue with an appropriate message