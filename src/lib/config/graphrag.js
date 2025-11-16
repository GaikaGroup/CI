/**
 * GraphRAG Configuration
 *
 * Centralized configuration for GraphRAG system including storage,
 * embedding, search, performance, and monitoring settings.
 */

export const graphragConfig = {
  storage: {
    usePgvector: process.env.USE_PGVECTOR !== 'false',
    fallbackToMemory: true
  },

  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || 'openai',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536'),
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100'),
    monthlyLimit: parseInt(process.env.EMBEDDING_MONTHLY_LIMIT || '1000000'),
    cacheEnabled: process.env.ENABLE_EMBEDDING_CACHE !== 'false',
    apiKey: process.env.OPENAI_API_KEY
  },

  search: {
    defaultLimit: parseInt(process.env.DEFAULT_SEARCH_LIMIT || '10'),
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.5'),
    cacheEnabled: process.env.ENABLE_QUERY_CACHE !== 'false',
    cacheTTL: parseInt(process.env.QUERY_CACHE_TTL || '300'), // seconds
    cacheMaxSize: parseInt(process.env.QUERY_CACHE_MAX_SIZE || '100')
  },

  performance: {
    maxConcurrentEmbeddings: 5,
    maxConcurrentQueries: 10,
    queryTimeout: 5000, // ms
    embeddingTimeout: 10000, // ms
    batchInsertSize: 500 // nodes per transaction
  },

  monitoring: {
    enabled: process.env.ENABLE_METRICS !== 'false',
    healthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};
