# Single Dev Server Policy

## Problem

Multiple dev servers running simultaneously cause:

- Database connection pool exhaustion ("too many clients" error)
- Port conflicts (servers on 3000, 3001, 3002, etc.)
- Confusion about which server is active
- Wasted system resources

## Solution

### 1. Use `npm run dev:single`

This script ensures only ONE dev server is running:

```bash
npm run dev:single
```

What it does:

1. Kills all existing vite dev processes
2. Clears ports 3000-3015
3. Cleans up database connections
4. Starts fresh dev server on port 3005

### 2. Strict Port Configuration

`vite.config.js` is configured with:

- `port: 3005` - Fixed port
- `strictPort: true` - Fail if port is busy (don't try next port)
- `open: false` - Don't auto-open browser (prevents multiple tabs)

### 3. Manual Cleanup (if needed)

If you need to manually clean up:

```bash
# Kill all dev servers
pkill -f "node.*vite dev"

# Clear specific port
lsof -ti:3005 | xargs kill -9

# Cleanup database connections
npm run db:cleanup --force

# Start fresh
npm run dev
```

## Best Practices

### ✅ DO:

- Use `npm run dev:single` to start development
- Stop dev server with `Ctrl+C` when done
- Check `http://localhost:3005` is your active server
- Run `npm run db:cleanup` if you see connection errors

### ❌ DON'T:

- Run multiple `npm run dev` commands
- Use `kill -9` on node processes (use `Ctrl+C` instead)
- Leave dev servers running overnight
- Ignore "port already in use" errors

## Troubleshooting

### "Port 3005 is already in use"

```bash
# Check what's using the port
lsof -ti:3005

# Kill it
lsof -ti:3005 | xargs kill -9

# Start fresh
npm run dev:single
```

### "Too many clients" database error

```bash
# Cleanup connections
npm run db:cleanup --force

# Restart dev server
npm run dev:single
```

### Multiple dev servers running

```bash
# Check running servers
ps aux | grep "vite dev"

# Kill all
pkill -f "node.*vite dev"

# Start single server
npm run dev:single
```

## Monitoring

Check active connections:

```bash
# Check dev servers
ps aux | grep "vite dev" | grep -v grep

# Check database connections
psql -U mak -d postgres -c "
  SELECT count(*) as connections
  FROM pg_stat_activity
  WHERE datname = 'ai_tutor_sessions';
"
```

## Why This Matters

- **PostgreSQL default**: 100 max connections
- **Each dev server**: ~5-10 connections
- **10 dev servers**: 50-100 connections = pool exhausted
- **Result**: Application crashes, database locks

## Configuration Files

- `vite.config.js` - Server configuration
- `scripts/start-single-dev.sh` - Cleanup script
- `scripts/cleanup-db-connections.sh` - Database cleanup
- `.env` - Database connection settings

## Related Issues

- Database connection management: `docs/database-connection-management.md`
- Development workflow: `docs/common-tasks.md`
