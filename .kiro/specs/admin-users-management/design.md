# Design Document

## Overview

This design document outlines the implementation of the Users page within the Console section of the admin dashboard. The Console section provides a unified administrative interface that includes Users, Finance, and Analytics pages. The Users page will display user information retrieved from session data, following the same architectural patterns as the existing Finance and Analytics pages.

Since the application currently uses a mock authentication system without a dedicated User database table, the Users page will aggregate user data from the Session and Message tables in the Prisma schema.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Navigation Component                  │
│  (Shows Console links only for users with admin role)   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   /admin/users Route                     │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         +page.server.js                          │   │
│  │  - Verify admin role                             │   │
│  │  - Fetch user data from API                      │   │
│  └─────────────────────────────────────────────────┘   │
│                            │                             │
│                            ▼                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │         +page.svelte                             │   │
│  │  - Display user statistics                       │   │
│  │  - Render user table                             │   │
│  │  - Handle search                                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              /api/admin/users Endpoint                   │
│                                                           │
│  - Query sessions grouped by userId                      │
│  - Aggregate session and message counts                  │
│  - Return user list with statistics                      │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. Admin navigates to `/admin/users`
2. Server-side load function verifies admin role
3. Server fetches user data from `/api/admin/users` endpoint
4. API endpoint queries Prisma database to aggregate user data from sessions
5. Data is returned to page component
6. Page component renders user table with search functionality

## Components and Interfaces

### 1. Navigation Component Update

**File:** `src/lib/modules/navigation/components/Navigation.svelte`

**Changes:**
- Replace individual Finance and Analytics links with a Console dropdown component
- Show Console dropdown only when `$user?.role === 'admin'`
- Import and use `ConsoleDropdown.svelte` component

**Desktop Navigation Structure:**
```
[Console ▼]
  ├─ Users
  ├─ Finance
  └─ Analytics
```

**Mobile Navigation Structure:**
```
[Console] (expandable)
  - Users
  - Finance
  - Analytics
```

### 1.1 Console Dropdown Component

**File:** `src/lib/modules/navigation/components/ConsoleDropdown.svelte`

**Responsibilities:**
- Display "Console" button in navigation
- Show dropdown menu on click/hover
- Highlight Console button when on any /admin/* page
- Highlight current page within dropdown
- Handle navigation to Users, Finance, Analytics pages
- Close dropdown after navigation (mobile)

**Props:**
- None (uses $page store to determine active route)

**State:**
- `isOpen` - Boolean for dropdown visibility
- `currentPath` - Derived from $page.url.pathname

### 2. Users Page Component

**File:** `src/routes/admin/users/+page.svelte`

**Responsibilities:**
- Display page header with title and description
- Show summary statistics (total users, total sessions)
- Render user table with columns: Email, Registration Date, Sessions, Messages
- Implement client-side search filtering by email
- Handle loading and error states
- Display notifications for errors

**Props from Server:**
- `data.user` - Current admin user object
- `data.users` - Array of user objects with statistics
- `data.statistics` - Summary statistics object
- `data.error` - Error message if data fetch failed

**State:**
- `searchQuery` - Current search input value
- `filteredUsers` - Computed list of users matching search

### 3. Server Load Function

**File:** `src/routes/admin/users/+page.server.js`

**Responsibilities:**
- Verify user is authenticated and has admin role
- Fetch user data from API endpoint
- Handle errors gracefully
- Return data to page component

**Implementation Pattern:**
```javascript
export const load = async ({ locals, cookies, fetch, url }) => {
  // 1. Get user from locals or cookies
  // 2. Verify user.role === 'admin', redirect if not
  // 3. Fetch from /api/admin/users
  // 4. Return { user, users, statistics, error }
}
```

### 4. Users API Endpoint

**File:** `src/routes/api/admin/users/+server.js`

**Responsibilities:**
- Verify admin authentication
- Query database for user data
- Aggregate statistics from sessions and messages
- Return JSON response

**Response Format:**
```json
{
  "users": [
    {
      "userId": "string",
      "email": "string",
      "registrationDate": "ISO date string",
      "sessionCount": number,
      "messageCount": number
    }
  ],
  "statistics": {
    "totalUsers": number,
    "totalSessions": number
  }
}
```

## Data Models

### User Data Structure (Derived)

Since there's no User table, user data is derived from Session records:

```typescript
interface UserData {
  userId: string;           // From Session.userId
  email: string;            // Derived from userId (mock auth uses email as identifier)
  registrationDate: Date;   // Earliest Session.createdAt for this userId
  sessionCount: number;     // Count of sessions for this userId
  messageCount: number;     // Sum of Session.messageCount for this userId
}
```

### Statistics Structure

```typescript
interface Statistics {
  totalUsers: number;       // Distinct count of userId in sessions
  totalSessions: number;    // Total count of all sessions
}
```

### Database Queries

**Get All Users with Statistics:**
```javascript
// Group sessions by userId
const sessions = await prisma.session.groupBy({
  by: ['userId'],
  _count: {
    id: true
  },
  _sum: {
    messageCount: true
  },
  _min: {
    createdAt: true
  }
});

// Transform to user data
const users = sessions.map(s => ({
  userId: s.userId,
  email: s.userId, // In mock auth, userId is the email
  registrationDate: s._min.createdAt,
  sessionCount: s._count.id,
  messageCount: s._sum.messageCount || 0
}));
```

**Get Statistics:**
```javascript
const totalSessions = await prisma.session.count();
const distinctUsers = await prisma.session.findMany({
  distinct: ['userId'],
  select: { userId: true }
});
const totalUsers = distinctUsers.length;
```

## Error Handling

### Server-Side Errors

1. **Authentication Failure:**
   - Redirect to `/login?redirect=/admin/users`

2. **Authorization Failure:**
   - Redirect to home page

3. **Database Query Failure:**
   - Return error message to page
   - Display user-friendly error in UI

### Client-Side Errors

1. **Data Load Failure:**
   - Display error message banner
   - Show "Unable to load users" message

2. **Empty State:**
   - Display "No users found" when no data exists
   - Display "No results found" when search returns empty

## Testing Strategy

### Unit Tests

1. **API Endpoint Tests** (`tests/unit/api/users-endpoints.test.js`)
   - Test user data aggregation logic
   - Test statistics calculation
   - Test error handling
   - Test admin authorization

2. **Page Component Tests** (`tests/unit/admin/UsersPage.test.js`)
   - Test search filtering
   - Test table rendering
   - Test loading states
   - Test error states

### Integration Tests

1. **Users Page Flow** (`tests/integration/admin/UsersPageFlow.test.js`)
   - Test full page load with data
   - Test search functionality
   - Test navigation between Console pages
   - Test admin access control

### E2E Tests

1. **Console Navigation** (`tests/e2e/admin/ConsoleNavigation.test.js`)
   - Test Console visibility for admin users
   - Test Console hidden for non-admin users
   - Test navigation between Users, Finance, Analytics

## UI Design

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Console                                                 │
│  Users                                                   │
│  View and monitor user accounts in the system           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Total Users     │  │ Total Sessions  │             │
│  │ 42              │  │ 156             │             │
│  └─────────────────┘  └─────────────────┘             │
├─────────────────────────────────────────────────────────┤
│  Search: [________________]                             │
├─────────────────────────────────────────────────────────┤
│  Email          Registration    Sessions    Messages    │
│  ─────────────────────────────────────────────────────  │
│  user@email.com  2025-01-15     5          23          │
│  admin@test.com  2025-01-10     12         89          │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Styling

- Follow existing admin page patterns (Finance, Analytics)
- Use Tailwind CSS classes consistent with the application
- Dark mode support using existing theme system
- Responsive table with horizontal scroll on smaller screens

### Console Navigation

**Desktop:** Dropdown menu in main navigation
```
[Console ▼]
  Users
  Finance
  Analytics
```

**Mobile:** Expandable section in mobile menu
```
> Console
  - Users
  - Finance
  - Analytics
```

## Implementation Notes

### Console Navigation Implementation

The Console navigation will be implemented as a dropdown component:

**Implementation Approach:**
- Create a new `ConsoleDropdown.svelte` component
- Similar pattern to `MyCoursesDropdown.svelte`
- Shows Users, Finance, Analytics as dropdown items
- Highlights the Console button when on any Console page
- Highlights the current page within the dropdown

**Component Structure:**
```svelte
<ConsoleDropdown>
  - Console button (highlighted when on /admin/*)
  - Dropdown menu:
    - Users (highlighted when on /admin/users)
    - Finance (highlighted when on /admin/finance)
    - Analytics (highlighted when on /admin/analytics)
</ConsoleDropdown>
```

### Data Aggregation Performance

For applications with many users:
- Consider adding pagination (50 users per page)
- Add database indexes on `userId` and `createdAt` fields
- Cache statistics for better performance

Current implementation assumes moderate user count (<1000 users) where full table load is acceptable.

### Future Enhancements

Features intentionally excluded from this design but could be added later:
- User detail modal/page
- User account status management
- Advanced filtering (date range, activity level)
- Data export (CSV/JSON)
- Pagination for large user lists
- User activity timeline
