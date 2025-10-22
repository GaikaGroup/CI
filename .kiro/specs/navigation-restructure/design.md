# Navigation Restructure Design

## Overview

This design document outlines the implementation of a role-based navigation system that clearly separates Student and Tutor functionality while maintaining the existing Fun mode for experimental AI interactions.

## Architecture

### Navigation Structure

```
Header Navigation:
┌─────────────────────────────────────────────────────────────────┐
│ [🎲 Fun] [🎓 Student] [👨‍🏫 Tutor] [Sessions] [Console ▼] [User ▼] │
└─────────────────────────────────────────────────────────────────┘
```

### Page Structure

#### Student Page (`/student`)

```
┌─────────────────────────────────────────────────────────────┐
│ Student Dashboard                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Browse Courses] [My Learning] [Progress]               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Tab Content Area                                            │
└─────────────────────────────────────────────────────────────┘
```

#### Tutor Page (`/tutor`)

```
┌─────────────────────────────────────────────────────────────┐
│ Tutor Dashboard                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [My Courses] [Create Course] [Analytics] [Students]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Tab Content Area                                            │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Navigation Component Updates

#### Header Navigation (`src/lib/components/Header.svelte`)

- Replace existing navigation items
- Add badge support for Student/Tutor counts
- Implement active state highlighting
- Add responsive mobile menu

#### Student Dashboard (`src/routes/student/+page.svelte`)

- Tab-based interface
- Browse Courses tab (existing catalogue functionality)
- My Learning tab (enrolled courses)
- Progress tab (learning statistics)

#### Tutor Dashboard (`src/routes/tutor/+page.svelte`)

- Tab-based interface
- My Courses tab (authored courses)
- Create Course tab (course creation)
- Analytics tab (course statistics)
- Students tab (enrolled students)

### Data Models

#### Navigation State Store

```javascript
// src/lib/stores/navigation.js
export const navigationStore = writable({
  currentMode: 'fun', // 'fun' | 'student' | 'tutor'
  studentCourseCount: 0,
  tutorCourseCount: 0,
  badges: {
    student: 0,
    tutor: 0
  }
});
```

#### Role-based Course Filtering

```javascript
// Enhanced course store methods
export const courseStore = {
  // Existing methods...
  getEnrolledCourses(userId),
  getAuthoredCourses(userId),
  getUserRoleInCourse(userId, courseId), // 'student' | 'author' | 'both'
  canUserEnrollInOwnCourse(userId, courseId)
};
```

### Routing Structure

```
/student
├── /student (default: Browse Courses tab)
├── /student?tab=browse
├── /student?tab=learning
└── /student?tab=progress

/tutor
├── /tutor (default: My Courses tab)
├── /tutor?tab=courses
├── /tutor?tab=create
├── /tutor?tab=analytics
└── /tutor?tab=students

Legacy Redirects:
/catalogue → /student?tab=browse
/my-subjects → /student?tab=learning
/my-courses → /tutor?tab=courses
```

## Error Handling

### Navigation Error States

- Handle missing permissions gracefully
- Provide fallback navigation for unauthorized access
- Display appropriate error messages for failed course operations

### Data Loading States

- Show loading indicators during course data fetching
- Handle empty states for each tab
- Provide retry mechanisms for failed requests

## Testing Strategy

### Unit Tests

- Navigation component rendering
- Badge count calculations
- Tab switching functionality
- Route handling and redirects

### Integration Tests

- Student dashboard functionality
- Tutor dashboard functionality
- Cross-role course enrollment
- Navigation state persistence

### E2E Tests

- Complete user journey: Fun → Student → Tutor
- Course creation and enrollment flow
- Mobile navigation functionality
- Badge updates and real-time counts

## Performance Considerations

### Lazy Loading

- Load tab content only when accessed
- Implement virtual scrolling for large course lists
- Cache course data to minimize API calls

### State Management

- Efficient badge count updates
- Minimize re-renders during navigation
- Optimize course filtering operations

## Accessibility

### Keyboard Navigation

- Full keyboard support for all navigation elements
- Proper tab order and focus management
- ARIA labels for screen readers

### Visual Indicators

- High contrast mode support
- Clear visual hierarchy
- Consistent iconography and labeling

## Mobile Design

### Responsive Navigation

- Collapsible hamburger menu for mobile
- Touch-friendly tab interface
- Optimized spacing and sizing

### Mobile-specific Features

- Swipe gestures for tab navigation
- Pull-to-refresh functionality
- Optimized course card layouts

## Migration Strategy

### Phase 1: New Routes and Components

- Create new Student and Tutor pages
- Implement tab-based interfaces
- Add navigation badges

### Phase 2: Header Navigation Update

- Update main navigation component
- Add role-based styling
- Implement responsive design

### Phase 3: Legacy Route Handling

- Add redirect logic for old routes
- Update internal links
- Test backward compatibility

### Phase 4: Cleanup

- Remove old navigation items
- Clean up unused components
- Update documentation
