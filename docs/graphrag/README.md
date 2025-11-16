# GraphRAG with pgvector Integration

## Overview

This implementation integrates PostgreSQL's pgvector extension with the GraphRAG (Graph Retrieval-Augmented Generation) system, enabling persistent storage, real vector embeddings, and semantic similarity search for knowledge graphs.

## Quick Start

### 1. Prerequisites

```bash
# Install PostgreSQL with pgvector
brew install postgresql@15 pgvector

# Enable extension
psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Choose Embedding Provider

**Option A: OpenAI (Paid - $0.02 per 1M tokens)**

```bash
# .env
EMBEDDING_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
```

**Option B: Local (Free - Zero cost!)**

```bash
# Quick setup
npm run graphrag:setup-local

# Choose: Ollama (easiest) or Sentence-Transformers (best quality)
```

See [Cost Comparison](./COST_COMPARISON.md) and [Local Embeddings Guide](./local-embeddings.md)

### 3. Configuration

```bash
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"
USE_PGVECTOR="true"
```

### 3. Setup

```bash
# Install dependencies
npm install

# Run migrations
npm run db:migrate
npm run db:generate

# Build
npm run build
```

### 4. Verify

```bash
# Start server
npm run dev

# Check health
curl http://localhost:3000/api/health/graphrag
```

## Architecture

```
GraphRAG Service
    ↓
Storage Adapter Factory
    ↓
┌─────────────────┬──────────────────┐
│ Database        │ In-Memory        │
│ (pgvector)      │ (Fallback)       │
└─────────────────┴──────────────────┘
    ↓
Embedding Service (OpenAI)
```

## Key Features

### ✅ Persistent Storage

- Knowledge graphs stored in PostgreSQL
- Survives server restarts
- Scalable to 10,000+ nodes

### ✅ Semantic Search

- Real vector embeddings via OpenAI
- Cosine similarity search
- Configurable similarity threshold

### ✅ Automatic Fallback

- Detects pgvector availability
- Falls back to in-memory storage
- Keyword search when vector unavailable

### ✅ Cost Management

- Token usage tracking
- Monthly limits
- Embedding caching (SHA-256)
- Query result caching (LRU)

### ✅ Performance

- Batch processing (100 texts/batch)
- IVFFlat vector index
- Connection pooling
- Multi-level caching

### ✅ Monitoring

- Health check endpoint
- Admin statistics dashboard
- Comprehensive logging
- Error tracking

## Usage

### Process Documents

```javascript
import { GraphRAGService } from '$lib/modules/courses/services/GraphRAGService.js';

const service = new GraphRAGService();

const result = await service.processDocument(content, {
  materialId: 'material-123',
  courseId: 'course-456',
  fileName: 'intro.txt'
});
```

### Search Knowledge Base

```javascript
const results = await service.queryKnowledge('What is machine learning?', 'course-456', {
  limit: 10,
  similarityThreshold: 0.7
});
```

### Create Knowledge Graph

```javascript
const result = await service.createKnowledgeGraph(materials, courseId);
```

## API Endpoints

### Health Check

```bash
GET /api/health/graphrag
```

Returns system health status and statistics.

### Admin Statistics

```bash
GET /api/admin/graphrag/stats
```

Returns detailed statistics (admin only).

## Migration

Migrate existing in-memory knowledge graphs:

```bash
# Dry run
npm run graphrag:migrate:dry-run

# Actual migration
npm run graphrag:migrate
```

## Configuration

See [deployment.md](./deployment.md) for full configuration options.

## Documentation

- **[Deployment Guide](./deployment.md)** - Setup and deployment
- **[API Documentation](./api.md)** - Complete API reference
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions
- **[Implementation Status](./IMPLEMENTATION_STATUS.md)** - What's implemented

## Testing

```bash
# Unit tests
npm run test:run tests/unit/graphrag/

# Integration tests
npm run test:run tests/integration/graphrag/

# All tests
npm run test:run
```

## Performance

### Targets (P95)

- Vector search: <200ms
- Embedding generation: <500ms
- Batch embedding (100): <2s
- Node insertion: <50ms

### Optimization

- Enable caching
- Use appropriate batch sizes
- Tune similarity threshold
- Regular index maintenance

## Security

- Input validation (max lengths)
- Rate limiting (100 search/min, 1000 embed/hour)
- API key protection
- SQL injection prevention (Prisma)

## Cost Management

### Monitoring

```bash
curl -H "Cookie: session=admin" \
  http://localhost:3000/api/admin/graphrag/stats | jq '.overview'
```

### Optimization

- Enable embedding cache
- Use smaller dimensions (512 vs 1536)
- Batch operations
- Set monthly limits

## Support

### Issues?

1. Check [troubleshooting.md](./troubleshooting.md)
2. Review health check output
3. Check application logs
4. Verify configuration

### Common Issues

- **pgvector not found**: Install extension
- **API key invalid**: Check OPENAI_API_KEY
- **Slow searches**: Rebuild indexes
- **High costs**: Enable caching, reduce batch size

## License

Part of the AI Tutor Platform project.
