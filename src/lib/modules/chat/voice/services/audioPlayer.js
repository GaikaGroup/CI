/**
 * Audio Player Service
 * Manages audio playback and AudioContext
 */

import { audioBufferManager } from '../../AudioBufferManager.js';
import { interruptionDetector } from '../../InterruptionDetector.js';
import { isSpeaking, audioAmplitude } from './avatarAnimation.js';
import {
  phraseQueue,
  isPlayingSequence,
  currentlyPlayingMetadata,
  waitingPhraseActive,
  waitingPhraseLanguage,
  queueState,
  setPlayingSequence,
  setCurrentMetadata,
  setWaitingPhraseActive,
  setWaitingPhraseLanguage,
  addToQueue,
  addToFrontOfQueue,
  getNextFromQueue,
  getQueueLength,
  hasResponseInQueue,
  clearWaitingPhrasesFromQueue as clearWaitingPhrases,
  getEnhancedState
} from './audioQueue.js';

// Re-export for external use
export { clearWaitingPhrases as clearWaitingPhrasesFromQueue };

// Audio state
let audioContext = null;
let audioPlayer = null;
let audioAnalyser = null;
let analyserDataArray = null;

/**
 * Initialize audio context and player
 */
export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.sampleRate < 44100) {
      console.log('Audio context sample rate:', audioContext.sampleRate);
    }
  }

  if (!audioPlayer) {
    audioPlayer = new Audio();
    if (audioPlayer.mozAudioChannelType) {
      audioPlayer.mozAudioChannelType = 'content';
    }
  }

  if (!audioAnalyser && audioContext) {
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 128;
    audioAnalyser.smoothingTimeConstant = 0.2;
    audioAnalyser.minDecibels = -90;
    audioAnalyser.maxDecibels = -10;
    analyserDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    console.log('Audio analyzer initialized');
  }

  if (audioContext && !audioBufferManager.isInitialized) {
    audioBufferManager.initialize(audioContext).catch((error) => {
      console.error('Failed to initialize AudioBufferManager:', error);
    });
  }

  if (audioContext && !interruptionDetector.isListening) {
    interruptionDetector
      .initialize(audioContext)
      .then(() => {
        console.log('InterruptionDetector initialized');
      })
      .catch((error) => {
        console.error('Failed to initialize InterruptionDetector:', error);
      });
  }
}

// Re-export queue functions
export { clearQueue as clearAudioQueue } from './audioQueue.js';
export { getQueueStatus as getAudioQueueStatus } from './audioQueue.js';
export { optimizeQueue as optimizeAudioQueue } from './audioQueue.js';

/**
 * Check if waiting phrase is active
 */
export function isWaitingPhraseActive() {
  return waitingPhraseActive;
}

/**
 * Get waiting phrase language
 */
export function getWaitingPhraseLanguage() {
  return waitingPhraseLanguage;
}

/**
 * Get current audio info
 */
export function getCurrentAudioInfo() {
  return currentlyPlayingMetadata ? { ...currentlyPlayingMetadata } : null;
}

/**
 * Get enhanced audio state
 */
export function getEnhancedAudioState() {
  const queueInfo = getEnhancedState();
  return {
    ...queueInfo,
    state: {
      ...queueInfo.state,
      audioContextState: audioContext?.state,
      bufferManagerReady: audioBufferManager.isInitialized
    }
  };
}

/**
 * Force audio transition
 */
export function forceAudioTransition() {
  if (!isPlayingSequence || !waitingPhraseActive) {
    console.log('No waiting phrase to interrupt');
    return false;
  }

  console.log('Forcing audio transition');

  clearWaitingPhrases();
  queueState.pendingInterruption = true;

  if (audioPlayer && !audioPlayer.paused) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  }

  setWaitingPhraseActive(false);
  isSpeaking.set(false);

  return true;
}

/**
 * Play audio with buffering (uses AudioBufferManager)
 */
export async function playAudioWithBuffering(audioWithMetadata) {
  try {
    console.log(
      `Buffering and playing audio: ${audioWithMetadata.metadata.isWaitingPhrase ? 'waiting phrase' : 'response'} (priority: ${audioWithMetadata.metadata.priority})`
    );

    // Check if AudioBufferManager is initialized
    if (!audioBufferManager.isInitialized) {
      console.warn('AudioBufferManager not initialized, falling back to direct playback');
      return playAudioWithMetadata(audioWithMetadata);
    }

    // Buffer the audio for smooth playback
    const bufferedAudio = await audioBufferManager.bufferAudio(
      audioWithMetadata.blob,
      audioWithMetadata.metadata
    );

    // If buffering failed, fall back to direct playback
    if (!bufferedAudio.processingInfo.buffered) {
      console.warn('Audio buffering failed, falling back to direct playback');
      return playAudioWithMetadata(audioWithMetadata);
    }

    // Add to queue with buffered audio
    const queueItem = {
      ...audioWithMetadata,
      bufferedAudio: bufferedAudio,
      useBuffering: true
    };

    // Use enhanced queue management
    manageQueueTransition(queueItem);

    // If not already playing, start
    if (!isPlayingSequence) {
      playNextInQueue();
    }
  } catch (error) {
    console.error('Error in playAudioWithBuffering:', error);
    // Fall back to direct playback
    return playAudioWithMetadata(audioWithMetadata);
  }
}

/**
 * Play audio with metadata (direct playback without buffering)
 */
export async function playAudioWithMetadata(audioWithMetadata) {
  try {
    manageQueueTransition(audioWithMetadata);

    if (!isPlayingSequence) {
      playNextInQueue();
    }
  } catch (error) {
    console.error('Error playing audio with metadata:', error);
  }
}

/**
 * Manage queue transition
 */
function manageQueueTransition(audioWithMetadata) {
  const isResponse = !audioWithMetadata.metadata.isWaitingPhrase;

  if (isResponse) {
    console.log('AI response ready, managing transition');
    queueState.pendingInterruption = true;

    if (waitingPhraseActive) {
      clearWaitingPhrases();
    }

    addToFrontOfQueue(audioWithMetadata);
  } else {
    if (!queueState.pendingInterruption && !hasResponseInQueue()) {
      addToQueue(audioWithMetadata);
    }
  }
}

/**
 * Play next in queue
 */
function playNextInQueue() {
  if (getQueueLength() === 0) {
    setPlayingSequence(false);
    setWaitingPhraseActive(false);
    isSpeaking.set(false);
    return;
  }

  setPlayingSequence(true);
  const audioWithMetadata = getNextFromQueue();
  setCurrentMetadata(audioWithMetadata.metadata);

  if (audioWithMetadata.metadata.isWaitingPhrase) {
    setWaitingPhraseActive(true);
    setWaitingPhraseLanguage(audioWithMetadata.metadata.language);
  } else {
    setWaitingPhraseActive(false);
  }

  playAudio(audioWithMetadata);
}

/**
 * Play audio
 */
function playAudio(audioWithMetadata) {
  const url = URL.createObjectURL(audioWithMetadata.blob);
  audioPlayer.src = url;

  audioPlayer.onended = () => {
    URL.revokeObjectURL(url);
    isSpeaking.set(false);
    playNextInQueue();
  };

  audioPlayer.onerror = (error) => {
    console.error('Audio playback error:', error);
    URL.revokeObjectURL(url);
    isSpeaking.set(false);
    playNextInQueue();
  };

  audioPlayer.play().then(() => {
    isSpeaking.set(true);
    startAudioAnalysis();
  });
}

/**
 * Start audio analysis for lip sync
 */
function startAudioAnalysis() {
  if (!audioAnalyser || !analyserDataArray) return;

  const analyze = () => {
    if (audioPlayer.paused || audioPlayer.ended) {
      audioAmplitude.set(0);
      return;
    }

    audioAnalyser.getByteFrequencyData(analyserDataArray);
    const average = analyserDataArray.reduce((a, b) => a + b) / analyserDataArray.length;
    const normalized = average / 255;

    audioAmplitude.set(normalized);
    requestAnimationFrame(analyze);
  };

  analyze();
}

// Export internal state for testing
export const _internal = {
  get audioContext() {
    return audioContext;
  },
  get audioPlayer() {
    return audioPlayer;
  },
  get phraseQueue() {
    return phraseQueue;
  },
  get queueState() {
    return queueState;
  }
};
