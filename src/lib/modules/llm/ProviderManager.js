/**
 * Provider Manager for LLM Providers
 *
 * This class manages different LLM providers and handles fallback logic.
 */

import { OpenAIProvider } from './providers/OpenAIProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { LLM_FEATURES, PROVIDER_CONFIG } from '$lib/config/llm';
import { calculateOpenAICost } from '$lib/config/pricing';
import { usageTracker } from '$modules/analytics/UsageTracker';

/**
 * Provider Manager class
 */
export class ProviderManager {
  /**
   * Initialize the provider manager
   */
  constructor() {
    this.providers = new Map();
    this.defaultProvider = PROVIDER_CONFIG.DEFAULT_PROVIDER;
    this.fallbackEnabled = LLM_FEATURES.ENABLE_FALLBACK;
    this.fallbackTimeout = PROVIDER_CONFIG.FALLBACK_TIMEOUT;

    // Initialize providers
    this._initializeProviders();
  }

  /**
   * Initialize the available providers
   * @private
   */
  _initializeProviders() {
    // Always register OpenAI provider
    this.registerProvider('openai', new OpenAIProvider());

    // Register Ollama provider if local LLM is enabled
    if (LLM_FEATURES.ENABLE_LOCAL_LLM) {
      this.registerProvider('ollama', new OllamaProvider());
    }
  }

  /**
   * Register a provider
   * @param {string} name - The name of the provider
   * @param {ProviderInterface} provider - The provider instance
   */
  registerProvider(name, provider) {
    this.providers.set(name, provider);
    console.log(`Registered LLM provider: ${name}`);
  }

  /**
   * Get a provider by name
   * @param {string} name - The name of the provider
   * @returns {ProviderInterface} - The provider instance
   */
  getProvider(name) {
    if (!this.providers.has(name)) {
      throw new Error(`Provider not found: ${name}`);
    }
    return this.providers.get(name);
  }

  /**
   * Check if a provider is available
   * @param {string} name - The name of the provider
   * @returns {Promise<boolean>} - True if the provider is available
   */
  async isProviderAvailable(name) {
    try {
      const provider = this.getProvider(name);
      return await provider.isAvailable();
    } catch (error) {
      console.error(`Error checking provider availability (${name}):`, error);
      return false;
    }
  }

  /**
   * Get the best available provider
   * @returns {Promise<string>} - The name of the best available provider
   */
  async getBestProvider() {
    // First try the default provider
    if (await this.isProviderAvailable(this.defaultProvider)) {
      return this.defaultProvider;
    }

    // If default provider is not available and fallback is enabled, try other providers
    if (this.fallbackEnabled) {
      for (const [name] of this.providers) {
        if (name !== this.defaultProvider && (await this.isProviderAvailable(name))) {
          console.log(
            `Default provider ${this.defaultProvider} not available, falling back to ${name}`
          );
          return name;
        }
      }
    }

    // If no provider is available, return the default provider anyway
    // (it will fail, but at least we tried)
    console.warn(`No available LLM providers found, using default: ${this.defaultProvider}`);
    return this.defaultProvider;
  }

  /**
   * Generate a chat completion using the best available provider
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion
   */
  async generateChatCompletion(messages, options = {}) {
    const providerName = options.provider || (await this.getBestProvider());
    const provider = this.getProvider(providerName);

    const invokeProvider = async (providerInstance, name, requestOptions) => {
      const result = await providerInstance.generateChatCompletion(messages, requestOptions);
      const resolvedProvider = result.provider || name;
      const modelName = result.model || requestOptions?.model;

      const usage = result.usage || {};
      const tokens = {
        prompt: usage.prompt_tokens ?? usage.promptTokens ?? 0,
        completion: usage.completion_tokens ?? usage.completionTokens ?? 0,
        total: usage.total_tokens ?? usage.totalTokens ?? 0
      };

      const isPaid = resolvedProvider === 'openai';
      const cost = isPaid ? calculateOpenAICost(modelName, tokens) : 0;

      usageTracker.record(resolvedProvider, modelName, {
        isPaid,
        tokens,
        cost
      });

      return {
        ...result,
        provider: resolvedProvider
      };
    };

    try {
      // Try the selected provider
      return await invokeProvider(provider, providerName, options);
    } catch (error) {
      console.error(`Error with provider ${providerName}:`, error);

      // If fallback is enabled and we're not already using a fallback, try another provider
      if (this.fallbackEnabled && !options.isFallback) {
        for (const [name, fallbackProvider] of this.providers) {
          if (name !== providerName && (await this.isProviderAvailable(name))) {
            console.log(`Falling back to ${name} provider`);
            try {
              return await invokeProvider(fallbackProvider, name, {
                ...options,
                isFallback: true
              });
            } catch (fallbackError) {
              console.error(`Fallback provider ${name} failed:`, fallbackError);
            }
          }
        }
      }

      // If we get here, all providers failed or fallback is disabled
      throw error;
    }
  }

  /**
   * List all registered providers
   * @returns {Array<string>} - Array of provider names
   */
  listProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * List available models for a provider
   * @param {string} providerName - The name of the provider
   * @returns {Promise<Array>} - Array of available model names
   */
  async listModels(providerName) {
    const provider = this.getProvider(providerName);
    return provider.listModels();
  }

  /**
   * Set the default provider
   * @param {string} providerName - The name of the provider
   */
  setDefaultProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(`Cannot set default provider: ${providerName} is not registered`);
    }
    this.defaultProvider = providerName;
    console.log(`Default LLM provider set to: ${providerName}`);
  }
}
