# Requirements Document

## Introduction

This feature adds a Users page to the Console section of the admin dashboard. The Console section is a unified administrative area that incorporates Users, Finance, and Analytics pages, providing administrators with comprehensive system oversight. The Users page will enable administrators to view and monitor user accounts, following the same design patterns as the existing Finance and Analytics pages within the Console.

## Requirements

### Requirement 1: User List Display

**User Story:** As an Admin, I want to view a list of all users in the system, so that I can monitor user accounts.

#### Acceptance Criteria

1. WHEN the admin navigates to /admin/users THEN the system SHALL display a table of all users
2. WHEN the user list is displayed THEN the system SHALL show email, registration date, session count, and message count for each user
3. WHEN the user list is loading THEN the system SHALL display a loading indicator
4. IF the user list fails to load THEN the system SHALL display an error message
5. WHEN the page loads THEN the system SHALL sort users by registration date in descending order

### Requirement 2: User Search

**User Story:** As an Admin, I want to search users by email, so that I can quickly find specific users.

#### Acceptance Criteria

1. WHEN the admin enters text in the search field THEN the system SHALL filter users by email address in real-time
2. WHEN the admin types in the search field THEN the system SHALL filter as the user types (client-side filtering)
3. WHEN search results are empty THEN the system SHALL display a "no results found" message
4. WHEN the admin clears the search THEN the system SHALL show all users again

### Requirement 3: User Statistics Summary

**User Story:** As an Admin, I want to see summary statistics about users, so that I can understand system usage.

#### Acceptance Criteria

1. WHEN the admin views the users page THEN the system SHALL display summary statistics at the top of the page
2. WHEN summary statistics are displayed THEN the system SHALL show total user count and total sessions count
3. WHEN statistics are calculated THEN the system SHALL derive them from the loaded user data
4. IF the entire page fails to load THEN the system SHALL display an error message without statistics

### Requirement 4: Console Navigation

**User Story:** As an Admin, I want to navigate between Console pages (Users, Finance, Analytics), so that I can access different administrative functions.

#### Acceptance Criteria

1. WHEN the admin is logged in THEN the system SHALL display a "Console" item in the main navigation bar
2. WHEN the admin clicks the Console item THEN the system SHALL show subsections: Users, Finance, and Analytics
3. WHEN the admin clicks a Console subsection THEN the system SHALL navigate to the selected page
4. WHEN the admin is on any Console page THEN the Console item SHALL be visually highlighted in the main navigation
5. WHEN the Console dropdown is open THEN the current page subsection SHALL be visually highlighted

### Requirement 5: Access Control

**User Story:** As a system, I want to show the Console section only to users with Admin role, so that administrative data remains secure.

#### Acceptance Criteria

1. WHEN a user with Admin role is logged in THEN the system SHALL display Console navigation in the main menu
2. WHEN a user without Admin role is logged in THEN the system SHALL NOT display Console navigation
3. WHEN an Admin accesses /admin/users THEN the system SHALL display the Users page
4. IF the user is not authenticated THEN the system SHALL redirect to the login page
