import { USD_MICRO_PRECISION, roundUSDToPrecision } from '$lib/config/pricing';

/**
 * Tracks usage metrics for LLM provider requests.
 */
export class UsageTracker {
  constructor() {
    this._modelUsage = new Map();
    this._mathUsage = {
      totalMathQueries: 0,
      byCategory: {},
      totalTokens: 0,
      totalCost: 0,
      classifications: []
    };
  }

  /**
   * Normalize numeric values ensuring they are finite and non-negative.
   * @param {number|undefined|null} value
   * @param {boolean} [allowZero=true] When false, zero will be coerced to the fallback value
   * @param {number} [fallback=0]
   * @returns {number}
   */
  _sanitizeNumber(value, allowZero = true, fallback = 0) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }
    if (!allowZero && value === 0) {
      return fallback;
    }
    return value < 0 ? fallback : value;
  }

  /**
   * Record a successful LLM request.
   *
   * Back-compat:
   *   record(provider, model, true)              // legacy boolean for paid
   * Preferred:
   *   record(provider, model, { isPaid, tokens, cost })
   *
   * @param {string} provider
   * @param {string} model
   * @param {boolean | {
   *   isPaid?: boolean,
   *   tokens?: { prompt?: number, completion?: number, total?: number, prompt_tokens?: number, completion_tokens?: number, total_tokens?: number },
   *   cost?: number
   * }} [options]
   */
  record(provider, model, options) {
    let isPaid = false;
    let tokens;
    let cost;

    if (typeof options === 'boolean') {
      // Legacy signature: (provider, model, isPaid)
      isPaid = options;
    } else if (options && typeof options === 'object') {
      ({ isPaid = false, tokens, cost } = options);
    }

    const normalizedModel = model || 'Unknown model';
    const key = `${provider || 'unknown'}::${normalizedModel}`;

    if (!this._modelUsage.has(key)) {
      this._modelUsage.set(key, {
        model: normalizedModel,
        provider: provider || 'unknown',
        totalRequests: 0,
        paidRequests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCostMicro: 0
      });
    }

    const entry = this._modelUsage.get(key);
    entry.totalRequests += 1;
    if (isPaid) {
      entry.paidRequests += 1;
    }

    if (tokens) {
      const promptTokens = this._sanitizeNumber(tokens.prompt ?? tokens.prompt_tokens ?? 0);
      const completionTokens = this._sanitizeNumber(
        tokens.completion ?? tokens.completion_tokens ?? 0
      );
      const totalTokens = this._sanitizeNumber(
        tokens.total ?? tokens.total_tokens ?? promptTokens + completionTokens
      );

      entry.promptTokens += promptTokens;
      entry.completionTokens += completionTokens;
      entry.totalTokens += totalTokens;
    }

    if (typeof cost !== 'undefined') {
      const sanitizedCost = this._sanitizeNumber(cost, true, 0);
      const microValue = Math.round(sanitizedCost * USD_MICRO_PRECISION);
      entry.totalCostMicro += microValue;
    }
  }

  /**
   * Return aggregated usage summary for presentation.
   * @returns {{
   *   models: Array<{
   *     provider: string,
   *     model: string,
   *     total: number,
   *     paid: number,
   *     promptTokens: number,
   *     completionTokens: number,
   *     totalTokens: number,
   *     totalCost: number
   *   }>,
   *   totals: {
   *     totalRequests: number,
   *     paidRequests: number,
   *     promptTokens: number,
   *     completionTokens: number,
   *     totalTokens: number,
   *     totalCost: number
   *   }
   * }}
   */
  summary() {
    let totalsCostMicro = 0;

    const models = Array.from(this._modelUsage.values()).map((entry) => {
      totalsCostMicro += entry.totalCostMicro;

      return {
        provider: entry.provider,
        model: entry.model,
        total: entry.totalRequests,
        paid: entry.paidRequests,
        promptTokens: entry.promptTokens,
        completionTokens: entry.completionTokens,
        totalTokens: entry.totalTokens,
        totalCost: roundUSDToPrecision(entry.totalCostMicro / USD_MICRO_PRECISION)
      };
    });

    const totals = models.reduce(
      (accumulator, entry) => {
        accumulator.totalRequests += entry.total;
        accumulator.paidRequests += entry.paid;
        accumulator.promptTokens += entry.promptTokens;
        accumulator.completionTokens += entry.completionTokens;
        accumulator.totalTokens += entry.totalTokens;
        return accumulator;
      },
      {
        totalRequests: 0,
        paidRequests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    );

    return {
      models,
      totals: {
        ...totals,
        totalCost: roundUSDToPrecision(totalsCostMicro / USD_MICRO_PRECISION)
      }
    };
  }

  /**
   * Record a mathematical query for analytics
   * @param {Object} classification - Classification result
   * @param {Object} tokens - Token usage
   * @param {number} cost - Cost in USD
   */
  recordMathQuery(classification, tokens = {}, cost = 0) {
    if (!classification || !classification.isMath) {
      return;
    }

    this._mathUsage.totalMathQueries += 1;

    const category = classification.category || 'general';
    if (!this._mathUsage.byCategory[category]) {
      this._mathUsage.byCategory[category] = {
        count: 0,
        totalTokens: 0,
        totalCost: 0,
        avgConfidence: 0
      };
    }

    const categoryData = this._mathUsage.byCategory[category];
    categoryData.count += 1;

    const totalTokens = this._sanitizeNumber(
      tokens.total ?? tokens.total_tokens ?? 0
    );
    categoryData.totalTokens += totalTokens;
    this._mathUsage.totalTokens += totalTokens;

    const sanitizedCost = this._sanitizeNumber(cost, true, 0);
    categoryData.totalCost += sanitizedCost;
    this._mathUsage.totalCost += sanitizedCost;

    // Update average confidence
    const prevAvg = categoryData.avgConfidence;
    const newCount = categoryData.count;
    categoryData.avgConfidence = 
      (prevAvg * (newCount - 1) + classification.confidence) / newCount;

    // Store classification for analysis (keep last 100)
    this._mathUsage.classifications.push({
      category,
      confidence: classification.confidence,
      timestamp: Date.now()
    });

    if (this._mathUsage.classifications.length > 100) {
      this._mathUsage.classifications.shift();
    }
  }

  /**
   * Get math usage statistics
   * @returns {Object} Math usage summary
   */
  getMathSummary() {
    const categories = Object.entries(this._mathUsage.byCategory).map(
      ([category, data]) => ({
        category,
        count: data.count,
        totalTokens: data.totalTokens,
        avgTokens: data.count > 0 ? Math.round(data.totalTokens / data.count) : 0,
        totalCost: roundUSDToPrecision(data.totalCost),
        avgCost: roundUSDToPrecision(data.count > 0 ? data.totalCost / data.count : 0),
        avgConfidence: Math.round(data.avgConfidence * 100) / 100
      })
    );

    return {
      totalMathQueries: this._mathUsage.totalMathQueries,
      totalTokens: this._mathUsage.totalTokens,
      avgTokens: this._mathUsage.totalMathQueries > 0 
        ? Math.round(this._mathUsage.totalTokens / this._mathUsage.totalMathQueries)
        : 0,
      totalCost: roundUSDToPrecision(this._mathUsage.totalCost),
      avgCost: roundUSDToPrecision(
        this._mathUsage.totalMathQueries > 0 
          ? this._mathUsage.totalCost / this._mathUsage.totalMathQueries 
          : 0
      ),
      categories,
      recentClassifications: this._mathUsage.classifications.slice(-10)
    };
  }

  /**
   * Reset all tracked metrics.
   */
  reset() {
    this._modelUsage.clear();
    this._mathUsage = {
      totalMathQueries: 0,
      byCategory: {},
      totalTokens: 0,
      totalCost: 0,
      classifications: []
    };
  }
}

export const usageTracker = new UsageTracker();
