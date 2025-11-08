/**
 * Voice Module - Main Entry Point
 *
 * This module provides a clean API for voice chat functionality.
 * All voice-related features are organized into focused sub-modules.
 */

// Core voice mode management
export {
  isVoiceModeActive,
  setVoiceModeActive,
  registerVoiceModeCleanup,
  unregisterVoiceModeCleanup,
  getVoiceModeSession,
  isVoiceModeReady,
  ensureVoiceModeActive
} from './services/voiceModeManager.js';

// Audio recording
export { startRecording, stopRecording } from './services/audioRecorder.js';

// Speech synthesis
export { synthesizeWaitingPhrase, synthesizeResponseSpeech } from './services/speechSynthesizer.js';

// Audio playback and queue management
export {
  initAudioContext,
  isWaitingPhraseActive,
  getWaitingPhraseLanguage,
  getCurrentAudioInfo,
  getAudioQueueStatus,
  clearAudioQueue,
  clearWaitingPhrasesFromQueue,
  getEnhancedAudioState,
  forceAudioTransition,
  optimizeAudioQueue,
  playAudioWithMetadata
} from './services/audioPlayer.js';

// Audio queue (for advanced usage)
export { getQueueStatus, optimizeQueue, resetQueueState } from './services/audioQueue.js';

// Avatar animation
export {
  isSpeaking,
  currentEmotion,
  audioAmplitude,
  determineEmotion
} from './services/avatarAnimation.js';

// Message handling
export { sendTranscribedText } from './services/messageHandler.js';

// Utilities
export {
  detectLanguageFromText,
  getLanguageConfidence,
  detectMultipleLanguages
} from './utils/languageDetection.js';

export {
  getFallbackWaitingPhrase,
  formatAudioDuration,
  estimateAudioSize,
  validateAudioBlob,
  createAudioURL,
  revokeAudioURL,
  blobToBase64,
  base64ToBlob,
  mergeAudioBlobs,
  getAudioMetadata
} from './utils/audioUtils.js';
