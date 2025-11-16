# GraphRAG Deployment Guide

## Prerequisites

### 1. PostgreSQL 15+ with pgvector Extension

**Installation:**

```bash
# macOS (Homebrew)
brew install postgresql@15
brew install pgvector

# Ubuntu/Debian
sudo apt-get install postgresql-15 postgresql-15-pgvector

# Or compile from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

**Enable Extension:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 2. OpenAI API Key

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

### 3. Node.js 18+

```bash
node --version  # Should be 18.0.0 or higher
```

## Environment Configuration

Create or update `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?connection_limit=20"

# OpenAI API
OPENAI_API_KEY="sk-..."

# GraphRAG Configuration
USE_PGVECTOR="true"
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-3-small"
EMBEDDING_DIMENSIONS="1536"
EMBEDDING_BATCH_SIZE="100"
EMBEDDING_MONTHLY_LIMIT="1000000"

# Caching
ENABLE_EMBEDDING_CACHE="true"
ENABLE_QUERY_CACHE="true"
QUERY_CACHE_TTL="300"
QUERY_CACHE_MAX_SIZE="100"

# Search
DEFAULT_SEARCH_LIMIT="10"
SIMILARITY_THRESHOLD="0.5"

# Monitoring
ENABLE_METRICS="true"
ENABLE_HEALTH_CHECKS="true"
LOG_LEVEL="info"
```

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

**Verify pgvector:**

```bash
psql -U your_user -d your_database -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Application

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

## Health Checks

### Verify GraphRAG System

```bash
curl http://localhost:3000/api/health/graphrag
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "pgvector": { "status": "ok" },
    "embedding": { "status": "ok", "latency": 450 },
    "database": { "status": "ok" }
  },
  "stats": {
    "nodes": 1234,
    "relationships": 5678,
    "embeddingCoverage": "95.5%"
  }
}
```

### Admin Dashboard

```bash
curl -H "Cookie: session=your-admin-session" \
  http://localhost:3000/api/admin/graphrag/stats
```

## Migration from In-Memory Storage

If you have existing in-memory knowledge graphs:

### 1. Create Backup

```bash
npm run db:backup
```

### 2. Dry Run Migration

```bash
npm run graphrag:migrate:dry-run
```

### 3. Run Migration

```bash
npm run graphrag:migrate
```

**Follow prompts and confirm migration.**

## Deployment Checklist

- [ ] PostgreSQL 15+ installed
- [ ] pgvector extension enabled
- [ ] DATABASE_URL configured with connection_limit
- [ ] OPENAI_API_KEY set in environment
- [ ] Database migrations applied
- [ ] Prisma Client generated
- [ ] Application builds successfully
- [ ] Health check endpoint returns 200
- [ ] pgvector check passes
- [ ] Embedding service check passes
- [ ] Database backup created
- [ ] Monitoring configured
- [ ] Rate limiting configured

## Production Considerations

### Database Connection Pool

Configure connection pool size based on your load:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

**Recommended:**

- Small apps: 10-20 connections
- Medium apps: 20-50 connections
- Large apps: 50-100 connections

### Embedding API Costs

Monitor token usage:

```bash
curl -H "Cookie: session=admin-session" \
  http://localhost:3000/api/admin/graphrag/stats
```

**Cost Estimation:**

- text-embedding-3-small: $0.02 per 1M tokens
- Average document (1000 words): ~1,250 tokens
- 1000 documents: ~$0.025

### Performance Tuning

**Index Optimization:**

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'knowledge_graph_nodes';

-- Rebuild index if needed
REINDEX INDEX idx_kg_nodes_embedding;
```

**Query Performance:**

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM knowledge_graph_nodes
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

### Monitoring

**Key Metrics to Track:**

1. **Embedding Generation:**
   - Latency (P95 < 500ms)
   - Cache hit rate (> 75%)
   - Token usage (monthly)
   - API errors

2. **Vector Search:**
   - Query latency (P95 < 200ms)
   - Result quality (avg similarity)
   - Cache hit rate (> 60%)

3. **Database:**
   - Connection pool usage
   - Query latency
   - Index efficiency
   - Storage growth

### Backup Strategy

**Automated Backups:**

```bash
# Add to crontab
0 2 * * * cd /path/to/app && npm run db:backup
```

**Before Major Changes:**

```bash
npm run db:backup:pre-migration
```

## Rollback Procedures

### Application Rollback

```bash
# Revert to previous version
git checkout previous-tag
npm install
npm run build
npm start
```

### Database Rollback

```bash
# Restore from backup
npm run db:restore backups/latest.sql
```

### Migration Rollback

If migration fails, the system automatically falls back to in-memory storage.

To manually rollback:

```bash
# Delete migrated data
psql -U user -d dbname -c "DELETE FROM knowledge_graph_nodes WHERE created_at > 'migration-timestamp';"
```

## Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for common issues and solutions.

## Security

### API Key Protection

- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Use separate keys for dev/staging/prod

### Database Security

- Use SSL/TLS for database connections
- Implement read-only users for queries
- Regular security updates
- Monitor for suspicious activity

### Rate Limiting

Default limits:

- Search: 100 requests/minute per user
- Embedding: 1000 requests/hour per user

Adjust in code if needed.

## Support

For issues or questions:

1. Check [troubleshooting.md](./troubleshooting.md)
2. Review [API documentation](./api.md)
3. Check application logs
4. Contact system administrator
