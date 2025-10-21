# Implementation Plan - Sessions Page UX Enhancement

## Overview

This implementation plan transforms the Sessions page into a powerful session discovery tool with advanced filtering, search, command badges, and infinite scroll. Each task builds incrementally on previous work.

---

## Phase 1: Backend Foundation

### Task 1: Database Optimization and Indexing

- [ ] 1.1 Add database indexes for session filtering performance
  - Create index on `sessions(user_id, updated_at DESC)` for date-based queries
  - Create index on `sessions(user_id, is_hidden)` for visibility filtering
  - Create index on `messages(session_id, role)` for command extraction
  - Add full-text search index on `messages.content` using PostgreSQL's `gin(to_tsvector('english', content))`
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 1.2 Create database migration for indexes
  - Generate Prisma migration with new indexes
  - Test migration on development database
  - Document rollback procedure
  - _Requirements: 7.1_

### Task 2: Command Type Mapping System

- [ ] 2.1 Create command type definitions and mapping utilities
  - Create `src/lib/modules/session/utils/commandTypes.js` with COMMAND_TYPES constant
  - Map command IDs from tutorCommands.json to command types (solve, explain, check, example, cheatsheet, test, conspect, plan, essay)
  - Include emoji icons and label keys for each command type
  - Group all language variants under their command type
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.2, 5.3_

- [ ] 2.2 Create CommandExtractionService
  - Create `src/lib/modules/session/services/CommandExtractionService.js`
  - Implement `extractCommands(messages)` to find all commands used in a session
  - Implement `mapCommandToType(command)` to convert localized commands to types
  - Handle edge cases: unknown commands, malformed commands, empty messages
  - _Requirements: 3.1, 3.2, 5.9_

- [ ]\* 2.3 Write unit tests for CommandExtractionService
  - Create `tests/unit/session/commandExtraction.test.js`
  - Test command extraction from various message formats
  - Test command-to-type mapping for all languages (en, ru, es)
  - Test handling of unknown/invalid commands
  - Test multiple commands in single session
  - _Requirements: 3.1, 3.2_

### Task 3: Session Enhancement Service

- [ ] 3.1 Create SessionEnhancementService
  - Create `src/lib/modules/session/services/SessionEnhancementService.js`
  - Implement `enhanceSession(session)` to add computed UI fields
  - Implement `getPrimaryCommand(messages)` to identify first command used
  - Implement `getPreviewText(messages)` to extract first user message (150 chars max)
  - Implement `enhanceSessions(sessions)` for batch processing
  - _Requirements: 3.1, 3.6, 3.7, 4.1_

- [ ]\* 3.2 Write unit tests for SessionEnhancementService
  - Create `tests/unit/session/sessionEnhancement.test.js`
  - Test session enhancement with various message patterns
  - Test preview text generation and truncation
  - Test primary command detection
  - Test handling of sessions without commands
  - _Requirements: 3.1, 4.1_

### Task 4: Session Filter Service

- [ ] 4.1 Create SessionFilterService for query building
  - Create `src/lib/modules/session/services/SessionFilterService.js`
  - Implement `buildQuery(filters, userId)` to construct Prisma where clauses
  - Implement `getDateRangeStart(range)` for date calculations (hour, day, week, month, year, all)
  - Implement `getCommandVariants(commandTypes)` to expand command types to all language variants
  - Support combined filters: search + dateRange + commands
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 5.4, 6.1_

- [ ]\* 4.2 Write unit tests for SessionFilterService
  - Create `tests/unit/session/sessionFilter.test.js`
  - Test query building for each filter type independently
  - Test date range calculations for all time periods
  - Test command variant expansion
  - Test combined filter scenarios
  - _Requirements: 1.3, 2.1, 5.4, 6.1_

### Task 5: Enhanced Sessions API Endpoint

- [ ] 5.1 Update GET /api/sessions endpoint with filtering support
  - Modify `src/routes/api/sessions/+server.js`
  - Add query parameters: `search`, `dateRange`, `commands` (comma-separated), `page`, `limit`
  - Use SessionFilterService to build Prisma query
  - Include messages in query for command extraction
  - Use SessionEnhancementService to add computed fields
  - Return pagination metadata: `{ page, limit, total, pages, hasMore }`
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 5.4, 6.1, 7.1_

- [ ] 5.2 Add error handling and validation to API endpoint
  - Validate query parameters (dateRange whitelist, positive integers for page/limit)
  - Sanitize search input (max 500 chars, escape special characters)
  - Validate command types against known types
  - Return appropriate HTTP status codes (400, 401, 500)
  - _Requirements: 2.7, 8.1_

- [ ]\* 5.3 Write integration tests for sessions API
  - Create `tests/integration/api/sessions-filter.test.js`
  - Test authentication requirement (401 without auth)
  - Test search filtering with various queries
  - Test date range filtering for each time period
  - Test command filtering with single and multiple commands
  - Test pagination (page, limit, hasMore)
  - Test combined filters
  - Test error cases (invalid parameters, malformed requests)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 5.4, 6.1, 7.1_

---

## Phase 2: State Management and Stores

### Task 6: Filter Store

- [ ] 6.1 Create filter store for managing filter state
  - Create `src/lib/modules/session/stores/filterStore.js`
  - Implement writable store with initial state: `{ search: '', dateRange: 'all', commandTypes: [], page: 1, limit: 20 }`
  - Implement actions: `setSearch`, `setDateRange`, `setCommandTypes`, `addCommandType`, `removeCommandType`, `clearFilters`, `nextPage`, `reset`
  - Reset page to 1 when any filter changes
  - _Requirements: 1.4, 6.2, 6.3, 6.4_

- [ ] 6.2 Create derived stores for filter state
  - Add `activeFilterCount` derived store to count active filters
  - Add `hasActiveFilters` derived store to check if any filters are active
  - _Requirements: 5.6, 6.2_

- [ ]\* 6.3 Write unit tests for filter store
  - Create `tests/unit/session/filterStore.test.js`
  - Test initial state
  - Test each action (setSearch, setDateRange, etc.)
  - Test page reset on filter changes
  - Test derived stores (activeFilterCount, hasActiveFilters)
  - _Requirements: 1.4, 6.2, 6.3_

### Task 7: Session Cache Store

- [ ] 7.1 Create session cache store for managing session data
  - Create `src/lib/modules/session/stores/sessionCacheStore.js`
  - Implement writable store with state: `{ sessions: [], pagination: null, loading: false, error: null }`
  - Implement actions: `setSessions`, `appendSessions`, `setLoading`, `setError`, `clear`
  - Support infinite scroll by appending new sessions
  - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9_

- [ ]\* 7.2 Write unit tests for session cache store
  - Create `tests/unit/session/sessionCacheStore.test.js`
  - Test initial state
  - Test setSessions (replace)
  - Test appendSessions (infinite scroll)
  - Test loading and error states
  - Test clear action
  - _Requirements: 7.5, 7.6, 7.7_

---

## Phase 3: UI Components

### Task 8: Command Badge Component

- [ ] 8.1 Create CommandBadge component
  - Create `src/lib/modules/session/components/CommandBadge.svelte`
  - Props: `commandType`, `size` ('primary' | 'secondary'), `highlighted` (boolean)
  - Display emoji icon and localized command name
  - Apply color scheme from design (9 distinct colors for command types)
  - Support primary (32px) and secondary (24px) sizes
  - Add hover effects and transitions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8_

- [ ] 8.2 Add accessibility features to CommandBadge
  - Add ARIA labels for screen readers
  - Ensure color contrast meets WCAG AA standards (4.5:1 for text)
  - Support keyboard focus indicators
  - _Requirements: 8.1, 8.2, 8.3_

### Task 9: Enhanced Session Card Component

- [ ] 9.1 Create EnhancedSessionCard component
  - Create `src/lib/modules/session/components/EnhancedSessionCard.svelte`
  - Props: `session`, `highlightedCommands` (array)
  - Display mode badge (FUN/LEARN) in top-right corner
  - Display command badges in top-left (primary + secondary)
  - Display title (bold), preview text, date/time, message count
  - Apply hover effects (scale 1.02, shadow elevation, border color change)
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 4.1, 4.2, 4.5_

- [ ] 9.2 Add click handler and accessibility to session card
  - Emit click event for navigation
  - Add ARIA role="article" and aria-label
  - Support keyboard navigation (tabindex, Enter/Space)
  - Add focus indicators
  - _Requirements: 8.1, 8.2, 8.5_

- [ ]\* 9.3 Write component tests for EnhancedSessionCard
  - Create `tests/unit/session/EnhancedSessionCard.test.js`
  - Test rendering with various session data
  - Test command badge display (primary, secondary, multiple)
  - Test mode badge display
  - Test preview text truncation
  - Test click event emission
  - Test highlighted commands styling
  - _Requirements: 3.1, 3.2, 3.3, 4.1_

### Task 10: Search Input Component

- [ ] 10.1 Create SearchInput component with debouncing
  - Create `src/lib/modules/session/components/SearchInput.svelte`
  - Props: `value`, `placeholder`, `debounceMs` (default: 300)
  - Implement debounced input handling (300ms delay)
  - Add search icon and clear button
  - Emit `search` event with debounced value
  - _Requirements: 2.1, 2.2, 2.5, 7.2_

- [ ] 10.2 Add accessibility to SearchInput
  - Add ARIA role="searchbox" and aria-label
  - Support keyboard shortcuts (/ to focus)
  - Add aria-describedby for help text
  - _Requirements: 8.1, 8.2_

### Task 11: Date Range Filter Component

- [ ] 11.1 Create DateRangeFilter dropdown component
  - Create `src/lib/modules/session/components/DateRangeFilter.svelte`
  - Display dropdown with predefined options: Last Hour, Last Day, Last Week, Last Month, Last Year, All Time
  - Show currently selected range
  - Emit `change` event when selection changes
  - _Requirements: 1.1, 1.2, 1.5_

- [ ] 11.2 Add accessibility to DateRangeFilter
  - Add ARIA labels and roles
  - Support keyboard navigation (arrow keys, Enter, Escape)
  - Add focus indicators
  - _Requirements: 8.1, 8.2_

### Task 12: Command Filter Panel Component

- [ ] 12.1 Create CommandFilterPanel modal/drawer component
  - Create `src/lib/modules/session/components/CommandFilterPanel.svelte`
  - Props: `isOpen`, `selectedCommands`, `language`
  - Display checkboxes for all command types with emoji icons
  - Include "All Commands" option to clear selection
  - Add Apply and Clear buttons
  - Emit `apply` and `close` events
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12.2 Add accessibility to CommandFilterPanel
  - Implement focus trap when modal is open
  - Return focus to trigger button on close
  - Support Escape key to close
  - Add ARIA labels and roles
  - Support keyboard navigation within panel
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 12.3 Style CommandFilterPanel for mobile and desktop
  - Modal overlay on mobile (full screen)
  - Dropdown panel on desktop (positioned below button)
  - Smooth open/close animations
  - _Requirements: 5.1_

### Task 13: Active Filters Display Component

- [ ] 13.1 Create ActiveFiltersDisplay component
  - Create `src/lib/modules/session/components/ActiveFiltersDisplay.svelte`
  - Props: `filters` (from filterStore)
  - Display removable filter tags for active filters
  - Show "Clear all" button when multiple filters active
  - Emit `removeFilter` and `clearAll` events
  - _Requirements: 6.3, 6.6, 6.7_

- [ ] 13.2 Add accessibility to ActiveFiltersDisplay
  - Add ARIA labels for filter tags
  - Support keyboard navigation (Tab, Enter, Delete)
  - Announce filter changes to screen readers
  - _Requirements: 8.1, 8.2, 8.4_

### Task 14: Session Toolbar Component

- [ ] 14.1 Create SessionToolbar component
  - Create `src/lib/modules/session/components/SessionToolbar.svelte`
  - Integrate SearchInput, DateRangeFilter, and CommandFilterButton
  - Display active filter count badge on Filters button
  - Manage filter panel open/close state
  - _Requirements: 1.1, 2.1, 5.1, 5.6_

- [ ] 14.2 Connect toolbar to filter store
  - Subscribe to filterStore
  - Update store on filter changes
  - Display activeFilterCount on Filters button
  - _Requirements: 6.2, 6.4_

---

## Phase 4: Page Integration

### Task 15: Infinite Scroll Implementation

- [ ] 15.1 Implement Intersection Observer for infinite scroll
  - Add scroll trigger element at bottom of session list
  - Use Intersection Observer API to detect when trigger is visible
  - Load next page when trigger intersects viewport
  - Prevent multiple simultaneous loads
  - _Requirements: 7.5, 7.6, 7.7_

- [ ] 15.2 Add loading states for infinite scroll
  - Display spinner at bottom while loading more sessions
  - Show "End of list" message when all sessions loaded
  - Handle loading errors gracefully
  - _Requirements: 7.7, 7.9_

### Task 16: Update Sessions Page with New Components

- [ ] 16.1 Integrate new components into sessions page
  - Update `src/routes/sessions/+page.svelte`
  - Replace existing toolbar with SessionToolbar component
  - Add ActiveFiltersDisplay below toolbar
  - Replace session cards with EnhancedSessionCard components
  - Add infinite scroll trigger element
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.6, 7.5_

- [ ] 16.2 Connect page to stores and API
  - Subscribe to filterStore and sessionCacheStore
  - Fetch sessions on mount and filter changes
  - Implement fetchSessions function using enhanced API endpoint
  - Implement loadMoreSessions for infinite scroll
  - Clear cache when filters change
  - _Requirements: 6.1, 6.4, 7.5, 7.6, 7.8_

- [ ] 16.3 Handle filter changes and state updates
  - Clear sessions and reset page when filters change
  - Append sessions for infinite scroll
  - Update loading and error states
  - Maintain scroll position on navigation return
  - _Requirements: 6.1, 6.5, 7.8, 7.10_

### Task 17: Empty States and Error Handling

- [ ] 17.1 Create empty state components
  - Display "No sessions found" when search/filters return no results
  - Show "Clear filters" button in empty state
  - Display appropriate messages for different scenarios
  - _Requirements: 2.7, 6.3_

- [ ] 17.2 Implement error handling and recovery
  - Display error banner for API failures
  - Show retry button for failed requests
  - Handle network errors gracefully
  - Log errors for debugging
  - _Requirements: 2.7, 7.3_

---

## Phase 5: Internationalization and Accessibility

### Task 18: Internationalization

- [ ] 18.1 Add translation keys for new UI elements
  - Update `src/lib/i18n/translations.json` with sessions page translations
  - Add translations for: search placeholder, filter labels, date ranges, command names, empty states, loading messages
  - Support en, ru, es languages
  - _Requirements: 5.11, 8.4_

- [ ] 18.2 Integrate translations into components
  - Use translation service in all components
  - Display command labels in user's interface language
  - Localize date/time formats
  - _Requirements: 5.10, 5.11_

### Task 19: Accessibility Enhancements

- [ ] 19.1 Add screen reader announcements
  - Implement live regions for filter changes
  - Announce search results count
  - Announce loading states
  - Announce errors
  - _Requirements: 8.4_

- [ ] 19.2 Verify keyboard navigation
  - Test Tab navigation through all interactive elements
  - Test Enter/Space activation
  - Test Escape to close modals
  - Test arrow keys in dropdowns
  - Test / shortcut to focus search
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 19.3 Verify color contrast and focus indicators
  - Test all command badge colors for WCAG AA compliance
  - Ensure visible focus indicators on all interactive elements
  - Test with screen reader (VoiceOver/NVDA)
  - _Requirements: 8.3, 8.5_

---

## Phase 6: Testing and Polish

### Task 20: Integration Testing

- [ ]\* 20.1 Write integration tests for filter combinations
  - Create `tests/integration/session/filter-combinations.test.js`
  - Test search + date range combination
  - Test search + commands combination
  - Test date range + commands combination
  - Test all filters combined
  - Test filter state persistence
  - _Requirements: 6.1, 6.4, 6.5_

### Task 21: End-to-End Testing

- [ ]\* 21.1 Write E2E test for basic session browsing
  - Create `tests/e2e/sessions/browsing.test.js`
  - Test loading sessions page
  - Test session display
  - Test infinite scroll
  - Test clicking session to navigate
  - _Requirements: 7.5, 7.6_

- [ ]\* 21.2 Write E2E test for search functionality
  - Create `tests/e2e/sessions/search.test.js`
  - Test entering search query
  - Test filtered results display
  - Test clearing search
  - Test empty search results
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

- [ ]\* 21.3 Write E2E test for filtering
  - Create `tests/e2e/sessions/filtering.test.js`
  - Test date range filtering
  - Test command filtering (single and multiple)
  - Test removing individual filter tags
  - Test clearing all filters
  - Test combined filtering
  - _Requirements: 1.1, 1.2, 1.3, 5.4, 5.5, 6.6, 6.7_

### Task 22: Performance Optimization

- [ ] 22.1 Optimize database queries
  - Verify indexes are being used (EXPLAIN ANALYZE)
  - Optimize message inclusion for command extraction
  - Add query result caching if needed
  - _Requirements: 7.1, 7.2_

- [ ] 22.2 Optimize client-side performance
  - Implement component lazy loading
  - Optimize re-renders with reactive statements
  - Measure and optimize filter application time (< 500ms)
  - Test with large session lists (100+ sessions)
  - _Requirements: 7.1, 7.2, 7.4_

- [ ]\* 22.3 Write performance tests
  - Create `tests/performance/sessions-load.test.js`
  - Measure initial page load time (< 2 seconds)
  - Measure filter application time (< 500ms)
  - Measure infinite scroll smoothness
  - _Requirements: 7.1, 7.2, 7.4_

### Task 23: Visual Polish and Animations

- [ ] 23.1 Add loading skeletons
  - Create skeleton loaders for session cards
  - Display during initial load
  - Smooth transition to actual content
  - _Requirements: 7.3_

- [ ] 23.2 Add smooth transitions and animations
  - Animate filter panel open/close
  - Animate session card hover effects
  - Animate filter tag additions/removals
  - Ensure 200ms transition duration
  - _Requirements: 7.4_

- [ ] 23.3 Responsive design adjustments
  - Test on mobile (320px - 768px)
  - Test on tablet (768px - 1024px)
  - Test on desktop (1024px+)
  - Adjust grid layouts and spacing
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

---

## Phase 7: Documentation and Deployment

### Task 24: Documentation

- [ ] 24.1 Document new components and services
  - Add JSDoc comments to all new files
  - Document component props and events
  - Document service methods and parameters
  - Add usage examples
  - _Requirements: All_

- [ ] 24.2 Update user-facing documentation
  - Document new filtering features
  - Document command badges
  - Document keyboard shortcuts
  - Create troubleshooting guide
  - _Requirements: All_

### Task 25: Deployment Preparation

- [ ] 25.1 Run full test suite
  - Execute all unit tests
  - Execute all integration tests
  - Execute all E2E tests
  - Verify test coverage (80%+ target)
  - _Requirements: All_

- [ ] 25.2 Code quality checks
  - Run ESLint and fix issues
  - Run Prettier and format code
  - Check for console.log statements
  - Review error handling
  - _Requirements: All_

- [ ] 25.3 Create deployment checklist
  - Verify database migrations are ready
  - Verify environment variables are set
  - Create rollback plan
  - Document deployment steps
  - _Requirements: All_

---

## Notes

- **Optional tasks** (marked with \*) focus on testing and can be skipped for faster MVP delivery
- Each task builds incrementally on previous tasks
- All tasks reference specific requirements from requirements.md
- Backend tasks (Phase 1) should be completed before UI tasks (Phase 3)
- State management (Phase 2) bridges backend and UI
- Testing (Phase 6) validates the complete implementation
