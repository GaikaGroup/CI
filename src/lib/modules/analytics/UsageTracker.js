import { USD_MICRO_PRECISION, roundUSDToPrecision } from '$lib/config/pricing';

/**
 * Tracks usage metrics for LLM provider requests.
 */
export class UsageTracker {
  constructor() {
    this._modelUsage = new Map();
  }

  /**
   * Normalize numeric values ensuring they are finite and non-negative.
   * @param {number|undefined|null} value
   * @param {boolean} allowZero When false, zero will be coerced to the fallback value
   * @param {number} fallback
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
   * @param {string} provider
   * @param {string} model
   * @param {{
   *   isPaid?: boolean,
   *   tokens?: { prompt?: number, completion?: number, total?: number },
   *   cost?: number
   * }} metrics
   */
  record(provider, model, { isPaid = false, tokens, cost } = {}) {
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
   * Reset all tracked metrics.
   */
  reset() {
    this._modelUsage.clear();
  }
}

export const usageTracker = new UsageTracker();
