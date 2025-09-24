/**
 * Course-Aware Provider Manager
 *
 * This class extends the existing ProviderManager to respect course-level
 * LLM settings, including OpenAI opt-out and provider preferences.
 */

import { ProviderManager } from '../../llm/ProviderManager.js';

/**
 * Course-Aware Provider Manager class
 */
export class CourseAwareProviderManager extends ProviderManager {
  constructor() {
    super();
  }

  /**
   * Generate chat completion with course-level LLM settings
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @param {Object} courseLLMSettings - Course-level LLM settings
   * @returns {Promise<Object>} - The generated completion
   */
  async generateChatCompletionForCourse(messages, options = {}, courseLLMSettings = null) {
    try {
      // If no course settings provided, use standard behavior
      if (!courseLLMSettings) {
        return await this.generateChatCompletion(messages, options);
      }

      // Apply course-level restrictions
      const restrictedOptions = this.applyCourseRestrictions(options, courseLLMSettings);

      // Generate completion with restrictions
      return await this.generateChatCompletion(messages, restrictedOptions);
    } catch (error) {
      // If error is due to OpenAI restriction and no local provider available
      if (this.isOpenAIRestrictionError(error, courseLLMSettings)) {
        throw new Error(
          'This course has disabled OpenAI usage and no local LLM provider is available. ' +
            'Please ensure a local LLM provider is running or contact the course creator.'
        );
      }
      throw error;
    }
  }

  /**
   * Apply course-level restrictions to options
   * @param {Object} options - Original options
   * @param {Object} courseLLMSettings - Course LLM settings
   * @returns {Object} - Modified options with restrictions applied
   */
  applyCourseRestrictions(options, courseLLMSettings) {
    const restrictedOptions = { ...options };

    // Handle OpenAI opt-out
    if (!courseLLMSettings.allowOpenAI) {
      // Force use of non-OpenAI provider
      restrictedOptions.provider = this.getNonOpenAIProvider(courseLLMSettings);
      restrictedOptions.disableOpenAIFallback = true;
    }

    // Apply preferred provider if specified
    if (courseLLMSettings.preferredProvider && courseLLMSettings.allowOpenAI) {
      restrictedOptions.provider = courseLLMSettings.preferredProvider;
    }

    // Handle fallback settings
    if (!courseLLMSettings.fallbackEnabled) {
      restrictedOptions.disableFallback = true;
    }

    return restrictedOptions;
  }

  /**
   * Get best available provider respecting course restrictions
   * @param {Object} courseLLMSettings - Course LLM settings
   * @returns {Promise<string>} - The name of the best available provider
   */
  async getBestProviderForCourse(courseLLMSettings) {
    if (!courseLLMSettings) {
      return await this.getBestProvider();
    }

    // If OpenAI is disabled, only consider non-OpenAI providers
    if (!courseLLMSettings.allowOpenAI) {
      const nonOpenAIProviders = this.listProviders().filter((name) => name !== 'openai');

      for (const providerName of nonOpenAIProviders) {
        if (await this.isProviderAvailable(providerName)) {
          return providerName;
        }
      }

      throw new Error('No non-OpenAI providers available for this course');
    }

    // If preferred provider is specified, try it first
    if (courseLLMSettings.preferredProvider) {
      if (await this.isProviderAvailable(courseLLMSettings.preferredProvider)) {
        return courseLLMSettings.preferredProvider;
      }

      // If preferred provider is not available and fallback is disabled, throw error
      if (!courseLLMSettings.fallbackEnabled) {
        throw new Error(
          `Preferred provider ${courseLLMSettings.preferredProvider} is not available and fallback is disabled`
        );
      }
    }

    // Use standard logic for other cases
    return await this.getBestProvider();
  }

  /**
   * Get non-OpenAI provider for courses that opt out
   * @param {Object} courseLLMSettings - Course LLM settings
   * @returns {string} - Non-OpenAI provider name
   */
  getNonOpenAIProvider(courseLLMSettings) {
    // Prefer the specified provider if it's not OpenAI
    if (courseLLMSettings.preferredProvider && courseLLMSettings.preferredProvider !== 'openai') {
      return courseLLMSettings.preferredProvider;
    }

    // Default to ollama for local processing
    return 'ollama';
  }

  /**
   * Check if error is due to OpenAI restriction
   * @param {Error} error - The error that occurred
   * @param {Object} courseLLMSettings - Course LLM settings
   * @returns {boolean} - True if error is due to OpenAI restriction
   */
  isOpenAIRestrictionError(error, courseLLMSettings) {
    return (
      !courseLLMSettings.allowOpenAI &&
      (error.message.includes('Provider not found') ||
        error.message.includes('not available') ||
        error.message.includes('ollama'))
    );
  }

  /**
   * Generate chat completion with enhanced error handling for course restrictions
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion
   */
  async generateChatCompletion(messages, options = {}) {
    // Handle course-specific restrictions
    if (options.disableOpenAIFallback) {
      return await this.generateWithoutOpenAIFallback(messages, options);
    }

    if (options.disableFallback) {
      return await this.generateWithoutFallback(messages, options);
    }

    // Use parent implementation for standard cases
    return await super.generateChatCompletion(messages, options);
  }

  /**
   * Generate completion without OpenAI fallback
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - The generated completion
   */
  async generateWithoutOpenAIFallback(messages, options) {
    const providerName = options.provider || 'ollama';

    if (providerName === 'openai') {
      throw new Error('OpenAI provider is disabled for this course');
    }

    const provider = this.getProvider(providerName);

    try {
      const result = await provider.generateChatCompletion(messages, options);
      return {
        ...result,
        provider: providerName
      };
    } catch (error) {
      // Try other non-OpenAI providers if available
      const nonOpenAIProviders = this.listProviders().filter(
        (name) => name !== 'openai' && name !== providerName
      );

      for (const fallbackProvider of nonOpenAIProviders) {
        if (await this.isProviderAvailable(fallbackProvider)) {
          try {
            const fallbackResult = await this.getProvider(fallbackProvider).generateChatCompletion(
              messages,
              options
            );
            return {
              ...fallbackResult,
              provider: fallbackProvider
            };
          } catch (fallbackError) {
            console.error(`Fallback provider ${fallbackProvider} failed:`, fallbackError);
          }
        }
      }

      throw new Error(`No non-OpenAI providers available: ${error.message}`);
    }
  }

  /**
   * Generate completion without any fallback
   * @param {Array} messages - Array of message objects
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - The generated completion
   */
  async generateWithoutFallback(messages, options) {
    const providerName = options.provider || this.defaultProvider;
    const provider = this.getProvider(providerName);

    const result = await provider.generateChatCompletion(messages, options);
    return {
      ...result,
      provider: providerName
    };
  }

  /**
   * Validate course LLM settings
   * @param {Object} llmSettings - LLM settings to validate
   * @returns {Object} - Validation result
   */
  validateCourseLLMSettings(llmSettings) {
    const errors = [];

    if (typeof llmSettings.allowOpenAI !== 'boolean') {
      errors.push('allowOpenAI must be a boolean');
    }

    if (llmSettings.preferredProvider && typeof llmSettings.preferredProvider !== 'string') {
      errors.push('preferredProvider must be a string');
    }

    if (llmSettings.preferredProvider && !this.providers.has(llmSettings.preferredProvider)) {
      errors.push(
        `preferredProvider '${llmSettings.preferredProvider}' is not a registered provider`
      );
    }

    if (typeof llmSettings.fallbackEnabled !== 'boolean') {
      errors.push('fallbackEnabled must be a boolean');
    }

    // Check for conflicting settings
    if (!llmSettings.allowOpenAI && llmSettings.preferredProvider === 'openai') {
      errors.push('Cannot set preferredProvider to openai when allowOpenAI is false');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get available providers for a course based on its settings
   * @param {Object} courseLLMSettings - Course LLM settings
   * @returns {Promise<string[]>} - Array of available provider names
   */
  async getAvailableProvidersForCourse(courseLLMSettings) {
    let availableProviders = this.listProviders();

    // Filter out OpenAI if not allowed
    if (!courseLLMSettings.allowOpenAI) {
      availableProviders = availableProviders.filter((name) => name !== 'openai');
    }

    // Check which providers are actually available
    const checkedProviders = [];
    for (const providerName of availableProviders) {
      if (await this.isProviderAvailable(providerName)) {
        checkedProviders.push(providerName);
      }
    }

    return checkedProviders;
  }

  /**
   * Get provider status for a course
   * @param {Object} courseLLMSettings - Course LLM settings
   * @returns {Promise<Object>} - Provider status information
   */
  async getProviderStatusForCourse(courseLLMSettings) {
    const availableProviders = await this.getAvailableProvidersForCourse(courseLLMSettings);
    const preferredProvider = courseLLMSettings.preferredProvider;

    return {
      availableProviders,
      preferredProvider,
      preferredAvailable: preferredProvider ? availableProviders.includes(preferredProvider) : null,
      openAIAllowed: courseLLMSettings.allowOpenAI,
      fallbackEnabled: courseLLMSettings.fallbackEnabled,
      hasAvailableProviders: availableProviders.length > 0
    };
  }
}
