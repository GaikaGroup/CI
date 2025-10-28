/**
 * Configuration Validator for Second Opinion Feature
 *
 * Provides validation utilities for Second Opinion configuration
 */

/**
 * Validate the entire configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateConfiguration(config) {
  const errors = [];

  // Validate required fields
  if (typeof config.ENABLED !== 'boolean') {
    errors.push('ENABLED must be a boolean');
  }

  // Validate selection strategy
  const validStrategies = ['priority', 'cost', 'performance', 'round-robin', 'random'];
  if (!validStrategies.includes(config.SELECTION_STRATEGY)) {
    errors.push(
      `SELECTION_STRATEGY must be one of: ${validStrategies.join(', ')}. Got: ${config.SELECTION_STRATEGY}`
    );
  }

  // Validate provider priority
  if (!Array.isArray(config.PROVIDER_PRIORITY)) {
    errors.push('PROVIDER_PRIORITY must be an array');
  } else if (config.PROVIDER_PRIORITY.length === 0) {
    errors.push('PROVIDER_PRIORITY cannot be empty');
  } else if (!config.PROVIDER_PRIORITY.every((p) => typeof p === 'string')) {
    errors.push('PROVIDER_PRIORITY must contain only strings');
  }

  // Validate rate limit configuration
  const rateLimitErrors = validateRateLimit(config.RATE_LIMIT);
  errors.push(...rateLimitErrors);

  // Validate divergence configuration
  const divergenceErrors = validateDivergence(config.DIVERGENCE);
  errors.push(...divergenceErrors);

  // Validate voice mode configuration
  if (config.VOICE_MODE) {
    const voiceErrors = validateVoiceMode(config.VOICE_MODE);
    errors.push(...voiceErrors);
  }

  // Validate performance configuration
  if (config.PERFORMANCE) {
    const perfErrors = validatePerformance(config.PERFORMANCE);
    errors.push(...perfErrors);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate rate limit configuration
 * @param {Object} rateLimit - Rate limit configuration
 * @returns {string[]} Array of error messages
 */
function validateRateLimit(rateLimit) {
  const errors = [];

  if (!rateLimit || typeof rateLimit !== 'object') {
    errors.push('RATE_LIMIT must be an object');
    return errors;
  }

  if (typeof rateLimit.ENABLED !== 'boolean') {
    errors.push('RATE_LIMIT.ENABLED must be a boolean');
  }

  if (rateLimit.ENABLED) {
    if (
      typeof rateLimit.MAX_REQUESTS_PER_HOUR !== 'number' ||
      rateLimit.MAX_REQUESTS_PER_HOUR <= 0
    ) {
      errors.push('RATE_LIMIT.MAX_REQUESTS_PER_HOUR must be a positive number');
    }

    if (typeof rateLimit.MAX_REQUESTS_PER_DAY !== 'number' || rateLimit.MAX_REQUESTS_PER_DAY <= 0) {
      errors.push('RATE_LIMIT.MAX_REQUESTS_PER_DAY must be a positive number');
    }

    if (
      rateLimit.MAX_REQUESTS_PER_HOUR &&
      rateLimit.MAX_REQUESTS_PER_DAY &&
      rateLimit.MAX_REQUESTS_PER_HOUR > rateLimit.MAX_REQUESTS_PER_DAY
    ) {
      errors.push('RATE_LIMIT.MAX_REQUESTS_PER_HOUR cannot exceed MAX_REQUESTS_PER_DAY');
    }

    if (typeof rateLimit.HOUR_WINDOW !== 'number' || rateLimit.HOUR_WINDOW <= 0) {
      errors.push('RATE_LIMIT.HOUR_WINDOW must be a positive number');
    }

    if (typeof rateLimit.DAY_WINDOW !== 'number' || rateLimit.DAY_WINDOW <= 0) {
      errors.push('RATE_LIMIT.DAY_WINDOW must be a positive number');
    }
  }

  return errors;
}

/**
 * Validate divergence configuration
 * @param {Object} divergence - Divergence configuration
 * @returns {string[]} Array of error messages
 */
function validateDivergence(divergence) {
  const errors = [];

  if (!divergence || typeof divergence !== 'object') {
    errors.push('DIVERGENCE must be an object');
    return errors;
  }

  if (typeof divergence.ENABLED !== 'boolean') {
    errors.push('DIVERGENCE.ENABLED must be a boolean');
  }

  if (divergence.ENABLED) {
    if (!divergence.SIMILARITY_THRESHOLD || typeof divergence.SIMILARITY_THRESHOLD !== 'object') {
      errors.push('DIVERGENCE.SIMILARITY_THRESHOLD must be an object');
    } else {
      const threshold = divergence.SIMILARITY_THRESHOLD;

      if (typeof threshold.LOW !== 'number' || threshold.LOW < 0 || threshold.LOW > 1) {
        errors.push('DIVERGENCE.SIMILARITY_THRESHOLD.LOW must be a number between 0 and 1');
      }

      if (typeof threshold.MEDIUM !== 'number' || threshold.MEDIUM < 0 || threshold.MEDIUM > 1) {
        errors.push('DIVERGENCE.SIMILARITY_THRESHOLD.MEDIUM must be a number between 0 and 1');
      }

      if (typeof threshold.HIGH !== 'number' || threshold.HIGH < 0 || threshold.HIGH > 1) {
        errors.push('DIVERGENCE.SIMILARITY_THRESHOLD.HIGH must be a number between 0 and 1');
      }
    }

    if (
      typeof divergence.MIN_WORD_DIFF !== 'number' ||
      divergence.MIN_WORD_DIFF < 0 ||
      !Number.isInteger(divergence.MIN_WORD_DIFF)
    ) {
      errors.push('DIVERGENCE.MIN_WORD_DIFF must be a non-negative integer');
    }

    if (typeof divergence.GENERATE_FOLLOWUP_QUESTIONS !== 'boolean') {
      errors.push('DIVERGENCE.GENERATE_FOLLOWUP_QUESTIONS must be a boolean');
    }

    if (
      typeof divergence.MAX_FOLLOWUP_QUESTIONS !== 'number' ||
      divergence.MAX_FOLLOWUP_QUESTIONS < 0 ||
      divergence.MAX_FOLLOWUP_QUESTIONS > 10 ||
      !Number.isInteger(divergence.MAX_FOLLOWUP_QUESTIONS)
    ) {
      errors.push('DIVERGENCE.MAX_FOLLOWUP_QUESTIONS must be an integer between 0 and 10');
    }
  }

  return errors;
}

/**
 * Validate voice mode configuration
 * @param {Object} voiceMode - Voice mode configuration
 * @returns {string[]} Array of error messages
 */
function validateVoiceMode(voiceMode) {
  const errors = [];

  if (typeof voiceMode.ENABLED !== 'boolean') {
    errors.push('VOICE_MODE.ENABLED must be a boolean');
  }

  if (voiceMode.ENABLED) {
    if (typeof voiceMode.ANNOUNCE_PROVIDER !== 'boolean') {
      errors.push('VOICE_MODE.ANNOUNCE_PROVIDER must be a boolean');
    }

    if (typeof voiceMode.COMMAND !== 'string' || voiceMode.COMMAND.length === 0) {
      errors.push('VOICE_MODE.COMMAND must be a non-empty string');
    }

    if (voiceMode.AUDIO_CUES) {
      if (typeof voiceMode.AUDIO_CUES.ENABLED !== 'boolean') {
        errors.push('VOICE_MODE.AUDIO_CUES.ENABLED must be a boolean');
      }

      if (
        typeof voiceMode.AUDIO_CUES.PAUSE_BEFORE !== 'number' ||
        voiceMode.AUDIO_CUES.PAUSE_BEFORE < 0
      ) {
        errors.push('VOICE_MODE.AUDIO_CUES.PAUSE_BEFORE must be a non-negative number');
      }

      if (
        typeof voiceMode.AUDIO_CUES.PAUSE_AFTER !== 'number' ||
        voiceMode.AUDIO_CUES.PAUSE_AFTER < 0
      ) {
        errors.push('VOICE_MODE.AUDIO_CUES.PAUSE_AFTER must be a non-negative number');
      }
    }
  }

  return errors;
}

/**
 * Validate performance configuration
 * @param {Object} performance - Performance configuration
 * @returns {string[]} Array of error messages
 */
function validatePerformance(performance) {
  const errors = [];

  if (
    typeof performance.CACHE_PROVIDERS_TTL !== 'number' ||
    performance.CACHE_PROVIDERS_TTL < 0 ||
    !Number.isInteger(performance.CACHE_PROVIDERS_TTL)
  ) {
    errors.push('PERFORMANCE.CACHE_PROVIDERS_TTL must be a non-negative integer');
  }

  if (
    typeof performance.CACHE_RATE_LIMIT_TTL !== 'number' ||
    performance.CACHE_RATE_LIMIT_TTL < 0 ||
    !Number.isInteger(performance.CACHE_RATE_LIMIT_TTL)
  ) {
    errors.push('PERFORMANCE.CACHE_RATE_LIMIT_TTL must be a non-negative integer');
  }

  if (
    typeof performance.GENERATION_TIMEOUT !== 'number' ||
    performance.GENERATION_TIMEOUT < 1000 ||
    !Number.isInteger(performance.GENERATION_TIMEOUT)
  ) {
    errors.push('PERFORMANCE.GENERATION_TIMEOUT must be an integer >= 1000');
  }

  if (
    typeof performance.MAX_RETRIES !== 'number' ||
    performance.MAX_RETRIES < 0 ||
    performance.MAX_RETRIES > 5 ||
    !Number.isInteger(performance.MAX_RETRIES)
  ) {
    errors.push('PERFORMANCE.MAX_RETRIES must be an integer between 0 and 5');
  }

  if (
    typeof performance.RETRY_DELAY !== 'number' ||
    performance.RETRY_DELAY < 0 ||
    !Number.isInteger(performance.RETRY_DELAY)
  ) {
    errors.push('PERFORMANCE.RETRY_DELAY must be a non-negative integer');
  }

  return errors;
}

/**
 * Validate provider weights
 * @param {Object} weights - Provider weights object
 * @returns {Object} Validation result
 */
export function validateProviderWeights(weights) {
  const errors = [];

  if (!weights || typeof weights !== 'object') {
    errors.push('Provider weights must be an object');
    return { valid: false, errors };
  }

  for (const [provider, weight] of Object.entries(weights)) {
    if (typeof weight !== 'number' || weight < 0 || weight > 10) {
      errors.push(`Weight for provider "${provider}" must be a number between 0 and 10`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate provider costs
 * @param {Object} costs - Provider costs object
 * @returns {Object} Validation result
 */
export function validateProviderCosts(costs) {
  const errors = [];

  if (!costs || typeof costs !== 'object') {
    errors.push('Provider costs must be an object');
    return { valid: false, errors };
  }

  for (const [provider, models] of Object.entries(costs)) {
    if (!models || typeof models !== 'object') {
      errors.push(`Costs for provider "${provider}" must be an object`);
      continue;
    }

    for (const [model, cost] of Object.entries(models)) {
      if (!cost || typeof cost !== 'object') {
        errors.push(`Cost for model "${provider}/${model}" must be an object`);
        continue;
      }

      if (typeof cost.input !== 'number' || cost.input < 0) {
        errors.push(`Input cost for "${provider}/${model}" must be a non-negative number`);
      }

      if (typeof cost.output !== 'number' || cost.output < 0) {
        errors.push(`Output cost for "${provider}/${model}" must be a non-negative number`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
