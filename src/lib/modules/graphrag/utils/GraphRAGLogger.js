/**
 * GraphRAG Logger
 *
 * Centralized logging for GraphRAG operations with consistent formatting.
 */
export class GraphRAGLogger {
  /**
   * Log embedding generation event
   * @param {string} text - Text being embedded
   * @param {Object} result - Embedding result
   * @param {number} duration - Duration in ms
   */
  static logEmbeddingGeneration(text, result, duration) {
    const textPreview = text.substring(0, 50) + (text.length > 50 ? '...' : '');
    console.log('[GraphRAG] Embedding generated', {
      textLength: text.length,
      textPreview,
      success: result.success,
      duration,
      cached: result.cached,
      tokens: result.tokens || 0
    });
  }

  /**
   * Log search operation
   * @param {string} query - Search query
   * @param {Array} results - Search results
   * @param {number} duration - Duration in ms
   */
  static logSearch(query, results, duration) {
    const queryPreview = query.substring(0, 50) + (query.length > 50 ? '...' : '');
    const avgSimilarity =
      results.length > 0
        ? results.reduce((sum, r) => sum + (r.similarity || 0), 0) / results.length
        : 0;

    console.log('[GraphRAG] Search completed', {
      query: queryPreview,
      resultCount: results.length,
      avgSimilarity: avgSimilarity.toFixed(3),
      duration,
      cached: results.cached || false
    });
  }

  /**
   * Log error with context
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  static logError(operation, error, context = {}) {
    console.error('[GraphRAG] Error', {
      operation,
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  /**
   * Log migration progress
   * @param {string} phase - Migration phase
   * @param {Object} data - Phase data
   */
  static logMigration(phase, data) {
    console.log('[GraphRAG] Migration', {
      phase,
      ...data
    });
  }

  /**
   * Log document processing
   * @param {string} materialId - Material ID
   * @param {Object} result - Processing result
   */
  static logDocumentProcessing(materialId, result) {
    console.log('[GraphRAG] Document processed', {
      materialId,
      success: result.success,
      nodeCount: result.nodes?.length || 0,
      relationshipCount: result.relationships?.length || 0,
      error: result.error
    });
  }

  /**
   * Log storage adapter selection
   * @param {string} adapterType - Type of adapter selected
   * @param {string} reason - Reason for selection
   */
  static logAdapterSelection(adapterType, reason) {
    console.log('[GraphRAG] Storage adapter selected', {
      adapterType,
      reason
    });
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {Object} metrics - Performance metrics
   */
  static logPerformance(operation, metrics) {
    console.log('[GraphRAG] Performance', {
      operation,
      ...metrics
    });
  }
}
