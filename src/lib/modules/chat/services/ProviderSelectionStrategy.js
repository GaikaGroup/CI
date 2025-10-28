/**
 * Provider Selection Strategy Service
 *
 * Implements different strategies for selecting alternative LLM providers
 * for second opinion generation.
 */

import {
  SECOND_OPINION_CONFIG,
  PROVIDER_WEIGHTS,
  PROVIDER_COSTS
} from '$lib/config/secondOpinion.js';

/**
 * ProviderSelectionStrategy class
 */
export class ProviderSelectionStrategy {
  constructor() {
    this.config = SECOND_OPINION_CONFIG;
    this.weights = { ...PROVIDER_WEIGHTS };
    this.costs = PROVIDER_COSTS;
    this.roundRobinIndex = 0;
    this.selectionHistory = new Map(); // Track selections per user
  }

  /**
   * Select an alternative provider using configured strategy
   * @param {Array<string>} availableProviders - List of available provider names
   * @param {string} excludeProvider - Provider to exclude (used for primary)
   * @param {Object} context - Selection context (user, session, etc.)
   * @returns {string} Selected provider name
   */
  select(availableProviders, excludeProvider, context = {}) {
    // Filter out excluded provider
    const candidates = availableProviders.filter((p) => p !== excludeProvider);

    if (candidates.length === 0) {
      throw new Error('No alternative providers available');
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // Select based on configured strategy
    const strategy = this.config.SELECTION_STRATEGY;

    switch (strategy) {
      case 'priority':
        return this.selectByPriority(candidates, excludeProvider);
      case 'cost':
        return this.selectByCost(candidates, excludeProvider);
      case 'performance':
        return this.selectByPerformance(candidates, excludeProvider, context);
      case 'round-robin':
        return this.selectRoundRobin(candidates, excludeProvider, context);
      case 'random':
        return this.selectRandom(candidates, excludeProvider);
      default:
        console.warn(`Unknown strategy: ${strategy}, falling back to priority`);
        return this.selectByPriority(candidates, excludeProvider);
    }
  }

  /**
   * Select provider based on configured priority order
   * @param {Array<string>} candidates - Available provider candidates
   * @param {string} excludeProvider - Provider to exclude
   * @returns {string} Selected provider
   */
  selectByPriority(candidates, excludeProvider) {
    const priority = this.config.PROVIDER_PRIORITY;

    // Find first provider in priority list that's available
    for (const provider of priority) {
      if (candidates.includes(provider) && provider !== excludeProvider) {
        console.log(`[ProviderSelection] Selected by priority: ${provider}`);
        return provider;
      }
    }

    // If no provider from priority list is available, return first candidate
    console.log(`[ProviderSelection] No priority match, using first candidate: ${candidates[0]}`);
    return candidates[0];
  }

  /**
   * Select provider based on cost (prefer cheaper options)
   * @param {Array<string>} candidates - Available provider candidates
   * @param {string} excludeProvider - Provider to exclude
   * @returns {string} Selected provider
   */
  selectByCost(candidates, excludeProvider) {
    // Calculate average cost per provider
    const providerCosts = candidates.map((provider) => {
      const cost = this.calculateAverageCost(provider);
      return { provider, cost };
    });

    // Sort by cost (ascending)
    providerCosts.sort((a, b) => a.cost - b.cost);

    const selected = providerCosts[0].provider;
    console.log(
      `[ProviderSelection] Selected by cost: ${selected} (avg cost: $${providerCosts[0].cost.toFixed(6)})`
    );
    return selected;
  }

  /**
   * Calculate average cost for a provider
   * @param {string} provider - Provider name
   * @returns {number} Average cost per token
   */
  calculateAverageCost(provider) {
    const providerCosts = this.costs[provider];
    if (!providerCosts) {
      return 0; // Free/unknown cost
    }

    // Calculate average across all models
    const models = Object.values(providerCosts);
    if (models.length === 0) {
      return 0;
    }

    const totalCost = models.reduce((sum, model) => {
      // Average of input and output cost
      return sum + (model.input + model.output) / 2;
    }, 0);

    return totalCost / models.length;
  }

  /**
   * Select provider based on performance (using feedback weights)
   * @param {Array<string>} candidates - Available provider candidates
   * @param {string} excludeProvider - Provider to exclude
   * @param {Object} context - Selection context
   * @returns {string} Selected provider
   */
  selectByPerformance(candidates, excludeProvider, context) {
    // Get weights for candidates
    const providerWeights = candidates.map((provider) => {
      const weight = this.weights[provider] || 1.0;
      return { provider, weight };
    });

    // Sort by weight (descending)
    providerWeights.sort((a, b) => b.weight - a.weight);

    const selected = providerWeights[0].provider;
    console.log(
      `[ProviderSelection] Selected by performance: ${selected} (weight: ${providerWeights[0].weight})`
    );
    return selected;
  }

  /**
   * Select provider using round-robin rotation
   * @param {Array<string>} candidates - Available provider candidates
   * @param {string} excludeProvider - Provider to exclude
   * @param {Object} context - Selection context
   * @returns {string} Selected provider
   */
  selectRoundRobin(candidates, excludeProvider, context) {
    const userId = context.userId || 'default';

    // Get or initialize user's round-robin index
    if (!this.selectionHistory.has(userId)) {
      this.selectionHistory.set(userId, 0);
    }

    let index = this.selectionHistory.get(userId);

    // Ensure index is within bounds
    index = index % candidates.length;

    const selected = candidates[index];

    // Increment index for next selection
    this.selectionHistory.set(userId, (index + 1) % candidates.length);

    console.log(`[ProviderSelection] Selected by round-robin: ${selected} (index: ${index})`);
    return selected;
  }

  /**
   * Select provider randomly
   * @param {Array<string>} candidates - Available provider candidates
   * @param {string} excludeProvider - Provider to exclude
   * @returns {string} Selected provider
   */
  selectRandom(candidates, excludeProvider) {
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];

    console.log(`[ProviderSelection] Selected randomly: ${selected}`);
    return selected;
  }

  /**
   * Update provider weight based on feedback
   * @param {string} provider - Provider name
   * @param {boolean} helpful - Whether the opinion was helpful
   * @param {number} adjustmentFactor - How much to adjust (default: 0.1)
   */
  updateProviderWeight(provider, helpful, adjustmentFactor = 0.1) {
    if (!this.weights[provider]) {
      this.weights[provider] = 1.0;
    }

    if (helpful) {
      // Increase weight for helpful responses
      this.weights[provider] = Math.min(10.0, this.weights[provider] + adjustmentFactor);
    } else {
      // Decrease weight for unhelpful responses
      this.weights[provider] = Math.max(0.1, this.weights[provider] - adjustmentFactor);
    }

    console.log(
      `[ProviderSelection] Updated weight for ${provider}: ${this.weights[provider].toFixed(2)}`
    );
  }

  /**
   * Get provider weights for analytics
   * @returns {Object} Current provider weights
   */
  getProviderWeights() {
    return { ...this.weights };
  }

  /**
   * Reset provider weights to default
   */
  resetProviderWeights() {
    this.weights = { ...PROVIDER_WEIGHTS };
    console.log('[ProviderSelection] Provider weights reset to default');
  }

  /**
   * Get selection statistics
   * @returns {Object} Selection statistics
   */
  getStatistics() {
    return {
      strategy: this.config.SELECTION_STRATEGY,
      weights: this.getProviderWeights(),
      roundRobinUsers: this.selectionHistory.size,
      costs: this.costs
    };
  }

  /**
   * Clear selection history (for testing or reset)
   */
  clearHistory() {
    this.selectionHistory.clear();
    this.roundRobinIndex = 0;
    console.log('[ProviderSelection] Selection history cleared');
  }
}

// Export singleton instance
export const providerSelectionStrategy = new ProviderSelectionStrategy();
