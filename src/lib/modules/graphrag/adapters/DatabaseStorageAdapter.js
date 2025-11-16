import { prisma } from '$lib/database/client';
import { graphragConfig } from '$lib/config/graphrag.js';
import { insertNodeWithVector, vectorSearch } from '../utils/vectorHelpers.js';

/**
 * Database Storage Adapter
 *
 * Stores knowledge graph data in PostgreSQL with pgvector for semantic search.
 * Implements caching and batch operations for performance.
 */
export class DatabaseStorageAdapter {
  constructor(embeddingService) {
    this.embeddingService = embeddingService;
    this.queryCache = new Map(); // query hash -> { results, timestamp }
    this.cacheEnabled = graphragConfig.search.cacheEnabled;
    this.cacheTTL = graphragConfig.search.cacheTTL * 1000; // convert to ms
    this.cacheMaxSize = graphragConfig.search.cacheMaxSize;
  }

  /**
   * Store a single node with automatic embedding generation
   * @param {Object} node - Node data
   * @returns {Promise<Object>} Result with stored node
   */
  async storeNode(node) {
    try {
      // Validate input
      if (!node.content || !node.materialId || !node.courseId) {
        throw new Error('Missing required fields: content, materialId, courseId');
      }

      // Generate embedding
      const embeddingResult = await this.embeddingService.generateEmbedding(node.content);

      if (!embeddingResult.success) {
        throw new Error(`Embedding generation failed: ${embeddingResult.error}`);
      }

      // Store in database using helper function
      const id = await insertNodeWithVector(prisma, node, embeddingResult.embedding);

      // Fetch the stored node
      const storedNode = await prisma.knowledgeGraphNode.findUnique({
        where: { id }
      });

      return {
        success: true,
        node: storedNode
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error storing node:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store multiple nodes in a transaction with batch embedding generation
   * @param {Object[]} nodes - Array of nodes to store
   * @returns {Promise<Object>} Result with stored nodes
   */
  async storeBatchNodes(nodes) {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('Invalid nodes: must be non-empty array');
      }

      // Generate embeddings for all nodes
      const texts = nodes.map((n) => n.content);
      const embeddingResult = await this.embeddingService.generateBatchEmbeddings(texts);

      if (!embeddingResult.success) {
        throw new Error(`Batch embedding generation failed: ${embeddingResult.error}`);
      }

      // Create batches for database insertion
      const batchSize = graphragConfig.performance.batchInsertSize;
      const batches = this.createBatches(nodes, batchSize);
      const allStoredNodes = [];

      // Process each batch in a transaction
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const startIdx = i * batchSize;

        const storedNodes = await prisma.$transaction(async (tx) => {
          const insertedIds = [];

          for (let idx = 0; idx < batch.length; idx++) {
            const node = batch[idx];
            const embeddingIdx = startIdx + idx;
            const id = await insertNodeWithVector(
              tx,
              node,
              embeddingResult.embeddings[embeddingIdx]
            );
            insertedIds.push(id);
          }

          // Fetch all inserted nodes
          return tx.knowledgeGraphNode.findMany({
            where: {
              id: { in: insertedIds }
            }
          });
        });

        allStoredNodes.push(...storedNodes);
      }

      return {
        success: true,
        nodes: allStoredNodes,
        count: allStoredNodes.length
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error storing batch nodes:', error);
      return {
        success: false,
        error: error.message,
        nodes: []
      };
    }
  }

  /**
   * Store a relationship between nodes
   * @param {Object} relationship - Relationship data
   * @returns {Promise<Object>} Result with stored relationship
   */
  async storeRelationship(relationship) {
    try {
      if (
        !relationship.sourceNodeId ||
        !relationship.targetNodeId ||
        !relationship.relationshipType
      ) {
        throw new Error('Missing required fields: sourceNodeId, targetNodeId, relationshipType');
      }

      // Upsert relationship (update if exists, create if not)
      const storedRelationship = await prisma.knowledgeGraphRelationship.upsert({
        where: {
          idx_kg_rel_unique: {
            sourceNodeId: relationship.sourceNodeId,
            targetNodeId: relationship.targetNodeId,
            relationshipType: relationship.relationshipType
          }
        },
        update: {
          weight: relationship.weight || 1.0,
          metadata: relationship.metadata || {}
        },
        create: {
          sourceNodeId: relationship.sourceNodeId,
          targetNodeId: relationship.targetNodeId,
          relationshipType: relationship.relationshipType,
          weight: relationship.weight || 1.0,
          metadata: relationship.metadata || {}
        }
      });

      return {
        success: true,
        relationship: storedRelationship
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error storing relationship:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Semantic search using pgvector cosine similarity
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async semanticSearch(query, options = {}) {
    try {
      const startTime = Date.now();

      // Check cache
      const cacheKey = this.getQueryCacheKey(query, options);
      if (this.cacheEnabled) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return {
            success: true,
            results: cached,
            cached: true,
            latency: Date.now() - startTime
          };
        }
      }

      // Generate query embedding
      const embeddingResult = await this.embeddingService.generateEmbedding(query);

      if (!embeddingResult.success) {
        throw new Error(`Query embedding failed: ${embeddingResult.error}`);
      }

      // Build query with filters
      const limit = options.limit || graphragConfig.search.defaultLimit;
      const threshold = options.similarityThreshold || graphragConfig.search.similarityThreshold;

      let whereClause = 'WHERE embedding IS NOT NULL';
      const params = [embeddingResult.embedding];

      if (options.materialId) {
        whereClause += ' AND material_id = $2';
        params.push(options.materialId);
      }

      if (options.courseId) {
        const paramIdx = params.length + 1;
        whereClause += ` AND course_id = $${paramIdx}`;
        params.push(options.courseId);
      }

      // Execute vector similarity search
      const results = await prisma.$queryRawUnsafe(
        `
        SELECT 
          id,
          material_id,
          course_id,
          content,
          chunk_index,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM knowledge_graph_nodes
        ${whereClause}
          AND 1 - (embedding <=> $1::vector) >= ${threshold}
        ORDER BY embedding <=> $1::vector
        LIMIT ${limit}
      `,
        ...params
      );

      // Cache results
      if (this.cacheEnabled) {
        this.addToCache(cacheKey, results);
      }

      return {
        success: true,
        results,
        count: results.length,
        cached: false,
        latency: Date.now() - startTime
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error in semantic search:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Get all nodes for a material with relationships
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Nodes and relationships
   */
  async getNodesByMaterial(materialId) {
    try {
      const nodes = await prisma.knowledgeGraphNode.findMany({
        where: { materialId },
        include: {
          sourceRelationships: true,
          targetRelationships: true
        },
        orderBy: { chunkIndex: 'asc' }
      });

      return {
        success: true,
        nodes,
        count: nodes.length
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error getting nodes:', error);
      return {
        success: false,
        error: error.message,
        nodes: []
      };
    }
  }

  /**
   * Delete all nodes and relationships for a material
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMaterialGraph(materialId) {
    try {
      // Cascade delete is handled by foreign key constraints
      const result = await prisma.knowledgeGraphNode.deleteMany({
        where: { materialId }
      });

      // Clear cache
      this.clearCache();

      return {
        success: true,
        deletedCount: result.count
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error deleting material graph:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up orphaned nodes (nodes without valid course)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOrphanedNodes() {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM knowledge_graph_nodes
        WHERE course_id NOT IN (SELECT id FROM courses)
      `;

      return {
        success: true,
        deletedCount: result
      };
    } catch (error) {
      console.error('[DatabaseStorageAdapter] Error cleaning up orphaned nodes:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get query cache key
   * @param {string} query - Query text
   * @param {Object} options - Query options
   * @returns {string} Cache key
   */
  getQueryCacheKey(query, options) {
    const key = JSON.stringify({ query, ...options });
    return require('crypto').createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get results from cache if not expired
   * @param {string} key - Cache key
   * @returns {Array|null} Cached results or null
   */
  getFromCache(key) {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTTL) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.results;
  }

  /**
   * Add results to cache
   * @param {string} key - Cache key
   * @param {Array} results - Results to cache
   */
  addToCache(key, results) {
    // Implement LRU: remove oldest if at max size
    if (this.queryCache.size >= this.cacheMaxSize) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(key, {
      results,
      timestamp: Date.now()
    });
  }

  /**
   * Clear query cache
   */
  clearCache() {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.cacheMaxSize,
      enabled: this.cacheEnabled,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate (placeholder)
   * @returns {number} Hit rate (0-1)
   */
  calculateHitRate() {
    // This would need request tracking to calculate accurately
    return 0;
  }

  /**
   * Create batches from array
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array[]} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
