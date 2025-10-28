/**
 * Unit tests for SecondOpinionService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecondOpinionService } from '../../../src/lib/modules/chat/services/SecondOpinionService.js';

// Mock dependencies
vi.mock('$lib/database/client.js', () => ({
  prisma: {
    message: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn()
    },
    secondOpinion: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    opinionFeedback: {
      upsert: vi.fn()
    }
  }
}));

vi.mock('$lib/modules/llm/ProviderManager.js', () => ({
  ProviderManager: vi.fn().mockImplementation(() => ({
    isProviderAvailable: vi.fn().mockResolvedValue(true),
    listProviders: vi.fn().mockReturnValue(['openai', 'ollama']),
    generateChatCompletion: vi.fn().mockResolvedValue({
      text: 'Second opinion response',
      provider: 'ollama',
      model: 'llama2',
      llmMetadata: { provider: 'ollama', model: 'llama2' }
    })
  }))
}));

vi.mock('../../../src/lib/modules/chat/services/DivergenceDetector.js', () => ({
  divergenceDetector: {
    analyze: vi.fn().mockReturnValue({
      similarity: 0.7,
      divergenceLevel: 'medium',
      differences: ['Some differences'],
      suggestedQuestions: ['Question 1'],
      metadata: { text1Length: 10, text2Length: 12, wordDifference: 2 }
    })
  }
}));

vi.mock('../../../src/lib/modules/chat/services/ProviderSelectionStrategy.js', () => ({
  providerSelectionStrategy: {
    select: vi.fn().mockReturnValue('ollama'),
    updateProviderWeight: vi.fn()
  }
}));

describe('SecondOpinionService', () => {
  let service;
  let mockPrisma;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Import mocked prisma
    const { prisma } = await import('$lib/database/client.js');
    mockPrisma = prisma;

    // Create service instance
    service = new SecondOpinionService();
    service.clearRateLimitCache();
  });

  describe('validateRequest', () => {
    it('should throw error if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(service.validateRequest('msg1', 'session1', 'user1')).rejects.toThrow(
        'Message not found'
      );
    });

    it('should throw error if message does not belong to session', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg1',
        sessionId: 'different-session',
        type: 'assistant',
        session: { userId: 'user1' }
      });

      await expect(service.validateRequest('msg1', 'session1', 'user1')).rejects.toThrow(
        'Message does not belong to session'
      );
    });

    it('should throw error if user does not own session', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg1',
        sessionId: 'session1',
        type: 'assistant',
        session: { userId: 'different-user' }
      });

      await expect(service.validateRequest('msg1', 'session1', 'user1')).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('should throw error if message is not assistant message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg1',
        sessionId: 'session1',
        type: 'user',
        session: { userId: 'user1' }
      });

      await expect(service.validateRequest('msg1', 'session1', 'user1')).rejects.toThrow(
        'Can only request second opinion for assistant messages'
      );
    });

    it('should pass validation for valid request', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 'msg1',
        sessionId: 'session1',
        type: 'assistant',
        session: { userId: 'user1' }
      });

      await expect(service.validateRequest('msg1', 'session1', 'user1')).resolves.not.toThrow();
    });
  });

  describe('checkRateLimit', () => {
    it('should return true when rate limiting is disabled', async () => {
      service.config.RATE_LIMIT.ENABLED = false;
      const result = await service.checkRateLimit('user1');
      expect(result).toBe(true);
    });

    it('should return true when under rate limit', async () => {
      service.config.RATE_LIMIT.ENABLED = true;
      mockPrisma.secondOpinion.count.mockResolvedValue(5);

      const result = await service.checkRateLimit('user1');
      expect(result).toBe(true);
    });

    it('should return false when hourly limit exceeded', async () => {
      service.config.RATE_LIMIT.ENABLED = true;
      mockPrisma.secondOpinion.count
        .mockResolvedValueOnce(15) // hour count
        .mockResolvedValueOnce(20); // day count

      const result = await service.checkRateLimit('user1');
      expect(result).toBe(false);
    });

    it('should return false when daily limit exceeded', async () => {
      service.config.RATE_LIMIT.ENABLED = true;
      mockPrisma.secondOpinion.count
        .mockResolvedValueOnce(5) // hour count
        .mockResolvedValueOnce(55); // day count

      const result = await service.checkRateLimit('user1');
      expect(result).toBe(false);
    });

    it('should use cache for repeated checks', async () => {
      service.config.RATE_LIMIT.ENABLED = true;
      mockPrisma.secondOpinion.count.mockResolvedValue(5);

      await service.checkRateLimit('user1');
      await service.checkRateLimit('user1');

      // Should only call database once due to caching
      expect(mockPrisma.secondOpinion.count).toHaveBeenCalledTimes(2); // 2 calls (hour + day) for first check
    });
  });

  describe('getMessageContext', () => {
    it('should retrieve message and conversation history', async () => {
      const mockMessage = {
        id: 'msg1',
        sessionId: 'session1',
        content: 'Primary response',
        createdAt: new Date(),
        session: {
          id: 'session1',
          language: 'en',
          mode: 'learn',
          courseId: 'course1',
          course: {
            id: 'course1',
            name: 'Test Course',
            language: 'en'
          }
        }
      };

      const mockHistory = [
        { id: 'msg0', type: 'user', content: 'Question', createdAt: new Date(Date.now() - 1000) },
        mockMessage
      ];

      mockPrisma.message.findUnique.mockResolvedValue(mockMessage);
      mockPrisma.message.findMany.mockResolvedValue(mockHistory);

      const result = await service.getMessageContext('msg1', 'session1');

      expect(result).toHaveProperty('primaryMessage');
      expect(result).toHaveProperty('context');
      expect(result.context.messages).toHaveLength(2);
      expect(result.context.session.language).toBe('en');
    });

    it('should throw error if message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      await expect(service.getMessageContext('msg1', 'session1')).rejects.toThrow(
        'Primary message not found'
      );
    });
  });

  describe('selectAlternativeProvider', () => {
    it('should use manual provider when allowed', async () => {
      service.config.ALLOW_MANUAL_SELECTION = true;

      const result = await service.selectAlternativeProvider('openai', 'ollama', {});
      expect(result).toBe('ollama');
    });

    it('should throw error if manual provider is unavailable', async () => {
      service.config.ALLOW_MANUAL_SELECTION = true;
      service.providerManager.isProviderAvailable.mockResolvedValue(false);

      await expect(
        service.selectAlternativeProvider('openai', 'unavailable', { language: 'en' })
      ).rejects.toThrow();
    });

    it('should throw error if manual provider is same as primary', async () => {
      service.config.ALLOW_MANUAL_SELECTION = true;

      await expect(service.selectAlternativeProvider('openai', 'openai', {})).rejects.toThrow(
        'Manual provider cannot be the same as primary provider'
      );
    });

    it('should use selection strategy when no manual provider', async () => {
      const { providerSelectionStrategy } = await import(
        '../../../src/lib/modules/chat/services/ProviderSelectionStrategy.js'
      );

      const result = await service.selectAlternativeProvider('openai', null, { userId: 'user1' });

      expect(providerSelectionStrategy.select).toHaveBeenCalled();
      expect(result).toBe('ollama');
    });
  });

  describe('generateOpinion', () => {
    it('should generate opinion using provider manager', async () => {
      const context = {
        messages: [
          { role: 'user', content: 'Question' },
          { role: 'assistant', content: 'Answer' }
        ]
      };

      const result = await service.generateOpinion(context, 'ollama', null, 'en');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('model');
      expect(result.provider).toBe('ollama');
    });

    it('should handle timeout', async () => {
      service.config.PERFORMANCE.GENERATION_TIMEOUT = 100;
      service.providerManager.generateChatCompletion.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      const context = { messages: [] };

      await expect(service.generateOpinion(context, 'ollama', null, 'en')).rejects.toThrow();
    });
  });

  describe('recordFeedback', () => {
    it('should record feedback and update weights', async () => {
      const { providerSelectionStrategy } = await import(
        '../../../src/lib/modules/chat/services/ProviderSelectionStrategy.js'
      );

      mockPrisma.secondOpinion.findUnique.mockResolvedValue({
        id: 'opinion1',
        opinionProvider: 'ollama'
      });
      mockPrisma.opinionFeedback.upsert.mockResolvedValue({});

      await service.recordFeedback('opinion1', true, 'user1', 'Great!');

      expect(mockPrisma.opinionFeedback.upsert).toHaveBeenCalled();
      expect(providerSelectionStrategy.updateProviderWeight).toHaveBeenCalledWith('ollama', true);
    });

    it('should throw error if opinion not found', async () => {
      mockPrisma.secondOpinion.findUnique.mockResolvedValue(null);

      await expect(service.recordFeedback('opinion1', true, 'user1')).rejects.toThrow(
        'Opinion not found'
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return unlimited status when rate limiting disabled', async () => {
      service.config.RATE_LIMIT.ENABLED = false;

      const status = await service.getRateLimitStatus('user1');

      expect(status.enabled).toBe(false);
      expect(status.unlimited).toBe(true);
    });

    it('should return current usage when rate limiting enabled', async () => {
      service.config.RATE_LIMIT.ENABLED = true;
      mockPrisma.secondOpinion.count
        .mockResolvedValueOnce(3) // hour count
        .mockResolvedValueOnce(15); // day count

      const status = await service.getRateLimitStatus('user1');

      expect(status.enabled).toBe(true);
      expect(status.hourly.used).toBe(3);
      expect(status.hourly.remaining).toBe(7); // 10 - 3
      expect(status.daily.used).toBe(15);
      expect(status.daily.remaining).toBe(35); // 50 - 15
    });
  });

  describe('getSecondOpinions', () => {
    it('should retrieve all opinions for a message', async () => {
      const mockOpinions = [
        {
          id: 'opinion1',
          opinionMessageId: 'msg2',
          opinionProvider: 'ollama',
          opinionModel: 'llama2',
          divergenceLevel: 'medium',
          divergenceData: {},
          requestType: 'automatic',
          createdAt: new Date(),
          opinionMessage: { content: 'Opinion 1' },
          feedback: [{ helpful: true }, { helpful: false }]
        }
      ];

      mockPrisma.secondOpinion.findMany.mockResolvedValue(mockOpinions);

      const result = await service.getSecondOpinions('msg1');

      expect(result).toHaveLength(1);
      expect(result[0].feedback.helpful).toBe(1);
      expect(result[0].feedback.notHelpful).toBe(1);
    });
  });

  describe('clearRateLimitCache', () => {
    it('should clear the cache', () => {
      service.rateLimitCache.set('test', { data: 'value' });
      expect(service.rateLimitCache.size).toBe(1);

      service.clearRateLimitCache();
      expect(service.rateLimitCache.size).toBe(0);
    });
  });
});
