/**
 * Response Builder Service
 *
 * Constructs standardized API responses for success and error cases.
 * Handles conditional field inclusion based on configuration.
 */

import { LLM_FEATURES } from '$lib/config/llm';

export class ResponseBuilderService {
  /**
   * Builds a success response
   * @param {Object} params - Response parameters
   * @param {string} params.aiResponse - AI response text
   * @param {string} params.recognizedText - OCR recognized text
   * @param {Object} params.examProfile - Exam profile (optional)
   * @param {Object} params.providerInfo - Provider information (name, model)
   * @param {Object} params.llmMetadata - LLM metadata for storage
   * @returns {Object} Success response object
   */
  buildSuccessResponse({
    aiResponse,
    recognizedText = '',
    examProfile = null,
    providerInfo = null,
    llmMetadata = null
  }) {
    const response = {
      response: aiResponse,
      ocrText: recognizedText
    };

    // Add exam profile if provided
    if (examProfile) {
      response.examProfile = examProfile;
    }

    // Include provider info if in development mode or provider switching is enabled
    const includeProviderInfo = import.meta.env.DEV || LLM_FEATURES.ENABLE_PROVIDER_SWITCHING;
    if (includeProviderInfo && providerInfo) {
      response.provider = {
        name: providerInfo.name,
        model: providerInfo.model
      };
    }

    // Always include llmMetadata for storage (even if not shown to user)
    if (llmMetadata) {
      response.llmMetadata = llmMetadata;
    }

    return response;
  }

  /**
   * Builds an error response
   * @param {Object} params - Error parameters
   * @param {Error} params.error - Error object
   * @param {string} params.context - Error context (optional)
   * @returns {Object} Error response object with status code
   */
  buildErrorResponse({ error, context = '' }) {
    const statusCode = this.getErrorStatusCode(error);
    const errorMessage = this.getErrorMessage(error, context);

    const response = {
      error: errorMessage
    };

    // In development, include error details
    if (import.meta.env.DEV) {
      response.details = error.message;
      response.stack = error.stack;
      if (context) {
        response.context = context;
      }
    }

    return {
      response,
      statusCode
    };
  }

  /**
   * Gets appropriate HTTP status code for an error
   * @param {Error} error - Error object
   * @returns {number} HTTP status code
   */
  getErrorStatusCode(error) {
    const message = error.message?.toLowerCase() || '';

    // Authentication errors
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 401;
    }

    // Authorization errors
    if (
      message.includes('authorization') ||
      message.includes('forbidden') ||
      message.includes('permission')
    ) {
      return 403;
    }

    // Not found errors
    if (message.includes('not found')) {
      return 404;
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 400;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 504;
    }

    // Service unavailable errors
    if (
      message.includes('not running') ||
      message.includes('not accessible') ||
      message.includes('unavailable')
    ) {
      return 503;
    }

    // API key errors
    if (message.includes('api key')) {
      return 500;
    }

    // Default to internal server error
    return 500;
  }

  /**
   * Gets user-friendly error message
   * @param {Error} error - Error object
   * @param {string} context - Error context
   * @returns {string} User-friendly error message
   */
  getErrorMessage(error, context = '') {
    const message = error.message?.toLowerCase() || '';

    // API key errors
    if (message.includes('api key')) {
      return 'API configuration error';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'Request timed out';
    }

    // Service unavailable errors
    if (message.includes('not running') || message.includes('not accessible')) {
      return 'Local LLM service is not available';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return error.message; // Return original message for validation errors
    }

    // Authentication errors
    if (message.includes('authentication') || message.includes('unauthorized')) {
      return 'Authentication required';
    }

    // Authorization errors
    if (message.includes('authorization') || message.includes('forbidden')) {
      return 'Access forbidden';
    }

    // Not found errors
    if (message.includes('not found')) {
      return 'Resource not found';
    }

    // Generic error with context
    if (context) {
      return `Error in ${context}: Internal server error`;
    }

    // Default error message
    return 'Internal server error';
  }
}
