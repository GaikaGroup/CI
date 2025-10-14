# Terminology Migration: Subject → Course

This document outlines the migration from "subject" to "course" terminology throughout the application.

## Overview

As part of the session management restructure, we've updated the terminology to be more consistent and user-friendly:

- **Subject** → **Course**
- All related UI text, API endpoints, and documentation have been updated
- Backward compatibility is maintained through aliases and dual parameter support

## Changes Made

### 1. Translation Updates

- Updated all language files (`src/lib/modules/i18n/translations.js`)
- Changed translation keys:
  - `learnSelectSubjectHeading` → `learnSelectCourseHeading`
  - `learnSelectSubjectDescription` → `learnSelectCourseDescription`
  - `learnNoSubjects` → `learnNoCourses`
  - `learnCurrentSubject` → `learnCurrentCourse`
  - `learnChangeSubject` → `learnChangeCourse`
- Updated placeholder text in all supported languages (EN, RU, ES)

### 2. Store Migration

- Created new `src/lib/stores/courses.js` with course-focused terminology
- Updated `src/lib/stores/subjects.js` to import from courses.js for backward compatibility
- Maintained all existing functionality with new naming conventions

### 3. UI Component Updates

- Created new `/my-courses` route to replace `/my-subjects`
- Updated catalogue page to use new translation keys
- Updated moderation components to use "course" terminology
- Maintained existing `/my-subjects` route for backward compatibility

### 4. API Updates

- Updated `src/routes/api/chat/+server.js` to use course terminology
- Function `formatSubjectSettings` → `formatCourseSettings`
- Variable `subjectSettings` → `courseSettings`
- Updated exam profile text to use "course" instead of "subject"

### 5. Service Layer Updates

- Updated comments and documentation in service files
- Created new course-focused AgentService in `src/lib/modules/courses/services/`
- Updated parameter names and function signatures where appropriate

## Backward Compatibility

### Store Compatibility

```javascript
// Both of these work:
import { subjectsStore } from '$lib/stores/subjects'; // Legacy
import { coursesStore } from '$lib/stores/courses'; // New

// subjectsStore is an alias for coursesStore
```

### API Compatibility

- API endpoints accept both `subjectId` and `courseId` parameters
- Old function names are aliased to new implementations
- Existing localStorage keys continue to work

### Component Compatibility

- Existing components continue to function without changes
- New components use course terminology
- Translation keys have fallbacks to maintain functionality

## Migration Path

### For Developers

1. **Immediate**: Start using new course terminology in new code
2. **Gradual**: Update existing code to use course terminology when making changes
3. **Future**: Remove subject terminology aliases after transition period

### For Users

1. **Transparent**: Users will see updated terminology immediately
2. **Seamless**: All existing functionality continues to work
3. **Improved**: More consistent and intuitive terminology

## File Changes Summary

### New Files

- `src/lib/stores/courses.js` - New courses store
- `src/routes/my-courses/+page.svelte` - New my-courses page
- `src/lib/modules/courses/services/AgentService.js` - Course-focused agent service
- `migrate_subjects_to_courses.sh` - Migration helper script

### Modified Files

- `src/lib/modules/i18n/translations.js` - Updated translations
- `src/lib/stores/subjects.js` - Now imports from courses.js
- `src/routes/catalogue/+page.svelte` - Updated translation keys
- `src/routes/api/chat/+server.js` - Updated function and variable names
- Various component files - Updated UI text and comments

### Deprecated (but maintained)

- `/my-subjects` route - Still works, but `/my-courses` is preferred
- `subjectsStore` - Still works, but `coursesStore` is preferred
- Old translation keys - Still work with fallbacks

## Testing

All existing tests should continue to pass due to backward compatibility. New tests should use course terminology.

### Key Test Areas

1. **Store functionality** - Ensure both subjects and courses stores work
2. **Translation rendering** - Verify new translation keys display correctly
3. **API endpoints** - Test both old and new parameter names
4. **Navigation** - Ensure both `/my-subjects` and `/my-courses` work
5. **Component rendering** - Verify UI displays course terminology

## Future Considerations

### Phase 2 (Optional)

- Remove backward compatibility aliases
- Deprecate `/my-subjects` route
- Update all remaining internal code to use course terminology
- Migrate localStorage keys to new naming convention

### Database Migration (If Applicable)

If using a database, consider:

- Adding `courseId` columns alongside existing `subjectId` columns
- Gradually migrating data to use course terminology
- Eventually removing subject-related columns

## Rollback Plan

If issues arise, rollback is simple due to maintained backward compatibility:

1. Revert translation files to use subject terminology
2. Update UI components to use old translation keys
3. Continue using subjects store instead of courses store

The migration is designed to be safe and reversible.
