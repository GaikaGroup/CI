/**
 * Voice Mode Manager
 * Manages voice mode activation, deactivation, and lifecycle
 */

import { get, writable } from 'svelte/store';
import { waitingPhrasesService } from '../../waitingPhrasesService.js';
import { audioBufferManager } from '../../AudioBufferManager.js';
import { interruptionDetector } from '../../InterruptionDetector.js';
import { conversationFlowManager } from '../../ConversationFlowManager.js';
import { interruptionEventHandler } from '../../InterruptionEventHandler.js';
import { initAudioContext, clearAudioQueue, _internal } from '../services/audioPlayer.js';
import { isSpeaking, currentEmotion, audioAmplitude } from '../services/avatarAnimation.js';

// Store for voice mode state
export const isVoiceModeActive = writable(false);

// Internal state
let voiceModeStartTime = null;
let voiceModeSessionId = null;
let voiceModeCleanupCallbacks = [];

/**
 * Set voice mode active state
 */
export function setVoiceModeActive(active, options = {}) {
  const currentState = get(isVoiceModeActive);

  if (currentState === active) {
    console.log(`Voice mode already ${active ? 'active' : 'inactive'}, no change needed`);
    return;
  }

  console.log(`Setting voice mode ${active ? 'active' : 'inactive'}`);

  if (active) {
    voiceModeStartTime = Date.now();
    voiceModeSessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Voice mode activated (session: ${voiceModeSessionId})`);
    initializeVoiceMode(options);
  } else {
    const sessionDuration = voiceModeStartTime ? Date.now() - voiceModeStartTime : 0;
    console.log(
      `Voice mode deactivated (session: ${voiceModeSessionId}, duration: ${sessionDuration}ms)`
    );
    cleanupVoiceMode();
    voiceModeStartTime = null;
    voiceModeSessionId = null;
  }

  isVoiceModeActive.set(active);
}

/**
 * Initialize voice mode components
 */
function initializeVoiceMode(options = {}) {
  try {
    console.log('Initializing voice mode components...');

    initAudioContext();

    if (options.clearQueue !== false) {
      clearAudioQueue();
    }

    isSpeaking.set(false);
    currentEmotion.set('neutral');
    audioAmplitude.set(0);

    if (options.initWaitingPhrases !== false) {
      initializeWaitingPhrasesForVoiceMode();
    }

    console.log('Voice mode components initialized successfully');
  } catch (error) {
    console.error('Error initializing voice mode components:', error);
  }
}

/**
 * Clean up voice mode components
 */
function cleanupVoiceMode() {
  try {
    console.log('Cleaning up voice mode components...');

    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }

    clearAudioQueue();

    isSpeaking.set(false);
    currentEmotion.set('neutral');
    audioAmplitude.set(0);

    if (audioBufferManager.isInitialized) {
      audioBufferManager.cleanup();
    }

    if (interruptionDetector) {
      interruptionDetector.cleanup();
    }

    conversationFlowManager.reset();
    interruptionEventHandler.reset();

    voiceModeCleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in voice mode cleanup callback:', error);
      }
    });

    console.log('Voice mode cleanup completed');
  } catch (error) {
    console.error('Error during voice mode cleanup:', error);
  }
}

/**
 * Initialize waiting phrases service
 */
async function initializeWaitingPhrasesForVoiceMode() {
  try {
    console.log('Initializing waiting phrases service for voice mode...');

    if (!waitingPhrasesService.isServiceInitialized()) {
      await waitingPhrasesService.initializeWaitingPhrases();
    }

    console.log('Waiting phrases service ready for voice mode');
  } catch (error) {
    console.error('Error initializing waiting phrases for voice mode:', error);
  }
}

/**
 * Register cleanup callback
 */
export function registerVoiceModeCleanup(callback) {
  if (typeof callback === 'function') {
    voiceModeCleanupCallbacks.push(callback);
  }
}

/**
 * Unregister cleanup callback
 */
export function unregisterVoiceModeCleanup(callback) {
  const index = voiceModeCleanupCallbacks.indexOf(callback);
  if (index > -1) {
    voiceModeCleanupCallbacks.splice(index, 1);
  }
}

/**
 * Get voice mode session information
 */
export function getVoiceModeSession() {
  return {
    isActive: get(isVoiceModeActive),
    sessionId: voiceModeSessionId,
    startTime: voiceModeStartTime,
    duration: voiceModeStartTime ? Date.now() - voiceModeStartTime : 0
  };
}

/**
 * Check if voice mode is ready
 */
export function isVoiceModeReady() {
  if (!get(isVoiceModeActive)) {
    return false;
  }

  if (!_internal.audioContext || _internal.audioContext.state !== 'running') {
    return false;
  }

  if (!_internal.audioPlayer) {
    return false;
  }

  return true;
}

/**
 * Ensure voice mode is active
 */
export function ensureVoiceModeActive(operation = 'voice operation') {
  if (!get(isVoiceModeActive)) {
    console.warn(`Attempted ${operation} while voice mode is inactive`);
    return false;
  }

  if (!isVoiceModeReady()) {
    console.warn(`Attempted ${operation} while voice mode is not ready`);
    return false;
  }

  return true;
}
