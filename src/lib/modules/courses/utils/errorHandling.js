/**
 * Error Handling Utilities
 *
 * This module provides comprehensive error handling for the subject management system,
 * including validation errors, user-friendly messages, and retry mechanisms.
 */

/**
 * Error types enumeration
 */
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  PROCESSING: 'processing',
  RATE_LIMIT: 'rate_limit',
  UNKNOWN: 'unknown'
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Create a standardized error object
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @param {string} severity - Error severity
 * @returns {Object} Standardized error object
 */
export function createError(type, message, details = {}, severity = ERROR_SEVERITY.MEDIUM) {
  return {
    type,
    message,
    details,
    severity,
    timestamp: new Date().toISOString(),
    id: generateErrorId()
  };
}

/**
 * Generate unique error ID
 * @returns {string} Unique error identifier
 */
function generateErrorId() {
  return `error_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get user-friendly error message
 * @param {Object} error - Error object
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error) {
  const messages = {
    [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
    [ERROR_TYPES.NETWORK]: 'Network error. Please check your connection and try again.',
    [ERROR_TYPES.PERMISSION]: "You don't have permission to perform this action.",
    [ERROR_TYPES.NOT_FOUND]: 'The requested item could not be found.',
    [ERROR_TYPES.PROCESSING]: 'Processing failed. Please try again.',
    [ERROR_TYPES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.'
  };

  return error.userMessage || messages[error.type] || messages[ERROR_TYPES.UNKNOWN];
}

/**
 * Validation error handler
 * @param {Object} validationResult - Validation result with errors
 * @param {string} context - Context where validation failed
 * @returns {Object} Formatted validation error
 */
export function handleValidationError(validationResult, context = 'form') {
  const error = createError(
    ERROR_TYPES.VALIDATION,
    `Validation failed in ${context}`,
    {
      validationErrors: validationResult.errors,
      context,
      fieldCount: validationResult.errors?.length || 0
    },
    ERROR_SEVERITY.MEDIUM
  );

  error.userMessage =
    validationResult.errors?.length === 1
      ? validationResult.errors[0]
      : `Please fix ${validationResult.errors?.length || 0} validation errors.`;

  return error;
}

/**
 * Network error handler
 * @param {Error} networkError - Network error
 * @param {string} operation - Operation that failed
 * @returns {Object} Formatted network error
 */
export function handleNetworkError(networkError, operation = 'request') {
  const isTimeout =
    networkError.name === 'TimeoutError' || networkError.message.includes('timeout');
  const isOffline = !navigator.onLine;

  const error = createError(
    ERROR_TYPES.NETWORK,
    `Network error during ${operation}`,
    {
      originalError: networkError.message,
      operation,
      isTimeout,
      isOffline,
      status: networkError.status || null
    },
    ERROR_SEVERITY.HIGH
  );

  if (isOffline) {
    error.userMessage = 'You appear to be offline. Please check your internet connection.';
  } else if (isTimeout) {
    error.userMessage = 'The request timed out. Please try again.';
  } else if (networkError.status >= 500) {
    error.userMessage = 'Server error. Please try again later.';
  } else if (networkError.status === 404) {
    error.userMessage = 'The requested resource was not found.';
  } else {
    error.userMessage = 'Network error. Please check your connection and try again.';
  }

  return error;
}

/**
 * Permission error handler
 * @param {string} action - Action that was denied
 * @param {string} resource - Resource that was accessed
 * @returns {Object} Formatted permission error
 */
export function handlePermissionError(action, resource) {
  const error = createError(
    ERROR_TYPES.PERMISSION,
    `Permission denied for ${action} on ${resource}`,
    {
      action,
      resource,
      requiredRole: 'admin' // Could be dynamic based on action
    },
    ERROR_SEVERITY.HIGH
  );

  error.userMessage = `You don't have permission to ${action} ${resource}. Please contact an administrator.`;

  return error;
}

/**
 * Processing error handler
 * @param {Error} processingError - Processing error
 * @param {string} process - Process that failed
 * @returns {Object} Formatted processing error
 */
export function handleProcessingError(processingError, process = 'operation') {
  const error = createError(
    ERROR_TYPES.PROCESSING,
    `Processing failed: ${process}`,
    {
      originalError: processingError.message,
      process,
      stack: processingError.stack
    },
    ERROR_SEVERITY.MEDIUM
  );

  error.userMessage = `Failed to ${process}. Please try again.`;

  return error;
}

/**
 * Retry mechanism for failed operations
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Operation result
 */
export async function withRetry(operation, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    retryCondition = (error) => error.type === ERROR_TYPES.NETWORK
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if condition is not met or it's the last attempt
      if (!retryCondition(error) || attempt === maxAttempts) {
        break;
      }

      // Wait before retrying
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      console.log(`Retrying operation (attempt ${attempt + 1}/${maxAttempts}) after ${waitTime}ms`);
    }
  }

  throw lastError;
}

/**
 * Error boundary for async operations
 * @param {Function} operation - Async operation to wrap
 * @param {Object} errorContext - Context for error handling
 * @returns {Promise<Object>} Result with success/error status
 */
export async function safeAsync(operation, errorContext = {}) {
  try {
    const result = await operation();
    return {
      success: true,
      data: result,
      error: null
    };
  } catch (error) {
    console.error(`Error in ${errorContext.operation || 'async operation'}:`, error);

    let formattedError;

    if (error.type) {
      // Already a formatted error
      formattedError = error;
    } else if (error.name === 'ValidationError') {
      formattedError = handleValidationError({ errors: [error.message] }, errorContext.context);
    } else if (error.name === 'NetworkError' || error.status) {
      formattedError = handleNetworkError(error, errorContext.operation);
    } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      formattedError = handlePermissionError(
        errorContext.action || 'access',
        errorContext.resource || 'resource'
      );
    } else {
      formattedError = handleProcessingError(error, errorContext.operation || 'operation');
    }

    return {
      success: false,
      data: null,
      error: formattedError
    };
  }
}

/**
 * Validation error formatter for forms
 * @param {Object} errors - Validation errors object
 * @returns {Object} Formatted errors for UI display
 */
export function formatValidationErrors(errors) {
  const formatted = {
    hasErrors: false,
    fieldErrors: {},
    generalErrors: [],
    errorCount: 0
  };

  if (!errors || typeof errors !== 'object') {
    return formatted;
  }

  // Handle array of error strings
  if (Array.isArray(errors)) {
    formatted.generalErrors = errors;
    formatted.hasErrors = errors.length > 0;
    formatted.errorCount = errors.length;
    return formatted;
  }

  // Handle field-specific errors
  Object.entries(errors).forEach(([field, fieldErrors]) => {
    if (Array.isArray(fieldErrors)) {
      formatted.fieldErrors[field] = fieldErrors;
      formatted.errorCount += fieldErrors.length;
    } else if (typeof fieldErrors === 'string') {
      formatted.fieldErrors[field] = [fieldErrors];
      formatted.errorCount += 1;
    }
  });

  formatted.hasErrors = formatted.errorCount > 0;
  return formatted;
}

/**
 * Error notification helper
 * @param {Object} error - Error object
 * @param {Function} notificationFn - Notification function
 */
export function notifyError(error, notificationFn) {
  if (!notificationFn) {
    console.error('No notification function provided');
    return;
  }

  const message = getUserFriendlyMessage(error);
  const type = error.severity === ERROR_SEVERITY.CRITICAL ? 'error' : 'warning';

  notificationFn(message, type, {
    duration: error.severity === ERROR_SEVERITY.LOW ? 3000 : 5000,
    errorId: error.id
  });
}

/**
 * Progress error handler for long-running operations
 * @param {Object} error - Error object
 * @param {Function} progressCallback - Progress callback function
 */
export function handleProgressError(error, progressCallback) {
  if (progressCallback) {
    progressCallback({
      status: 'error',
      error: getUserFriendlyMessage(error),
      canRetry: error.type === ERROR_TYPES.NETWORK || error.type === ERROR_TYPES.PROCESSING
    });
  }
}

/**
 * Create error recovery suggestions
 * @param {Object} error - Error object
 * @returns {string[]} Array of recovery suggestions
 */
export function getRecoverySuggestions(error) {
  const suggestions = {
    [ERROR_TYPES.VALIDATION]: [
      'Check all required fields are filled',
      'Ensure data formats are correct',
      'Review any highlighted errors'
    ],
    [ERROR_TYPES.NETWORK]: [
      'Check your internet connection',
      'Try refreshing the page',
      'Wait a moment and try again'
    ],
    [ERROR_TYPES.PERMISSION]: [
      'Contact an administrator for access',
      "Check if you're logged in with the correct account",
      'Verify your role permissions'
    ],
    [ERROR_TYPES.NOT_FOUND]: [
      'Check if the item still exists',
      'Try refreshing the page',
      'Navigate back and try again'
    ],
    [ERROR_TYPES.PROCESSING]: [
      'Try the operation again',
      'Check if all required data is provided',
      'Contact support if the problem persists'
    ],
    [ERROR_TYPES.RATE_LIMIT]: [
      'Wait a few minutes before trying again',
      'Reduce the frequency of requests',
      'Try again during off-peak hours'
    ]
  };

  return (
    suggestions[error.type] || [
      'Try refreshing the page',
      'Check your internet connection',
      'Contact support if the problem persists'
    ]
  );
}

/**
 * Log error for debugging and monitoring
 * @param {Object} error - Error object
 * @param {Object} context - Additional context
 */
export function logError(error, context = {}) {
  const logEntry = {
    ...error,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  };

  // In a real application, this would send to a logging service
  console.error('[Error Log]', logEntry);

  // Store in local storage for debugging (limit to last 50 errors)
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('errorLog') || '[]');
      stored.push(logEntry);

      // Keep only last 50 errors
      const trimmed = stored.slice(-50);
      localStorage.setItem('errorLog', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  }
}
