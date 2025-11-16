# GraphRAG API Documentation

## Overview

The GraphRAG system provides semantic search capabilities for course materials using vector embeddings and PostgreSQL with pgvector.

## GraphRAG Service

### `processDocument(content, metadata)`

Process a document and create knowledge graph nodes.

**Parameters:**

- `content` (string): Document content to process
- `metadata` (object):
  - `materialId` (string, required): Unique material identifier
  - `courseId` (string, required): Course identifier
  - `fileName` (string, optional): Original filename
  - `fileType` (string, optional): MIME type

**Returns:**

```javascript
{
  success: true,
  nodes: [...],           // Array of created nodes
  relationships: [...],   // Array of created relationships
  metadata: {
    processedAt: Date,
    chunkCount: number,
    nodeCount: number,
    relationshipCount: number
  }
}
```

**Example:**

```javascript
const result = await graphRAGService.processDocument('Machine learning is a subset of AI...', {
  materialId: 'material-123',
  courseId: 'course-456',
  fileName: 'intro.txt',
  fileType: 'text/plain'
});
```

### `createKnowledgeGraph(materials, courseId)`

Create knowledge graph for multiple materials.

**Parameters:**

- `materials` (array): Array of material objects
  - `id` (string): Material ID
  - `status` (string): Material status ('ready' to process)
  - `content` (string): Material content
  - `fileName` (string): Filename
  - `fileType` (string): MIME type
- `courseId` (string): Course identifier

**Returns:**

```javascript
{
  success: true,
  nodeCount: number,
  relationshipCount: number,
  materialCount: number,
  message: string
}
```

### `queryKnowledge(query, courseId, options)`

Search knowledge base using semantic similarity.

**Parameters:**

- `query` (string): Search query
- `courseId` (string): Course identifier
- `options` (object, optional):
  - `materialId` (string): Filter by material
  - `limit` (number): Max results (default: 10)
  - `similarityThreshold` (number): Min similarity (default: 0.5)

**Returns:**

```javascript
{
  success: true,
  results: [
    {
      id: string,
      material_id: string,
      course_id: string,
      content: string,
      chunk_index: number,
      metadata: object,
      similarity: number  // 0-1 score
    }
  ],
  count: number,
  cached: boolean,
  latency: number,
  query: string,
  message: string
}
```

**Example:**

```javascript
const result = await graphRAGService.queryKnowledge('What is machine learning?', 'course-456', {
  limit: 5,
  similarityThreshold: 0.7
});
```

### `updateKnowledgeBase(materialId, courseId, content, metadata)`

Update knowledge base when material content changes.

**Parameters:**

- `materialId` (string): Material identifier
- `courseId` (string): Course identifier
- `content` (string): Updated content
- `metadata` (object, optional): Additional metadata

**Returns:**

```javascript
{
  success: true,
  nodeCount: number,
  relationshipCount: number,
  message: string
}
```

### `deleteFromKnowledgeBase(materialId)`

Delete material from knowledge base.

**Parameters:**

- `materialId` (string): Material identifier

**Returns:**

```javascript
{
  success: true,
  deletedCount: number,
  message: string
}
```

### `getKnowledgeGraph(materialId)`

Get knowledge graph for a material.

**Parameters:**

- `materialId` (string): Material identifier

**Returns:**

```javascript
{
  success: true,
  nodes: [...],
  count: number
}
```

## HTTP Endpoints

### Health Check

**GET** `/api/health/graphrag`

Check GraphRAG system health.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "pgvector": { "status": "ok" },
    "embedding": {
      "status": "ok",
      "latency": 450,
      "cached": false
    },
    "database": { "status": "ok" }
  },
  "stats": {
    "nodes": 1234,
    "relationships": 5678,
    "embeddingCoverage": "95.5%",
    "nodesWithEmbeddings": 1178
  }
}
```

**Status Codes:**

- `200`: System healthy
- `503`: System degraded or unhealthy

### Admin Statistics

**GET** `/api/admin/graphrag/stats`

Get detailed GraphRAG statistics (admin only).

**Authentication:** Required (admin role)

**Response:**

```json
{
  "overview": {
    "totalNodes": 1234,
    "totalRelationships": 5678,
    "materialsWithGraphs": 45,
    "coursesWithGraphs": 12,
    "embeddingCoverage": "95.5%",
    "nodesWithEmbeddings": 1178,
    "estimatedStorageMB": "12.34"
  },
  "topMaterials": [
    {
      "materialId": "material-123",
      "courseId": "course-456",
      "nodeCount": 150
    }
  ],
  "recentNodes": [
    {
      "id": "node-789",
      "materialId": "material-123",
      "courseId": "course-456",
      "chunkIndex": 0,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**

- `200`: Success
- `401`: Not authenticated
- `403`: Not authorized (not admin)
- `500`: Server error

## Configuration

### Environment Variables

```bash
# Storage
USE_PGVECTOR="true"                    # Enable pgvector storage

# Embedding Service
EMBEDDING_PROVIDER="openai"            # Provider: openai
EMBEDDING_MODEL="text-embedding-3-small"  # Model name
EMBEDDING_DIMENSIONS="1536"            # Vector dimensions: 512, 1536, 3072
EMBEDDING_BATCH_SIZE="100"             # Batch size for bulk operations
EMBEDDING_MONTHLY_LIMIT="1000000"      # Monthly token limit

# Caching
ENABLE_EMBEDDING_CACHE="true"          # Cache embeddings
ENABLE_QUERY_CACHE="true"              # Cache query results
QUERY_CACHE_TTL="300"                  # Cache TTL in seconds
QUERY_CACHE_MAX_SIZE="100"             # Max cached queries

# Search
DEFAULT_SEARCH_LIMIT="10"              # Default result limit
SIMILARITY_THRESHOLD="0.5"             # Min similarity score (0-1)

# Monitoring
ENABLE_METRICS="true"                  # Enable metrics collection
ENABLE_HEALTH_CHECKS="true"            # Enable health endpoints
LOG_LEVEL="info"                       # Log level: debug, info, warn, error
```

### Configuration Object

```javascript
import { graphragConfig } from '$lib/config/graphrag.js';

// Access configuration
console.log(graphragConfig.embedding.model);
console.log(graphragConfig.search.defaultLimit);
```

## Storage Adapters

### DatabaseStorageAdapter

Uses PostgreSQL with pgvector for persistent storage and semantic search.

**Features:**

- Real vector embeddings via OpenAI API
- Semantic similarity search with cosine distance
- LRU query cache
- Batch operations with transactions
- Automatic embedding generation

### InMemoryStorageAdapter

Fallback adapter using Maps for storage and keyword-based search.

**Features:**

- No external dependencies
- Keyword matching search
- Fast for small datasets
- Automatic fallback when pgvector unavailable

### StorageAdapterFactory

Automatically selects appropriate adapter:

```javascript
import { StorageAdapterFactory } from '$lib/modules/graphrag/factories/StorageAdapterFactory.js';

// Auto-detect and create adapter
const adapter = await StorageAdapterFactory.create();

// Check adapter type
const type = await StorageAdapterFactory.getAdapterType();
// Returns: 'database' or 'memory'
```

## Error Handling

All methods return consistent error format:

```javascript
{
  success: false,
  error: "Error message",
  // Additional context may be included
}
```

**Common Errors:**

- `"Missing required fields"`: Required parameters not provided
- `"Invalid query"`: Query validation failed
- `"Monthly token limit exceeded"`: Embedding API limit reached
- `"Rate limit exceeded"`: Too many requests
- `"Embedding generation failed"`: OpenAI API error
- `"pgvector not available"`: Database extension not installed

## Rate Limiting

Default limits per user:

- **Search operations**: 100 requests/minute
- **Embedding generation**: 1000 requests/hour

**Error Response:**

```json
{
  "success": false,
  "error": "Rate limit exceeded for search. Maximum 100 requests per 60 seconds. Try again in 45 seconds."
}
```

## Best Practices

### 1. Batch Operations

Use batch methods for multiple documents:

```javascript
// Good: Process multiple materials at once
await graphRAGService.createKnowledgeGraph(materials, courseId);

// Avoid: Process one at a time
for (const material of materials) {
  await graphRAGService.processDocument(material.content, {...});
}
```

### 2. Cache Warming

Pre-generate embeddings for common queries:

```javascript
const commonQueries = [
  'What is machine learning?',
  'Explain neural networks',
  'How does deep learning work?'
];

for (const query of commonQueries) {
  await graphRAGService.queryKnowledge(query, courseId);
}
```

### 3. Error Handling

Always check success flag:

```javascript
const result = await graphRAGService.queryKnowledge(query, courseId);

if (!result.success) {
  console.error('Search failed:', result.error);
  // Handle error appropriately
  return;
}

// Use results
console.log(`Found ${result.count} results`);
```

### 4. Resource Cleanup

Delete unused knowledge graphs:

```javascript
// When material is deleted
await graphRAGService.deleteFromKnowledgeBase(materialId);
```

## Performance Tips

1. **Use appropriate similarity threshold**: Higher threshold (0.7-0.9) for precise results, lower (0.3-0.5) for broader matches

2. **Limit result count**: Request only what you need (default: 10)

3. **Enable caching**: Both embedding and query caching significantly improve performance

4. **Monitor token usage**: Track monthly usage to avoid hitting limits

5. **Batch operations**: Process multiple documents together when possible

## Migration

See [deployment.md](./deployment.md) for migration from in-memory to database storage.

## Troubleshooting

See [troubleshooting.md](./troubleshooting.md) for common issues and solutions.
