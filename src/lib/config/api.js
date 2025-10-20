/**
 * API configuration
 */

// OpenAI API configuration
export const OPENAI_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here', // Use environment variable
  API_URL: 'https://api.openai.com/v1/chat/completions',
  MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4-turbo', // Changed to gpt-4-turbo which supports vision
  MAX_TOKENS: parseInt(import.meta.env.VITE_OPENAI_MAX_TOKENS || '500', 10),
  DETAILED_MAX_TOKENS: parseInt(import.meta.env.VITE_OPENAI_DETAILED_MAX_TOKENS || '4000', 10),
  TEMPERATURE: parseFloat(import.meta.env.VITE_OPENAI_TEMPERATURE || '0.7'),
  // Retry configuration for API calls
  RETRY: {
    MAX_RETRIES: parseInt(import.meta.env.VITE_OPENAI_MAX_RETRIES || '3', 10),
    RETRY_DELAY: parseInt(import.meta.env.VITE_OPENAI_RETRY_DELAY || '1000', 10)
  },
  // Timeout in milliseconds
  TIMEOUT: parseInt(import.meta.env.VITE_OPENAI_TIMEOUT || '30000', 10)
};

export const WAITING_PHRASES_DEFAULT =
  import.meta.env.VITE_WAITING_PHRASES_DEFAULT || 'DefaultWaitingAnswer';
export const WAITING_PHRASES_DETAILED =
  import.meta.env.VITE_WAITING_PHRASES_DETAILED || 'DetailedWaitingAnswer';

// Whisper API configuration for speech-to-text
export const WHISPER_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here', // Use same key as OpenAI
  API_URL: 'https://api.openai.com/v1/audio/transcriptions',
  MODEL: 'whisper-1'
};

// TTS API configuration for text-to-speech
export const TTS_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here', // Use same key as OpenAI
  API_URL: 'https://api.openai.com/v1/audio/speech',
  MODEL: 'tts-1', // OpenAI's TTS model
  VOICE: 'alloy' // Options: alloy, echo, fable, onyx, nova, shimmer
};
