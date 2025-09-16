/**
 * Pricing configuration for paid AI providers.
 */

/**
 * OpenAI chat completion pricing.
 *
 * Rates sourced from the official pricing table:
 * https://openai.com/api/pricing/
 *
 * Prices are expressed in USD per 1,000 tokens.
 */
export const OPENAI_PRICING = {
  'gpt-3.5-turbo-0125': {
    prompt: 0.0005,
    completion: 0.0015
  }
};

/**
 * Look up pricing data for an OpenAI model.
 * @param {string} model
 * @returns {{ prompt: number, completion: number } | null}
 */
export function getOpenAIModelPricing(model) {
  if (!model) {
    return null;
  }

  return OPENAI_PRICING[model] || null;
}

/**
 * Calculate the USD cost for an OpenAI response using token counts.
 * @param {string} model
 * @param {{ prompt?: number, completion?: number }} tokens
 * @returns {number}
 */
export function calculateOpenAICost(model, tokens = {}) {
  const pricing = getOpenAIModelPricing(model);

  if (!pricing) {
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

  const promptCost = (promptTokens / 1000) * pricing.prompt;
  const completionCost = (completionTokens / 1000) * pricing.completion;

  return promptCost + completionCost;
}
