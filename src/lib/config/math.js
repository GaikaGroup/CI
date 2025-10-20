/**
 * Math Enhancement Configuration
 *
 * Configuration for mathematical query enhancement features
 */

// -----------------------------
// Feature flags for math enhancement
// -----------------------------
export const MATH_FEATURES = {
  // Enable automatic classification of mathematical queries
  ENABLE_AUTO_CLASSIFICATION:
    (import.meta.env.VITE_MATH_ENABLE_AUTO_CLASSIFICATION ?? 'true') === 'true',

  // Enable request enhancement for mathematical queries
  ENABLE_REQUEST_ENHANCEMENT:
    (import.meta.env.VITE_MATH_ENABLE_REQUEST_ENHANCEMENT ?? 'true') === 'true',

  // Enable math-specific system prompts
  ENABLE_MATH_SYSTEM_PROMPTS:
    (import.meta.env.VITE_MATH_ENABLE_SYSTEM_PROMPTS ?? 'true') === 'true',

  // Enable local math models (for future use with Ollama)
  ENABLE_LOCAL_MATH_MODELS:
    (import.meta.env.VITE_MATH_ENABLE_LOCAL_MODELS ?? 'false') === 'true'
};

// -----------------------------
// Math enhancement parameters
// -----------------------------
export const MATH_CONFIG = {
  // Maximum tokens for mathematical responses
  // GPT-5 uses reasoning tokens + output tokens, so we need more
  MAX_TOKENS: parseInt(import.meta.env.VITE_MATH_MAX_TOKENS || '16000', 10),

  // Temperature for mathematical queries (lower = more precise)
  TEMPERATURE: parseFloat(import.meta.env.VITE_MATH_TEMPERATURE || '0.3'),

  // Preferred model for mathematical queries
  // gpt-5 has superior reasoning capabilities for complex math problems
  MODEL: import.meta.env.VITE_MATH_MODEL || 'gpt-5',

  // Confidence threshold for classification (0.0 - 1.0)
  CONFIDENCE_THRESHOLD: parseFloat(import.meta.env.VITE_MATH_CONFIDENCE_THRESHOLD || '0.5'),

  // Enable context analysis for better classification
  ENABLE_CONTEXT: (import.meta.env.VITE_MATH_ENABLE_CONTEXT ?? 'true') === 'true'
};

// -----------------------------
// Local math models configuration (Ollama)
// -----------------------------
export const LOCAL_MATH_CONFIG = {
  // Local math model for Ollama (qwen2-math is specialized for mathematics)
  MODEL: import.meta.env.VITE_OLLAMA_MATH_MODEL || 'qwen2-math:7b',

  // Fallback to cloud if local model fails
  ENABLE_FALLBACK: (import.meta.env.VITE_MATH_LOCAL_FALLBACK ?? 'true') === 'true',

  // Timeout for local math model (ms) - set to 0 for no timeout
  TIMEOUT: parseInt(import.meta.env.VITE_MATH_LOCAL_TIMEOUT || '0', 10)
};

// -----------------------------
// Category-specific configurations
// -----------------------------
export const CATEGORY_CONFIG = {
  algebra: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_ALGEBRA_MAX_TOKENS || '3000', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_ALGEBRA_TEMPERATURE || '0.3')
  },
  geometry: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_GEOMETRY_MAX_TOKENS || '3500', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_GEOMETRY_TEMPERATURE || '0.3')
  },
  calculus: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_CALCULUS_MAX_TOKENS || '4000', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_CALCULUS_TEMPERATURE || '0.3')
  },
  probability: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_PROBABILITY_MAX_TOKENS || '3500', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_PROBABILITY_TEMPERATURE || '0.3')
  },
  discrete: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_DISCRETE_MAX_TOKENS || '3500', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_DISCRETE_TEMPERATURE || '0.3')
  },
  arithmetic: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_ARITHMETIC_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_ARITHMETIC_TEMPERATURE || '0.2')
  },
  general: {
    maxTokens: parseInt(import.meta.env.VITE_MATH_GENERAL_MAX_TOKENS || '4000', 10),
    temperature: parseFloat(import.meta.env.VITE_MATH_GENERAL_TEMPERATURE || '0.3')
  }
};
