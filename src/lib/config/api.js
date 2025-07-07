/**
 * API configuration
 */

// OpenAI API configuration
export const OPENAI_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here', // Use environment variable
  API_URL: 'https://api.openai.com/v1/chat/completions',
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7
};

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
