import crypto from 'crypto';

/**
 * Embedding Service
 *
 * Generates vector embeddings using OpenAI API with caching and cost tracking.
 * Supports configurable dimensions and batch processing.
 */
export class EmbeddingService {
  constructor(config = {}) {
    this.provider = config.provider || 'openai';
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;
    this.batchSize = config.batchSize || 100;
    this.monthlyLimit = config.monthlyLimit || 1000000;
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;

    // Caching
    this.cache = new Map(); // SHA-256 hash -> embedding
    this.cacheEnabled = config.cacheEnabled !== false;

    // Cost tracking
    this.tokenUsage = {
      total: 0,
      monthly: 0,
      lastReset: new Date()
    };

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 4000]; // ms
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<Object>} Result with embedding and metadata
   */
  async generateEmbedding(text) {
    const startTime = Date.now();

    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text: must be non-empty string');
      }

      if (text.length > 100000) {
        throw new Error('Text too long: maximum 100,000 characters');
      }

      // Check cache
      const cacheKey = this.getCacheKey(text);
      if (this.cacheEnabled && this.cache.has(cacheKey)) {
        return {
          success: true,
          embedding: this.cache.get(cacheKey),
          cached: true,
          latency: Date.now() - startTime,
          tokens: 0
        };
      }

      // Check monthly limit
      this.checkMonthlyLimit();

      // Generate embedding with retry
      const embedding = await this.generateWithRetry(text);

      // Estimate tokens (roughly 4 chars per token)
      const tokens = Math.ceil(text.length / 4);
      this.trackTokenUsage(tokens);

      // Cache result
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, embedding);
      }

      return {
        success: true,
        embedding,
        cached: false,
        latency: Date.now() - startTime,
        tokens
      };
    } catch (error) {
      console.error('[EmbeddingService] Error generating embedding:', error);
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   * @param {string[]} texts - Array of texts to embed
   * @returns {Promise<Object>} Result with embeddings array
   */
  async generateBatchEmbeddings(texts) {
    const startTime = Date.now();

    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Invalid texts: must be non-empty array');
      }

      const results = [];
      const batches = this.createBatches(texts, this.batchSize);

      for (const batch of batches) {
        const batchResults = await Promise.all(batch.map((text) => this.generateEmbedding(text)));
        results.push(...batchResults);
      }

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      return {
        success: failed.length === 0,
        embeddings: successful.map((r) => r.embedding),
        results,
        totalTexts: texts.length,
        successful: successful.length,
        failed: failed.length,
        latency: Date.now() - startTime
      };
    } catch (error) {
      console.error('[EmbeddingService] Error in batch generation:', error);
      return {
        success: false,
        error: error.message,
        embeddings: [],
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Generate embedding with exponential backoff retry
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateWithRetry(text) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.callOpenAIAPI(text);
      } catch (error) {
        lastError = error;

        // Don't retry on validation errors
        if (error.message.includes('Invalid') || error.message.includes('too long')) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelays[attempt]);
          console.log(`[EmbeddingService] Retry attempt ${attempt + 1}/${this.maxRetries}`);
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Call OpenAI API to generate embedding
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async callOpenAIAPI(text) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: this.dimensions
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data[0].embedding;
  }

  /**
   * Get cache key for text (SHA-256 hash)
   * @param {string} text - Text to hash
   * @returns {string} Cache key
   */
  getCacheKey(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Create batches from array
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Size of each batch
   * @returns {Array[]} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Track token usage
   * @param {number} tokens - Number of tokens used
   */
  trackTokenUsage(tokens) {
    this.tokenUsage.total += tokens;
    this.tokenUsage.monthly += tokens;

    // Reset monthly counter if needed
    const now = new Date();
    const lastReset = new Date(this.tokenUsage.lastReset);
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      this.tokenUsage.monthly = tokens;
      this.tokenUsage.lastReset = now;
    }
  }

  /**
   * Check if monthly limit is exceeded
   * @throws {Error} If limit exceeded
   */
  checkMonthlyLimit() {
    if (this.tokenUsage.monthly >= this.monthlyLimit) {
      throw new Error(
        `Monthly token limit exceeded: ${this.tokenUsage.monthly}/${this.monthlyLimit}`
      );
    }
  }

  /**
   * Get token usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      total: this.tokenUsage.total,
      monthly: this.tokenUsage.monthly,
      monthlyLimit: this.monthlyLimit,
      percentUsed: (this.tokenUsage.monthly / this.monthlyLimit) * 100,
      estimatedCost: this.tokenUsage.monthly * 0.00001, // $0.01 per 1K tokens
      lastReset: this.tokenUsage.lastReset
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled
    };
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
