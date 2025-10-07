/**
 * LLM (Language Learning Model) Configuration
 *
 * This file contains configuration settings for different LLM providers
 * including OpenAI and local LLM providers like Ollama.
 *
 * Notes:
 * - We now prefer Ollama by default (DEFAULT_PROVIDER = 'ollama').
 * - Added multi-model support for Ollama via VITE_OLLAMA_MODELS.
 *   The first entry is used as default, the second as a local fallback.
 * - Added NUM_CTX (context window) and STRICT mode for safer runtime on 8 GB RAM.
 */

// -----------------------------
// Feature flags for LLM functionality
// -----------------------------
export const LLM_FEATURES = {
  // Enable local LLM functionality
  ENABLE_LOCAL_LLM: (import.meta.env.VITE_ENABLE_LOCAL_LLM ?? 'true') === 'true',

  // Enable fallback to OpenAI when local LLM fails
  ENABLE_FALLBACK: (import.meta.env.VITE_ENABLE_LLM_FALLBACK ?? 'true') === 'true',

  // Enable provider switching in the UI (for development/testing)
  ENABLE_PROVIDER_SWITCHING:
    (import.meta.env.VITE_ENABLE_PROVIDER_SWITCHING ?? 'false') === 'true' || import.meta.env.DEV
};

// -----------------------------
// Provider selection configuration
// -----------------------------
export const PROVIDER_CONFIG = {
  /**
   * Default provider to use ('openai' or 'ollama')
   * We prefer local first to reduce cost/latency and keep data local.
   */
  DEFAULT_PROVIDER: (import.meta.env.VITE_DEFAULT_LLM_PROVIDER ?? 'ollama').toLowerCase(),

  /**
   * Timeout in milliseconds before falling back to alternative provider
   * (Only used if LLM_FEATURES.ENABLE_FALLBACK === true)
   */
  FALLBACK_TIMEOUT: parseInt(import.meta.env.VITE_LLM_FALLBACK_TIMEOUT || '10000', 10)
};

// -----------------------------
// Ollama (local LLM) Configuration
// -----------------------------
const OLLAMA_MODELS_RAW = (
  import.meta.env.VITE_OLLAMA_MODELS ??
  // sensible defaults for 8 GB machines
  'qwen2.5:1.5b,qwen2.5:7b'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const OLLAMA_CONFIG = {
  // Ollama API endpoint
  API_URL: import.meta.env.VITE_OLLAMA_API_URL || 'http://127.0.0.1:11434',

  /**
   * Multi-model support: first = default, second = local fallback.
   * Example env: VITE_OLLAMA_MODELS=qwen2.5:1.5b,qwen2.5:7b
   */
  MODELS: OLLAMA_MODELS_RAW,

  /**
   * Back-compat single model (some parts of the app may still read .MODEL)
   * If you only use the new MODELS field, you can ignore this.
   */
  MODEL: OLLAMA_MODELS_RAW[0] || import.meta.env.VITE_OLLAMA_MODEL || 'qwen2.5:1.5b',

  // Max tokens to generate per response (keep conservative for 8 GB)
  MAX_TOKENS: parseInt(import.meta.env.VITE_OLLAMA_MAX_TOKENS || '256', 10),

  // Temperature for response generation (0.0 to 1.0)
  TEMPERATURE: parseFloat(import.meta.env.VITE_OLLAMA_TEMPERATURE || '0.7'),

  // Context window (tokens kept in memory). 2048 is a good “balanced+” default on 8 GB.
  NUM_CTX: parseInt(import.meta.env.VITE_OLLAMA_NUM_CTX || '2048', 10),

  /**
   * STRICT mode: if true, only choose from MODELS.
   * If none are available, throw (so ProviderManager can fall back to OpenAI),
   * rather than silently picking a huge model that could freeze the machine.
   */
  STRICT: (import.meta.env.VITE_OLLAMA_STRICT ?? 'true') === 'true',

  // Additional sampling parameters
  PARAMETERS: {
    // Number between 0 and 2 specifying how much to penalize repetitions (default ~1.1)
    repeat_penalty: parseFloat(import.meta.env.VITE_OLLAMA_REPEAT_PENALTY || '1.1'),
    // Controls nucleus sampling (0.0 to 1.0)
    top_p: parseFloat(import.meta.env.VITE_OLLAMA_TOP_P || '0.9'),
    // Top-k sampling size
    top_k: parseInt(import.meta.env.VITE_OLLAMA_TOP_K || '40', 10)
  }
};

// -----------------------------
// Resource monitoring configuration
// -----------------------------
export const RESOURCE_CONFIG = {
  // Memory threshold in MB before switching to OpenAI (keep high; we prefer local)
  MEMORY_THRESHOLD: parseInt(import.meta.env.VITE_LLM_MEMORY_THRESHOLD || '2048', 10),

  // CPU load threshold (0.0 to 1.0) before switching to OpenAI (keep high)
  CPU_THRESHOLD: parseFloat(import.meta.env.VITE_LLM_CPU_THRESHOLD || '0.95'),

  // Check resource usage every N milliseconds
  CHECK_INTERVAL: parseInt(import.meta.env.VITE_LLM_RESOURCE_CHECK_INTERVAL || '5000', 10)
};
