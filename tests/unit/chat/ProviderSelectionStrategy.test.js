/**
 * Unit tests for ProviderSelectionStrategy service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderSelectionStrategy } from '../../../src/lib/modules/chat/services/ProviderSelectionStrategy.js';

describe('ProviderSelectionStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new ProviderSelectionStrategy();
    strategy.clearHistory();
    strategy.resetProviderWeights();
  });

  describe('select', () => {
    it('should throw error when no alternative providers available', () => {
      expect(() => {
        strategy.select(['openai'], 'openai');
      }).toThrow('No alternative providers available');
    });

    it('should return single candidate when only one alternative', () => {
      const result = strategy.select(['openai', 'ollama'], 'openai');
      expect(result).toBe('ollama');
    });

    it('should use configured strategy', () => {
      const originalStrategy = strategy.config.SELECTION_STRATEGY;
      strategy.config.SELECTION_STRATEGY = 'random';

      const result = strategy.select(['openai', 'ollama', 'anthropic'], 'openai');
      expect(['ollama', 'anthropic']).toContain(result);

      strategy.config.SELECTION_STRATEGY = originalStrategy;
    });

    it('should fallback to priority for unknown strategy', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      strategy.config.SELECTION_STRATEGY = 'unknown';

      // Use multiple candidates to trigger the strategy selection logic
      const result = strategy.select(['openai', 'ollama', 'anthropic'], 'none');
      expect(['openai', 'ollama', 'anthropic']).toContain(result);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown strategy: unknown'));

      consoleSpy.mockRestore();
    });
  });

  describe('selectByPriority', () => {
    it('should select first provider in priority list', () => {
      strategy.config.PROVIDER_PRIORITY = ['ollama', 'openai'];
      const result = strategy.selectByPriority(['openai', 'ollama'], 'anthropic');
      expect(result).toBe('ollama');
    });

    it('should skip excluded provider', () => {
      strategy.config.PROVIDER_PRIORITY = ['openai', 'ollama'];
      const result = strategy.selectByPriority(['openai', 'ollama'], 'openai');
      expect(result).toBe('ollama');
    });

    it('should return first candidate if no priority match', () => {
      strategy.config.PROVIDER_PRIORITY = ['anthropic'];
      const result = strategy.selectByPriority(['openai', 'ollama'], 'anthropic');
      expect(['openai', 'ollama']).toContain(result);
    });
  });

  describe('selectByCost', () => {
    it('should select cheaper provider', () => {
      const result = strategy.selectByCost(['openai', 'ollama'], 'anthropic');
      // Ollama is free (cost = 0), OpenAI has cost
      expect(result).toBe('ollama');
    });

    it('should handle providers with no cost data', () => {
      const result = strategy.selectByCost(['unknown1', 'unknown2'], 'openai');
      expect(['unknown1', 'unknown2']).toContain(result);
    });
  });

  describe('calculateAverageCost', () => {
    it('should return 0 for providers without cost data', () => {
      const cost = strategy.calculateAverageCost('unknown');
      expect(cost).toBe(0);
    });

    it('should calculate average cost for OpenAI', () => {
      const cost = strategy.calculateAverageCost('openai');
      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for Ollama (free)', () => {
      const cost = strategy.calculateAverageCost('ollama');
      expect(cost).toBe(0);
    });
  });

  describe('selectByPerformance', () => {
    it('should select provider with highest weight', () => {
      strategy.weights = { openai: 2.0, ollama: 1.0 };
      const result = strategy.selectByPerformance(['openai', 'ollama'], 'anthropic');
      expect(result).toBe('openai');
    });

    it('should use default weight of 1.0 for unknown providers', () => {
      strategy.weights = { openai: 0.5 };
      const result = strategy.selectByPerformance(['openai', 'ollama'], 'anthropic');
      expect(result).toBe('ollama'); // ollama has default weight 1.0 > openai 0.5
    });
  });

  describe('selectRoundRobin', () => {
    it('should rotate through providers', () => {
      const candidates = ['openai', 'ollama', 'anthropic'];
      const context = { userId: 'user1' };

      const result1 = strategy.selectRoundRobin(candidates, 'none', context);
      const result2 = strategy.selectRoundRobin(candidates, 'none', context);
      const result3 = strategy.selectRoundRobin(candidates, 'none', context);

      expect(result1).toBe('openai');
      expect(result2).toBe('ollama');
      expect(result3).toBe('anthropic');
    });

    it('should wrap around after reaching end', () => {
      const candidates = ['openai', 'ollama'];
      const context = { userId: 'user1' };

      strategy.selectRoundRobin(candidates, 'none', context);
      strategy.selectRoundRobin(candidates, 'none', context);
      const result = strategy.selectRoundRobin(candidates, 'none', context);

      expect(result).toBe('openai'); // Wrapped around
    });

    it('should maintain separate indices for different users', () => {
      const candidates = ['openai', 'ollama'];

      const result1 = strategy.selectRoundRobin(candidates, 'none', { userId: 'user1' });
      const result2 = strategy.selectRoundRobin(candidates, 'none', { userId: 'user2' });

      expect(result1).toBe('openai');
      expect(result2).toBe('openai'); // Different user, starts from 0
    });
  });

  describe('selectRandom', () => {
    it('should return one of the candidates', () => {
      const candidates = ['openai', 'ollama', 'anthropic'];
      const result = strategy.selectRandom(candidates, 'none');
      expect(candidates).toContain(result);
    });

    it('should not return excluded provider', () => {
      const candidates = ['openai', 'ollama'];
      const result = strategy.selectRandom(candidates, 'anthropic');
      expect(['openai', 'ollama']).toContain(result);
    });
  });

  describe('updateProviderWeight', () => {
    it('should increase weight for helpful feedback', () => {
      const initialWeight = strategy.weights.openai || 1.0;
      strategy.updateProviderWeight('openai', true, 0.1);
      expect(strategy.weights.openai).toBe(initialWeight + 0.1);
    });

    it('should decrease weight for unhelpful feedback', () => {
      strategy.weights.openai = 1.0;
      strategy.updateProviderWeight('openai', false, 0.1);
      expect(strategy.weights.openai).toBe(0.9);
    });

    it('should not exceed maximum weight of 10.0', () => {
      strategy.weights.openai = 9.95;
      strategy.updateProviderWeight('openai', true, 0.1);
      expect(strategy.weights.openai).toBe(10.0);
    });

    it('should not go below minimum weight of 0.1', () => {
      strategy.weights.openai = 0.15;
      strategy.updateProviderWeight('openai', false, 0.1);
      expect(strategy.weights.openai).toBe(0.1);
    });

    it('should initialize weight for new provider', () => {
      strategy.updateProviderWeight('newprovider', true, 0.1);
      expect(strategy.weights.newprovider).toBe(1.1);
    });
  });

  describe('getProviderWeights', () => {
    it('should return copy of weights', () => {
      strategy.weights = { openai: 1.5, ollama: 2.0 };
      const weights = strategy.getProviderWeights();

      expect(weights).toEqual({ openai: 1.5, ollama: 2.0 });

      // Modifying returned object should not affect original
      weights.openai = 5.0;
      expect(strategy.weights.openai).toBe(1.5);
    });
  });

  describe('resetProviderWeights', () => {
    it('should reset weights to default', () => {
      strategy.weights = { openai: 5.0, ollama: 3.0 };
      strategy.resetProviderWeights();

      expect(strategy.weights.openai).toBe(1.0);
      expect(strategy.weights.ollama).toBe(1.0);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics object', () => {
      strategy.selectionHistory.set('user1', 0);
      strategy.selectionHistory.set('user2', 1);

      const stats = strategy.getStatistics();

      expect(stats).toHaveProperty('strategy');
      expect(stats).toHaveProperty('weights');
      expect(stats).toHaveProperty('roundRobinUsers');
      expect(stats).toHaveProperty('costs');
      expect(stats.roundRobinUsers).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear selection history', () => {
      strategy.selectionHistory.set('user1', 5);
      strategy.roundRobinIndex = 3;

      strategy.clearHistory();

      expect(strategy.selectionHistory.size).toBe(0);
      expect(strategy.roundRobinIndex).toBe(0);
    });
  });
});
