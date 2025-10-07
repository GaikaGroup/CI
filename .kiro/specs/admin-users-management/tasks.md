# Implementation Plan

- [x] 1. Create Console Dropdown Component
  - Create `src/lib/modules/navigation/components/ConsoleDropdown.svelte` component
  - Implement dropdown toggle functionality (open/close on click)
  - Add dropdown menu with Users, Finance, Analytics links
  - Implement active page detection using $page store
  - Add highlighting for Console button when on /admin/\* routes
  - Add highlighting for current page within dropdown
  - Style component to match existing navigation design patterns
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 2. Update Navigation Component
  - Import ConsoleDropdown component in `src/lib/modules/navigation/components/Navigation.svelte`
  - Replace individual Finance and Analytics links with ConsoleDropdown
  - Add conditional rendering: show ConsoleDropdown only when `$user?.role === 'admin'`
  - Update desktop navigation to include ConsoleDropdown
  - Update mobile navigation to include ConsoleDropdown
  - Test navigation visibility for admin and non-admin users
  - _Requirements: 4.1, 5.1, 5.2_

- [x] 3. Create Users API Endpoint
  - Create `src/routes/api/admin/users/+server.js` file
  - Implement GET handler function
  - Add admin authentication check (verify user.role === 'admin')
  - Query Prisma database to group sessions by userId
  - Aggregate session count and message count per user
  - Calculate registration date (earliest session createdAt) per user
  - Calculate total users and total sessions statistics
  - Format response with users array and statistics object
  - Add error handling for database queries
  - Return JSON response
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.3_

- [x] 4. Create Users Page Server Load Function
  - Create `src/routes/admin/users/+page.server.js` file
  - Implement load function
  - Get user from locals or cookies (follow Finance page pattern)
  - Verify user exists and has admin role
  - Redirect to login if not authenticated
  - Redirect to home if not admin
  - Fetch user data from `/api/admin/users` endpoint
  - Handle fetch errors gracefully
  - Return data object with user, users array, statistics, and error message
  - _Requirements: 5.3, 5.4_

- [x] 5. Create Users Page Component
  - Create `src/routes/admin/users/+page.svelte` file
  - Add page title and description header
  - Display summary statistics cards (total users, total sessions)
  - Create search input field
  - Implement client-side search state (searchQuery)
  - Implement filtered users computation based on search
  - Create user table with columns: Email, Registration Date, Sessions, Messages
  - Sort users by registration date descending
  - Add loading state indicator
  - Add error message display
  - Add "no results found" message for empty search
  - Style page to match Finance and Analytics pages
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 6. Write Unit Tests for Users API
  - Create `tests/unit/api/users-endpoints.test.js` file
  - Test GET /api/admin/users returns user data
  - Test user data aggregation logic
  - Test statistics calculation
  - Test admin authorization (reject non-admin)
  - Test error handling for database failures
  - Mock Prisma client for tests
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 5.3_

- [x] 7. Write Unit Tests for Console Dropdown
  - Create `tests/unit/navigation/ConsoleDropdown.test.js` file
  - Test dropdown opens and closes on click
  - Test active page highlighting for Console button
  - Test active page highlighting within dropdown
  - Test navigation links render correctly
  - Test component renders Users, Finance, Analytics links
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 8. Write Unit Tests for Users Page
  - Create `tests/unit/admin/UsersPage.test.js` file
  - Test page renders user table with data
  - Test search filtering functionality
  - Test statistics display
  - Test loading state display
  - Test error state display
  - Test "no results found" message
  - Test sorting by registration date
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 9. Write Integration Tests
  - Create `tests/integration/admin/UsersPageFlow.test.js` file
  - Test full page load with server data
  - Test search functionality end-to-end
  - Test navigation from Console dropdown to Users page
  - Test admin access control (admin can access, non-admin cannot)
  - Test error handling when API fails
  - _Requirements: 1.1, 2.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [x] 10. Write E2E Tests for Console Navigation
  - Create `tests/e2e/admin/ConsoleNavigation.test.js` file
  - Test Console dropdown visible for admin users
  - Test Console dropdown hidden for non-admin users
  - Test navigation between Users, Finance, Analytics pages
  - Test active page highlighting in Console dropdown
  - Test Console dropdown works on mobile view
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_
