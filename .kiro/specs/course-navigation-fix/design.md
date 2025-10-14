# Design Document

## Overview

This design addresses the course navigation issue by implementing proper mode parameter mapping between the UI app mode and API calls, creating dynamic course routes, and ensuring seamless navigation from the my-courses page to individual course learning interfaces.

## Architecture

The solution involves three main components:

1. **Mode Parameter Mapping**: A utility function that maps UI app modes to valid API mode parameters
2. **Dynamic Course Routes**: New route handlers for individual course pages under `/learn/[courseId]`
3. **Session Store Enhancement**: Updated session loading logic to use proper mode mapping

## Components and Interfaces

### Mode Mapping Utility

```javascript
// src/lib/utils/modeMapping.js
export function getApiModeFromAppMode(appMode) {
  switch (appMode) {
    case 'catalogue':
    case 'learn':
      return 'learn';
    case 'fun':
    default:
      return 'fun';
  }
}
```

### Dynamic Course Route Structure

```
src/routes/learn/[courseId]/
├── +page.svelte          # Course learning interface
├── +page.server.js       # Server-side course data loading
└── progress/
    └── +page.svelte      # Course progress page
```

### Session Store Enhancement

The session store will be updated to use the mode mapping utility when making API calls, ensuring that 'catalogue' app mode translates to 'learn' API mode.

### Course Learning Page Component

A new course learning page that:
- Loads course-specific data
- Sets appropriate app mode
- Initializes session with correct parameters
- Provides fallback for invalid course IDs

## Data Models

### Course Context Interface

```typescript
interface CourseContext {
  courseId: string;
  course: Course | null;
  isValidCourse: boolean;
  sessionMode: 'learn' | 'fun';
  appMode: 'catalogue' | 'learn' | 'fun';
}
```

### Navigation State

```typescript
interface NavigationState {
  fromMyCourses: boolean;
  targetCourseId: string | null;
  redirectPath: string | null;
}
```

## Error Handling

### Invalid Course ID Handling

1. Check if course exists in the courses store
2. If not found, redirect to catalogue with error message
3. Log the invalid access attempt for debugging

### API Mode Parameter Validation

1. Always use mode mapping utility before API calls
2. Add validation in session store to prevent invalid modes
3. Provide clear error messages for debugging

### Navigation Error Recovery

1. Catch navigation errors and provide fallback routes
2. Preserve user context when possible
3. Show user-friendly error messages

## Testing Strategy

### Unit Tests

1. Mode mapping utility tests for all app mode combinations
2. Session store tests with mocked API responses
3. Course validation logic tests

### Integration Tests

1. End-to-end navigation flow from my-courses to course learning
2. API parameter validation tests
3. Error handling and recovery scenarios

### User Experience Tests

1. Navigation timing and performance
2. Error message clarity and helpfulness
3. Bookmark and direct URL access functionality

## Implementation Approach

### Phase 1: Mode Mapping Fix
- Create mode mapping utility
- Update session store to use mapping
- Test API calls with correct parameters

### Phase 2: Dynamic Course Routes
- Create course-specific route handlers
- Implement course validation and loading
- Add error handling and redirects

### Phase 3: Navigation Enhancement
- Update my-courses page navigation
- Implement progress page routing
- Add bookmark support and direct access

## Security Considerations

1. Validate course access permissions
2. Ensure user authentication for course-specific routes
3. Prevent unauthorized access to private courses
4. Sanitize course ID parameters to prevent injection attacks

## Performance Considerations

1. Cache course data to reduce API calls
2. Implement lazy loading for course content
3. Optimize route transitions for smooth user experience
4. Consider preloading course data on my-courses page