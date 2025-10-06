# Sessions API Documentation

This document describes the REST API endpoints for the AI Tutor Sessions feature.

## Authentication

All endpoints require authentication. The user must be logged in and have a valid session cookie. Unauthenticated requests will return a `401 Unauthorized` response.

## Base URL

All endpoints are prefixed with `/api`

## Sessions Endpoints

### GET /api/sessions

Get user sessions with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): Sort field - `updatedAt`, `createdAt`, `title`, `messageCount` (default: `updatedAt`)
- `sortOrder` (optional): Sort order - `asc` or `desc` (default: `desc`)
- `mode` (optional): Filter by mode - `fun` or `learn`
- `language` (optional): Filter by language code
- `search` (optional): Search query for title and preview content

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "userId": "string",
      "title": "string",
      "preview": "string",
      "mode": "fun|learn",
      "language": "string",
      "messageCount": 0,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "limit": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### POST /api/sessions

Create a new session.

**Request Body:**
```json
{
  "title": "string (required)",
  "mode": "fun|learn (optional, default: fun)",
  "language": "string (optional, default: en)",
  "preview": "string (optional, max 1000 chars)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "userId": "string",
  "title": "string",
  "preview": "string",
  "mode": "fun|learn",
  "language": "string",
  "messageCount": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### GET /api/sessions/[id]

Get a specific session by ID.

**Query Parameters:**
- `includeMessages` (optional): Include messages in response (default: false)

**Response:**
```json
{
  "id": "uuid",
  "userId": "string",
  "title": "string",
  "preview": "string",
  "mode": "fun|learn",
  "language": "string",
  "messageCount": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "messages": [] // Only if includeMessages=true
}
```

### PUT /api/sessions/[id]

Update a session.

**Request Body:**
```json
{
  "title": "string (optional)",
  "preview": "string (optional)",
  "mode": "fun|learn (optional)",
  "language": "string (optional)"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "string",
  "title": "string",
  "preview": "string",
  "mode": "fun|learn",
  "language": "string",
  "messageCount": 0,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### DELETE /api/sessions/[id]

Delete a session and all its messages.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

## Messages Endpoints

### GET /api/sessions/[id]/messages

Get messages for a session with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 200)
- `sortOrder` (optional): Sort order - `asc` or `desc` (default: `asc`)
- `type` (optional): Filter by message type - `user` or `assistant`

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "type": "user|assistant",
      "content": "string",
      "metadata": {
        "timestamp": "string",
        "audioUrl": "string",
        "imageUrl": "string",
        "language": "string"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "limit": 50,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### POST /api/sessions/[id]/messages

Add a new message to a session.

**Request Body:**
```json
{
  "type": "user|assistant (required)",
  "content": "string (required)",
  "metadata": {
    "timestamp": "string",
    "audioUrl": "string",
    "imageUrl": "string",
    "language": "string"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "type": "user|assistant",
  "content": "string",
  "metadata": {},
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### GET /api/messages/[id]

Get a specific message by ID.

**Response:**
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "type": "user|assistant",
  "content": "string",
  "metadata": {},
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### PUT /api/messages/[id]

Update a message.

**Request Body:**
```json
{
  "content": "string (optional)",
  "metadata": {} // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "type": "user|assistant",
  "content": "string",
  "metadata": {},
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### DELETE /api/messages/[id]

Delete a message.

**Response:**
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

## Search and Statistics Endpoints

### GET /api/sessions/search

Search sessions by title and preview content.

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `mode` (optional): Filter by mode - `fun` or `learn`
- `language` (optional): Filter by language

**Response:**
```json
{
  "sessions": [...],
  "pagination": {...},
  "query": "search term"
}
```

### GET /api/messages/search

Search messages by content.

**Query Parameters:**
- `q` (required): Search query
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sessionId` (optional): Filter by specific session
- `type` (optional): Filter by message type - `user` or `assistant`

**Response:**
```json
{
  "messages": [...],
  "pagination": {...},
  "query": "search term"
}
```

### GET /api/sessions/stats

Get session and message statistics for the authenticated user.

**Response:**
```json
{
  "sessions": {
    "total": 10,
    "fun": 6,
    "learn": 4,
    "lastActivity": "2025-01-01T00:00:00.000Z"
  },
  "messages": {
    "total": 150,
    "user": 75,
    "assistant": 75,
    "lastMessage": "2025-01-01T00:00:00.000Z"
  },
  "overview": {
    "averageMessagesPerSession": 15.0,
    "mostRecentActivity": "2025-01-01T00:00:00.000Z"
  }
}
```

### GET /api/messages/recent

Get recent messages across all user sessions.

**Query Parameters:**
- `limit` (optional): Number of recent messages (default: 10, max: 100)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "type": "user|assistant",
      "content": "string",
      "metadata": {},
      "createdAt": "2025-01-01T00:00:00.000Z",
      "session": {
        "id": "uuid",
        "title": "string",
        "mode": "fun|learn",
        "language": "string"
      }
    }
  ]
}
```

## Bulk Operations

### DELETE /api/sessions/[id]/messages/bulk

Bulk delete messages from a session.

**Request Body:**
```json
{
  "messageIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 3 messages",
  "deletedCount": 3
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Session not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

API endpoints implement rate limiting to prevent abuse. Specific limits depend on the endpoint and user authentication status.

## Data Validation

- Session titles must be 1-500 characters
- Message content must be 1-50,000 characters
- Preview text must be 0-1,000 characters
- Language codes must be valid ISO language codes (max 10 characters)
- Mode must be either "fun" or "learn"
- Message type must be either "user" or "assistant"

## Security

- All endpoints require authentication
- Users can only access their own sessions and messages
- Input validation prevents XSS and injection attacks
- Database queries use parameterized statements to prevent SQL injection