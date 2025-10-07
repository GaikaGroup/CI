# Session Components

This directory contains UI components for the session management feature.

## Components

### SessionsList.svelte

A comprehensive sidebar component for displaying and managing user sessions.

#### Features

- **Session List Display**: Shows all user sessions with metadata (title, preview, date, mode, language, message count)
- **Real-time Search**: Debounced search input (300ms) that filters sessions by title and preview content
- **Session Selection**: Click to select sessions with visual highlighting
- **New Session Creation**: Modal dialog for creating new sessions with mode and language selection
- **Session Management**: Inline editing of session titles and deletion with confirmation
- **Pagination**: Support for navigating through multiple pages of sessions
- **Empty States**: Helpful messages when no sessions exist or search returns no results
- **Loading States**: Skeleton loaders during data fetching
- **Error Handling**: User-friendly error messages with retry functionality

#### Props

```typescript
{
  selectedSessionId?: string | null  // ID of the currently selected session
}
```

#### Usage

```svelte
<script>
  import { SessionsList } from '$lib/modules/session/components';

  let selectedSessionId = null;
</script>

<SessionsList bind:selectedSessionId />
```

#### Requirements Fulfilled

- **Requirement 1.1**: Display sidebar with all user sessions
- **Requirement 1.2**: Real-time search with debounced filtering
- **Requirement 1.3**: Session selection and highlighting
- **Requirement 1.4**: Empty state handling
- **Requirement 1.5**: Session sorting by most recent first
- **Requirement 2.1**: New session creation with mode/language selection

#### Session Metadata Display

Each session in the list shows:

- **Title**: Session name (editable inline)
- **Preview**: First few lines of conversation (if available)
- **Date**: Relative time (e.g., "2h ago", "3d ago")
- **Message Count**: Number of messages in the session
- **Mode**: Fun or Learn mode with icon
- **Language**: Language code (EN, RU, ES, etc.)

#### Keyboard Support

- **Enter**: Save edited session title
- **Escape**: Cancel editing / Close modals
- **Tab**: Navigate between interactive elements

#### Accessibility

- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Focus management for modals
- Clear visual focus indicators

#### Styling

The component uses Tailwind CSS with dark mode support:

- Light theme: Stone color palette
- Dark theme: Gray color palette
- Accent color: Amber (amber-600)
- Responsive design for mobile, tablet, and desktop

#### State Management

The component integrates with:

- `sessionStore`: Main session state management
- `isSessionLoading`: Loading state
- `sessionError`: Error state
- `user`: Current authenticated user

#### Events

The component handles:

- Session selection (updates `selectedSessionId` prop)
- Session creation (navigates to `/sessions/{id}`)
- Session updates (title editing)
- Session deletion (with confirmation)
- Search input (debounced)
- Pagination (next/previous page)

#### Error Handling

- Network errors: Retry button with error message
- Validation errors: Inline feedback
- Empty states: Helpful guidance
- Loading states: Skeleton loaders

#### Performance

- Debounced search (300ms delay)
- Pagination (20 sessions per page by default)
- Optimistic UI updates
- Efficient re-rendering with Svelte reactivity

## Testing

Tests are located in:

- `tests/unit/session/SessionsList.test.js` - Unit tests
- `tests/integration/session/SessionsList.integration.test.js` - Integration tests

Run tests with:

```bash
npm test -- SessionsList
```

## Future Enhancements

Potential improvements for future iterations:

- Drag and drop to reorder sessions
- Bulk operations (delete multiple sessions)
- Session tags/categories
- Advanced filtering (by date range, message count, etc.)
- Session export functionality
- Session sharing capabilities
