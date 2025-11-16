import { StorageAdapterFactory } from '../../graphrag/factories/StorageAdapterFactory.js';

/**
 * GraphRAG Service
 *
 * This service provides GraphRAG (Graph Retrieval-Augmented Generation) functionality
 * for processing and querying reference materials. Now uses persistent storage with pgvector
 * for semantic search, with automatic fallback to in-memory storage.
 */

/**
 * GraphRAG Service class
 */
export class GraphRAGService {
  constructor(storageAdapter = null) {
    this.storageAdapter = storageAdapter;
    this.initialized = false;
  }

  /**
   * Initialize storage adapter
   * @returns {Promise<void>}
   */
  async initialize() {
    if (!this.initialized) {
      if (!this.storageAdapter) {
        this.storageAdapter = await StorageAdapterFactory.create();
      }
      this.initialized = true;
    }
  }

  /**
   * Process a document and create knowledge graph nodes
   * @param {string} content - Document content
   * @param {Object} metadata - Document metadata (must include materialId and courseId)
   * @returns {Promise<Object>} Processing result
   */
  async processDocument(content, metadata) {
    try {
      await this.initialize();

      if (!metadata.materialId || !metadata.courseId) {
        throw new Error('Missing required metadata: materialId and courseId');
      }

      // Chunk content
      const chunks = this.chunkContent(content);

      // Create node objects
      const nodes = chunks.map((chunk, index) => ({
        courseId: metadata.courseId,
        materialId: metadata.materialId,
        content: chunk,
        chunkIndex: index,
        metadata: {
          fileName: metadata.fileName,
          fileType: metadata.fileType,
          processedAt: new Date()
        }
      }));

      // Store nodes (embeddings generated automatically by DatabaseStorageAdapter)
      const result = await this.storageAdapter.storeBatchNodes(nodes);

      if (!result.success) {
        throw new Error(`Failed to store nodes: ${result.error}`);
      }

      // Create relationships between sequential chunks
      const relationships = [];
      for (let i = 0; i < result.nodes.length - 1; i++) {
        const relResult = await this.storageAdapter.storeRelationship({
          sourceNodeId: result.nodes[i].id,
          targetNodeId: result.nodes[i + 1].id,
          relationshipType: 'follows',
          weight: 1.0
        });

        if (relResult.success) {
          relationships.push(relResult.relationship);
        }
      }

      return {
        success: true,
        nodes: result.nodes,
        relationships,
        metadata: {
          processedAt: new Date(),
          chunkCount: chunks.length,
          nodeCount: result.nodes.length,
          relationshipCount: relationships.length
        }
      };
    } catch (error) {
      console.error('[GraphRAGService] Error processing document:', error);
      return {
        success: false,
        error: error.message,
        nodes: [],
        relationships: []
      };
    }
  }

  /**
   * Create knowledge graph for a course's materials
   * @param {Object[]} materials - Array of materials
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Knowledge graph creation result
   */
  async createKnowledgeGraph(materials, courseId) {
    try {
      await this.initialize();

      if (!courseId) {
        throw new Error('Course ID is required');
      }

      if (!Array.isArray(materials) || materials.length === 0) {
        throw new Error('No materials provided');
      }

      const allNodes = [];
      const allRelationships = [];

      // Process each material
      for (const material of materials) {
        if (material.status === 'ready' && material.content) {
          const processingResult = await this.processDocument(material.content, {
            materialId: material.id,
            courseId: courseId,
            fileName: material.fileName,
            fileType: material.fileType
          });

          if (processingResult.success) {
            allNodes.push(...processingResult.nodes);
            allRelationships.push(...processingResult.relationships);
          }
        }
      }

      return {
        success: true,
        nodeCount: allNodes.length,
        relationshipCount: allRelationships.length,
        materialCount: materials.length,
        message: 'Knowledge graph created successfully'
      };
    } catch (error) {
      console.error('[GraphRAGService] Error creating knowledge graph:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query knowledge base for relevant information using semantic search
   * @param {string} query - Search query
   * @param {string} courseId - Course ID
   * @param {Object} options - Additional search options
   * @returns {Promise<Object>} Query result
   */
  async queryKnowledge(query, courseId, options = {}) {
    try {
      await this.initialize();

      if (!query || typeof query !== 'string') {
        throw new Error('Invalid query: must be non-empty string');
      }

      // Use semantic search (or keyword fallback for in-memory adapter)
      const searchResult = await this.storageAdapter.semanticSearch(query, {
        courseId,
        ...options
      });

      if (!searchResult.success) {
        throw new Error(`Search failed: ${searchResult.error}`);
      }

      return {
        success: true,
        results: searchResult.results,
        count: searchResult.count,
        cached: searchResult.cached,
        latency: searchResult.latency,
        query,
        message: `Found ${searchResult.count} relevant results`
      };
    } catch (error) {
      console.error('[GraphRAGService] Error querying knowledge:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Update knowledge base when materials change
   * @param {string} materialId - Material ID
   * @param {string} courseId - Course ID
   * @param {string} content - Updated content
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Update result
   */
  async updateKnowledgeBase(materialId, courseId, content, metadata = {}) {
    try {
      await this.initialize();

      // Delete old nodes for this material
      const deleteResult = await this.storageAdapter.deleteMaterialGraph(materialId);

      if (!deleteResult.success) {
        console.warn('[GraphRAGService] Failed to delete old nodes:', deleteResult.error);
      }

      // Process updated content
      const processingResult = await this.processDocument(content, {
        materialId,
        courseId,
        ...metadata,
        updatedAt: new Date()
      });

      if (!processingResult.success) {
        throw new Error(`Failed to process updated content: ${processingResult.error}`);
      }

      return {
        success: true,
        nodeCount: processingResult.nodes.length,
        relationshipCount: processingResult.relationships.length,
        message: 'Knowledge base updated successfully'
      };
    } catch (error) {
      console.error('[GraphRAGService] Error updating knowledge base:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete material from knowledge base
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFromKnowledgeBase(materialId) {
    try {
      await this.initialize();

      const result = await this.storageAdapter.deleteMaterialGraph(materialId);

      if (!result.success) {
        throw new Error(`Failed to delete material: ${result.error}`);
      }

      return {
        success: true,
        deletedCount: result.deletedCount,
        message:
          result.deletedCount > 0
            ? `Removed ${result.deletedCount} nodes from knowledge base`
            : 'Material not found in knowledge base'
      };
    } catch (error) {
      console.error('[GraphRAGService] Error deleting from knowledge base:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get knowledge graph for a material
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Knowledge graph data
   */
  async getKnowledgeGraph(materialId) {
    try {
      await this.initialize();

      const result = await this.storageAdapter.getNodesByMaterial(materialId);

      if (!result.success) {
        throw new Error(`Failed to get knowledge graph: ${result.error}`);
      }

      return {
        success: true,
        nodes: result.nodes,
        count: result.count
      };
    } catch (error) {
      console.error('[GraphRAGService] Error getting knowledge graph:', error);
      return {
        success: false,
        error: error.message,
        nodes: []
      };
    }
  }

  /**
   * Chunk content into smaller pieces
   * @param {string} content - Content to chunk
   * @returns {string[]} Array of content chunks
   */
  chunkContent(content) {
    // Simple chunking by sentences/paragraphs
    // In a real implementation, this would be more sophisticated
    const chunks = [];
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let currentChunk = '';
    const maxChunkSize = 500; // characters

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence.trim();
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
