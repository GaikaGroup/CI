import { prisma } from '$lib/database/client';
import { DatabaseStorageAdapter } from '../adapters/DatabaseStorageAdapter.js';
import { InMemoryStorageAdapter } from '../adapters/InMemoryStorageAdapter.js';
import { EmbeddingService } from '../services/EmbeddingService.js';
import { LocalEmbeddingService } from '../services/LocalEmbeddingService.js';
import { graphragConfig } from '$lib/config/graphrag.js';

/**
 * Storage Adapter Factory
 *
 * Creates appropriate storage adapter based on configuration and pgvector availability.
 * Automatically falls back to in-memory storage if pgvector is unavailable.
 */
export class StorageAdapterFactory {
  /**
   * Create storage adapter
   * @param {Object} config - Configuration options
   * @returns {Promise<Object>} Storage adapter instance
   */
  static async create(config = {}) {
    const usePgvector = config.usePgvector !== false && graphragConfig.storage.usePgvector;

    if (usePgvector) {
      // Check if pgvector is available
      const pgvectorAvailable = await this.checkPgvectorAvailability();

      if (pgvectorAvailable) {
        console.log('[StorageAdapterFactory] Using database storage with pgvector');

        // Create embedding service based on provider
        const provider = config.embedding?.provider || graphragConfig.embedding.provider;
        let embeddingService;

        if (provider === 'local' || provider === 'sentence-transformers' || provider === 'ollama') {
          console.log(`[StorageAdapterFactory] Using local embedding provider: ${provider}`);
          embeddingService = new LocalEmbeddingService({
            provider,
            ...graphragConfig.embedding,
            ...config.embedding
          });
        } else {
          console.log('[StorageAdapterFactory] Using OpenAI embedding provider');
          embeddingService = new EmbeddingService({
            ...graphragConfig.embedding,
            ...config.embedding
          });
        }

        return new DatabaseStorageAdapter(embeddingService);
      } else {
        console.warn(
          '[StorageAdapterFactory] pgvector not available, falling back to in-memory storage'
        );
      }
    } else {
      console.log('[StorageAdapterFactory] Using in-memory storage (pgvector disabled)');
    }

    // Fallback to in-memory storage
    return new InMemoryStorageAdapter();
  }

  /**
   * Check if pgvector extension is available
   * @returns {Promise<boolean>} True if available
   */
  static async checkPgvectorAvailability() {
    try {
      const result = await prisma.$queryRaw`
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      `;
      return result && result.length > 0;
    } catch (error) {
      console.error('[StorageAdapterFactory] pgvector check failed:', error);
      return false;
    }
  }

  /**
   * Get adapter type for current configuration
   * @returns {Promise<string>} Adapter type ('database' or 'memory')
   */
  static async getAdapterType() {
    const usePgvector = graphragConfig.storage.usePgvector;

    if (usePgvector) {
      const pgvectorAvailable = await this.checkPgvectorAvailability();
      return pgvectorAvailable ? 'database' : 'memory';
    }

    return 'memory';
  }
}
