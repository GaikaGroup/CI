/**
 * OpenAI Provider Implementation
 *
 * This class implements the ProviderInterface for the OpenAI API.
 */

import { ProviderInterface } from './ProviderInterface';
import { OPENAI_CONFIG } from '$lib/config/api';

/**
 * OpenAI Provider class
 * @extends ProviderInterface
 */
export class OpenAIProvider extends ProviderInterface {
  /**
   * Initialize the OpenAI provider
   * @param {Object} config - OpenAI configuration (defaults to OPENAI_CONFIG)
   */
  constructor(config = OPENAI_CONFIG) {
    super(config);
    this.name = 'openai';
  }

  /**
   * Check if the OpenAI provider is available
   * @returns {Promise<boolean>} - True if the provider is available
   */
  async isAvailable() {
    try {
      // Check if API key is valid (not the default placeholder)
      if (!this.config.API_KEY || this.config.API_KEY === 'your-api-key-here') {
        console.warn('OpenAI API key is not configured');
        return false;
      }

      // Simple ping to check if the API is accessible
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.API_KEY}`
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      return response.ok;
    } catch (error) {
      console.error('Error checking OpenAI availability:', error);
      return false;
    }
  }

  /**
   * Generate a chat completion using OpenAI
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion
   */
  async generateChatCompletion(messages, options = {}) {
    try {
      const model = options.model || this.config.MODEL;
      const maxTokens = options.maxTokens || this.config.MAX_TOKENS;
      const temperature = options.temperature || this.config.TEMPERATURE;

      // Determine if model uses new API (GPT-5, o1-preview, o1-mini)
      const usesNewAPI = model.startsWith('gpt-5') || model.startsWith('o1-');

      // New models need more time for reasoning (2 minutes vs 30 seconds)
      const timeout = usesNewAPI ? 120000 : this.config.TIMEOUT;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      // Build request body based on model type
      const requestBody = {
        model,
        messages,
        ...options.extraParams
      };

      // Add token limit parameter (new models use max_completion_tokens)
      if (usesNewAPI) {
        requestBody.max_completion_tokens = maxTokens;
      } else {
        requestBody.max_tokens = maxTokens;
        requestBody.temperature = temperature;
      }

      // Make the API request
      const response = await fetch(this.config.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.API_KEY}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return this.formatResponse(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        const model = options.model || this.config.MODEL;
        const usesNewAPI = model.startsWith('gpt-5') || model.startsWith('o1-');
        const timeout = usesNewAPI ? 120000 : this.config.TIMEOUT;
        throw new Error(`OpenAI request timed out after ${timeout}ms`);
      }
      throw this.handleError(error);
    }
  }

  /**
   * List available models for OpenAI
   * @returns {Promise<Array>} - Array of available model names
   */
  async listModels() {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();

      // Filter for chat models only
      return data.data.filter((model) => model.id.includes('gpt')).map((model) => model.id);
    } catch (error) {
      console.error('Error listing OpenAI models:', error);
      return [this.config.MODEL]; // Return default model as fallback
    }
  }

  /**
   * Format the OpenAI response to a standard format
   * @param {Object} rawResponse - The raw response from OpenAI
   * @returns {Object} - The standardized response
   */
  formatResponse(rawResponse) {
    if (!rawResponse || !rawResponse.choices || !rawResponse.choices[0]) {
      throw new Error('Invalid response format from OpenAI');
    }

    const choice = rawResponse.choices[0];
    const content = choice.message?.content || '';

    // Log if content is empty for debugging
    if (!content) {
      console.warn('[OpenAIProvider] Empty content received from model:', rawResponse.model);
      console.warn('[OpenAIProvider] Finish reason:', choice.finish_reason);
      console.warn('[OpenAIProvider] Full response:', JSON.stringify(rawResponse, null, 2));
    }

    return {
      content,
      provider: this.name,
      model: rawResponse.model,
      usage: rawResponse.usage,
      finishReason: choice.finish_reason,
      raw: rawResponse // Include raw response for debugging
    };
  }

  /**
   * Handle errors from the OpenAI provider
   * @param {Error} error - The error to handle
   * @returns {Error} - A standardized error
   */
  handleError(error) {
    // Check for specific OpenAI error types and handle accordingly
    if (error.message.includes('API key')) {
      return new Error('OpenAI API key is invalid or missing');
    }

    if (error.message.includes('rate limit')) {
      return new Error('OpenAI rate limit exceeded. Please try again later.');
    }

    return super.handleError(error);
  }
}
