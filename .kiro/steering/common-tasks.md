---
inclusion: always
---

# Common Development Tasks

## Adding a New Feature

### 1. Create Feature Spec
```bash
# Create spec in .kiro/specs/
.kiro/specs/my-feature/
├── requirements.md
├── design.md
└── tasks.md
```

### 2. Create Module Structure
```bash
src/lib/modules/my-feature/
├── components/
├── services/
├── stores/
└── utils/
```

### 3. Add API Endpoints
```bash
src/routes/api/my-feature/
├── +server.js
└── [id]/
    └── +server.js
```

### 4. Add Tests
```bash
tests/
├── unit/my-feature/
├── integration/my-feature/
└── e2e/my-feature/
```

## Adding a New API Endpoint

### 1. Create Route File
```javascript
// src/routes/api/my-endpoint/+server.js
export async function GET({ locals }) {
  if (!locals.user) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Authentication required'
    }), { status: 401 });
  }
  
  try {
    const result = await MyService.getData(locals.user.id);
    return new Response(JSON.stringify(result));
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 });
  }
}
```

### 2. Add Service Method
```javascript
// src/lib/services/MyService.js
export class MyService {
  static async getData(userId) {
    try {
      const data = await prisma.myModel.findMany({
        where: { userId }
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### 3. Test the Endpoint
```javascript
// tests/integration/api/my-endpoint.test.js
import { describe, it, expect } from 'vitest';

describe('GET /api/my-endpoint', () => {
  it('returns data for authenticated user', async () => {
    const response = await fetch('/api/my-endpoint', {
      headers: { 'Cookie': 'session=test-token' }
    });
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## Adding a Database Model

### 1. Update Prisma Schema
```prisma
// prisma/schema.prisma
model MyModel {
  id        String   @id @default(cuid())
  name      String   @db.VarChar(255)
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@map("my_models")
}
```

### 2. Create Migration
```bash
# IMPORTANT: Always backup before migration!
npm run db:backup:pre-migration

# Create migration
npx prisma migrate dev --name add_my_model

# Generate Prisma Client
npm run db:generate
```

### 3. Create Service
```javascript
// src/lib/services/MyModelService.js
import { prisma } from '$lib/database/client';

export class MyModelService {
  static async create(data, userId) {
    try {
      const model = await prisma.myModel.create({
        data: { ...data, userId }
      });
      return { success: true, data: model };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

## Adding a Svelte Component

### 1. Create Component File
```svelte
<!-- src/lib/modules/my-feature/components/MyComponent.svelte -->
<script>
  export let data;
  export let onAction = () => {};
  
  let loading = false;
  
  async function handleClick() {
    loading = true;
    try {
      await onAction(data);
    } finally {
      loading = false;
    }
  }
</script>

<div class="my-component">
  <h2>{data.title}</h2>
  <button on:click={handleClick} disabled={loading}>
    {loading ? 'Loading...' : 'Click Me'}
  </button>
</div>

<style>
  .my-component {
    padding: 1rem;
    border: 1px solid #ccc;
  }
</style>
```

### 2. Use Component
```svelte
<script>
  import MyComponent from '$lib/modules/my-feature/components/MyComponent.svelte';
  
  const data = { title: 'Hello' };
  
  function handleAction(data) {
    console.log('Action:', data);
  }
</script>

<MyComponent {data} onAction={handleAction} />
```

## Running Tests

### Run All Tests
```bash
npm run test:run
```

### Run Specific Test File
```bash
npm run test:run tests/unit/my-feature/myService.test.js
```

### Run Tests in Watch Mode
```bash
npm run test
```

### Run with Coverage
```bash
npm run test:coverage
```

## Debugging

### Debug API Endpoints
```javascript
// Add console.log in API route
console.log('[DEBUG]', { locals, params, body });
```

### Debug Svelte Components
```svelte
<script>
  $: console.log('[DEBUG] Component state:', { data, loading });
</script>
```

### Debug Database Queries
```javascript
// Enable Prisma query logging in .env
DATABASE_URL="postgresql://..."
DEBUG="prisma:query"
```

## Common Issues

### "Module not found"
- Check import paths use `$lib` alias
- Verify file exists and is exported
- Restart dev server

### "Database connection failed"
- Check DATABASE_URL in .env
- Verify PostgreSQL is running
- Run migrations: `npm run db:migrate`

### "Prisma Client not generated"
- Run: `npm run db:generate`
- Restart dev server

### "API returns 401"
- Check authentication in hooks.server.js
- Verify session cookie is set
- Check user is logged in

## Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Database
npm run db:backup              # Backup database
npm run db:migrate             # Run migrations
npm run db:generate            # Generate Prisma Client
npm run db:studio              # Open Prisma Studio

# Testing
npm run test                   # Run tests in watch mode
npm run test:run               # Run all tests once
npm run test:coverage          # Run with coverage
npm run test:e2e               # Run E2E tests

# Code Quality
npm run lint                   # Lint code
npm run format                 # Format code
```
