# GraphRAG Troubleshooting Guide

## Common Issues

### 1. pgvector Extension Not Found

**Symptoms:**

- Health check shows `pgvector: unavailable`
- System falls back to in-memory storage
- Logs show "pgvector not available"

**Solutions:**

**Check if pgvector is installed:**

```bash
psql -U your_user -d your_database -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

**Install pgvector:**

```bash
# macOS
brew install pgvector

# Ubuntu/Debian
sudo apt-get install postgresql-15-pgvector

# From source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**Enable extension:**

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Verify:**

```bash
curl http://localhost:3000/api/health/graphrag | jq '.checks.pgvector'
```

---

### 2. OpenAI API Key Issues

**Symptoms:**

- Embedding generation fails
- Error: "OpenAI API key not configured"
- Health check shows `embedding: error`

**Solutions:**

**Check environment variable:**

```bash
echo $OPENAI_API_KEY
```

**Set API key:**

```bash
# In .env file
OPENAI_API_KEY="sk-..."

# Or export
export OPENAI_API_KEY="sk-..."
```

**Verify key is valid:**

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Test embedding service:**

```bash
curl http://localhost:3000/api/health/graphrag | jq '.checks.embedding'
```

---

### 3. Monthly Token Limit Exceeded

**Symptoms:**

- Error: "Monthly token limit exceeded"
- Embedding generation stops working
- High API costs

**Solutions:**

**Check current usage:**

```bash
curl -H "Cookie: session=admin-session" \
  http://localhost:3000/api/admin/graphrag/stats | jq '.overview'
```

**Increase limit:**

```bash
# In .env
EMBEDDING_MONTHLY_LIMIT="2000000"  # Increase from 1M to 2M
```

**Optimize usage:**

1. Enable caching: `ENABLE_EMBEDDING_CACHE="true"`
2. Reduce batch size: `EMBEDDING_BATCH_SIZE="50"`
3. Use smaller model: `EMBEDDING_MODEL="text-embedding-3-small"`
4. Use smaller dimensions: `EMBEDDING_DIMENSIONS="512"`

**Reset monthly counter:**

```javascript
// In code or admin panel
embeddingService.tokenUsage.monthly = 0;
embeddingService.tokenUsage.lastReset = new Date();
```

---

### 4. Slow Search Performance

**Symptoms:**

- Search queries take > 1 second
- High database CPU usage
- Timeout errors

**Solutions:**

**Check index usage:**

```sql
EXPLAIN ANALYZE
SELECT * FROM knowledge_graph_nodes
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

**Rebuild index:**

```sql
REINDEX INDEX idx_kg_nodes_embedding;
```

**Optimize index:**

```sql
-- Increase lists for larger datasets
DROP INDEX idx_kg_nodes_embedding;
CREATE INDEX idx_kg_nodes_embedding
ON knowledge_graph_nodes
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 200);  -- Increase from 100
```

**Enable query cache:**

```bash
ENABLE_QUERY_CACHE="true"
QUERY_CACHE_TTL="300"
QUERY_CACHE_MAX_SIZE="100"
```

**Reduce similarity threshold:**

```bash
SIMILARITY_THRESHOLD="0.3"  # Lower threshold = faster queries
```

---

### 5. Database Connection Pool Exhausted

**Symptoms:**

- Error: "Too many clients"
- Connection timeouts
- Application hangs

**Solutions:**

**Check active connections:**

```sql
SELECT count(*)
FROM pg_stat_activity
WHERE datname = 'your_database';
```

**Increase connection limit:**

```bash
# In DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=50"
```

**Increase PostgreSQL max_connections:**

```sql
-- In postgresql.conf
max_connections = 200

-- Restart PostgreSQL
brew services restart postgresql@15
```

**Cleanup idle connections:**

```bash
npm run db:cleanup
```

---

### 6. Migration Fails

**Symptoms:**

- Migration script errors
- Data verification fails
- Partial migration

**Solutions:**

**Run dry-run first:**

```bash
npm run graphrag:migrate:dry-run
```

**Check backup:**

```bash
ls -lh backups/graphrag/
```

**Restore from backup:**

```javascript
import { MigrationService } from './src/lib/modules/graphrag/services/MigrationService.js';

const service = new MigrationService();
await service.restoreFromBackup('backups/graphrag/backup_123456.json');
```

**Manual rollback:**

```sql
DELETE FROM knowledge_graph_nodes
WHERE created_at > 'migration-start-timestamp';
```

---

### 7. High Memory Usage

**Symptoms:**

- Application crashes with OOM
- Slow performance
- High memory consumption

**Solutions:**

**Reduce batch size:**

```bash
EMBEDDING_BATCH_SIZE="50"  # Reduce from 100
```

**Clear caches:**

```javascript
// In code
embeddingService.clearCache();
adapter.clearCache();
```

**Disable caching temporarily:**

```bash
ENABLE_EMBEDDING_CACHE="false"
ENABLE_QUERY_CACHE="false"
```

**Use database storage:**

```bash
USE_PGVECTOR="true"  # Don't use in-memory adapter
```

---

### 8. Incorrect Search Results

**Symptoms:**

- Irrelevant results returned
- Low similarity scores
- Missing expected results

**Solutions:**

**Lower similarity threshold:**

```bash
SIMILARITY_THRESHOLD="0.3"  # Lower from 0.5
```

**Check embedding quality:**

```javascript
const result = await embeddingService.generateEmbedding('test query');
console.log('Embedding dimensions:', result.embedding.length);
console.log('Embedding sample:', result.embedding.slice(0, 5));
```

**Verify node content:**

```sql
SELECT id, content, chunk_index
FROM knowledge_graph_nodes
WHERE material_id = 'your-material-id'
ORDER BY chunk_index;
```

**Re-process documents:**

```javascript
await graphRAGService.updateKnowledgeBase(materialId, courseId, updatedContent);
```

---

### 9. Rate Limit Errors

**Symptoms:**

- Error: "Rate limit exceeded"
- 429 status code
- Requests blocked

**Solutions:**

**Check current limits:**

```javascript
import { getRateLimiter } from './src/lib/modules/graphrag/utils/RateLimiter.js';

const limiter = getRateLimiter();
const usage = limiter.getUsage(userId, 'search');
console.log(usage);
```

**Increase limits:**

```javascript
limiter.setLimit('search', 200, 60000); // 200 per minute
limiter.setLimit('embedding', 2000, 3600000); // 2000 per hour
```

**Reset limits:**

```javascript
limiter.reset(userId); // Reset all
limiter.reset(userId, 'search'); // Reset specific operation
```

---

### 10. Build Errors

**Symptoms:**

- Build fails
- Import errors
- Module not found

**Solutions:**

**Regenerate Prisma Client:**

```bash
npm run db:generate
```

**Clear build cache:**

```bash
rm -rf .svelte-kit build
npm run build
```

**Check imports:**

```javascript
// Use correct import paths
import { prisma } from '$lib/database/client';
import { graphragConfig } from '$lib/config/graphrag.js';
```

**Verify dependencies:**

```bash
npm install
```

---

## Diagnostic Commands

### Check System Health

```bash
# Overall health
curl http://localhost:3000/api/health/graphrag | jq

# Specific checks
curl http://localhost:3000/api/health/graphrag | jq '.checks.pgvector'
curl http://localhost:3000/api/health/graphrag | jq '.checks.embedding'
curl http://localhost:3000/api/health/graphrag | jq '.checks.database'
```

### Check Statistics

```bash
# Admin stats (requires authentication)
curl -H "Cookie: session=admin-session" \
  http://localhost:3000/api/admin/graphrag/stats | jq

# Node count
curl -H "Cookie: session=admin-session" \
  http://localhost:3000/api/admin/graphrag/stats | jq '.overview.totalNodes'

# Embedding coverage
curl -H "Cookie: session=admin-session" \
  http://localhost:3000/api/admin/graphrag/stats | jq '.overview.embeddingCoverage'
```

### Database Queries

```sql
-- Node statistics
SELECT
  course_id,
  COUNT(*) as node_count,
  COUNT(embedding) as nodes_with_embeddings
FROM knowledge_graph_nodes
GROUP BY course_id;

-- Relationship statistics
SELECT
  relationship_type,
  COUNT(*) as count,
  AVG(weight) as avg_weight
FROM knowledge_graph_relationships
GROUP BY relationship_type;

-- Storage size
SELECT
  pg_size_pretty(pg_total_relation_size('knowledge_graph_nodes')) as nodes_size,
  pg_size_pretty(pg_total_relation_size('knowledge_graph_relationships')) as relationships_size;

-- Index efficiency
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('knowledge_graph_nodes', 'knowledge_graph_relationships');
```

### Log Analysis

```bash
# Search for errors
grep "ERROR" logs/app.log | grep GraphRAG

# Search for slow operations
grep "GraphRAG.*latency" logs/app.log | awk '$NF > 1000'

# Count operations
grep "GraphRAG" logs/app.log | cut -d' ' -f3 | sort | uniq -c
```

---

## Performance Optimization

### 1. Embedding Generation

**Optimize:**

- Enable caching
- Use batch operations
- Use smaller model/dimensions
- Implement request queuing

**Monitor:**

```javascript
const stats = embeddingService.getUsageStats();
console.log('Token usage:', stats.monthly);
console.log('Cache stats:', embeddingService.getCacheStats());
```

### 2. Vector Search

**Optimize:**

- Tune index parameters
- Enable query caching
- Use appropriate similarity threshold
- Limit result count

**Monitor:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM knowledge_graph_nodes
WHERE embedding IS NOT NULL
ORDER BY embedding <=> '[...]'::vector
LIMIT 10;
```

### 3. Database

**Optimize:**

- Regular VACUUM
- Update statistics
- Optimize connection pool
- Use read replicas for queries

**Monitor:**

```sql
-- Table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'knowledge_graph%';

-- Connection pool
SELECT
  count(*) as total,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'your_database';
```

---

## Getting Help

### 1. Check Logs

```bash
# Application logs
tail -f logs/app.log | grep GraphRAG

# Database logs
tail -f /usr/local/var/log/postgresql@15.log
```

### 2. Enable Debug Logging

```bash
LOG_LEVEL="debug"
```

### 3. Run Health Checks

```bash
npm run test:run tests/integration/graphrag/
```

### 4. Contact Support

Include:

- Error messages
- Health check output
- System configuration
- Steps to reproduce
- Expected vs actual behavior

---

## Prevention

### Regular Maintenance

```bash
# Weekly
npm run db:backup
npm run db:cleanup

# Monthly
# Review token usage
# Check index efficiency
# Update dependencies
# Review logs for errors
```

### Monitoring

Set up alerts for:

- Health check failures
- High token usage (> 80% of limit)
- Slow queries (> 1s)
- High error rates
- Low embedding coverage (< 80%)

### Best Practices

1. Always test in staging first
2. Create backups before changes
3. Monitor token usage
4. Enable caching
5. Use appropriate batch sizes
6. Regular index maintenance
7. Keep dependencies updated
8. Review logs regularly
