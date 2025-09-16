/**
 * Pricing configuration for paid AI providers.
 */

const TOKENS_PER_MILLION = 1000000;
export const USD_MICRO_PRECISION = 100000000; // 8 decimal places

/**
 * OpenAI chat completion pricing.
 *
 * Rates sourced from the official pricing table:
 * https://openai.com/api/pricing/
 *
 * Prices are expressed in USD per 1,000,000 tokens to match the official
 * documentation. Helper utilities derive per-token rates from these values.
 */
export const OPENAI_PRICING = {
  'gpt-3.5-turbo-0125': {
    promptPerMillion: 0.5,
    completionPerMillion: 1.5
  }
};

/**
 * Look up pricing data for an OpenAI model.
 * @param {string} model
 * @returns {{ promptPerMillion: number, completionPerMillion: number } | null}
 */
export function getOpenAIModelPricing(model) {
  if (!model) {
    return null;
  }

  return OPENAI_PRICING[model] || null;
}

/**
 * Derive per-token pricing data for an OpenAI model.
 * @param {string} model
 * @returns {{ promptPerToken: number, completionPerToken: number } | null}
 */
export function getOpenAIModelPerTokenRates(model) {
  const pricing = getOpenAIModelPricing(model);

  if (!pricing) {
    return null;
  }

  return {
    promptPerToken: pricing.promptPerMillion / TOKENS_PER_MILLION,
    completionPerToken: pricing.completionPerMillion / TOKENS_PER_MILLION
  };
}

/**
 * Round a USD value to the configured micro-dollar precision.
 * @param {number} value
 * @returns {number}
 */
export function roundUSDToPrecision(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * USD_MICRO_PRECISION) / USD_MICRO_PRECISION;
}

/**
 * Calculate the USD cost for an OpenAI response using token counts.
 * @param {string} model
 * @param {{ prompt?: number, completion?: number }} tokens
 * @returns {number}
 */
export function calculateOpenAICost(model, tokens = {}) {
  const rates = getOpenAIModelPerTokenRates(model);

  if (!rates) {
    return 0;
  }

  const promptTokens =
    typeof tokens.prompt === 'number' && Number.isFinite(tokens.prompt)
      ? Math.max(tokens.prompt, 0)
      : 0;
  const completionTokens =
    typeof tokens.completion === 'number' && Number.isFinite(tokens.completion)
      ? Math.max(tokens.completion, 0)
      : 0;

  const promptCost = promptTokens * rates.promptPerToken;
  const completionCost = completionTokens * rates.completionPerToken;

  return roundUSDToPrecision(promptCost + completionCost);
}
