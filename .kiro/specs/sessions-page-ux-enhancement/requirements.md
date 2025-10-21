# Requirements Document

## Introduction

This document outlines the requirements for enhancing the user experience of the Sessions page (http://localhost:3002/sessions). The enhancements focus on improving session discoverability, filtering capabilities, and visual presentation to help users quickly find and identify their sessions based on time periods, search queries, and visual cues.

## Glossary

- **Session**: A conversation thread between a user and the AI tutor, containing multiple messages
- **Session Card**: A visual card component displaying session information in the sessions list
- **Command Badge**: A visual indicator showing which AI agent/command was used in a session (e.g., /solve, /notes, /test, /explain in English; /решить, /конспект, /тест, /объяснить in Russian)
- **Command**: A special instruction or agent invocation used in chat messages, prefixed with "/". Commands are localized based on the session language (e.g., /solve for solving problems in English, /решить in Russian)
- **Command Type**: A language-agnostic category of commands that groups localized variants (e.g., "Solve" type includes /solve, /решить, /resolver)
- **Mode Badge**: An indicator showing whether a session is in FUN or LEARN mode
- **Date Range Filter**: A UI control allowing users to filter sessions by time period (Last Hour, Last Day, Last Week, Last Month, Last Year, All Time)
- **Search Input**: A text field allowing users to search sessions by title, content, or command name
- **Message Count**: The total number of messages in a session
- **Session Preview**: A text snippet showing the first user message or query from a session
- **Infinite Scroll**: A pagination technique that automatically loads more content as the user scrolls to the bottom of the list
- **Filter Panel**: A UI component displaying available filter options (commands, date ranges, etc.)
- **Active Filter Tag**: A visual chip/badge showing which filters are currently applied, with the ability to remove individual filters

## Requirements

### Requirement 1: Date Range Filtering

**User Story:** As a user, I want to filter my sessions by time period, so that I can quickly find sessions from specific timeframes.

#### Acceptance Criteria

1. WHEN the user views the Sessions page, THE System SHALL display a date range filter control with predefined time period options
2. THE System SHALL provide the following time period filter options: "Last Hour", "Last Day", "Last Week", "Last Month", "Last Year", and "All Time"
3. WHEN the user selects a time period filter, THE System SHALL display only sessions that were last updated within the selected time range
4. THE System SHALL maintain the selected filter state when the user navigates away and returns to the Sessions page
5. THE System SHALL display a visual indicator showing which time period filter is currently active

### Requirement 2: Functional Search Implementation

**User Story:** As a user, I want to search through my sessions by title, content, or command type, so that I can quickly locate specific conversations or all sessions using a particular AI agent.

#### Acceptance Criteria

1. WHEN the user types text into the search input field, THE System SHALL filter sessions in real-time based on the search query
2. THE System SHALL search across session titles, preview text content, and command names
3. WHEN the user searches for a command name in any language (e.g., "solve", "решить", "resolver"), THE System SHALL display all sessions that used that specific command
4. WHEN the search query matches session content, THE System SHALL display only matching sessions
5. WHEN the user clears the search input, THE System SHALL restore the full list of sessions respecting any active filters
6. THE System SHALL display a message indicating the number of search results found
7. THE System SHALL handle empty search results by displaying an appropriate "No sessions found" message
8. THE System SHALL support searching by command with or without the "/" prefix (e.g., both "solve" and "/solve" should work)

### Requirement 3: Enhanced Session Card Design with Command Badges

**User Story:** As a user, I want to see visual indicators of which AI commands were used in each session, so that I can quickly identify sessions by their purpose.

#### Acceptance Criteria

1. WHEN a session card is displayed, THE System SHALL show command badges for any AI agent commands used in the session
2. THE System SHALL display the primary command as a prominent badge with an emoji icon and command name in the session's language
3. WHERE multiple commands were used in a session, THE System SHALL display additional commands as smaller secondary badges
4. THE System SHALL use distinct colors and emoji icons for different command types (e.g., 🎯 for Solve, 📓 for Notes, 📝 for Test, 💡 for Explain)
5. THE System SHALL position the mode badge (FUN/LEARN) in the top-right corner of the session card
6. THE System SHALL display the message count with an icon (💬) in the card footer
7. THE System SHALL highlight the main user query or request text in bold within the session preview
8. THE System SHALL maintain visual hierarchy with the primary command being most prominent

### Requirement 4: Improved Visual Design and Layout

**User Story:** As a user, I want session cards to have clear visual hierarchy and organization, so that I can quickly scan and identify sessions.

#### Acceptance Criteria

1. THE System SHALL display session cards with a clear visual hierarchy: mode badge at top-right, command badges at top-left, title in bold, preview text, and metadata at bottom
2. THE System SHALL use color differentiation for command badges to make different session types easily distinguishable
3. THE System SHALL ensure command badges are readable with appropriate contrast ratios
4. THE System SHALL display the session date and time in a consistent, localized format
5. THE System SHALL show hover effects on session cards to indicate interactivity
6. WHERE a session has no specific command, THE System SHALL display a default badge or no badge based on the session mode

### Requirement 5: Command Filter

**User Story:** As a user, I want to filter sessions by the AI command types used, so that I can quickly find all sessions of a specific type (e.g., all problem-solving sessions, all study notes, all practice tests).

#### Acceptance Criteria

1. WHEN the user clicks on the "Filters" button, THE System SHALL display a filter panel with command filter options
2. THE System SHALL provide filter options for the following command types with their respective emoji icons:
   - Solve (🎯) - solve problems step-by-step
   - Explain (💡) - detailed explanations of topics
   - Check (✅) - check work for errors
   - Example (�) - show examples on current topic
   - Cheatsheet (📌) - create quick reference guides
   - Test (📝) - create practice questions
   - Notes (�)/ - create study notes
   - Plan (🗓️) - create learning plans
   - Essay (✍️) - essay writing assistance
   - All Commands - to show all sessions regardless of command
3. THE System SHALL group localized command variants by their command type (e.g., /solve, /решить, /resolver all map to "Solve" filter)
4. WHEN the user selects a command filter, THE System SHALL display only sessions that contain messages with any variant of the selected command type
5. THE System SHALL allow selecting multiple command filters simultaneously (OR logic - show sessions matching any selected command type)
6. THE System SHALL display the count of active command filters in the Filters button badge
7. THE System SHALL maintain command filter state when combined with other filters (date range, search)
8. WHEN a command filter is active, THE System SHALL highlight the corresponding command badges in session cards with a visual indicator
9. THE System SHALL extract command information from message metadata to determine which commands were used in each session
10. THE System SHALL display command badges in the session's original language while filtering works across all language variants
11. THE System SHALL display filter labels in the user's current interface language

### Requirement 6: Filter and Search Combination

**User Story:** As a user, I want to combine date range filters, command filters, and search queries, so that I can narrow down sessions more precisely.

#### Acceptance Criteria

1. WHEN date range filters, command filters, and search query are active, THE System SHALL apply all filters simultaneously
2. THE System SHALL display the count of active filters in the Filters button badge
3. THE System SHALL provide a "Clear all filters" action when any filters are active
4. THE System SHALL maintain filter state across page navigation within the same session
5. THE System SHALL update the session list in real-time as filters are applied or removed
6. THE System SHALL show active filter tags below the toolbar indicating which filters are currently applied
7. WHEN the user clicks on an active filter tag, THE System SHALL remove that specific filter

### Requirement 7: Performance and Infinite Scroll

**User Story:** As a user, I want the sessions page to load and respond quickly even with many sessions, so that I can efficiently browse and manage my sessions.

#### Acceptance Criteria

1. WHEN the user applies a filter or search query, THE System SHALL update the session list within 500 milliseconds
2. THE System SHALL implement debouncing for search input to avoid excessive API calls (300ms delay)
3. THE System SHALL display a loading indicator while fetching filtered sessions
4. THE System SHALL maintain smooth animations and transitions when updating the session list
5. THE System SHALL implement infinite scroll pagination to handle large numbers of sessions
6. WHEN the user scrolls to the bottom of the session list, THE System SHALL automatically load the next page of sessions (20 sessions per page)
7. THE System SHALL display a loading spinner at the bottom of the list while loading more sessions
8. THE System SHALL cache loaded sessions to avoid re-fetching when scrolling up
9. WHEN all sessions have been loaded, THE System SHALL display an "End of list" indicator
10. THE System SHALL maintain scroll position when the user navigates away and returns to the Sessions page

### Requirement 8: Accessibility and Usability

**User Story:** As a user with accessibility needs, I want the sessions page to be fully accessible, so that I can navigate and use all features effectively.

#### Acceptance Criteria

1. THE System SHALL provide keyboard navigation for all filter controls and session cards
2. THE System SHALL include appropriate ARIA labels for all interactive elements
3. THE System SHALL ensure command badges have sufficient color contrast for readability
4. THE System SHALL provide screen reader announcements when filters are applied or search results change
5. THE System SHALL support focus indicators for all interactive elements
6. THE System SHALL provide screen reader announcements when filters are applied or search results change
7. THE System SHALL support focus indicators for all interactive elements
