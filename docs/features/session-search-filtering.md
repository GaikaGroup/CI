# Session Search and Filtering

This document describes the search and filtering capabilities implemented for the AI Tutor Sessions feature.

## Overview

The session search and filtering system allows users to quickly find and organize their learning sessions through:

- Real-time text search across session titles and preview content
- Filtering by mode (Fun/Learn)
- Filtering by language
- Filtering by date range
- Search result highlighting
- Optimized database queries for performance

## Features

### 1. Real-Time Search

Users can search sessions by typing in the search box. The search is debounced (300ms) to reduce API calls and improve performance.

**Search Behavior:**

- Case-insensitive search
- Searches both title and preview content
- Returns results with highlighting metadata
- Maintains pagination for large result sets

**Implementation:**

```javascript
// In SessionsList.svelte
function handleSearchInput(event) {
  searchQuery = event.target.value;

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = setTimeout(async () => {
    if (searchQuery.trim().length > 0) {
      await sessionStore.searchSessions(searchQuery);
    } else {
      await sessionStore.loadSessions();
    }
  }, 300);
}
```

### 2. Filtering

Users can filter sessions by multiple criteria simultaneously:

#### Mode Filter

- **Options:** All Modes, Fun Mode, Learn Mode
- **Behavior:** Shows only sessions matching the selected mode

#### Language Filter

- **Options:** All Languages, English, Spanish, Russian (extensible)
- **Behavior:** Shows only sessions in the selected language

#### Date Range Filter

- **Options:** From date, To date
- **Behavior:** Shows sessions updated within the specified date range
- **Format:** ISO date strings (YYYY-MM-DD)

### 3. Search Result Highlighting

When a search query is active, matching terms are highlighted in:

- Session titles
- Session preview text

**Highlighting Styles:**

- Light mode: Yellow background (#fef3c7) with brown text (#92400e)
- Dark mode: Dark brown background (#78350f) with light yellow text (#fef3c7)

**Implementation:**

```javascript
// Using the highlightText utility
import { highlightText } from '../utils/searchHighlight.js';

// In template
{#if searchQuery && session._searchMeta?.matchedIn?.title}
  {@html getHighlightedText(session.title, searchQuery)}
{:else}
  {session.title}
{/if}
```

### 4. Filter State Management

The filter state is managed in the session store and persists across page navigation within the session.

**Filter State Structure:**

```javascript
filters: {
  mode: null,           // 'fun' | 'learn' | null
  language: null,       // 'en' | 'es' | 'ru' | null
  dateFrom: null,       // ISO date string | null
  dateTo: null,         // ISO date string | null
  sortBy: 'updatedAt',  // Sort field
  sortOrder: 'desc'     // 'asc' | 'desc'
}
```

## API Endpoints

### Search Sessions

```
GET /api/sessions/search?q={query}&mode={mode}&language={lang}&dateFrom={date}&dateTo={date}
```

**Query Parameters:**

- `q` (required): Search query string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `mode` (optional): Filter by mode ('fun' or 'learn')
- `language` (optional): Filter by language code
- `dateFrom` (optional): Filter from date (ISO string)
- `dateTo` (optional): Filter to date (ISO string)

**Response:**

```json
{
  "sessions": [
    {
      "id": "session-id",
      "title": "Session Title",
      "preview": "Preview text...",
      "mode": "learn",
      "language": "en",
      "messageCount": 10,
      "_searchMeta": {
        "matchedIn": {
          "title": true,
          "preview": false
        },
        "searchTerm": "query"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "limit": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "query": "query"
}
```

### Get Sessions with Filters

```
GET /api/sessions?mode={mode}&language={lang}&dateFrom={date}&dateTo={date}
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (default: 'updatedAt')
- `sortOrder` (optional): Sort order (default: 'desc')
- `mode` (optional): Filter by mode
- `language` (optional): Filter by language
- `dateFrom` (optional): Filter from date
- `dateTo` (optional): Filter to date

## Database Optimization

### Indexes

The following indexes are used to optimize search and filtering queries:

```sql
-- User sessions index (for filtering and sorting)
CREATE INDEX idx_user_sessions ON sessions(user_id, updated_at DESC);

-- Search index (for text search)
CREATE INDEX idx_session_search ON sessions(title, preview);
```

### Query Optimization

1. **Case-Insensitive Search:** Uses PostgreSQL's `ILIKE` operator (via Prisma's `contains` with `mode: 'insensitive'`)
2. **Compound Filters:** All filters are applied in a single database query
3. **Pagination:** Uses `LIMIT` and `OFFSET` for efficient pagination
4. **Count Optimization:** Separate count query runs in parallel with data query

## Store Methods

### searchSessions(query, options)

Searches sessions by title and preview content.

```javascript
await sessionStore.searchSessions('math', {
  mode: 'learn',
  language: 'en',
  page: 1
});
```

### applyFilters(filters)

Applies filters and reloads sessions.

```javascript
await sessionStore.applyFilters({
  mode: 'learn',
  language: 'en',
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31'
});
```

### clearFilters()

Clears all filters and reloads sessions.

```javascript
await sessionStore.clearFilters();
```

### setFilters(filters)

Sets filter values without reloading (use applyFilters to reload).

```javascript
sessionStore.setFilters({ mode: 'fun' });
```

## Utility Functions

### highlightText(text, searchTerm, className)

Highlights search terms in text with HTML mark tags.

```javascript
import { highlightText } from '$lib/modules/session/utils/searchHighlight.js';

const highlighted = highlightText('This is a test', 'test');
// Returns: 'This is a <mark class="highlight">test</mark>'
```

### getSearchExcerpt(text, searchTerm, contextLength)

Returns an excerpt of text around the search term.

```javascript
import { getSearchExcerpt } from '$lib/modules/session/utils/searchHighlight.js';

const excerpt = getSearchExcerpt(longText, 'search term', 50);
// Returns: '...text around search term...'
```

### containsSearchTerm(text, searchTerm)

Checks if text contains the search term (case-insensitive).

```javascript
import { containsSearchTerm } from '$lib/modules/session/utils/searchHighlight.js';

const hasMatch = containsSearchTerm('Hello World', 'world'); // true
```

### getMatchPositions(text, searchTerm)

Returns all match positions in text.

```javascript
import { getMatchPositions } from '$lib/modules/session/utils/searchHighlight.js';

const positions = getMatchPositions('test test test', 'test');
// Returns: [{ start: 0, end: 4 }, { start: 5, end: 9 }, { start: 10, end: 14 }]
```

## UI Components

### Filter Panel

The filter panel is toggled by clicking the filter button in the sessions list header. It shows:

- Mode dropdown
- Language dropdown
- Date range inputs (from/to)
- Apply and Clear buttons

**Active Filter Indicator:**

- Filter button shows a badge with the count of active filters
- Button color changes when filters are active (amber background)

### Search Highlighting

Search results show highlighted terms using the `<mark>` HTML element with custom styling.

## Performance Considerations

1. **Debounced Search:** 300ms debounce prevents excessive API calls
2. **Indexed Queries:** Database indexes on frequently queried columns
3. **Pagination:** Limits result set size for faster queries
4. **Parallel Queries:** Count and data queries run in parallel
5. **Client-Side Caching:** Store maintains current results to avoid unnecessary reloads

## Testing

### Unit Tests

- Search highlighting utilities
- Store method interfaces
- Service method signatures

### Integration Tests

- Search functionality with database
- Filter combinations
- Date range filtering
- Pagination with filters
- Performance benchmarks

**Test File:** `tests/integration/session/SearchAndFiltering.integration.test.js`

## Future Enhancements

Potential improvements for future iterations:

1. **Full-Text Search:** Implement PostgreSQL full-text search for better relevance ranking
2. **Search History:** Save recent searches for quick access
3. **Saved Filters:** Allow users to save filter combinations
4. **Advanced Filters:** Add filters for message count, creation date, etc.
5. **Search Suggestions:** Provide autocomplete suggestions as user types
6. **Fuzzy Search:** Implement fuzzy matching for typo tolerance
7. **Search Analytics:** Track popular search terms and filter combinations

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 1.2:** Real-time session filtering by title and preview content
- **Requirement 1.5:** Search functionality with query parameters
- **Requirement 7.8:** Pagination and filtering for optimal performance

## Related Documentation

- [Session Management Overview](./sessions-page-implementation.md)
- [Sessions API Documentation](./api/sessions-api.md)
- [Database Schema](../prisma/schema.prisma)
