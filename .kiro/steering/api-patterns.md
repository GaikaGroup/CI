---
inclusion: always
---

# API Patterns and Best Practices

## API Route Structure

All API endpoints follow this pattern:

```
src/routes/api/
├── [resource]/
│   ├── +server.js          # GET /api/resource, POST /api/resource
│   └── [id]/
│       └── +server.js      # GET /api/resource/:id, PUT, DELETE
```

## Standard Response Format

### Success Response

```javascript
return new Response(
  JSON.stringify({
    success: true,
    data: result
  }),
  {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }
);
```

### Error Response

```javascript
return new Response(
  JSON.stringify({
    success: false,
    error: 'Error message'
  }),
  {
    status: 400, // or appropriate status code
    headers: { 'Content-Type': 'application/json' }
  }
);
```

## HTTP Status Codes

Use appropriate status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (no permission)
- `404` - Not Found
- `500` - Internal Server Error

## Authentication

### Check Authentication

```javascript
export async function GET({ locals }) {
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Authentication required'
      }),
      { status: 401 }
    );
  }

  // Continue with authenticated logic
}
```

### Check Authorization

```javascript
// Check if user is admin
if (locals.user.type !== 'admin') {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Admin access required'
    }),
    { status: 403 }
  );
}
```

## Request Validation

### Validate Request Body

```javascript
export async function POST({ request, locals }) {
  const body = await request.json();

  // Validate required fields
  if (!body.name || !body.description) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing required fields: name, description'
      }),
      { status: 400 }
    );
  }

  // Validate field types
  if (typeof body.name !== 'string') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid field type: name must be string'
      }),
      { status: 400 }
    );
  }

  // Continue with valid data
}
```

### Validate URL Parameters

```javascript
export async function GET({ params }) {
  const { id } = params;

  // Validate ID format
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid ID parameter'
      }),
      { status: 400 }
    );
  }

  // Continue with valid ID
}
```

## Error Handling

### Wrap in Try-Catch

```javascript
export async function POST({ request, locals }) {
  try {
    const body = await request.json();
    const result = await Service.create(body, locals.user.id);

    if (!result.success) {
      return new Response(JSON.stringify(result), { status: 400 });
    }

    return new Response(JSON.stringify(result), { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500 }
    );
  }
}
```

## Database Operations

### Use Services, Not Direct Prisma

```javascript
// Good: Use service layer
import CourseService from '$lib/services/CourseService';
const result = await CourseService.getCourseById(id);

// Avoid: Direct Prisma in API routes
import { prisma } from '$lib/database/client';
const course = await prisma.course.findUnique({ where: { id } });
```

### Handle Not Found

```javascript
const result = await CourseService.getCourseById(id);

if (!result.success) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Course not found'
    }),
    { status: 404 }
  );
}
```

## Pagination

### Standard Pagination Pattern

```javascript
export async function GET({ url }) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const result = await Service.getAll({ page, limit });

  return new Response(
    JSON.stringify({
      success: true,
      data: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    })
  );
}
```

## Filtering and Search

### Query Parameters

```javascript
export async function GET({ url }) {
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || 'active';
  const language = url.searchParams.get('language') || '';

  const result = await Service.search({
    search,
    status,
    language
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: result.items
    })
  );
}
```

## File Uploads

### Handle Multipart Form Data

```javascript
export async function POST({ request, locals }) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'No file uploaded'
      }),
      { status: 400 }
    );
  }

  // Process file
  const result = await DocumentService.processFile(file, locals.user.id);

  return new Response(JSON.stringify(result), {
    status: result.success ? 201 : 400
  });
}
```

## Rate Limiting

### Simple Rate Limiting

```javascript
const requestCounts = new Map();

export async function POST({ request, locals }) {
  const userId = locals.user.id;
  const count = requestCounts.get(userId) || 0;

  if (count > 100) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded'
      }),
      { status: 429 }
    );
  }

  requestCounts.set(userId, count + 1);

  // Continue with request
}
```

## CORS Headers

### Add CORS if Needed

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type'
};

return new Response(JSON.stringify(data), { headers });
```

## Logging

### Log Important Events

```javascript
// Log API calls
console.log(`[API] ${request.method} ${request.url} - User: ${locals.user?.id}`);

// Log errors with context
console.error('[API Error]', {
  endpoint: request.url,
  method: request.method,
  user: locals.user?.id,
  error: error.message,
  stack: error.stack
});
```

## Testing APIs

### Test with curl

```bash
# GET request
curl http://localhost:5173/api/courses

# POST request
curl -X POST http://localhost:5173/api/courses \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Course","language":"en"}'

# With authentication
curl http://localhost:5173/api/courses \
  -H "Cookie: session=your-session-token"
```
