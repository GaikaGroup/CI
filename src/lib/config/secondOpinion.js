/**
 * Second Opinion Feature Configuration
 *
 * This file contains all configuration settings for the Second Opinion feature,
 * including feature toggles, rate limits, provider selection strategies, and
 * divergence detection thresholds.
 */

/**
 * Main configuration object for Second Opinion feature
 */
export const SECOND_OPINION_CONFIG = {
  // Feature toggle - set to false to disable the entire feature
  ENABLED: true,

  // Selection strategy for choosing alternative providers
  // Options: 'priority', 'cost', 'performance', 'round-robin', 'random'
  SELECTION_STRATEGY: 'priority',

  // Provider priority order (used when SELECTION_STRATEGY is 'priority')
  // Providers will be tried in this order when selecting an alternative
  PROVIDER_PRIORITY: ['ollama', 'openai'],

  // Rate limiting configuration
  RATE_LIMIT: {
    // Enable/disable rate limiting
    ENABLED: true,

    // Maximum number of second opinion requests per user per hour
    MAX_REQUESTS_PER_HOUR: 10,

    // Maximum number of second opinion requests per user per day
    MAX_REQUESTS_PER_DAY: 50,

    // Time window for rate limit tracking (in milliseconds)
    HOUR_WINDOW: 60 * 60 * 1000, // 1 hour
    DAY_WINDOW: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Divergence detection configuration
  DIVERGENCE: {
    // Enable/disable divergence detection
    ENABLED: true,

    // Similarity thresholds for divergence classification
    // Values are cosine similarity scores (0-1)
    SIMILARITY_THRESHOLD: {
      LOW: 0.8, // > 0.8 = low divergence (responses are very similar)
      MEDIUM: 0.5, // 0.5-0.8 = medium divergence (some differences)
      HIGH: 0.5 // < 0.5 = high divergence (significant differences)
    },

    // Minimum word count difference to consider as divergence
    MIN_WORD_DIFF: 20,

    // Enable follow-up question generation
    GENERATE_FOLLOWUP_QUESTIONS: true,

    // Maximum number of follow-up questions to generate
    MAX_FOLLOWUP_QUESTIONS: 3
  },

  // Manual provider selection configuration
  ALLOW_MANUAL_SELECTION: true,

  // Voice mode configuration
  VOICE_MODE: {
    // Enable second opinion in voice mode
    ENABLED: true,

    // Announce provider name before speaking the opinion
    ANNOUNCE_PROVIDER: true,

    // Voice command to trigger second opinion
    COMMAND: 'второе мнение', // Russian: "second opinion"

    // Audio cue settings
    AUDIO_CUES: {
      // Play sound before second opinion
      ENABLED: true,

      // Pause duration before speaking (ms)
      PAUSE_BEFORE: 500,

      // Pause duration after speaking (ms)
      PAUSE_AFTER: 300
    }
  },

  // Admin settings
  ADMIN: {
    // Track analytics for second opinions
    TRACK_ANALYTICS: true,

    // Enable cost reporting
    COST_REPORTING: true,

    // Alert threshold for high usage (requests per day)
    HIGH_USAGE_THRESHOLD: 100,

    // Alert threshold for high cost (USD per day)
    HIGH_COST_THRESHOLD: 10.0
  },

  // Performance settings
  PERFORMANCE: {
    // Cache available providers list (seconds)
    CACHE_PROVIDERS_TTL: 300, // 5 minutes

    // Cache user rate limit status (seconds)
    CACHE_RATE_LIMIT_TTL: 60, // 1 minute

    // Timeout for second opinion generation (ms)
    GENERATION_TIMEOUT: 30000, // 30 seconds

    // Maximum retries on failure
    MAX_RETRIES: 2,

    // Retry delay (ms)
    RETRY_DELAY: 1000
  },

  // UI settings
  UI: {
    // Show second opinion button by default
    SHOW_BUTTON: true,

    // Show opinion count badge
    SHOW_OPINION_COUNT: true,

    // Collapse second opinions by default in history
    COLLAPSE_IN_HISTORY: false,

    // Show divergence alerts
    SHOW_DIVERGENCE_ALERTS: true,

    // Animation duration (ms)
    ANIMATION_DURATION: 300
  }
};

/**
 * Provider selection weights for performance-based strategy
 * These weights are updated based on user feedback
 */
export const PROVIDER_WEIGHTS = {
  openai: 1.0,
  ollama: 1.0
};

/**
 * Cost per token for different providers (USD)
 * Used for cost-optimized selection strategy
 */
export const PROVIDER_COSTS = {
  openai: {
    'chatgpt-4o-latest': {
      input: 0.005 / 1000, // $5.00 per 1M tokens (estimated for GPT-4.5)
      output: 0.015 / 1000 // $15.00 per 1M tokens (estimated for GPT-4.5)
    },
    'gpt-4o': {
      input: 0.0025 / 1000, // $2.50 per 1M tokens
      output: 0.01 / 1000 // $10.00 per 1M tokens
    },
    'gpt-4o-mini': {
      input: 0.00015 / 1000, // $0.15 per 1M tokens
      output: 0.0006 / 1000 // $0.60 per 1M tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000, // $0.50 per 1M tokens
      output: 0.0015 / 1000 // $1.50 per 1M tokens
    }
  },
  ollama: {
    // Local models have no API cost
    default: {
      input: 0,
      output: 0
    }
  }
};

/**
 * Error messages for different scenarios
 */
export const ERROR_MESSAGES = {
  NO_ALTERNATIVE_PROVIDERS: {
    en: 'No alternative models available for second opinion',
    ru: 'Нет альтернативных моделей для второго мнения',
    es: 'No hay modelos alternativos disponibles para una segunda opinión'
  },
  RATE_LIMIT_EXCEEDED: {
    en: "You've reached the limit for second opinions. Please try again later.",
    ru: 'Вы достигли лимита запросов второго мнения. Попробуйте позже.',
    es: 'Has alcanzado el límite de segundas opiniones. Inténtalo más tarde.'
  },
  PROVIDER_UNAVAILABLE: {
    en: 'Selected model is currently unavailable. Please try another.',
    ru: 'Выбранная модель недоступна. Попробуйте другую.',
    es: 'El modelo seleccionado no está disponible actualmente. Prueba con otro.'
  },
  GENERATION_FAILED: {
    en: 'Failed to generate second opinion. Please try again.',
    ru: 'Не удалось сгенерировать второе мнение. Попробуйте снова.',
    es: 'Error al generar segunda opinión. Inténtalo de nuevo.'
  },
  CONTEXT_RETRIEVAL_FAILED: {
    en: 'Unable to retrieve message context. Please try again.',
    ru: 'Не удалось получить контекст сообщения. Попробуйте снова.',
    es: 'No se pudo recuperar el contexto del mensaje. Inténtalo de nuevo.'
  },
  TIMEOUT: {
    en: 'Second opinion generation timed out. Please try again.',
    ru: 'Время ожидания второго мнения истекло. Попробуйте снова.',
    es: 'Se agotó el tiempo de espera para la segunda opinión. Inténtalo de nuevo.'
  }
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  OPINION_GENERATED: {
    en: 'Second opinion generated successfully',
    ru: 'Второе мнение успешно сгенерировано',
    es: 'Segunda opinión generada exitosamente'
  },
  FEEDBACK_RECORDED: {
    en: 'Thank you for your feedback!',
    ru: 'Спасибо за ваш отзыв!',
    es: '¡Gracias por tu comentario!'
  }
};

// Import validator
import {
  validateConfiguration,
  validateProviderWeights,
  validateProviderCosts
} from './secondOpinionValidator.js';

// Validate configuration on module load
try {
  const configValidation = validateConfiguration(SECOND_OPINION_CONFIG);
  if (!configValidation.valid) {
    console.error('[SecondOpinion] Configuration validation failed:');
    configValidation.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error('Invalid Second Opinion configuration');
  }

  const weightsValidation = validateProviderWeights(PROVIDER_WEIGHTS);
  if (!weightsValidation.valid) {
    console.error('[SecondOpinion] Provider weights validation failed:');
    weightsValidation.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error('Invalid provider weights configuration');
  }

  const costsValidation = validateProviderCosts(PROVIDER_COSTS);
  if (!costsValidation.valid) {
    console.error('[SecondOpinion] Provider costs validation failed:');
    costsValidation.errors.forEach((error) => console.error(`  - ${error}`));
    throw new Error('Invalid provider costs configuration');
  }

  console.log('[SecondOpinion] Configuration loaded and validated successfully');
} catch (error) {
  console.error('[SecondOpinion] Configuration validation failed:', error);
}

/**
 * Get error message in specified language
 * @param {string} errorType - Type of error
 * @param {string} language - Language code (en, ru, es)
 * @returns {string} Error message
 */
export function getErrorMessage(errorType, language = 'en') {
  const message = ERROR_MESSAGES[errorType];
  if (!message) {
    return ERROR_MESSAGES.GENERATION_FAILED[language] || ERROR_MESSAGES.GENERATION_FAILED.en;
  }
  return message[language] || message.en;
}

/**
 * Get success message in specified language
 * @param {string} messageType - Type of message
 * @param {string} language - Language code (en, ru, es)
 * @returns {string} Success message
 */
export function getSuccessMessage(messageType, language = 'en') {
  const message = SUCCESS_MESSAGES[messageType];
  if (!message) {
    return SUCCESS_MESSAGES.OPINION_GENERATED[language] || SUCCESS_MESSAGES.OPINION_GENERATED.en;
  }
  return message[language] || message.en;
}
