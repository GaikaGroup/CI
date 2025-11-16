/**
 * Error Handler
 *
 * Centralized error handling for GraphRAG operations with graceful degradation.
 */
export class ErrorHandler {
  /**
   * Handle embedding generation errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery strategy
   */
  static async handleEmbeddingError(error, context = {}) {
    // Rate limit exceeded - already handled by retry logic
    if (error.message.includes('rate_limit') || error.message.includes('Rate limit')) {
      console.warn('[ErrorHandler] Rate limit exceeded, retrying...', context);
      return { retry: true, delay: 5000 };
    }

    // Invalid API key - critical error
    if (error.message.includes('Invalid') && error.message.includes('API key')) {
      console.error('[ErrorHandler] Invalid API key, falling back to in-memory storage');
      return { fallback: true };
    }

    // Token limit exceeded
    if (error.message.includes('token limit exceeded')) {
      console.error('[ErrorHandler] Monthly token limit exceeded', context);
      return { tokenLimitExceeded: true };
    }

    // Network errors
    if (error.message.includes('Network') || error.message.includes('ECONNREFUSED')) {
      console.warn('[ErrorHandler] Network error, will retry', context);
      return { retry: true, delay: 2000 };
    }

    // Log and continue without embedding
    console.error('[ErrorHandler] Embedding generation failed:', error.message, context);
    return { continue: true, embedding: null };
  }

  /**
   * Handle database errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery strategy
   */
  static async handleDatabaseError(error, context = {}) {
    // Prisma error codes
    const errorCode = error.code;

    // Unique constraint violation - update instead
    if (errorCode === 'P2002') {
      console.warn('[ErrorHandler] Duplicate entry, updating instead:', context);
      return { update: true };
    }

    // Foreign key constraint violation
    if (errorCode === 'P2003') {
      console.error('[ErrorHandler] Invalid reference:', error.message, context);
      return { skip: true };
    }

    // Record not found
    if (errorCode === 'P2025') {
      console.warn('[ErrorHandler] Record not found:', context);
      return { notFound: true };
    }

    // Connection error
    if (errorCode === 'P1001' || errorCode === 'P1002') {
      console.error('[ErrorHandler] Database connection error:', error.message);
      return { fallbackToMemory: true };
    }

    // Transaction error - rollback
    if (error.message.includes('transaction')) {
      console.error('[ErrorHandler] Transaction error, rolling back:', error.message, context);
      throw error; // Re-throw to trigger rollback
    }

    // Generic database error
    console.error('[ErrorHandler] Database error:', error.message, context);
    throw error; // Re-throw for caller to handle
  }

  /**
   * Handle search errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery strategy
   */
  static async handleSearchError(error, context = {}) {
    // Timeout errors
    if (error.message.includes('timeout')) {
      console.warn('[ErrorHandler] Search timeout, using cached results:', context);
      return { useCached: true };
    }

    // Vector search specific errors
    if (error.message.includes('vector') || error.message.includes('embedding')) {
      console.warn(
        '[ErrorHandler] Vector search failed, falling back to keyword search:',
        error.message
      );
      return { fallbackToKeyword: true };
    }

    // Invalid query
    if (error.message.includes('Invalid query')) {
      console.error('[ErrorHandler] Invalid search query:', error.message, context);
      return { invalidQuery: true };
    }

    // Generic search error
    console.error('[ErrorHandler] Search error:', error.message, context);
    return { error: true, message: error.message };
  }

  /**
   * Handle migration errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Recovery strategy
   */
  static async handleMigrationError(error, context = {}) {
    console.error('[ErrorHandler] Migration error:', error.message, context);

    // Verification failure
    if (error.message.includes('verification')) {
      return { verificationFailed: true, rollback: true };
    }

    // Partial migration
    if (context.migratedCount > 0) {
      console.warn('[ErrorHandler] Partial migration completed:', context.migratedCount);
      return { partial: true, migratedCount: context.migratedCount };
    }

    return { failed: true, error: error.message };
  }

  /**
   * Determine if error is retryable
   * @param {Error} error - Error object
   * @returns {boolean} True if retryable
   */
  static isRetryable(error) {
    const retryableMessages = [
      'rate_limit',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Network',
      'temporarily unavailable'
    ];

    return retryableMessages.some((msg) => error.message.toLowerCase().includes(msg.toLowerCase()));
  }

  /**
   * Determine if error is critical (requires immediate attention)
   * @param {Error} error - Error object
   * @returns {boolean} True if critical
   */
  static isCritical(error) {
    const criticalMessages = [
      'Invalid API key',
      'Authentication failed',
      'Database connection',
      'P1001',
      'P1002'
    ];

    return criticalMessages.some((msg) => error.message.includes(msg) || error.code === msg);
  }

  /**
   * Format error for logging
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Formatted error
   */
  static formatError(error, context = {}) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      retryable: this.isRetryable(error),
      critical: this.isCritical(error)
    };
  }
}
