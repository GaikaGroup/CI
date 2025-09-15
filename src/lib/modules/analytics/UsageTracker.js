/**
 * Tracks usage metrics for LLM provider requests.
 */
export class UsageTracker {
  constructor() {
    this._modelUsage = new Map();
  }

  /**
   * Record a successful LLM request.
   * @param {string} provider
   * @param {string} model
   * @param {boolean} isPaid
   */
  record(provider, model, isPaid) {
    const normalizedModel = model || 'Unknown model';
    const key = `${provider || 'unknown'}::${normalizedModel}`;

    if (!this._modelUsage.has(key)) {
      this._modelUsage.set(key, {
        model: normalizedModel,
        provider: provider || 'unknown',
        totalRequests: 0,
        paidRequests: 0
      });
    }

    const entry = this._modelUsage.get(key);
    entry.totalRequests += 1;
    if (isPaid) {
      entry.paidRequests += 1;
    }
  }

  /**
   * Return aggregated usage summary for presentation.
   * @returns {{ models: Array<{ model: string, total: number, paid: number }> }}
   */
  summary() {
    return {
      models: Array.from(this._modelUsage.values()).map((entry) => ({
        model: entry.model,
        total: entry.totalRequests,
        paid: entry.paidRequests
      }))
    };
  }

  /**
   * Reset all tracked metrics.
   */
  reset() {
    this._modelUsage.clear();
  }
}

export const usageTracker = new UsageTracker();
