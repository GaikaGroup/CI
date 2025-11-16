import { graphragConfig } from '$lib/config/graphrag.js';

/**
 * In-Memory Storage Adapter
 *
 * Storage adapter that uses Maps for storage with embedding-based semantic search.
 * Supports both embedding-based and keyword-based search.
 */
export class InMemoryStorageAdapter {
  constructor(embeddingService = null) {
    this.nodes = new Map(); // nodeId -> node
    this.relationships = new Map(); // relationshipId -> relationship
    this.materialIndex = new Map(); // materialId -> Set of nodeIds
    this.courseIndex = new Map(); // courseId -> Set of nodeIds
    this.nodeIdCounter = 0;
    this.embeddingService = embeddingService;
  }

  /**
   * Store a single node
   * @param {Object} node - Node data
   * @returns {Promise<Object>} Result with stored node
   */
  async storeNode(node) {
    try {
      if (!node.content || !node.materialId || !node.courseId) {
        throw new Error('Missing required fields: content, materialId, courseId');
      }

      const nodeId = node.id || `node_${++this.nodeIdCounter}`;

      // Generate embedding if service is available
      let embedding = node.embedding;
      if (!embedding && this.embeddingService) {
        const embeddingResult = await this.embeddingService.generateEmbedding(node.content);
        if (embeddingResult.success) {
          embedding = embeddingResult.embedding;
        }
      }

      const storedNode = {
        id: nodeId,
        courseId: node.courseId,
        materialId: node.materialId,
        content: node.content,
        chunkIndex: node.chunkIndex || 0,
        metadata: node.metadata || {},
        embedding: embedding || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.nodes.set(nodeId, storedNode);

      // Update indexes
      if (!this.materialIndex.has(node.materialId)) {
        this.materialIndex.set(node.materialId, new Set());
      }
      this.materialIndex.get(node.materialId).add(nodeId);

      if (!this.courseIndex.has(node.courseId)) {
        this.courseIndex.set(node.courseId, new Set());
      }
      this.courseIndex.get(node.courseId).add(nodeId);

      return {
        success: true,
        node: storedNode
      };
    } catch (error) {
      console.error('[InMemoryStorageAdapter] Error storing node:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store multiple nodes
   * @param {Object[]} nodes - Array of nodes to store
   * @returns {Promise<Object>} Result with stored nodes
   */
  async storeBatchNodes(nodes) {
    try {
      if (!Array.isArray(nodes) || nodes.length === 0) {
        throw new Error('Invalid nodes: must be non-empty array');
      }

      // Generate embeddings in batch if service is available
      let embeddings = [];
      if (this.embeddingService) {
        const texts = nodes.map((n) => n.content);
        const embeddingResult = await this.embeddingService.generateBatchEmbeddings(texts);
        if (embeddingResult.success) {
          embeddings = embeddingResult.embeddings;
        }
      }

      const storedNodes = [];

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const embedding = embeddings[i] || node.embedding || null;

        const result = await this.storeNode({
          ...node,
          embedding
        });

        if (result.success) {
          storedNodes.push(result.node);
        }
      }

      return {
        success: true,
        nodes: storedNodes,
        count: storedNodes.length
      };
    } catch (error) {
      console.error('[InMemoryStorageAdapter] Error storing batch nodes:', error);
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

      const relId = `${relationship.sourceNodeId}_${relationship.targetNodeId}_${relationship.relationshipType}`;

      const storedRelationship = {
        id: relId,
        sourceNodeId: relationship.sourceNodeId,
        targetNodeId: relationship.targetNodeId,
        relationshipType: relationship.relationshipType,
        weight: relationship.weight || 1.0,
        metadata: relationship.metadata || {},
        createdAt: new Date()
      };

      this.relationships.set(relId, storedRelationship);

      return {
        success: true,
        relationship: storedRelationship
      };
    } catch (error) {
      console.error('[InMemoryStorageAdapter] Error storing relationship:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Semantic search using embeddings or keyword-based fallback
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async semanticSearch(query, options = {}) {
    try {
      const startTime = Date.now();

      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query: must be non-empty string');
      }

      // Filter nodes by materialId/courseId if provided
      let nodesToSearch = Array.from(this.nodes.values());

      if (options.materialId) {
        const nodeIds = this.materialIndex.get(options.materialId) || new Set();
        nodesToSearch = nodesToSearch.filter((n) => nodeIds.has(n.id));
      }

      if (options.courseId) {
        const nodeIds = this.courseIndex.get(options.courseId) || new Set();
        nodesToSearch = nodesToSearch.filter((n) => nodeIds.has(n.id));
      }

      let scoredResults;

      // Try embedding-based search if service is available
      if (this.embeddingService) {
        const embeddingResult = await this.embeddingService.generateEmbedding(query);

        if (embeddingResult.success) {
          // Calculate cosine similarity with each node
          scoredResults = nodesToSearch
            .filter((node) => node.embedding)
            .map((node) => ({
              ...node,
              similarity: this.cosineSimilarity(embeddingResult.embedding, node.embedding)
            }))
            .filter(
              (node) =>
                node.similarity >=
                (options.similarityThreshold || graphragConfig.search.similarityThreshold)
            )
            .sort((a, b) => b.similarity - a.similarity);
        }
      }

      // Fallback to keyword-based search
      if (!scoredResults || scoredResults.length === 0) {
        const queryTerms = query
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length > 2);

        if (queryTerms.length === 0) {
          return {
            success: true,
            results: [],
            count: 0,
            cached: false,
            latency: Date.now() - startTime
          };
        }

        scoredResults = nodesToSearch
          .map((node) => ({
            ...node,
            similarity: this.calculateKeywordScore(node.content, queryTerms)
          }))
          .filter((node) => node.similarity > 0)
          .sort((a, b) => b.similarity - a.similarity);
      }

      // Apply limit
      const limit = options.limit || graphragConfig.search.defaultLimit;
      const results = scoredResults.slice(0, limit);

      return {
        success: true,
        results,
        count: results.length,
        cached: false,
        latency: Date.now() - startTime
      };
    } catch (error) {
      console.error('[InMemoryStorageAdapter] Error in semantic search:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} Cosine similarity (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate keyword-based relevance score
   * @param {string} content - Node content
   * @param {string[]} queryTerms - Query terms
   * @returns {number} Relevance score (0-1)
   */
  calculateKeywordScore(content, queryTerms) {
    const contentLower = content.toLowerCase();
    let score = 0;
    let totalMatches = 0;

    for (const term of queryTerms) {
      const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
      if (matches > 0) {
        totalMatches += matches;
        // Boost score for exact matches
        score += matches * (term.length / content.length);
      }
    }

    // Normalize score
    if (totalMatches > 0) {
      score = Math.min(score * 10, 1.0); // Scale and cap at 1.0
    }

    return score;
  }

  /**
   * Get all nodes for a material with relationships
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Nodes and relationships
   */
  async getNodesByMaterial(materialId) {
    try {
      const nodeIds = this.materialIndex.get(materialId) || new Set();
      const nodes = Array.from(nodeIds)
        .map((id) => this.nodes.get(id))
        .filter(Boolean)
        .sort((a, b) => a.chunkIndex - b.chunkIndex);

      // Get relationships for these nodes
      const nodeIdSet = new Set(nodeIds);
      const relationships = Array.from(this.relationships.values()).filter(
        (rel) => nodeIdSet.has(rel.sourceNodeId) || nodeIdSet.has(rel.targetNodeId)
      );

      // Attach relationships to nodes
      const nodesWithRelationships = nodes.map((node) => ({
        ...node,
        sourceRelationships: relationships.filter((r) => r.sourceNodeId === node.id),
        targetRelationships: relationships.filter((r) => r.targetNodeId === node.id)
      }));

      return {
        success: true,
        nodes: nodesWithRelationships,
        count: nodes.length
      };
    } catch (error) {
      console.error('[InMemoryStorageAdapter] Error getting nodes:', error);
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
      const nodeIds = this.materialIndex.get(materialId) || new Set();
      let deletedCount = 0;

      // Delete nodes
      for (const nodeId of nodeIds) {
        this.nodes.delete(nodeId);
        deletedCount++;
      }

      // Delete relationships
      const relationshipsToDelete = Array.from(this.relationships.entries())
        .filter(([, rel]) => nodeIds.has(rel.sourceNodeId) || nodeIds.has(rel.targetNodeId))
        .map(([id]) => id);

      for (const relId of relationshipsToDelete) {
        this.relationships.delete(relId);
      }

      // Update indexes
      this.materialIndex.delete(materialId);

      // Update course index
      for (const nodeId of nodeIds) {
        for (const [courseId, courseNodeIds] of this.courseIndex.entries()) {
          courseNodeIds.delete(nodeId);
          if (courseNodeIds.size === 0) {
            this.courseIndex.delete(courseId);
          }
        }
      }

      return {
        success: true,
        deletedCount
      };
    } catch (error) {
      console.error('[InMemoryStorageAdapter] Error deleting material graph:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up orphaned nodes (not applicable for in-memory)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOrphanedNodes() {
    return {
      success: true,
      deletedCount: 0,
      message: 'Cleanup not needed for in-memory storage'
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.nodes.clear();
    this.relationships.clear();
    this.materialIndex.clear();
    this.courseIndex.clear();
    this.nodeIdCounter = 0;
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage stats
   */
  getStats() {
    return {
      nodeCount: this.nodes.size,
      relationshipCount: this.relationships.size,
      materialCount: this.materialIndex.size,
      courseCount: this.courseIndex.size
    };
  }
}
