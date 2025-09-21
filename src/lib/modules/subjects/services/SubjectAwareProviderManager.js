/**
 * Subject-Aware Provider Manager
 *
 * This class extends the existing ProviderManager to respect subject-level
 * LLM settings, including OpenAI opt-out and provider preferences.
 */

import { ProviderManager } from '../../llm/ProviderManager.js';

/**
 * Subject-Aware Provider Manager class
 */
export class SubjectAwareProviderManager extends ProviderManager {
  constructor() {
    super();
  }

  /**
   * Generate chat completion with subject-level LLM settings
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @param {Object} subjectLLMSettings - Subject-level LLM settings
   * @returns {Promise<Object>} - The generated completion
   */
  async generateChatCompletionForSubject(messages, options = {}, subjectLLMSettings = null) {
    try {
      // If no subject settings provided, use standard behavior
      if (!subjectLLMSettings) {
        return await this.generateChatCompletion(messages, options);
      }

      // Apply subject-level restrictions
      const restrictedOptions = this.applySubjectRestrictions(options, subjectLLMSettings);

      // Generate completion with restrictions
      return await this.generateChatCompletion(messages, restrictedOptions);
    } catch (error) {
      // If error is due to OpenAI restriction and no local provider available
      if (this.isOpenAIRestrictionError(error, subjectLLMSettings)) {
        throw new Error(
          'This subject has disabled OpenAI usage and no local LLM provider is available. ' +
            'Please ensure a local LLM provider is running or contact the subject creator.'
        );
      }
      throw error;
    }
  }

  /**
   * Apply subject-level restrictions to options
   * @param {Object} options - Original options
   * @param {Object} subjectLLMSettings - Subject LLM settings
   * @returns {Object} - Modified options with restrictions applied
   */
  applySubjectRestrictions(options, subjectLLMSettings) {
    const restrictedOptions = { ...options };

    // Handle OpenAI opt-out
    if (!subjectLLMSettings.allowOpenAI) {
      // Force use of non-OpenAI provider
      restrictedOptions.provider = this.getNonOpenAIProvider(subjectLLMSettings);
      restrictedOptions.disableOpenAIFallback = true;
    }

    // Apply preferred provider if specified
    if (subjectLLMSettings.preferredProvider && subjectLLMSettings.allowOpenAI) {
      restrictedOptions.provider = subjectLLMSettings.preferredProvider;
    }

    // Handle fallback settings
    if (!subjectLLMSettings.fallbackEnabled) {
      restrictedOptions.disableFallback = true;
    }

    return restrictedOptions;
  }

  /**
   * Get best available provider respecting subject restrictions
   * @param {Object} subjectLLMSettings - Subject LLM settings
   * @returns {Promise<string>} - The name of the best available provider
   */
  async getBestProviderForSubject(subjectLLMSettings) {
    if (!subjectLLMSettings) {
      return await this.getBestProvider();
    }

    // If OpenAI is disabled, only consider non-OpenAI providers
    if (!subjectLLMSettings.allowOpenAI) {
      const nonOpenAIProviders = this.listProviders().filter((name) => name !== 'openai');

      for (const providerName of nonOpenAIProviders) {
        if (await this.isProviderAvailable(providerName)) {
          return providerName;
        }
      }

      throw new Error('No non-OpenAI providers available for this subject');
    }

    // If preferred provider is specified, try it first
    if (subjectLLMSettings.preferredProvider) {
      if (await this.isProviderAvailable(subjectLLMSettings.preferredProvider)) {
        return subjectLLMSettings.preferredProvider;
      }

      // If preferred provider is not available and fallback is disabled, throw error
      if (!subjectLLMSettings.fallbackEnabled) {
        throw new Error(
          `Preferred provider ${subjectLLMSettings.preferredProvider} is not available and fallback is disabled`
        );
      }
    }

    // Use standard logic for other cases
    return await this.getBestProvider();
  }

  /**
   * Get non-OpenAI provider for subjects that opt out
   * @param {Object} subjectLLMSettings - Subject LLM settings
   * @returns {string} - Non-OpenAI provider name
   */
  getNonOpenAIProvider(subjectLLMSettings) {
    // Prefer the specified provider if it's not OpenAI
    if (subjectLLMSettings.preferredProvider && subjectLLMSettings.preferredProvider !== 'openai') {
      return subjectLLMSettings.preferredProvider;
    }

    // Default to ollama for local processing
    return 'ollama';
  }

  /**
   * Check if error is due to OpenAI restriction
   * @param {Error} error - The error that occurred
   * @param {Object} subjectLLMSettings - Subject LLM settings
   * @returns {boolean} - True if error is due to OpenAI restriction
   */
  isOpenAIRestrictionError(error, subjectLLMSettings) {
    return (
      !subjectLLMSettings.allowOpenAI &&
      (error.message.includes('Provider not found') ||
        error.message.includes('not available') ||
        error.message.includes('ollama'))
    );
  }

  /**
   * Generate chat completion with enhanced error handling for subject restrictions
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion
   */
  async generateChatCompletion(messages, options = {}) {
    // Handle subject-specific restrictions
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
      throw new Error('OpenAI provider is disabled for this subject');
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
   * Validate subject LLM settings
   * @param {Object} llmSettings - LLM settings to validate
   * @returns {Object} - Validation result
   */
  validateSubjectLLMSettings(llmSettings) {
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
   * Get available providers for a subject based on its settings
   * @param {Object} subjectLLMSettings - Subject LLM settings
   * @returns {Promise<string[]>} - Array of available provider names
   */
  async getAvailableProvidersForSubject(subjectLLMSettings) {
    let availableProviders = this.listProviders();

    // Filter out OpenAI if not allowed
    if (!subjectLLMSettings.allowOpenAI) {
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
   * Get provider status for a subject
   * @param {Object} subjectLLMSettings - Subject LLM settings
   * @returns {Promise<Object>} - Provider status information
   */
  async getProviderStatusForSubject(subjectLLMSettings) {
    const availableProviders = await this.getAvailableProvidersForSubject(subjectLLMSettings);
    const preferredProvider = subjectLLMSettings.preferredProvider;

    return {
      availableProviders,
      preferredProvider,
      preferredAvailable: preferredProvider ? availableProviders.includes(preferredProvider) : null,
      openAIAllowed: subjectLLMSettings.allowOpenAI,
      fallbackEnabled: subjectLLMSettings.fallbackEnabled,
      hasAvailableProviders: availableProviders.length > 0
    };
  }
}
