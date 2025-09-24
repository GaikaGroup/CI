/**
 * Document GraphRAG Processor
 *
 * This class extends the existing DocumentProcessor to integrate with GraphRAG
 * for course material processing. It maintains compatibility with existing
 * document processing while adding GraphRAG capabilities.
 */

import { DocumentProcessor } from '../../document/DocumentProcessor.js';
import { GraphRAGService } from './GraphRAGService.js';

/**
 * Document GraphRAG Processor class
 */
export class DocumentGraphRAGProcessor extends DocumentProcessor {
  constructor(classifier = null, sessionStorageAdapter = null, graphRAGService = null) {
    super(classifier, sessionStorageAdapter);
    this.graphRAGService = graphRAGService || new GraphRAGService();
  }

  /**
   * Process document with GraphRAG integration
   * @param {File} file - The document file to process
   * @param {Object} options - Processing options
   * @param {string} options.materialId - Material ID for GraphRAG processing
   * @param {string} options.courseId - Course ID
   * @param {boolean} options.enableGraphRAG - Whether to enable GraphRAG processing
   * @returns {Promise<Object>} Processing result with GraphRAG data
   */
  async processDocumentWithGraphRAG(file, options = {}) {
    try {
      // First, process the document using the standard processor
      const standardResult = await this.processDocument(file, options.sessionId);

      // If GraphRAG is disabled or processing failed, return standard result
      if (!options.enableGraphRAG || !standardResult.text) {
        return {
          ...standardResult,
          graphRAGProcessed: false
        };
      }

      // Process with GraphRAG if enabled and we have text content
      const graphRAGResult = await this.graphRAGService.processDocument(standardResult.text, {
        materialId: options.materialId,
        courseId: options.courseId,
        fileName: file.name,
        fileType: file.type,
        documentType: standardResult.documentType,
        confidence: standardResult.confidence
      });

      return {
        ...standardResult,
        graphRAGProcessed: graphRAGResult.success,
        graphRAGNodes: graphRAGResult.nodes || [],
        graphRAGEmbeddings: graphRAGResult.embeddings || [],
        graphRAGMetadata: graphRAGResult.metadata || {},
        graphRAGError: graphRAGResult.success ? null : graphRAGResult.error
      };
    } catch (error) {
      console.error('Error processing document with GraphRAG:', error);

      // Try to return at least the standard processing result
      try {
        const fallbackResult = await this.processDocument(file, options.sessionId);
        return {
          ...fallbackResult,
          graphRAGProcessed: false,
          graphRAGError: error.message
        };
      } catch (fallbackError) {
        throw new Error(`Document processing failed: ${error.message}`);
      }
    }
  }

  /**
   * Process multiple documents for a course
   * @param {File[]} files - Array of files to process
   * @param {Object} options - Processing options
   * @returns {Promise<Object[]>} Array of processing results
   */
  async processMultipleDocuments(files, options = {}) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileOptions = {
        ...options,
        materialId: options.materialId || `${options.courseId}_material_${i}`
      };

      try {
        const result = await this.processDocumentWithGraphRAG(file, fileOptions);
        results.push({
          success: true,
          file: file.name,
          ...result
        });
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({
          success: false,
          file: file.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Update GraphRAG knowledge base when document content changes
   * @param {string} materialId - Material ID
   * @param {string} newContent - Updated content
   * @returns {Promise<Object>} Update result
   */
  async updateGraphRAGContent(materialId, newContent) {
    try {
      return await this.graphRAGService.updateKnowledgeBase(materialId, newContent);
    } catch (error) {
      console.error('Error updating GraphRAG content:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove document from GraphRAG knowledge base
   * @param {string} materialId - Material ID
   * @returns {Promise<Object>} Removal result
   */
  async removeFromGraphRAG(materialId) {
    try {
      return await this.graphRAGService.deleteFromKnowledgeBase(materialId);
    } catch (error) {
      console.error('Error removing from GraphRAG:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query GraphRAG knowledge base
   * @param {string} query - Search query
   * @param {string} subjectId - Subject ID
   * @param {string[]} agentIds - Array of agent IDs
   * @returns {Promise<Object>} Query result
   */
  async queryGraphRAG(query, courseId, agentIds = []) {
    try {
      return await this.graphRAGService.queryKnowledge(query, courseId, agentIds);
    } catch (error) {
      console.error('Error querying GraphRAG:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Create knowledge graph for a course
   * @param {Object[]} materials - Array of materials
   * @returns {Promise<Object>} Knowledge graph creation result
   */
  async createKnowledgeGraph(materials) {
    try {
      return await this.graphRAGService.createKnowledgeGraph(materials);
    } catch (error) {
      console.error('Error creating knowledge graph:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get knowledge graph for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Object|null} Knowledge graph or null
   */
  getKnowledgeGraph(courseId) {
    return this.graphRAGService.getKnowledgeGraph(courseId);
  }

  /**
   * Validate file for GraphRAG processing
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  validateFileForGraphRAG(file) {
    const errors = [];

    // Check if file type is supported for text extraction
    const textSupportedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!textSupportedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} may not be suitable for GraphRAG processing`);
    }

    // Check file size (GraphRAG processing can be resource intensive)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      errors.push(
        `File too large for GraphRAG processing: ${(file.size / (1024 * 1024)).toFixed(2)}MB. Maximum: ${maxSize / (1024 * 1024)}MB`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: errors.length > 0 ? ['GraphRAG processing may be limited'] : []
    };
  }

  /**
   * Get processing statistics for a subject
   * @param {string} subjectId - Subject ID
   * @returns {Object} Processing statistics
   */
  getProcessingStats(courseId) {
    const knowledgeGraph = this.getKnowledgeGraph(courseId);

    if (!knowledgeGraph) {
      return {
        hasKnowledgeGraph: false,
        nodeCount: 0,
        relationshipCount: 0,
        materialCount: 0
      };
    }

    return {
      hasKnowledgeGraph: true,
      nodeCount: knowledgeGraph.nodes.length,
      relationshipCount: knowledgeGraph.relationships.length,
      materialCount: knowledgeGraph.materialCount,
      createdAt: knowledgeGraph.createdAt
    };
  }
}
