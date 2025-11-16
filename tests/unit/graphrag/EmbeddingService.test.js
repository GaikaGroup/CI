import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingService } from '../../../src/lib/modules/graphrag/services/EmbeddingService.js';

describe('EmbeddingService', () => {
  let embeddingService;
  let fetchMock;

  beforeEach(() => {
    embeddingService = new EmbeddingService({
      apiKey: 'test-api-key',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      batchSize: 100,
      monthlyLimit: 1000000
    });

    // Mock fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }]
        })
      });

      const result = await embeddingService.generateEmbedding('test text');

      expect(result.success).toBe(true);
      expect(result.embedding).toEqual(mockEmbedding);
      expect(result.cached).toBe(false);
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should return cached embedding on second call', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }]
        })
      });

      // First call
      await embeddingService.generateEmbedding('test text');

      // Second call should use cache
      const result = await embeddingService.generateEmbedding('test text');

      expect(result.success).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.tokens).toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on API failure', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      // Fail first two times, succeed on third
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockEmbedding }]
          })
        });

      const result = await embeddingService.generateEmbedding('test text');

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await embeddingService.generateEmbedding('test text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed after 3 attempts');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(100001);

      const result = await embeddingService.generateEmbedding(longText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Text too long');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should reject invalid input', async () => {
      const result = await embeddingService.generateEmbedding(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid text');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }]
        })
      });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await embeddingService.generateBatchEmbeddings(texts);

      expect(result.success).toBe(true);
      expect(result.embeddings).toHaveLength(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockEmbedding }]
          })
        })
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: mockEmbedding }]
          })
        });

      const texts = ['text 1', 'text 2', 'text 3'];
      const result = await embeddingService.generateBatchEmbeddings(texts);

      expect(result.success).toBe(false);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('token tracking', () => {
    it('should track token usage', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }]
        })
      });

      await embeddingService.generateEmbedding('test text');

      const stats = embeddingService.getUsageStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.monthly).toBeGreaterThan(0);
    });

    it('should enforce monthly limit', async () => {
      embeddingService.tokenUsage.monthly = 1000000;

      const result = await embeddingService.generateEmbedding('test text');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Monthly token limit exceeded');
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockEmbedding = Array(1536)
        .fill(0)
        .map(() => Math.random());

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }]
        })
      });

      await embeddingService.generateEmbedding('test text');

      let stats = embeddingService.getCacheStats();
      expect(stats.size).toBe(1);

      embeddingService.clearCache();

      stats = embeddingService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
