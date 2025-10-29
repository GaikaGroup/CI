---
inclusion: manual
---

# Prisma Client Best Practices

## CRITICAL: Lazy Initialization Pattern

**ALWAYS use the centralized Prisma Client from `src/lib/database/client.js`**

### ✅ Correct Usage

```javascript
// In any server file
import { prisma } from '$lib/database/client';

export async function GET() {
  const users = await prisma.user.findMany();
  return new Response(JSON.stringify(users));
}
```

### ❌ NEVER Do This

```javascript
// DON'T create new PrismaClient instances
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // ❌ WRONG!
```

## Why We Use Proxy Pattern

The `client.js` uses a **Proxy** to defer Prisma Client initialization:

```javascript
export const prisma = new Proxy(
  {},
  {
    get(target, prop) {
      const client = createPrismaClient();
      return client[prop];
    }
  }
);
```

**Reason:** SvelteKit imports modules during build analyze. Without Proxy, `new PrismaClient()` would run at build-time and crash CI.

## Server-Only Rule

**Prisma Client must ONLY be imported in server-side code:**

✅ **Allowed:**

- `+server.js` (API endpoints)
- `+page.server.js` (server load functions)
- `+layout.server.js` (server layout load)
- Files in `src/lib/server/` directory

❌ **NEVER import in:**

- `+page.svelte` (client components)
- `+page.js` (universal load functions)
- Any file that runs on client-side

## Connection Pool Management

Our client is configured with singleton pattern:

```javascript
const globalForPrisma = globalThis;

function createPrismaClient() {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'minimal'
    });
  }
  return globalForPrisma.__prisma;
}
```

**Benefits:**

- Prevents "too many clients" error
- Reuses connection pool in dev mode (HMR)
- Automatic cleanup on process exit

## Database URL Configuration

Set connection limits in `.env`:

```bash
DATABASE_URL="postgresql://user@localhost:5432/db?connection_limit=5&pool_timeout=10"
```

**Parameters:**

- `connection_limit=5` - Max 5 connections per Prisma Client
- `pool_timeout=10` - 10 second timeout for acquiring connection

## CI/CD Requirements

GitHub Actions workflow MUST include:

```yaml
- name: Generate Prisma Client
  run: npm run db:generate

- name: Build application
  run: npm run build
```

**Order matters:** Generate BEFORE build!

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Solution:** Run `npm run db:generate`

### Error: "@prisma/client did not initialize yet"

**Solution:** Check that you're using Proxy pattern in `client.js`

### Error: "Too many clients"

**Solution:**

1. Check you're importing from `$lib/database/client` (not creating new instances)
2. Run `npm run db:cleanup` to kill idle connections
3. Verify `connection_limit` in DATABASE_URL

## Migration Best Practices

Before running migrations:

```bash
# 1. Backup database
npm run db:backup

# 2. Run migration
npm run db:migrate

# 3. Generate Prisma Client
npm run db:generate

# 4. Restart dev server
npm run dev
```

## Testing with Prisma

Always disconnect in test cleanup:

```javascript
import { afterAll } from 'vitest';
import { prisma } from '$lib/database/client';

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Summary

1. ✅ Always import from `$lib/database/client`
2. ✅ Never create new PrismaClient instances
3. ✅ Only use in server-side code
4. ✅ Generate Prisma Client before build in CI
5. ✅ Use connection limits in DATABASE_URL
6. ✅ Disconnect in test cleanup

Following these practices prevents connection pool exhaustion and build-time errors.
