# Sessions Page UX Enhancement - Quick Start Guide

## 🚀 Getting Started

This guide will help you get the enhanced Sessions page up and running.

---

## Prerequisites

- Node.js and npm installed
- PostgreSQL database running
- Prisma configured with DATABASE_URL in `.env`

---

## Installation Steps

### 1. Apply Database Migration

The new indexes need to be added to your database:

```bash
# Apply the migration
npx prisma migrate dev --name add_session_filter_indexes

# Or manually run the SQL
psql -d your_database -f prisma/migrations/20241021_add_session_filter_indexes/migration.sql
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Navigate to Sessions Page

Open your browser and go to:

```
http://localhost:5173/sessions
```

---

## Features Overview

### 🔍 Search

- Type in the search box to filter sessions by title, preview, or message content
- Search is debounced (300ms delay) for better performance
- Press `/` to quickly focus the search box
- Press `Escape` to clear search

### 📅 Date Range Filter

- Click the date filter dropdown
- Select from: Last Hour, Last Day, Last Week, Last Month, Last Year, All Time
- Use arrow keys to navigate options

### ⚡ Command Filter

- Click the "Commands" button to open the filter panel
- Check/uncheck command types to filter sessions
- Use "All Commands" to select/deselect all
- Click "Apply" to apply filters
- Press `Escape` to close panel

### 🏷️ Active Filters

- See all active filters as removable tags
- Click the ✕ on any tag to remove that filter
- Click "Clear all" to remove all filters at once

### 📜 Infinite Scroll

- Scroll down to automatically load more sessions
- Loading indicator appears while fetching
- "No more sessions to load" message when complete

### 🎨 Command Badges

- Each session shows command badges for commands used
- Primary command (first used) is larger
- Secondary commands are smaller
- Hover over badges for smooth animations
- 9 distinct colors for different command types

---

## API Endpoints

### GET /api/sessions

Fetch sessions with filtering and pagination.

**Query Parameters:**

- `search` (string): Search query
- `dateRange` (string): hour, day, week, month, year, all
- `commands` (string): Comma-separated command types (e.g., "solve,explain")
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Example:**

```bash
curl "http://localhost:5173/api/sessions?search=math&dateRange=week&commands=solve,explain&page=1&limit=20"
```

**Response:**

```json
{
  "success": true,
  "sessions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3,
    "hasMore": true
  }
}
```

---

## Component Usage

### CommandBadge

```svelte
<script>
  import CommandBadge from '$lib/modules/session/components/CommandBadge.svelte';
</script>

<CommandBadge commandType="solve" size="primary" highlighted={false} />
```

### EnhancedSessionCard

```svelte
<script>
  import EnhancedSessionCard from '$lib/modules/session/components/EnhancedSessionCard.svelte';

  const session = {
    id: '123',
    title: 'Math Problem Solving',
    preview: 'Help me solve this equation...',
    mode: 'learn',
    updatedAt: new Date(),
    messageCount: 15,
    primaryCommand: 'solve',
    commandTypes: ['solve', 'explain'],
    commandCount: 5
  };

  function handleClick(event) {
    console.log('Session clicked:', event.detail);
  }
</script>

<EnhancedSessionCard {session} highlightedCommands={['solve']} on:click={handleClick} />
```

### SessionToolbar

```svelte
<script>
  import SessionToolbar from '$lib/modules/session/components/SessionToolbar.svelte';

  function handleFilterChange() {
    console.log('Filters changed, fetch new data');
  }
</script>

<SessionToolbar on:filterChange={handleFilterChange} />
```

---

## Store Usage

### Filter Store

```javascript
import {
  filterStore,
  activeFilterCount,
  hasActiveFilters
} from '$lib/modules/session/stores/filterStore.js';

// Set search
filterStore.setSearch('math problems');

// Set date range
filterStore.setDateRange('week');

// Set command types
filterStore.setCommandTypes(['solve', 'explain']);

// Add a command type
filterStore.addCommandType('check');

// Remove a command type
filterStore.removeCommandType('solve');

// Clear all filters
filterStore.clearFilters();

// Subscribe to changes
filterStore.subscribe((filters) => {
  console.log('Current filters:', filters);
});

// Use derived stores
activeFilterCount.subscribe((count) => {
  console.log('Active filter count:', count);
});
```

### Session Cache Store

```javascript
import { sessionCacheStore } from '$lib/modules/session/stores/sessionCacheStore.js';

// Set sessions (replace)
sessionCacheStore.setSessions(sessions, pagination);

// Append sessions (infinite scroll)
sessionCacheStore.appendSessions(moreSessions, pagination);

// Set loading state
sessionCacheStore.setLoading(true);

// Set error
sessionCacheStore.setError('Failed to load sessions');

// Clear cache
sessionCacheStore.clear();

// Subscribe to changes
sessionCacheStore.subscribe((cache) => {
  console.log('Sessions:', cache.sessions);
  console.log('Loading:', cache.loading);
  console.log('Error:', cache.error);
});
```

---

## Keyboard Shortcuts

- `/` - Focus search input
- `Escape` - Clear search or close modals
- `Tab` - Navigate between interactive elements
- `Enter` / `Space` - Activate buttons and links
- `Arrow Up/Down` - Navigate dropdown options
- `Delete` / `Backspace` - Remove filter tags (when focused)

---

## Accessibility Features

### Screen Reader Support

- All interactive elements have ARIA labels
- Live regions announce filter changes
- Semantic HTML structure
- Proper heading hierarchy

### Keyboard Navigation

- Full keyboard support for all features
- Visible focus indicators
- Focus trap in modal dialogs
- Logical tab order

### Visual Accessibility

- WCAG AA color contrast compliance
- Clear visual indicators
- Sufficient touch target sizes (44x44px minimum)
- Responsive design for all screen sizes

---

## Troubleshooting

### Sessions not loading

1. Check database connection
2. Verify Prisma client is generated: `npx prisma generate`
3. Check browser console for errors
4. Verify API endpoint is accessible

### Filters not working

1. Check browser console for errors
2. Verify filter store is properly initialized
3. Check API response in Network tab
4. Clear browser cache and reload

### Infinite scroll not triggering

1. Ensure there are more sessions to load (`hasMore: true`)
2. Check if Intersection Observer is supported
3. Verify scroll trigger element is in DOM
4. Check browser console for errors

### Command badges not showing

1. Verify sessions have messages with commands
2. Check CommandExtractionService is working
3. Verify command types are properly mapped
4. Check browser console for errors

---

## Performance Tips

### For Large Session Lists (1000+ sessions)

1. Increase page limit for fewer requests: `?limit=50`
2. Use specific filters to narrow results
3. Consider adding server-side caching
4. Monitor database query performance

### For Slow Searches

1. Ensure database indexes are applied
2. Use PostgreSQL full-text search index
3. Consider adding search result caching
4. Limit search to recent sessions first

---

## Development Tips

### Adding New Command Types

1. Update `src/lib/config/tutorCommands.json`
2. Update `src/lib/modules/session/utils/commandTypes.js`
3. Add translations to `src/lib/i18n/sessions.translations.json`
4. Test command extraction and filtering

### Customizing Colors

Edit the `COMMAND_TYPES` object in `src/lib/modules/session/utils/commandTypes.js`:

```javascript
export const COMMAND_TYPES = {
  solve: {
    id: 'solve',
    emoji: '🧮',
    labelKey: 'commands.solve',
    color: '#4CAF50', // Change this color
    commandIds: ['solve']
  }
  // ...
};
```

### Adding New Filters

1. Add filter field to `filterStore` initial state
2. Add action methods to `filterStore`
3. Update `SessionFilterService.buildQuery()` to handle new filter
4. Add UI component for new filter
5. Update `SessionToolbar` to include new filter

---

## Testing

### Manual Testing Checklist

- [ ] Search functionality works
- [ ] Date range filter works
- [ ] Command filter works
- [ ] Multiple filters work together
- [ ] Filter tags can be removed
- [ ] Clear all filters works
- [ ] Infinite scroll loads more sessions
- [ ] Session cards display correctly
- [ ] Command badges show correct colors
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes
- [ ] Mobile responsive design works
- [ ] Error states display correctly
- [ ] Empty states display correctly

### Browser Testing

Test in:

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Support

For issues or questions:

1. Check the implementation status document
2. Review the design document
3. Check browser console for errors
4. Review API responses in Network tab
5. Consult the codebase documentation

---

## Next Steps

1. **Apply database migration** (if not done)
2. **Test all features** manually
3. **Add unit tests** (optional but recommended)
4. **Add E2E tests** (optional but recommended)
5. **Deploy to staging** for user testing
6. **Gather feedback** and iterate
7. **Deploy to production**

---

## Resources

- **Design Document:** `.kiro/specs/sessions-page-ux-enhancement/design.md`
- **Requirements:** `.kiro/specs/sessions-page-ux-enhancement/requirements.md`
- **Implementation Status:** `.kiro/specs/sessions-page-ux-enhancement/IMPLEMENTATION_STATUS.md`
- **Prisma Docs:** https://www.prisma.io/docs
- **Svelte Docs:** https://svelte.dev/docs
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
