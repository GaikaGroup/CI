---
inclusion: always
---

# Database Connection Management

## CRITICAL: Prevent "Too Many Clients" Error

### Problem

PostgreSQL has a limited number of connections (default: 100). In development with hot reload, multiple Prisma Client instances can exhaust the connection pool.

### Solution Implemented

#### 1. Singleton Prisma Client

File: `src/lib/database/client.js`

- Uses `globalThis.__prisma` to ensure single instance
- Properly handles cleanup on process exit
- Configured with minimal logging in production

#### 2. Connection Pool Settings

File: `.env`

```
DATABASE_URL="postgresql://user@localhost:5432/db?connection_limit=5&pool_timeout=10"
```

- `connection_limit=5`: Max 5 connections per Prisma Client
- `pool_timeout=10`: 10 second timeout for acquiring connection

#### 3. Vite Configuration

File: `vite.config.js`

- Excludes Prisma from optimization
- Reduces file watching overhead
- Prevents excessive HMR reloads

#### 4. Cleanup Script

File: `scripts/cleanup-db-connections.sh`

```bash
npm run db:cleanup          # Kill idle connections
npm run db:cleanup --force  # Kill all connections
```

### Best Practices

#### Always Use Singleton Pattern

```javascript
// ✅ CORRECT: Import from client.js
import { prisma } from '$lib/database/client';

// ❌ WRONG: Create new instance
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

#### Close Connections in Tests

```javascript
import { afterAll } from 'vitest';
import { prisma } from '$lib/database/client';

afterAll(async () => {
  await prisma.$disconnect();
});
```

#### Monitor Connections

```bash
# Check active connections
psql -U mak -d postgres -c "
  SELECT count(*)
  FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
"

# Show connection details
psql -U mak -d postgres -c "
  SELECT pid, usename, application_name, state, state_change
  FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
"
```

#### If You Get "Too Many Clients" Error

1. **Stop all dev servers:**

   ```bash
   pkill -f "node.*dev"
   pkill -f "vite"
   ```

2. **Kill all port processes:**

   ```bash
   lsof -ti:3000-3015 | xargs kill -9
   ```

3. **Cleanup database connections:**

   ```bash
   npm run db:cleanup --force
   ```

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

### PostgreSQL Configuration

If you frequently hit connection limits, increase PostgreSQL max_connections:

```bash
# Edit postgresql.conf
# Find and change:
max_connections = 100  # increase to 200 or more

# Restart PostgreSQL
brew services restart postgresql@15
```

### Development Workflow

1. **Before starting work:**

   ```bash
   npm run db:cleanup
   npm run dev
   ```

2. **If server becomes unresponsive:**
   - Press `Ctrl+C` to stop
   - Run `npm run db:cleanup`
   - Restart with `npm run dev`

3. **Before running tests:**
   ```bash
   npm run db:cleanup
   npm run test:run
   ```

### Monitoring Script

Create a monitoring script to watch connections:

```bash
# scripts/monitor-connections.sh
watch -n 5 "psql -U mak -d postgres -t -c \"
  SELECT count(*) as connections
  FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
\""
```

### Emergency Recovery

If database is completely locked:

```bash
# 1. Stop all Node processes
pkill -9 node

# 2. Restart PostgreSQL
brew services restart postgresql@15

# 3. Cleanup connections
npm run db:cleanup --force

# 4. Verify database is accessible
npm run db:test

# 5. Restart dev server
npm run dev
```

### Prevention Checklist

- [ ] Always import prisma from `$lib/database/client`
- [ ] Never create new PrismaClient instances
- [ ] Close connections in test afterAll hooks
- [ ] Use `npm run db:cleanup` before starting work
- [ ] Monitor connection count during development
- [ ] Stop dev server properly with Ctrl+C (not kill -9)
- [ ] Keep connection_limit=5 in DATABASE_URL

### Why This Happens

1. **Hot Module Replacement (HMR)**: Vite reloads modules on file changes
2. **Multiple Instances**: Each reload can create new Prisma Client
3. **Unclosed Connections**: Old connections don't close immediately
4. **Pool Exhaustion**: PostgreSQL runs out of available connections

### The Fix

- **Singleton Pattern**: Only one Prisma Client instance ever exists
- **Global Storage**: Store in `globalThis` to survive HMR
- **Proper Cleanup**: Disconnect on process exit
- **Connection Limits**: Restrict pool size per client
- **Vite Optimization**: Exclude Prisma from HMR

### Testing the Fix

```bash
# Terminal 1: Monitor connections
watch -n 2 "psql -U mak -d postgres -t -c \"
  SELECT count(*) FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
\""

# Terminal 2: Start dev server
npm run dev

# Terminal 3: Make changes to trigger HMR
# Watch connection count - should stay low (< 10)
```

### Success Criteria

- ✅ Connection count stays below 10 during development
- ✅ No "too many clients" errors
- ✅ Dev server starts on first available port (3000)
- ✅ HMR works without connection leaks
- ✅ Tests run without connection errors

### Additional Resources

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Vite HMR API](https://vitejs.dev/guide/api-hmr.html)
