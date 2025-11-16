import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

/**
 * Local Embedding Service
 *
 * Generates embeddings using local models (sentence-transformers, Ollama, etc.)
 * No API costs, but requires local compute resources.
 */
export class LocalEmbeddingService {
  constructor(config = {}) {
    this.provider = config.provider || 'sentence-transformers';
    this.model = config.model || 'all-MiniLM-L6-v2';
    this.dimensions = config.dimensions || 384;
    this.cache = new Map();
    this.cacheEnabled = config.cacheEnabled !== false;

    // Provider-specific settings
    this.pythonPath = config.pythonPath || 'python3';
    this.ollamaHost = config.ollamaHost || 'http://localhost:11434';
  }

  /**
   * Generate embedding for a single text
   * @param {string} text - Text to embed
   * @returns {Promise<Object>} Result with embedding
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

      // Generate embedding based on provider
      let embedding;
      switch (this.provider) {
        case 'sentence-transformers':
          embedding = await this.generateWithSentenceTransformers(text);
          break;
        case 'ollama':
          embedding = await this.generateWithOllama(text);
          break;
        case 'transformers-js':
          embedding = await this.generateWithTransformersJS(text);
          break;
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }

      // Cache result
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, embedding);
      }

      return {
        success: true,
        embedding,
        cached: false,
        latency: Date.now() - startTime,
        tokens: 0,
        provider: this.provider
      };
    } catch (error) {
      console.error('[LocalEmbeddingService] Error generating embedding:', error);
      return {
        success: false,
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Generate embeddings using sentence-transformers (Python)
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateWithSentenceTransformers(text) {
    // Create temporary Python script
    const scriptPath = join('/tmp', `embed_${Date.now()}.py`);
    const script = `
import sys
import json
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('${this.model}')
text = sys.stdin.read()
embedding = model.encode(text).tolist()
print(json.dumps(embedding))
`;

    await writeFile(scriptPath, script);

    try {
      const embedding = await this.runPythonScript(scriptPath, text);
      return embedding;
    } finally {
      // Cleanup
      await unlink(scriptPath).catch(() => {});
    }
  }

  /**
   * Generate embeddings using Ollama
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateWithOllama(text) {
    const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  /**
   * Generate embeddings using Transformers.js (browser-compatible)
   * @param {string} _text - Text to embed (unused, not yet implemented)
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateWithTransformersJS(_text) {
    // This would use @xenova/transformers in Node.js
    // For now, throw error as it requires additional setup
    throw new Error('Transformers.js support requires @xenova/transformers package');
  }

  /**
   * Run Python script and get output
   * @param {string} scriptPath - Path to Python script
   * @param {string} input - Input text
   * @returns {Promise<number[]>} Embedding vector
   */
  runPythonScript(scriptPath, input) {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [scriptPath]);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${error}`));
          return;
        }

        try {
          const embedding = JSON.parse(output.trim());
          resolve(embedding);
        } catch (e) {
          reject(new Error(`Failed to parse embedding: ${e.message}`));
        }
      });

      // Send input to Python script
      python.stdin.write(input);
      python.stdin.end();
    });
  }

  /**
   * Generate embeddings for multiple texts
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

      // Process in parallel (up to 5 at a time to avoid overwhelming system)
      const batchSize = 5;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
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
      console.error('[LocalEmbeddingService] Error in batch generation:', error);
      return {
        success: false,
        error: error.message,
        embeddings: [],
        latency: Date.now() - startTime
      };
    }
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
   * Get usage statistics (no cost for local models)
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    return {
      total: 0,
      monthly: 0,
      monthlyLimit: Infinity,
      percentUsed: 0,
      estimatedCost: 0,
      provider: this.provider,
      model: this.model
    };
  }
}
