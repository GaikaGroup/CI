/**
 * Error Handler Service
 *
 * Centralized error handling for the chat API.
 * Categorizes errors, logs with context, and determines retry strategies.
 */

export class ErrorHandlerService {
  /**
   * Error categories
   */
  static ERROR_CATEGORIES = {
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    PROVIDER: 'provider',
    TIMEOUT: 'timeout',
    NETWORK: 'network',
    INTERNAL: 'internal'
  };

  /**
   * Handles an error with logging and categorization
   * @param {Error} error - Error object
   * @param {Object} context - Request context
   * @returns {Object} { category: string, message: string, retryable: boolean }
   */
  handleError(error, context = {}) {
    const category = this.categorizeError(error);
    const retryable = this.isRetryable(error, category);

    // Log the error with context
    this.logError(error, category, context);

    return {
      category,
      message: error.message,
      retryable,
      originalError: error
    };
  }

  /**
   * Categorizes an error based on its properties
   * @param {Error} error - Error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';

    // Authentication errors (check before validation to avoid false positives)
    if (
      message.includes('authentication') ||
      message.includes('unauthorized') ||
      message.includes('not logged in')
    ) {
      return ErrorHandlerService.ERROR_CATEGORIES.AUTHENTICATION;
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('must be')
    ) {
      return ErrorHandlerService.ERROR_CATEGORIES.VALIDATION;
    }

    // Authorization errors
    if (
      message.includes('authorization') ||
      message.includes('forbidden') ||
      message.includes('permission') ||
      message.includes('access denied')
    ) {
      return ErrorHandlerService.ERROR_CATEGORIES.AUTHORIZATION;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorHandlerService.ERROR_CATEGORIES.TIMEOUT;
    }

    // Provider errors
    if (
      message.includes('api key') ||
      message.includes('not running') ||
      message.includes('not accessible') ||
      message.includes('provider') ||
      message.includes('llm')
    ) {
      return ErrorHandlerService.ERROR_CATEGORIES.PROVIDER;
    }

    // Network errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('fetch') ||
      error.name === 'NetworkError'
    ) {
      return ErrorHandlerService.ERROR_CATEGORIES.NETWORK;
    }

    // Default to internal error
    return ErrorHandlerService.ERROR_CATEGORIES.INTERNAL;
  }

  /**
   * Logs an error with context
   * @param {Error} error - Error object
   * @param {string} category - Error category
   * @param {Object} context - Request context
   */
  logError(error, category, context = {}) {
    const logData = {
      category,
      message: error.message,
      name: error.name,
      stack: error.stack,
      context: this._sanitizeContext(context),
      timestamp: new Date().toISOString()
    };

    // Log based on category severity
    if (
      category === ErrorHandlerService.ERROR_CATEGORIES.VALIDATION ||
      category === ErrorHandlerService.ERROR_CATEGORIES.AUTHENTICATION ||
      category === ErrorHandlerService.ERROR_CATEGORIES.AUTHORIZATION
    ) {
      // These are expected errors, log as info
      console.info('[Chat API Error]', logData);
    } else {
      // Unexpected errors, log as error
      console.error('[Chat API Error]', logData);
      console.error('Error stack:', error.stack);
    }

    // Additional detailed logging for specific categories
    if (category === ErrorHandlerService.ERROR_CATEGORIES.PROVIDER) {
      console.error('[Provider Error] Details:', {
        message: error.message,
        provider: context.provider,
        model: context.model
      });
    }

    if (category === ErrorHandlerService.ERROR_CATEGORIES.TIMEOUT) {
      console.warn('[Timeout Error] Request took too long:', {
        endpoint: context.endpoint,
        duration: context.duration
      });
    }
  }

  /**
   * Determines if an error is retryable
   * @param {Error} error - Error object
   * @param {string} category - Error category
   * @returns {boolean} True if error is retryable
   */
  isRetryable(error, category) {
    // Validation, authentication, and authorization errors are not retryable
    if (
      category === ErrorHandlerService.ERROR_CATEGORIES.VALIDATION ||
      category === ErrorHandlerService.ERROR_CATEGORIES.AUTHENTICATION ||
      category === ErrorHandlerService.ERROR_CATEGORIES.AUTHORIZATION
    ) {
      return false;
    }

    // Timeout and network errors are retryable
    if (
      category === ErrorHandlerService.ERROR_CATEGORIES.TIMEOUT ||
      category === ErrorHandlerService.ERROR_CATEGORIES.NETWORK
    ) {
      return true;
    }

    // Provider errors might be retryable (e.g., temporary unavailability)
    if (category === ErrorHandlerService.ERROR_CATEGORIES.PROVIDER) {
      const message = error.message?.toLowerCase() || '';
      // API key errors are not retryable
      if (message.includes('api key')) {
        return false;
      }
      // Service unavailable errors are retryable
      if (message.includes('not running') || message.includes('not accessible')) {
        return true;
      }
    }

    // Internal errors might be retryable
    return false;
  }

  /**
   * Sanitizes context to remove sensitive information
   * @param {Object} context - Request context
   * @returns {Object} Sanitized context
   */
  _sanitizeContext(context) {
    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'api_key', 'sessionToken'];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    // Truncate long content
    if (sanitized.content && sanitized.content.length > 200) {
      sanitized.content = sanitized.content.substring(0, 200) + '... [truncated]';
    }

    // Remove full message history (too verbose)
    if (sanitized.messages && Array.isArray(sanitized.messages)) {
      sanitized.messages = `[${sanitized.messages.length} messages]`;
    }

    // In production, remove stack traces from context
    if (!import.meta.env.DEV) {
      delete sanitized.stack;
    }

    return sanitized;
  }
}
