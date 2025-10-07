# Session Database Service Layer

This directory contains the database service layer for the AI Tutor Sessions feature, providing comprehensive CRUD operations for sessions and messages with built-in error handling, retry logic, and pagination support.

## Services

### SessionService

Handles all session-related database operations:

- **Create sessions** with validation and error handling
- **Retrieve sessions** with pagination and filtering
- **Update sessions** with field validation
- **Delete sessions** with cascade message deletion
- **Search sessions** by title and content
- **Get session statistics** for analytics

#### Key Features

- **Validation**: Comprehensive input validation with descriptive error messages
- **Authorization**: User-based access control for all operations
- **Pagination**: Efficient pagination for large datasets
- **Search**: Full-text search capabilities
- **Statistics**: User session analytics and metrics
- **Error Handling**: Robust error handling with custom error types
- **Retry Logic**: Automatic retry for transient database failures

#### Usage Example

```javascript
import { SessionService } from '../index.js';

// Create a new session
const session = await SessionService.createSession(
  'user-123',
  'Math Learning Session',
  'learn',
  'en',
  'Learning algebra concepts'
);

// Get user sessions with pagination
const result = await SessionService.getUserSessions('user-123', {
  page: 1,
  limit: 20,
  mode: 'learn'
});

// Search sessions
const searchResults = await SessionService.searchSessions('user-123', 'math');

// Update session
const updated = await SessionService.updateSession(session.id, 'user-123', {
  title: 'Advanced Math Session'
});
```

### MessageService

Handles all message-related database operations:

- **Add messages** to sessions with metadata support
- **Retrieve messages** with pagination and filtering
- **Update messages** with validation
- **Delete messages** with session count updates
- **Search messages** by content
- **Bulk operations** for efficient message management

#### Key Features

- **Metadata Support**: Rich metadata for audio, images, timestamps
- **Transaction Safety**: Database transactions for data consistency
- **Message Validation**: Content validation and sanitization
- **Bulk Operations**: Efficient bulk delete operations
- **Search**: Content-based message search
- **Statistics**: Message analytics and metrics
- **Authorization**: User-based access control
- **Retry Logic**: Automatic retry for transient failures

#### Usage Example

```javascript
import { MessageService } from '../index.js';

// Add a message to a session
const message = await MessageService.addMessage(
  'session-123',
  'user',
  'Can you help me with calculus?',
  {
    language: 'en',
    timestamp: new Date().toISOString()
  },
  'user-123'
);

// Get session messages with pagination
const messages = await MessageService.getSessionMessages(
  'session-123',
  { page: 1, limit: 50, sortOrder: 'asc' },
  'user-123'
);

// Search messages
const searchResults = await MessageService.searchMessages('user-123', 'calculus', {
  page: 1,
  limit: 20
});
```

## Error Handling

Both services implement comprehensive error handling with custom error types:

### SessionService Errors

- `SessionError`: Base error class for session operations
- `SessionNotFoundError`: When a session doesn't exist
- `SessionValidationError`: For validation failures

### MessageService Errors

- `MessageError`: Base error class for message operations
- `MessageNotFoundError`: When a message doesn't exist
- `MessageValidationError`: For validation failures

### Error Example

```javascript
try {
  await SessionService.createSession('', 'Test Session');
} catch (error) {
  if (error instanceof SessionValidationError) {
    console.log('Validation failed:', error.message);
    console.log('Field:', error.details.field);
  }
}
```

## Retry Logic

Both services implement automatic retry logic for transient database failures:

- **Max Attempts**: 3 retry attempts by default
- **Exponential Backoff**: Increasing delay between retries
- **Smart Retry**: Only retries appropriate errors (not validation errors)
- **Configurable**: Retry configuration can be customized

## Pagination

All list operations support pagination with consistent interface:

```javascript
const result = await SessionService.getUserSessions('user-123', {
  page: 1, // Page number (1-based)
  limit: 20, // Items per page
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});

// Result includes pagination metadata
console.log(result.pagination);
// {
//   currentPage: 1,
//   totalPages: 5,
//   totalCount: 100,
//   limit: 20,
//   hasNextPage: true,
//   hasPreviousPage: false
// }
```

## Database Schema

The services work with the following database schema:

### Sessions Table

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  preview TEXT,
  language VARCHAR(10) DEFAULT 'en',
  mode VARCHAR(20) DEFAULT 'fun',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Considerations

- **Indexes**: Optimized database indexes for common queries
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries with proper joins and limits
- **Pagination**: Efficient pagination to handle large datasets
- **Caching**: Ready for caching layer integration

## Testing

Comprehensive test suites are provided:

- **Unit Tests**: `tests/unit/session/SessionService.test.js`
- **Unit Tests**: `tests/unit/session/MessageService.test.js`
- **Integration Examples**: `services/example.js`

Run tests with:

```bash
npm test -- tests/unit/session/SessionService.test.js --run
npm test -- tests/unit/session/MessageService.test.js --run
```

## Requirements Compliance

This implementation satisfies the following requirements from the AI Tutor Sessions spec:

- **7.1**: Persistent session storage in open-source database (PostgreSQL)
- **7.2**: Immediate message persistence with proper indexing
- **7.7**: Retry logic and graceful error handling
- **7.8**: Pagination and filtering for optimal performance

## Next Steps

The database service layer is now ready for integration with:

1. **Session Stores**: Svelte stores for state management
2. **API Endpoints**: REST API endpoints for client communication
3. **UI Components**: Session management components
4. **Real-time Features**: WebSocket integration for live updates

See the main tasks.md file for the complete implementation roadmap.
