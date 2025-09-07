/**
 * Provider Interface for LLM Providers
 * 
 * This interface defines the standard methods that all LLM providers must implement.
 * It ensures consistency across different providers like OpenAI and Ollama.
 */

/**
 * Base class for all LLM providers
 * @abstract
 */
export class ProviderInterface {
  /**
   * Initialize the provider
   * @param {Object} config - Provider-specific configuration
   */
  constructor(config) {
    if (this.constructor === ProviderInterface) {
      throw new Error('ProviderInterface is an abstract class and cannot be instantiated directly');
    }
    
    this.config = config;
    this.name = 'abstract-provider';
  }

  /**
   * Get the name of the provider
   * @returns {string} - Provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Check if the provider is available
   * @returns {Promise<boolean>} - True if the provider is available
   * @abstract
   */
  async isAvailable() {
    throw new Error('Method isAvailable() must be implemented by subclass');
  }

  /**
   * Generate a chat completion
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion
   * @abstract
   */
  async generateChatCompletion(messages, options = {}) {
    throw new Error('Method generateChatCompletion() must be implemented by subclass');
  }

  /**
   * List available models for this provider
   * @returns {Promise<Array>} - Array of available model names
   * @abstract
   */
  async listModels() {
    throw new Error('Method listModels() must be implemented by subclass');
  }

  /**
   * Format the response to a standard format
   * @param {Object} rawResponse - The raw response from the provider
   * @returns {Object} - The standardized response
   * @abstract
   */
  formatResponse(rawResponse) {
    throw new Error('Method formatResponse() must be implemented by subclass');
  }

  /**
   * Handle errors from the provider
   * @param {Error} error - The error to handle
   * @returns {Error} - A standardized error
   */
  handleError(error) {
    // Default implementation - can be overridden by subclasses
    console.error(`Error in ${this.name} provider:`, error);
    return new Error(`${this.name} provider error: ${error.message}`);
  }
}