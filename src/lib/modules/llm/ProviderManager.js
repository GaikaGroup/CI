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
import { MathQueryClassifier } from './classifiers/MathQueryClassifier';
import { RequestEnhancer } from './enhancers/RequestEnhancer';

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

    // Initialize math enhancement components
    this.mathClassifier = new MathQueryClassifier();
    this.requestEnhancer = new RequestEnhancer();

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
    console.warn(`No available LLM providers found, using default: ${this.defaultProvider}`);
    return this.defaultProvider;
  }

  /**
   * Check if messages contain images
   */
  hasImages(messages) {
    console.log('[ProviderManager] Checking for images in messages:', messages.length);
    const result = messages.some((m) => {
      console.log(
        '[ProviderManager] Message content type:',
        typeof m.content,
        Array.isArray(m.content)
      );
      if (Array.isArray(m.content)) {
        const hasImageUrl = m.content.some((c) => {
          console.log('[ProviderManager] Content part type:', c.type);
          return c.type === 'image_url';
        });
        return hasImageUrl;
      }
      return false;
    });
    console.log('[ProviderManager] hasImages result:', result);
    return result;
  }

  /**
   * Generate a chat completion using the best available provider
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion with llmMetadata
   */
  async generateChatCompletion(messages, options = {}) {
    // Check if messages contain images and add flag to options
    const hasImages = this.hasImages(messages);
    if (hasImages) {
      options.hasImages = true;
      console.log('[ProviderManager] Detected images in messages, will use vision model');
    } else {
      console.log('[ProviderManager] No images detected in messages');
    }

    const providerName = options.provider || (await this.getBestProvider());
    const provider = this.getProvider(providerName);
    
    // Track attempted model for fallback scenarios
    let attemptedModel = null;
    let fallbackOccurred = false;
    let fallbackReason = null;

    const invokeProvider = async (providerInstance, name, requestOptions, isAttempt = false) => {
      const invocationTimestamp = new Date().toISOString();
      const result = await providerInstance.generateChatCompletion(messages, requestOptions);
      const resolvedProvider = result.provider || name;
      const modelName = result.model || requestOptions?.model;

      // Normalize usage fields from various providers
      const usageSources = [result.usage, result.raw, result.raw?.usage].filter(
        (candidate) => candidate && typeof candidate === 'object'
      );

      const pickNumeric = (keys) => {
        for (const source of usageSources) {
          for (const key of keys) {
            const value = source[key];
            if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
              return value;
            }
          }
        }
        return undefined;
      };

      const promptTokens = pickNumeric([
        'prompt_tokens',
        'promptTokens',
        'input_tokens',
        'inputTokens',
        'prompt_eval_count',
        'prompt_eval'
      ]);
      const completionTokens = pickNumeric([
        'completion_tokens',
        'completionTokens',
        'output_tokens',
        'outputTokens',
        'eval_count',
        'eval'
      ]);
      let totalTokens = pickNumeric(['total_tokens', 'totalTokens']);

      if (typeof totalTokens === 'undefined' && typeof promptTokens === 'number') {
        if (typeof completionTokens === 'number') {
          totalTokens = promptTokens + completionTokens;
        } else {
          totalTokens = promptTokens;
        }
      } else if (typeof totalTokens === 'undefined' && typeof completionTokens === 'number') {
        totalTokens = completionTokens;
      }

      const tokens = {
        prompt: promptTokens ?? 0,
        completion: completionTokens ?? 0,
        total: totalTokens ?? 0
      };

      // Paid usage + cost calc (OpenAI is paid; Ollama local is not)
      const isPaid = resolvedProvider === 'openai';
      const cost = isPaid ? calculateOpenAICost(modelName, tokens) : 0;

      usageTracker.record(resolvedProvider, modelName, {
        isPaid,
        tokens,
        cost
      });

      // Build LLM metadata for storage
      const llmMetadata = {
        provider: resolvedProvider,
        model: modelName,
        version: result.version || null,
        timestamp: invocationTimestamp,
        config: {
          temperature: requestOptions.temperature || null,
          maxTokens: requestOptions.maxTokens || requestOptions.max_tokens || null,
          systemPrompt: requestOptions.systemPrompt ? '[present]' : null // Don't store full prompt
        }
      };

      // Add fallback information if applicable
      if (fallbackOccurred && !isAttempt) {
        llmMetadata.fallback = {
          attempted: attemptedModel,
          reason: fallbackReason
        };
      }

      return {
        ...result,
        provider: resolvedProvider,
        llmMetadata
      };
    };

    try {
      // Try the selected provider
      attemptedModel = options.model || providerName;
      return await invokeProvider(provider, providerName, options, true);
    } catch (error) {
      console.error(`Error with provider ${providerName}:`, error);
      
      // Mark that fallback occurred
      fallbackOccurred = true;
      fallbackReason = error.message;

      // If fallback is enabled and we're not already using a fallback, try another provider
      if (this.fallbackEnabled && !options.isFallback) {
        for (const [name, fallbackProvider] of this.providers) {
          if (name !== providerName && (await this.isProviderAvailable(name))) {
            console.log(`Falling back to ${name} provider`);
            try {
              return await invokeProvider(fallbackProvider, name, {
                ...options,
                isFallback: true
              }, false);
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

  /**
   * Generate a chat completion with automatic enhancement for mathematical queries
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options for the request
   * @returns {Promise<Object>} - The generated completion with classification metadata
   */
  async generateChatCompletionWithEnhancement(messages, options = {}) {
    // Extract the last user message for classification
    const lastUserMessage = this._extractLastUserMessage(messages);

    if (!lastUserMessage) {
      // No user message to classify, use standard generation
      return this.generateChatCompletion(messages, options);
    }

    // Extract context for better classification
    const context = messages
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => this._extractMessageText(m));

    // Classify the query
    const classification = this.mathClassifier.classify(lastUserMessage, context);

    // Log classification for monitoring
    console.log('[ProviderManager] Query classification:', {
      isMath: classification.isMath,
      confidence: classification.confidence,
      category: classification.category
    });

    // Alert on low confidence classifications (Requirement 6.6)
    if (classification.isMath && classification.confidence < 0.6) {
      console.warn('[ProviderManager] Low confidence math classification detected:', {
        confidence: classification.confidence,
        category: classification.category,
        message: 'Classification may be inaccurate - consider manual review'
      });
    }

    // Enhance options if it's a math query
    let enhancedOptions = options;
    if (classification.isMath) {
      // Detect language from options or default to 'ru'
      const language = options.language || 'ru';
      enhancedOptions = this.requestEnhancer.enhance(options, classification, language);

      console.log('[ProviderManager] Enhanced options for math query:', {
        originalMaxTokens: options.maxTokens,
        enhancedMaxTokens: enhancedOptions.maxTokens,
        category: classification.category
      });

      // If system prompt was added, prepend it to messages
      if (enhancedOptions.systemPrompt && !this._hasSystemMessage(messages)) {
        messages = [{ role: 'system', content: enhancedOptions.systemPrompt }, ...messages];
      } else if (enhancedOptions.systemPrompt && this._hasSystemMessage(messages)) {
        // Append to existing system message
        messages = messages.map((msg, idx) => {
          if (idx === 0 && msg.role === 'system') {
            return {
              ...msg,
              content: `${msg.content}\n\n${enhancedOptions.systemPrompt}`
            };
          }
          return msg;
        });
      }
    }

    // Generate completion with enhanced options
    // Track response time for math queries (Requirement 6.1)
    const startTime = classification.isMath ? Date.now() : null;
    const result = await this.generateChatCompletion(messages, enhancedOptions);
    const responseTime = startTime ? Date.now() - startTime : null;

    // Record math query metrics if it's a math query
    if (classification.isMath) {
      // Extract token usage from result
      const tokens = result.usage || result.raw?.usage || {};

      // Calculate cost if available
      const cost = result.cost || 0;

      // Record the math query
      usageTracker.recordMathQuery(classification, tokens, cost);

      console.log('[ProviderManager] Math query recorded:', {
        category: classification.category,
        confidence: classification.confidence,
        tokens: tokens.total || tokens.total_tokens || 0,
        cost,
        responseTime: responseTime ? `${responseTime}ms` : 'N/A'
      });

      // Alert on slow responses (Requirement 6.6)
      if (responseTime && responseTime > 30000) {
        console.warn('[ProviderManager] Slow math query response detected:', {
          responseTime: `${responseTime}ms`,
          category: classification.category,
          model: result.model,
          message: 'Response time exceeded 30 seconds - consider optimization'
        });
      }
    }

    // Add classification metadata to result (preserve llmMetadata)
    return {
      ...result,
      classification,
      enhanced: classification.isMath
    };
  }

  /**
   * Extract the last user message text
   * @private
   */
  _extractLastUserMessage(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return this._extractMessageText(messages[i]);
      }
    }
    return null;
  }

  /**
   * Extract text from a message (handles both string and array content)
   * @private
   */
  _extractMessageText(message) {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      return message.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(' ');
    }
    return '';
  }

  /**
   * Check if messages already have a system message
   * @private
   */
  _hasSystemMessage(messages) {
    return messages.length > 0 && messages[0].role === 'system';
  }
}
