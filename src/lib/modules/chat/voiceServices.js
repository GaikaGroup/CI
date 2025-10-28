// Voice Chat Services
import { get } from 'svelte/store';
import { writable } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { setLoading, setError } from '$lib/stores/app';
import { addMessage, selectedImages } from './stores';
import { sendMessageWithOCRContext } from './enhancedServices';
import { MESSAGE_TYPES } from '$shared/utils/constants';
import { waitingPhrasesService } from './waitingPhrasesService.js';
import { audioBufferManager } from './AudioBufferManager.js';
import { interruptionDetector } from './InterruptionDetector.js';
import { interruptionEventHandler } from './InterruptionEventHandler.js';
import { conversationFlowManager } from './ConversationFlowManager.js';
import { voiceErrorHandler } from './VoiceErrorHandler.js';
import { avatarStateManager } from './AvatarStateManager.js';

// Flag to track if we're in voice mode
export const isVoiceModeActive = writable(false);

// Voice mode state tracking
let voiceModeStartTime = null;
let voiceModeSessionId = null;
let voiceModeCleanupCallbacks = [];

/**
 * Set the voice mode active state with comprehensive state management
 * @param {boolean} active - Whether voice mode is active
 * @param {Object} options - Additional options
 */
export function setVoiceModeActive(active, options = {}) {
  const currentState = get(isVoiceModeActive);

  if (currentState === active) {
    console.log(`Voice mode already ${active ? 'active' : 'inactive'}, no change needed`);
    return;
  }

  console.log(`Setting voice mode ${active ? 'active' : 'inactive'}`);

  if (active) {
    // Activating voice mode
    voiceModeStartTime = Date.now();
    voiceModeSessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Voice mode activated (session: ${voiceModeSessionId})`);

    // Initialize voice mode components
    initializeVoiceMode(options);
  } else {
    // Deactivating voice mode
    const sessionDuration = voiceModeStartTime ? Date.now() - voiceModeStartTime : 0;
    console.log(
      `Voice mode deactivated (session: ${voiceModeSessionId}, duration: ${sessionDuration}ms)`
    );

    // Clean up voice mode components
    cleanupVoiceMode();

    voiceModeStartTime = null;
    voiceModeSessionId = null;
  }

  isVoiceModeActive.set(active);
}

/**
 * Initialize voice mode components and state
 * @param {Object} options - Initialization options
 */
function initializeVoiceMode(options = {}) {
  try {
    console.log('Initializing voice mode components...');

    // Initialize audio context if not already done
    initAudioContext();

    // Clear any existing audio queue to start fresh
    if (options.clearQueue !== false) {
      clearAudioQueue();
    }

    // Reset audio state
    isSpeaking.set(false);
    currentEmotion.set('neutral');
    audioAmplitude.set(0);

    // Initialize waiting phrases service if needed
    if (options.initWaitingPhrases !== false) {
      initializeWaitingPhrasesForVoiceMode();
    }

    console.log('Voice mode components initialized successfully');
  } catch (error) {
    console.error('Error initializing voice mode components:', error);
  }
}

/**
 * Clean up voice mode components and state
 */
function cleanupVoiceMode() {
  try {
    console.log('Cleaning up voice mode components...');

    // Stop any ongoing audio playback
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }

    // Clear audio queue
    clearAudioQueue();

    // Reset audio state
    isSpeaking.set(false);
    currentEmotion.set('neutral');
    audioAmplitude.set(0);

    // Reset queue state
    isPlayingSequence = false;
    waitingPhraseActive = false;
    queueState.pendingInterruption = false;

    // Cleanup AudioBufferManager
    if (audioBufferManager.isInitialized) {
      audioBufferManager.cleanup();
    }

    // Cleanup InterruptionDetector
    if (interruptionDetector) {
      interruptionDetector.cleanup();
    }

    // Reset conversation flow manager
    conversationFlowManager.reset();

    // Reset interruption event handler
    interruptionEventHandler.reset();

    // Execute cleanup callbacks
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
 * Initialize waiting phrases service for voice mode
 */
async function initializeWaitingPhrasesForVoiceMode() {
  try {
    console.log('Initializing waiting phrases service for voice mode...');

    // Ensure waiting phrases service is initialized
    if (!waitingPhrasesService.isServiceInitialized()) {
      await waitingPhrasesService.initializeWaitingPhrases();
    }

    // Warm up translation cache for current language
    const currentLanguage = get(selectedLanguage);
    if (currentLanguage && currentLanguage !== 'en') {
      await waitingPhrasesService.warmUpTranslationCache(currentLanguage);
    }

    // Pre-buffer common waiting phrases for smoother playback
    await preBufferCommonWaitingPhrases(currentLanguage);

    console.log('Waiting phrases service ready for voice mode');
  } catch (error) {
    console.error('Error initializing waiting phrases for voice mode:', error);
    // Don't throw - voice mode can work without waiting phrases
  }
}

/**
 * Pre-buffer common waiting phrases to prevent stuttering
 * @param {string} language - Target language
 */
async function preBufferCommonWaitingPhrases(language) {
  try {
    if (!audioBufferManager.isInitialized) {
      console.log('AudioBufferManager not ready, skipping pre-buffering');
      return;
    }

    console.log(`Pre-buffering common waiting phrases for ${language}...`);

    // Get a few common waiting phrases
    const commonPhrases = [];
    try {
      for (let i = 0; i < 3; i++) {
        const phrase = await waitingPhrasesService.selectWaitingPhrase(language);
        if (phrase && !commonPhrases.includes(phrase)) {
          commonPhrases.push(phrase);
        }
      }
    } catch (error) {
      console.warn('Could not select phrases for pre-buffering:', error);
      // Use fallback phrases
      commonPhrases.push(getFallbackWaitingPhrase(language));
    }

    // Pre-synthesize and buffer these phrases
    for (const phrase of commonPhrases) {
      try {
        console.log(`Pre-buffering phrase: "${phrase.substring(0, 30)}..."`);

        // Synthesize the phrase
        const response = await fetch('/api/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: phrase,
            language: language,
            isWaitingPhrase: true,
            priority: 2
          })
        });

        if (response.ok) {
          const audioBlob = await response.blob();

          // Buffer the audio
          await audioBufferManager.bufferAudio(audioBlob, {
            isWaitingPhrase: true,
            originalText: phrase,
            language: language,
            priority: 2,
            preBuffered: true,
            id: `prebuffered_${language}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
          });

          console.log(`Successfully pre-buffered: "${phrase.substring(0, 30)}..."`);
        }
      } catch (error) {
        console.warn(`Failed to pre-buffer phrase "${phrase}":`, error);
      }
    }

    console.log(`Pre-buffering completed for ${language}`);
  } catch (error) {
    console.error('Error in pre-buffering waiting phrases:', error);
  }
}

/**
 * Clear audio queue
 */
function clearAudioQueue() {
  const queueLength = phraseQueue.length;
  phraseQueue.length = 0; // Clear array

  if (queueLength > 0) {
    console.log(`Cleared ${queueLength} items from audio queue`);
  }
}

/**
 * Register cleanup callback for voice mode deactivation
 * @param {Function} callback - Cleanup callback function
 */
export function registerVoiceModeCleanup(callback) {
  if (typeof callback === 'function') {
    voiceModeCleanupCallbacks.push(callback);
  }
}

/**
 * Unregister cleanup callback
 * @param {Function} callback - Cleanup callback function to remove
 */
export function unregisterVoiceModeCleanup(callback) {
  const index = voiceModeCleanupCallbacks.indexOf(callback);
  if (index > -1) {
    voiceModeCleanupCallbacks.splice(index, 1);
  }
}

/**
 * Get voice mode session information
 * @returns {Object} Voice mode session info
 */
export function getVoiceModeSession() {
  return {
    isActive: get(isVoiceModeActive),
    sessionId: voiceModeSessionId,
    startTime: voiceModeStartTime,
    duration: voiceModeStartTime ? Date.now() - voiceModeStartTime : 0,
    audioQueueStatus: getAudioQueueStatus(),
    waitingPhraseActive: isWaitingPhraseActive()
  };
}

/**
 * Check if voice mode is properly initialized and ready
 * @returns {boolean} True if voice mode is ready
 */
export function isVoiceModeReady() {
  if (!get(isVoiceModeActive)) {
    return false;
  }

  // Check if audio context is ready
  if (!audioContext || audioContext.state !== 'running') {
    return false;
  }

  // Check if audio player is available
  if (!audioPlayer) {
    return false;
  }

  return true;
}

/**
 * Ensure voice mode is active before performing voice operations
 * @param {string} operation - Name of the operation being performed
 * @returns {boolean} True if voice mode is active and ready
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

// Stores for cat avatar animation
export const isSpeaking = writable(false);
export const currentEmotion = writable('neutral');
export const audioAmplitude = writable(0); // Store for real-time audio amplitude

// Emotion persistence
let lastEmotionChangeTime = 0;
const MIN_EMOTION_DURATION = 2000; // 2 seconds minimum for an emotion

/**
 * Determine emotion from text
 * @param {string} text - Text to analyze
 * @returns {string} - Emotion (neutral, happy, sad, surprised, angry)
 */
export function determineEmotion(text) {
  // Enhanced keyword-based emotion detection with more comprehensive patterns

  // Define emotion patterns with more keywords and phrases
  const emotionPatterns = {
    happy:
      /\b(happy|great|excellent|good|congratulations|well done|fantastic|wonderful|amazing|delighted|pleased|joy|enjoy|glad|success|achievement|perfect|brilliant|awesome|love it|impressive)\b/i,

    sad: /\b(sad|sorry|unfortunate|regret|disappointed|unhappy|upset|apology|apologize|depressed|gloomy|miserable|heartbroken|grief|sorrow|tragic|pity|sympathy|condolences|failed)\b/i,

    surprised:
      /\b(surprised|wow|amazing|incredible|unexpected|astonishing|shocking|startling|remarkable|extraordinary|unbelievable|stunned|astounded|speechless|wonder|awe|fascinating|impressive|sudden|unpredictable)\b/i,

    angry:
      /\b(angry|frustrated|error|wrong|incorrect|failed|annoyed|upset|mad|furious|irritated|outraged|enraged|livid|hostile|agitated|displeased|indignant|exasperated|problem|issue|mistake|fault)\b/i
  };

  // Calculate emotion scores based on keyword matches
  const scores = {
    happy: (text.match(emotionPatterns.happy) || []).length,
    sad: (text.match(emotionPatterns.sad) || []).length,
    surprised: (text.match(emotionPatterns.surprised) || []).length,
    angry: (text.match(emotionPatterns.angry) || []).length
  };

  // Log the emotion scores for debugging
  console.log('Emotion scores:', scores);

  // Find the emotion with the highest score
  let maxScore = 0;
  let dominantEmotion = 'neutral';

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  }

  // Only change emotion if enough time has passed since the last change
  const now = Date.now();
  if (now - lastEmotionChangeTime < MIN_EMOTION_DURATION) {
    // Return the current emotion without changing it
    return get(currentEmotion);
  }

  // Only use the dominant emotion if its score is above a threshold
  if (maxScore > 0) {
    // If we're changing the emotion, update the timestamp
    if (dominantEmotion !== get(currentEmotion)) {
      lastEmotionChangeTime = now;
    }

    currentEmotion.set(dominantEmotion);
    return dominantEmotion;
  } else {
    // If we're changing to neutral, update the timestamp
    if (get(currentEmotion) !== 'neutral') {
      lastEmotionChangeTime = now;
    }

    currentEmotion.set('neutral');
    return 'neutral';
  }
}

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let audioContext;
let audioPlayer;
let audioAnalyser;
let analyserDataArray;

// Enhanced phrase queue system
let phraseQueue = [];
let isPlayingSequence = false;
let currentlyPlayingMetadata = null;
let waitingPhraseActive = false;
let queueState = {
  lastTransitionTime: 0,
  transitionInProgress: false,
  pendingInterruption: false,
  interruptionOccurred: false,
  interruptionTime: null,
  lastInterruptionId: null
};

/**
 * Initialize audio context and player
 */
export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Set a higher sample rate if possible for better audio analysis
    if (audioContext.sampleRate < 44100 && typeof audioContext.sampleRate === 'number') {
      console.log('Attempting to increase sample rate for better audio analysis');
      try {
        audioContext.sampleRate = 44100;
      } catch (e) {
        console.log('Could not set sample rate:', e);
      }
    }
  }

  if (!audioPlayer) {
    audioPlayer = new Audio();
    // Reduce latency in audio playback if possible
    if (audioPlayer.mozAudioChannelType) {
      audioPlayer.mozAudioChannelType = 'content'; // Firefox-specific
    }
  }

  // Initialize audio analyzer for lip-syncing with optimized settings for consonant detection
  if (!audioAnalyser && audioContext) {
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 128; // Increased from 64 for even better frequency resolution
    audioAnalyser.smoothingTimeConstant = 0.2; // Further reduced from 0.4 for faster response to consonants
    audioAnalyser.minDecibels = -90; // Lower threshold to catch quieter sounds
    audioAnalyser.maxDecibels = -10; // Upper threshold to prevent clipping
    analyserDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    console.log(
      'Audio analyzer initialized with frequency bin count:',
      audioAnalyser.frequencyBinCount
    );
  }

  // Initialize audio transition support
  initializeAudioTransitions();

  // Initialize AudioBufferManager
  if (audioContext && !audioBufferManager.isInitialized) {
    audioBufferManager.initialize(audioContext).catch((error) => {
      console.error('Failed to initialize AudioBufferManager:', error);
    });
  }

  // Initialize InterruptionDetector
  if (audioContext && !interruptionDetector.isListening) {
    interruptionDetector
      .initialize(audioContext)
      .then(() => {
        // Set up interruption handling
        interruptionDetector.onInterruption(handleVoiceInterruption);
        console.log('InterruptionDetector initialized and connected');
      })
      .catch((error) => {
        console.error('Failed to initialize InterruptionDetector:', error);
      });
  }
}

/**
 * Start recording audio
 * @returns {Promise<void>}
 */
export async function startRecording() {
  try {
    initAudioContext();
    audioChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    setError('Failed to start recording. Please check your microphone permissions.');
    return false;
  }
}

/**
 * Stop recording and transcribe audio
 * @returns {Promise<string>} - Transcribed text
 */
export async function stopRecording() {
  return new Promise((resolve, reject) => {
    try {
      if (!mediaRecorder) {
        reject('No recording in progress');
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const transcription = await transcribeAudio(audioBlob);
          resolve(transcription);
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorder.stop();

      // Stop all tracks in the stream
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Error stopping recording:', error);
      reject(error);
    }
  });
}

/**
 * Simple language detection based on text content
 * @param {string} text - Text to analyze
 * @returns {string|null} - Detected language code or null
 */
function detectLanguageFromText(text) {
  if (!text || text.length < 3) return null;

  // Russian detection - look for Cyrillic characters
  if (/[а-яё]/i.test(text)) {
    return 'ru';
  }

  // Spanish detection - look for Spanish-specific characters and patterns
  if (
    /[ñáéíóúü¿¡]/i.test(text) ||
    /\b(el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|están)\b/i.test(text)
  ) {
    return 'es';
  }

  // Default to English for other cases
  return 'en';
}

/**
 * Transcribe audio using Whisper API
 * @param {Blob} audioBlob - Audio blob to transcribe
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioBlob) {
  try {
    setLoading(true);

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', get(selectedLanguage));

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();

    // Update selectedLanguage if the API detected a different language
    if (data.detectedLanguage && data.detectedLanguage !== get(selectedLanguage)) {
      console.log(
        `Language detected: ${data.detectedLanguage}, updating from ${get(selectedLanguage)}`
      );
      selectedLanguage.set(data.detectedLanguage);
    } else {
      // Fallback: simple language detection based on text content
      const detectedLang = detectLanguageFromText(data.transcription);
      if (detectedLang && detectedLang !== get(selectedLanguage)) {
        console.log(
          `Language detected from text: ${detectedLang}, updating from ${get(selectedLanguage)}`
        );
        selectedLanguage.set(detectedLang);
      }
    }

    return data.transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    setError('Failed to transcribe audio. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
}

/**
 * Send transcribed text to chat API and get response
 * @param {string} transcription - Transcribed text
 * @param {string} sessionId - Current session ID (optional)
 * @returns {Promise<string>} - AI response
 */
export async function sendTranscribedText(transcription, sessionId = null) {
  try {
    // Ensure voice mode is active (should already be active when this is called)
    if (!get(isVoiceModeActive)) {
      console.log('Activating voice mode for transcribed text processing');
      setVoiceModeActive(true);
    }

    setLoading(true);

    // Get the current selected images
    const images = get(selectedImages);
    console.log('Voice mode - Selected images:', images?.length || 0);

    // Generate a unique message ID
    const messageId = Date.now();

    // Add the transcription as a user message with images
    addMessage(MESSAGE_TYPES.USER, transcription, images, messageId);

    // Update session title if this is the first user message and we have a session ID
    if (sessionId && transcription && transcription.trim().length > 0) {
      try {
        // Check if session title needs updating (starts with "New Session")
        const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.title && sessionData.title.startsWith('New Session')) {
            console.log(
              'Updating session title from voice message:',
              transcription.substring(0, 50)
            );

            // Update session title with the transcribed text
            await fetch(`/api/sessions/${sessionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : ''),
                preview: transcription.substring(0, 200)
              })
            });
          }
        }
      } catch (titleUpdateError) {
        // Don't let title update errors interrupt the main flow
        console.warn('Failed to update session title from voice message:', titleUpdateError);
      }
    }

    // Trigger waiting phrase immediately after user message
    console.log('Triggering waiting phrase for user message...');
    try {
      await triggerWaitingPhrase();
    } catch (waitingPhraseError) {
      // Don't let waiting phrase errors interrupt the main flow
      console.warn(
        'Waiting phrase failed, continuing with response generation:',
        waitingPhraseError
      );
    }

    // Start async AI response generation
    const responsePromise = generateAIResponse(transcription, images);

    // Wait for AI response to complete
    const data = await responsePromise;

    // If we have a response, process it
    if (data && data.response) {
      // Add the AI's response to the chat
      addMessage(MESSAGE_TYPES.TUTOR, data.response);

      // Determine emotion from the response
      determineEmotion(data.response);

      // Synthesize speech from the response with high priority
      await synthesizeSpeech(data.response, {
        isWaitingPhrase: false,
        priority: 1
      });

      return data.response;
    }

    return null;
  } catch (error) {
    console.error('Error processing voice data:', error);
    setError('Failed to process voice data. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
}

/**
 * Generate AI response asynchronously while waiting phrase plays
 * @param {string} transcription - User's transcribed message
 * @param {Array} images - Selected images (if any)
 * @returns {Promise<Object>} AI response data
 */
async function generateAIResponse(transcription, images) {
  try {
    // Process the message with OCR context if there are images
    if (images && images.length > 0) {
      console.log('Voice mode - Processing message with images');
      // Extract URLs from image objects
      const imageUrls = images.map((img) => img.url);

      // Send the message with OCR context
      await sendMessageWithOCRContext(transcription, imageUrls);

      // Clear the selected images after sending
      selectedImages.set([]);

      // For voice mode with images, the response is handled by enhancedServices
      // Return null to indicate no direct response processing needed
      return null;
    } else {
      // If no images, send the message normally
      console.log('Voice mode - Processing message without images');

      // Send the transcribed message to the OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: transcription,
          language: get(selectedLanguage)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process voice data');
      }

      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

/**
 * Trigger waiting phrase playback with comprehensive error handling
 * @returns {Promise<void>}
 */
async function triggerWaitingPhrase() {
  let phraseSelectionTime = 0;
  let synthesisTime = 0;
  const startTime = Date.now();

  try {
    // Ensure voice mode is active and ready
    if (!ensureVoiceModeActive('waiting phrase trigger')) {
      return;
    }

    console.log('Selecting and playing waiting phrase...');

    // Get current language
    const currentLanguage = get(selectedLanguage);

    // Step 1: Select a waiting phrase with error handling
    let waitingPhrase = null;
    const phraseStartTime = Date.now();

    try {
      waitingPhrase = await waitingPhrasesService.selectWaitingPhrase(currentLanguage);
      phraseSelectionTime = Date.now() - phraseStartTime;

      if (!waitingPhrase) {
        console.warn('No waiting phrase selected, using fallback');
        waitingPhrase = getFallbackWaitingPhrase(currentLanguage);
      }
    } catch (phraseError) {
      phraseSelectionTime = Date.now() - phraseStartTime;
      console.error('Error selecting waiting phrase:', phraseError);

      // Use fallback phrase
      waitingPhrase = getFallbackWaitingPhrase(currentLanguage);
      console.log(`Using fallback waiting phrase: "${waitingPhrase}"`);
    }

    if (waitingPhrase) {
      console.log(
        `Selected waiting phrase: "${waitingPhrase.substring(0, 50)}..." (selection time: ${phraseSelectionTime}ms)`
      );

      // Step 2: Synthesize and play the waiting phrase with error handling
      const synthesisStartTime = Date.now();

      try {
        await synthesizeWaitingPhraseWithErrorHandling(waitingPhrase, currentLanguage);
        synthesisTime = Date.now() - synthesisStartTime;

        const totalTime = Date.now() - startTime;
        console.log(
          `Waiting phrase completed successfully (total time: ${totalTime}ms, synthesis: ${synthesisTime}ms)`
        );
      } catch (synthesisError) {
        synthesisTime = Date.now() - synthesisStartTime;
        console.error('Error synthesizing waiting phrase:', synthesisError);

        // Log synthesis error details
        logSynthesisError(synthesisError, waitingPhrase, currentLanguage, synthesisTime);

        // Don't throw - continue with main flow
        console.log('Continuing without waiting phrase due to synthesis error');
      }
    } else {
      console.warn('No waiting phrase available (including fallback)');
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Error in waiting phrase flow after ${totalTime}ms:`, error);

    // Log comprehensive error details
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      phraseSelectionTime,
      synthesisTime,
      totalTime,
      voiceModeActive: get(isVoiceModeActive),
      currentLanguage: get(selectedLanguage),
      timestamp: new Date().toISOString()
    };
    console.error('Waiting phrase error details:', errorDetails);

    // Don't throw - let the main flow continue
  }
}

/**
 * Get fallback waiting phrase when selection fails
 * @param {string} language - Target language
 * @returns {string} Fallback phrase
 */
function getFallbackWaitingPhrase(language) {
  const fallbacks = {
    en: 'Please wait...',
    ru: 'Подождите...',
    es: 'Por favor espere...'
  };

  return fallbacks[language] || fallbacks.en;
}

/**
 * Synthesize waiting phrase with enhanced error handling
 * @param {string} text - Waiting phrase text
 * @param {string} language - Target language
 * @returns {Promise<void>}
 */
async function synthesizeWaitingPhraseWithErrorHandling(text, language) {
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Synthesis attempt ${attempt}/${maxRetries} for waiting phrase`);

      await synthesizeWaitingPhrase(text, language);

      console.log(`Waiting phrase synthesis successful on attempt ${attempt}`);
      return; // Success
    } catch (error) {
      lastError = error;
      console.warn(`Synthesis attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt - 1) * 200; // 200ms, 400ms
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All attempts failed
  console.error(`All synthesis attempts failed for waiting phrase: "${text}"`);
  throw lastError || new Error('Synthesis failed after all retries');
}

/**
 * Log synthesis error details for debugging
 * @param {Error} error - Synthesis error
 * @param {string} text - Text that failed to synthesize
 * @param {string} language - Target language
 * @param {number} synthesisTime - Time spent on synthesis
 */
function logSynthesisError(error, text, language, synthesisTime) {
  const errorInfo = {
    type: 'waiting-phrase-synthesis-error',
    message: error.message,
    text: text.substring(0, 100),
    language,
    synthesisTime,
    timestamp: new Date().toISOString(),
    voiceModeActive: get(isVoiceModeActive),
    audioQueueStatus: getAudioQueueStatus(),
    stack: error.stack
  };

  console.error('Synthesis error details:', errorInfo);

  // Could send to error tracking service here
  // trackError('waiting-phrase-synthesis', errorInfo);
}

/**
 * Synthesize speech from text using TTS API
 * @param {string} text - Text to synthesize
 * @param {Object} options - Synthesis options
 * @param {boolean} options.isWaitingPhrase - Whether this is a waiting phrase
 * @param {string} options.language - Language override
 * @param {number} options.priority - Priority level (1=highest, 3=lowest)
 * @returns {Promise<void>}
 */
async function synthesizeSpeech(text, options = {}) {
  const startTime = Date.now();
  let networkTime = 0;
  let processingTime = 0;

  // Extract options outside the try block so they are available in error handling
  const {
    isWaitingPhrase = false,
    language = get(selectedLanguage),
    priority = isWaitingPhrase ? 2 : 1 // Waiting phrases have medium priority
  } = options;

  // Skip synthesis entirely when voice mode is not active
  if (!get(isVoiceModeActive)) {
    console.warn('Voice mode inactive, skipping speech synthesis');
    return;
  }

  try {
    console.log(
      `Synthesizing ${isWaitingPhrase ? 'waiting phrase' : 'response'}: "${text.substring(0, 50)}..." (language: ${language}, priority: ${priority})`
    );

    // Validate inputs
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text for synthesis: text is empty or not a string');
    }

    // Note: Long texts are now handled by splitting in synthesizeResponseSpeech
    // Individual chunks should not exceed 4000 characters

    setLoading(true);

    const networkStartTime = Date.now();

    // Make synthesis request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => {
        controller.abort();
      },
      isWaitingPhrase ? 5000 : 15000
    ); // Shorter timeout for waiting phrases

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          language,
          isWaitingPhrase,
          priority
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      networkTime = Date.now() - networkStartTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Synthesis API error (${response.status}): ${errorText}`);
      }

      const processingStartTime = Date.now();
      const audioBlob = await response.blob();
      processingTime = Date.now() - processingStartTime;

      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Received empty audio blob from synthesis API');
      }

      if (audioBlob.size > 10 * 1024 * 1024) {
        // 10MB limit
        console.warn(`Audio blob is very large (${Math.round(audioBlob.size / 1024 / 1024)}MB)`);
      }

      // Add metadata to the audio blob for queue management
      const audioWithMetadata = {
        blob: audioBlob,
        metadata: {
          isWaitingPhrase,
          originalText: text,
          language,
          priority,
          timestamp: Date.now(),
          synthesisTime: Date.now() - startTime,
          networkTime,
          processingTime,
          blobSize: audioBlob.size,
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };

      console.log(
        `Synthesis completed successfully (total: ${Date.now() - startTime}ms, network: ${networkTime}ms, processing: ${processingTime}ms, size: ${Math.round(audioBlob.size / 1024)}KB)`
      );

      // Use AudioBufferManager for smooth playback
      await playAudioWithBuffering(audioWithMetadata);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        throw new Error(`Synthesis request timed out after ${isWaitingPhrase ? 5 : 15} seconds`);
      }

      throw fetchError;
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Error synthesizing speech after ${totalTime}ms:`, error);

    // Log detailed error information
    const errorDetails = {
      type: isWaitingPhrase ? 'waiting-phrase-synthesis' : 'response-synthesis',
      message: error.message,
      text: text.substring(0, 100),
      language,
      isWaitingPhrase,
      priority,
      totalTime,
      networkTime,
      processingTime,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    console.error('Synthesis error details:', errorDetails);

    // Handle error based on type
    if (isWaitingPhrase) {
      // For waiting phrases, fail gracefully
      console.warn('Waiting phrase synthesis failed, continuing without phrase');

      // Try to use a simpler fallback phrase if the original was complex
      if (text.length > 50 || text.includes(',') || text.includes(';')) {
        console.log('Attempting synthesis with simpler fallback phrase...');
        try {
          const simpleFallback = getFallbackWaitingPhrase(
            options.language || get(selectedLanguage)
          );
          if (simpleFallback !== text) {
            // Recursive call with simpler text (prevent infinite recursion)
            await synthesizeSpeech(simpleFallback, { ...options, _isRetry: true });
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback synthesis also failed:', fallbackError);
        }
      }

      return; // Fail silently for waiting phrases
    } else {
      // For AI responses, show error to user but don't throw
      console.error('AI response synthesis failed, user will see text-only response');
      setError('Speech synthesis failed. You can see the text response above.');

      // Could implement text-to-speech fallback here
      // tryFallbackTTS(text, options);
    }
  } finally {
    setLoading(false);
  }
}

/**
 * Synthesize waiting phrase speech
 * @param {string} text - Waiting phrase text
 * @param {string} language - Language for synthesis
 * @returns {Promise<void>}
 */
export async function synthesizeWaitingPhrase(text, language = null) {
  const targetLanguage = language || get(selectedLanguage);

  console.log(`Synthesizing waiting phrase in ${targetLanguage}: "${text}"`);

  return synthesizeSpeech(text, {
    isWaitingPhrase: true,
    language: targetLanguage,
    priority: 2
  });
}

/**
 * Split long text into chunks for TTS processing
 * Splits on sentence boundaries to maintain natural speech
 * @param {string} text - Text to split
 * @param {number} maxChunkLength - Maximum length per chunk (default 1000)
 * @returns {string[]} Array of text chunks
 */
function splitTextForTTS(text, maxChunkLength = 1000) {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const chunks = [];
  
  // Split by sentences (including Russian and English punctuation)
  // Matches: . ! ? followed by space or newline
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
  const sentences = text.match(sentenceRegex) || [text];
  
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // If single sentence is longer than max, we have to include it anyway
    // (better to have one long chunk than break mid-sentence)
    if (trimmedSentence.length > maxChunkLength) {
      // Flush current chunk if exists
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // Add the long sentence as its own chunk
      chunks.push(trimmedSentence);
      continue;
    }
    
    // Check if adding this sentence would exceed the limit
    const potentialLength = currentChunk.length + (currentChunk ? 1 : 0) + trimmedSentence.length;
    
    if (potentialLength > maxChunkLength && currentChunk) {
      // Current chunk is full, save it and start new one
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  // Add remaining chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Exported function to synthesize speech for OCR responses
 * This function checks if voice mode is active before synthesizing speech
 * Handles long texts by splitting them into chunks
 * @param {string} text - Text to synthesize
 * @returns {Promise<void>}
 */
export async function synthesizeResponseSpeech(text) {
  // Only synthesize speech if we're in voice mode
  if (get(isVoiceModeActive)) {
    console.log('Voice mode active, synthesizing speech for OCR response');

    // Determine emotion from the response
    determineEmotion(text);

    // Check if text is too long and needs to be split
    const MAX_TTS_LENGTH = 1000; // Split into smaller chunks for faster processing and better reliability
    
    console.log(`[TTS] Text length: ${text.length} chars (max: ${MAX_TTS_LENGTH})`);
    
    if (text.length > MAX_TTS_LENGTH) {
      console.log(`[TTS] Text is long (${text.length} chars), splitting into chunks for TTS`);
      
      const chunks = splitTextForTTS(text, MAX_TTS_LENGTH);
      console.log(`[TTS] Split text into ${chunks.length} chunks:`, chunks.map((c, i) => `Chunk ${i+1}: ${c.length} chars`));

      // Synthesize and play each chunk sequentially
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[TTS] Synthesizing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        try {
          await synthesizeSpeech(chunk, {
            isWaitingPhrase: false,
            priority: 1
          });
          
          // Small delay between chunks to ensure smooth playback
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error synthesizing chunk ${i + 1}:`, error);
          // Continue with next chunk even if one fails
        }
      }
      
      console.log('[TTS] Completed synthesizing all chunks');
    } else {
      // Text is short enough, synthesize normally
      console.log(`[TTS] Text is short enough (${text.length} chars), synthesizing as single chunk`);
      await synthesizeSpeech(text, {
        isWaitingPhrase: false,
        priority: 1
      });
    }
  } else {
    console.log('Voice mode not active, skipping speech synthesis for OCR response');
  }
}

/**
 * Check if a waiting phrase is currently active/playing
 * @returns {boolean} True if a waiting phrase is currently playing
 */
export function isWaitingPhraseActive() {
  return waitingPhraseActive;
}

/**
 * Get information about currently playing audio
 * @returns {Object|null} Current audio metadata or null if nothing playing
 */
export function getCurrentAudioInfo() {
  return currentlyPlayingMetadata ? { ...currentlyPlayingMetadata } : null;
}

/**
 * Get current audio queue status
 * @returns {Object} Queue status information
 */
export function getAudioQueueStatus() {
  const waitingPhrases = phraseQueue.filter((item) => item.metadata?.isWaitingPhrase).length;
  const responses = phraseQueue.filter((item) => !item.metadata?.isWaitingPhrase).length;

  return {
    totalItems: phraseQueue.length,
    waitingPhrases,
    responses,
    isPlaying: isPlayingSequence,
    currentlyPlaying: currentlyPlayingMetadata
      ? {
          type: currentlyPlayingMetadata.isWaitingPhrase ? 'waiting_phrase' : 'response',
          language: currentlyPlayingMetadata.language,
          priority: currentlyPlayingMetadata.priority
        }
      : null
  };
}

/**
 * Clear waiting phrases from the audio queue
 * This can be used when an AI response is ready to interrupt waiting phrases
 */
export function clearWaitingPhrasesFromQueue() {
  const originalLength = phraseQueue.length;
  phraseQueue = phraseQueue.filter((item) => !item.metadata?.isWaitingPhrase);
  const removed = originalLength - phraseQueue.length;

  if (removed > 0) {
    console.log(`Cleared ${removed} waiting phrases from audio queue`);
  }

  return removed;
}

/**
 * Enhanced queue management for smooth transitions with interruption support
 * @param {Object} audioWithMetadata - Audio object with metadata
 */
function manageQueueTransition(audioWithMetadata) {
  const isResponse = !audioWithMetadata.metadata.isWaitingPhrase;
  const isWaitingPhrase = audioWithMetadata.metadata.isWaitingPhrase;
  const isInterruptionResponse = audioWithMetadata.metadata.isInterruptionResponse;

  // Handle interruption responses with highest priority
  if (isInterruptionResponse) {
    console.log('Interruption response ready, clearing queue and prioritizing');

    // Clear all queued items - interruption takes precedence
    clearAudioQueue();

    // Stop current playback immediately
    if (currentlyPlayingMetadata) {
      stopCurrentAudioForInterruption();
    }

    // Add interruption response with immediate priority
    phraseQueue.unshift(audioWithMetadata);
    queueState.pendingInterruption = false; // Reset interruption state
    return;
  }

  // If this is an AI response and we have waiting phrases in queue or playing
  if (isResponse) {
    console.log('AI response ready, managing transition from waiting phrases');

    // Mark that we have a pending interruption
    queueState.pendingInterruption = true;

    // If a waiting phrase is currently playing, we'll let it finish naturally
    // but clear any queued waiting phrases
    if (waitingPhraseActive) {
      console.log('Waiting phrase currently playing, will transition after completion');
      clearWaitingPhrasesFromQueue();
    } else {
      // No waiting phrase playing, clear queue and add response immediately
      clearWaitingPhrasesFromQueue();
    }

    // Add response with high priority
    phraseQueue.unshift(audioWithMetadata);
  } else if (isWaitingPhrase) {
    // Only add waiting phrase if no response is pending and no interruption occurred
    if (
      !queueState.pendingInterruption &&
      !hasResponseInQueue() &&
      !queueState.interruptionOccurred
    ) {
      phraseQueue.push(audioWithMetadata);
      console.log('Added waiting phrase to queue');
    } else {
      console.log('Skipping waiting phrase - response pending, in queue, or interruption occurred');
    }
  }
}

/**
 * Enhanced audio queue management for interruptions
 */
function handleInterruptionInQueue() {
  console.log('Handling interruption in audio queue');

  // Mark that an interruption occurred
  queueState.interruptionOccurred = true;
  queueState.interruptionTime = Date.now();

  // Clear all waiting phrases from queue
  clearWaitingPhrasesFromQueue();

  // If currently playing a waiting phrase, mark it for interruption
  if (waitingPhraseActive && currentlyPlayingMetadata) {
    console.log('Marking current waiting phrase for interruption');
    currentlyPlayingMetadata.interrupted = true;
  }
}

/**
 * Reset interruption state after handling
 */
function resetInterruptionState() {
  queueState.interruptionOccurred = false;
  queueState.interruptionTime = null;
  queueState.pendingInterruption = false;
  console.log('Interruption state reset');
}

/**
 * Check if there's a response (non-waiting phrase) in the queue
 * @returns {boolean} True if response is in queue
 */
function hasResponseInQueue() {
  return phraseQueue.some((item) => !item.metadata?.isWaitingPhrase);
}

/**
 * Handle smooth transition between audio types
 */
function handleAudioTransition() {
  const now = Date.now();
  const timeSinceLastTransition = now - queueState.lastTransitionTime;
  const minTransitionInterval = 75; // Reduced to 75ms for quicker transitions

  // Prevent rapid transitions that could cause audio glitches
  if (timeSinceLastTransition < minTransitionInterval && queueState.transitionInProgress) {
    console.log('Transition too rapid, delaying...');
    setTimeout(() => {
      if (!queueState.transitionInProgress) {
        handleAudioTransition();
      }
    }, minTransitionInterval - timeSinceLastTransition);
    return;
  }

  // Determine transition type based on current and next audio
  const nextAudio = phraseQueue.length > 0 ? phraseQueue[0] : null;
  const transitionType = nextAudio?.metadata?.isWaitingPhrase
    ? 'transition_to_waiting'
    : 'transition_to_response';

  // Use enhanced transition management
  manageAudioStateTransition(transitionType, nextAudio?.metadata);

  // Apply fade-out effect if supported (fallback)
  if (audioPlayer && !audioPlayer.paused && !audioBufferManager.isInitialized) {
    applyAudioFadeTransition();
  }

  // Reset transition state after a short delay
  setTimeout(() => {
    queueState.transitionInProgress = false;
  }, 200);
}

/**
 * Apply smooth audio transition effects
 */
function applyAudioFadeTransition() {
  try {
    // If Web Audio API is available, apply a quick fade
    if (audioContext && audioContext.state === 'running') {
      const currentTime = audioContext.currentTime;
      const fadeTime = 0.05; // Reduced to 50ms for quicker transitions

      // Create a gain node for smooth transitions
      if (audioPlayer.gainNode) {
        audioPlayer.gainNode.gain.setValueAtTime(1, currentTime);
        audioPlayer.gainNode.gain.linearRampToValueAtTime(0.3, currentTime + fadeTime);
        audioPlayer.gainNode.gain.linearRampToValueAtTime(1, currentTime + fadeTime * 2);
      } else {
        // Fallback: use HTML5 audio volume
        const originalVolume = audioPlayer.volume;
        audioPlayer.volume = 0.3;
        setTimeout(() => {
          if (audioPlayer) {
            audioPlayer.volume = originalVolume;
          }
        }, fadeTime * 2000);
      }
    }
  } catch (error) {
    console.log('Audio fade transition not available:', error.message);
  }
}

/**
 * Apply crossfade transition between audio sources
 * @param {Object} fromAudio - Current audio metadata
 * @param {Object} toAudio - New audio metadata
 */
function applyCrossfadeTransition(fromAudio, toAudio) {
  try {
    console.log(
      `Applying crossfade transition from ${fromAudio?.isWaitingPhrase ? 'waiting phrase' : 'response'} to ${toAudio?.isWaitingPhrase ? 'waiting phrase' : 'response'}`
    );

    if (audioBufferManager.isInitialized && fromAudio?.id) {
      // Use AudioBufferManager for smooth crossfading
      audioBufferManager.stopWithFadeOut(fromAudio.id, 75); // Quick fade out
    } else if (audioPlayer && !audioPlayer.paused) {
      // Fallback to HTML5 audio fade
      applyAudioFadeTransition();
    }

    // Update transition state
    queueState.transitionInProgress = true;
    queueState.lastTransitionTime = Date.now();

    // Clear transition flag after completion
    setTimeout(() => {
      queueState.transitionInProgress = false;
    }, 150);
  } catch (error) {
    console.error('Error applying crossfade transition:', error);
    queueState.transitionInProgress = false;
  }
}

/**
 * Enhanced audio state transition manager
 */
function manageAudioStateTransition(newState, metadata = {}) {
  try {
    const currentState = {
      isSpeaking: get(isSpeaking),
      isPlaying: isPlayingSequence,
      waitingPhraseActive: waitingPhraseActive,
      currentAudio: currentlyPlayingMetadata
    };

    console.log(`Managing audio state transition: ${JSON.stringify(currentState)} -> ${newState}`);

    switch (newState) {
      case 'speaking_start':
        if (!currentState.isSpeaking) {
          isSpeaking.set(true);
          audioAmplitude.set(0.1); // Gentle start

          // Gradual amplitude increase for natural feel
          setTimeout(() => {
            if (get(isSpeaking)) {
              audioAmplitude.set(0.2);
            }
          }, 50);
        }
        break;

      case 'speaking_stop':
        if (currentState.isSpeaking) {
          // Immediate stop to prevent mouth movement lag
          console.log('Immediately stopping speaking state and mouth animation');
          audioAmplitude.set(0);
          isSpeaking.set(false);
        }
        break;

      case 'transition_to_response':
        if (currentState.waitingPhraseActive) {
          applyCrossfadeTransition(currentState.currentAudio, metadata);
        }
        break;

      case 'transition_to_waiting':
        if (currentState.currentAudio && !currentState.currentAudio.isWaitingPhrase) {
          applyCrossfadeTransition(currentState.currentAudio, metadata);
        }
        break;

      default:
        console.warn(`Unknown audio state transition: ${newState}`);
    }
  } catch (error) {
    console.error('Error managing audio state transition:', error);
  }
}

/**
 * Initialize audio transition support
 */
function initializeAudioTransitions() {
  if (audioContext && audioPlayer) {
    try {
      // Create a gain node for smooth transitions
      if (!audioPlayer.gainNode) {
        audioPlayer.gainNode = audioContext.createGain();
        audioPlayer.gainNode.gain.value = 1.0;
      }
    } catch (error) {
      console.log('Could not initialize audio transitions:', error.message);
    }
  }
}

/**
 * Enhanced audio state management
 */
export function getEnhancedAudioState() {
  return {
    queue: {
      total: phraseQueue.length,
      waitingPhrases: phraseQueue.filter((item) => item.metadata?.isWaitingPhrase).length,
      responses: phraseQueue.filter((item) => !item.metadata?.isWaitingPhrase).length,
      nextItem:
        phraseQueue.length > 0
          ? {
              type: phraseQueue[0].metadata?.isWaitingPhrase ? 'waiting_phrase' : 'response',
              priority: phraseQueue[0].metadata?.priority || 1
            }
          : null
    },
    playback: {
      isPlaying: isPlayingSequence,
      currentType: currentlyPlayingMetadata?.isWaitingPhrase ? 'waiting_phrase' : 'response',
      waitingPhraseActive,
      transitionInProgress: queueState.transitionInProgress
    },
    transitions: {
      pendingInterruption: queueState.pendingInterruption,
      lastTransitionTime: queueState.lastTransitionTime,
      canTransition: !queueState.transitionInProgress
    }
  };
}

/**
 * Force immediate transition to next audio item (for interrupting waiting phrases)
 * @returns {boolean} True if transition was initiated
 */
export function forceAudioTransition() {
  if (!isPlayingSequence || !waitingPhraseActive) {
    console.log('No waiting phrase to interrupt');
    return false;
  }

  console.log('Forcing immediate transition from waiting phrase to response');

  // Apply quick fade out
  applyAudioFadeTransition();

  // Skip to next item in queue after a brief moment
  setTimeout(() => {
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
      audioPlayer.currentTime = audioPlayer.duration || 0; // Jump to end
    }
  }, 50);

  return true;
}

/**
 * Optimize queue for better performance and user experience
 */
export function optimizeAudioQueue() {
  const originalLength = phraseQueue.length;

  // Remove duplicate waiting phrases
  const seen = new Set();
  phraseQueue = phraseQueue.filter((item) => {
    if (item.metadata?.isWaitingPhrase) {
      const key = `${item.metadata.originalText}:${item.metadata.language}`;
      if (seen.has(key)) {
        return false; // Remove duplicate
      }
      seen.add(key);
    }
    return true;
  });

  // Limit waiting phrases to prevent queue buildup
  const maxWaitingPhrases = 2;
  let waitingPhraseCount = 0;
  phraseQueue = phraseQueue.filter((item) => {
    if (item.metadata?.isWaitingPhrase) {
      waitingPhraseCount++;
      return waitingPhraseCount <= maxWaitingPhrases;
    }
    return true;
  });

  const removed = originalLength - phraseQueue.length;
  if (removed > 0) {
    console.log(`Optimized audio queue: removed ${removed} items`);
  }

  return removed;
}

/**
 * Analyze audio and update amplitude with enhanced consonant detection
 */
function analyzeAudio() {
  if (!audioAnalyser || !analyserDataArray) return;

  // Get frequency data
  audioAnalyser.getByteFrequencyData(analyserDataArray);

  // Create frequency bands for different speech components
  // These ranges are approximate and based on typical speech frequencies
  const bands = {
    lowVowels: { start: 0, end: Math.floor(analyserDataArray.length * 0.1) }, // ~80-250 Hz (a, o sounds)
    midVowels: {
      start: Math.floor(analyserDataArray.length * 0.1),
      end: Math.floor(analyserDataArray.length * 0.2)
    }, // ~250-500 Hz (e, i sounds)
    consonants: {
      start: Math.floor(analyserDataArray.length * 0.2),
      end: Math.floor(analyserDataArray.length * 0.6)
    }, // ~500-4000 Hz (most consonants)
    sibilants: { start: Math.floor(analyserDataArray.length * 0.6), end: analyserDataArray.length } // ~4000+ Hz (s, sh, f sounds)
  };

  // Calculate band energies
  const bandEnergies = {};

  for (const [bandName, range] of Object.entries(bands)) {
    let bandSum = 0;
    for (let i = range.start; i < range.end; i++) {
      bandSum += analyserDataArray[i];
    }
    const bandAvg = bandSum / (range.end - range.start);
    bandEnergies[bandName] = bandAvg;
  }

  // Normalize band energies
  const normalizedBands = {};
  for (const [bandName, energy] of Object.entries(bandEnergies)) {
    normalizedBands[bandName] = energy / 255;
  }

  // Detect consonant patterns
  const isConsonantDominant =
    normalizedBands.consonants > 0.15 &&
    normalizedBands.consonants > normalizedBands.lowVowels * 1.2;

  const isSibilantDominant =
    normalizedBands.sibilants > 0.1 && normalizedBands.sibilants > normalizedBands.lowVowels;

  // Calculate weighted amplitude with emphasis on speech-relevant frequencies
  let sum = 0;
  let weight = 0;

  for (let i = 0; i < analyserDataArray.length; i++) {
    // Apply dynamic weighting based on frequency band importance
    let freqWeight = 1;

    // Boost consonant frequencies
    if (i >= bands.consonants.start && i < bands.consonants.end) {
      freqWeight = 2.5;
    }
    // Boost sibilant frequencies even more
    else if (i >= bands.sibilants.start && i < bands.sibilants.end) {
      freqWeight = 3;
    }
    // Apply standard weighting to vowel frequencies
    else {
      freqWeight = 1.5;
    }

    sum += analyserDataArray[i] * freqWeight;
    weight += freqWeight;
  }

  const average = sum / weight;

  // Apply additional boost for consonant patterns
  let consonantBoost = 1.0;
  if (isConsonantDominant) {
    consonantBoost = 1.4; // Boost amplitude for consonants
  } else if (isSibilantDominant) {
    consonantBoost = 1.6; // Boost amplitude even more for sibilants
  }

  // Normalize to 0-1 range and update store with consonant boost
  const normalizedAmplitude = Math.min(1, (average / 255) * 1.3 * consonantBoost);

  // Apply the amplitude update immediately for better responsiveness
  audioAmplitude.set(normalizedAmplitude);

  // Schedule next analysis with high priority
  if (get(isSpeaking)) {
    requestAnimationFrame(analyzeAudio);
  }
}

/**
 * Play audio with metadata and priority handling
 * @param {Object} audioWithMetadata - Audio object with metadata
 * @param {Blob} audioWithMetadata.blob - Audio blob to play
 * @param {Object} audioWithMetadata.metadata - Audio metadata
 */
function playAudioWithMetadata(audioWithMetadata) {
  console.log(
    `Queuing audio: ${audioWithMetadata.metadata.isWaitingPhrase ? 'waiting phrase' : 'response'} (priority: ${audioWithMetadata.metadata.priority})`
  );

  // Use enhanced queue management for smooth transitions
  manageQueueTransition(audioWithMetadata);

  // If not already playing a sequence, start one
  if (!isPlayingSequence) {
    playNextInQueue();
  } else if (!audioWithMetadata.metadata.isWaitingPhrase) {
    // If this is a response and we're playing a waiting phrase, prepare for transition
    if (waitingPhraseActive) {
      console.log('Response ready while waiting phrase playing, preparing transition');
      handleAudioTransition();
    }
  }
}

/**
 * Play the next audio blob in the queue with improved synchronization
 */
function playNextInQueue() {
  if (phraseQueue.length === 0) {
    isPlayingSequence = false;
    queueState.pendingInterruption = false;
    console.log('Audio queue empty, playback sequence ended');
    return;
  }

  isPlayingSequence = true;
  const audioItem = phraseQueue.shift();

  // Handle both old format (just blob) and new format (with metadata)
  const audioBlob = audioItem.blob || audioItem;
  const metadata = audioItem.metadata || {
    isWaitingPhrase: false,
    originalText: '',
    language: get(selectedLanguage),
    priority: 1,
    timestamp: Date.now()
  };

  // Clear pending interruption if we're playing a response
  if (!metadata.isWaitingPhrase) {
    queueState.pendingInterruption = false;
  }

  console.log(
    `Playing ${metadata.isWaitingPhrase ? 'waiting phrase' : 'response'}: "${metadata.originalText.substring(0, 30)}..."`
  );

  const audioUrl = URL.createObjectURL(audioBlob);

  // Set speaking state immediately if not already speaking
  if (!get(isSpeaking)) {
    isSpeaking.set(true);

    // Start with a more pronounced initial amplitude to ensure mouth starts moving
    // before audio plays (helps with perceived synchronization)
    audioAmplitude.set(0.15); // Increased from 0.05 for more immediate visual feedback

    // Simulate an initial consonant pattern to get the mouth moving
    setTimeout(() => {
      if (get(isSpeaking)) {
        // Quick pulse to simulate initial consonant
        audioAmplitude.set(0.3);
        setTimeout(() => {
          if (get(isSpeaking)) {
            audioAmplitude.set(0.1);
          }
        }, 60);
      }
    }, 30);
  }

  // Ensure audio context is running
  if (audioContext) {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Warm up the audio context with a silent sound to reduce startup latency
    const silentBuffer = audioContext.createBuffer(1, 1, 22050);
    const silentSource = audioContext.createBufferSource();
    silentSource.buffer = silentBuffer;
    silentSource.connect(audioContext.destination);
    silentSource.start();
  }

  // Preload the audio
  audioPlayer.preload = 'auto';
  audioPlayer.src = audioUrl;

  // Force a load event to ensure audio is ready to play
  audioPlayer.load();

  // Reduce latency if browser supports it
  if ('playbackRate' in audioPlayer) {
    // Start playback faster initially to compensate for any startup delay
    audioPlayer.playbackRate = 1.05; // Increased from 1.01 for better compensation

    // Reset to normal rate after a short time
    setTimeout(() => {
      if (!audioPlayer.paused) {
        audioPlayer.playbackRate = 1.0;
      }
    }, 200); // Reduced from 300ms for faster normalization
  }

  // Set up audio analysis when playback starts
  audioPlayer.onplay = () => {
    // Update currently playing metadata and waiting phrase status
    currentlyPlayingMetadata = metadata;
    waitingPhraseActive = metadata.isWaitingPhrase;

    console.log(`Started playing ${metadata.isWaitingPhrase ? 'waiting phrase' : 'response'}`);

    // Connect audio player to analyzer if not already connected
    if (audioContext && audioAnalyser && audioPlayer) {
      try {
        const source = audioContext.createMediaElementSource(audioPlayer);

        // Connect through gain node for smooth transitions if available
        if (audioPlayer.gainNode) {
          source.connect(audioPlayer.gainNode);
          audioPlayer.gainNode.connect(audioAnalyser);
          audioAnalyser.connect(audioContext.destination);
          console.log('Connected audio player to analyzer with gain node for transitions');
        } else {
          source.connect(audioAnalyser);
          audioAnalyser.connect(audioContext.destination);
          console.log('Connected audio player to analyzer');
        }

        // Start analyzing audio immediately
        analyzeAudio();
      } catch (error) {
        // If already connected, this will throw an error which we can ignore
        console.log('Audio player already connected or error connecting:', error.message);
        // Still start analyzing
        analyzeAudio();
      }
    }
  };

  // Start playback with high priority
  const playPromise = audioPlayer.play();

  // Handle play promise to avoid uncaught promise errors
  if (playPromise !== undefined) {
    playPromise.catch((error) => {
      console.log('Audio playback error:', error);
      // Reset speaking state if playback fails
      isSpeaking.set(false);
      isPlayingSequence = false;
    });
  }

  // Modify the onended handler
  audioPlayer.onended = () => {
    console.log(
      `Finished playing ${currentlyPlayingMetadata?.isWaitingPhrase ? 'waiting phrase' : 'response'}`
    );

    // Clear currently playing metadata
    currentlyPlayingMetadata = null;
    waitingPhraseActive = false;

    // If there are more phrases in the queue, play the next one
    if (phraseQueue.length > 0) {
      // Keep speaking state true between phrases
      playNextInQueue();
    } else {
      // Immediately set speaking to false when audio ends to prevent mouth movement lag
      console.log('Audio playback sequence completed - immediately stopping mouth animation');
      isSpeaking.set(false);
      audioAmplitude.set(0);
      isPlayingSequence = false;

      // Force avatar mouth closure through state manager
      if (typeof avatarStateManager !== 'undefined' && avatarStateManager.transitionToState) {
        avatarStateManager.transitionToState(
          {
            speaking: false,
            currentState: 'idle',
            mouthPosition: null
          },
          { priority: 'immediate', force: true }
        );
      }
    }

    URL.revokeObjectURL(audioUrl);
  };
}

/**
 * Play audio using AudioBufferManager for smooth playback
 * @param {Object} audioWithMetadata - Audio data with metadata
 */
async function playAudioWithBuffering(audioWithMetadata) {
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

    // Use enhanced queue management for smooth transitions
    manageQueueTransition(queueItem);

    // If not already playing a sequence, start one
    if (!isPlayingSequence) {
      playNextBufferedInQueue();
    } else if (!audioWithMetadata.metadata.isWaitingPhrase) {
      // If this is a response and we're playing a waiting phrase, prepare for transition
      if (waitingPhraseActive) {
        console.log('Response ready while waiting phrase playing, preparing buffered transition');
        handleBufferedAudioTransition();
      }
    }
  } catch (error) {
    console.error('Error in playAudioWithBuffering:', error);
    // Fall back to direct playback
    return playAudioWithMetadata(audioWithMetadata);
  }
}

/**
 * Play the next buffered audio in the queue
 */
function playNextBufferedInQueue() {
  if (phraseQueue.length === 0) {
    isPlayingSequence = false;
    queueState.pendingInterruption = false;
    console.log('Buffered audio queue empty, playback sequence ended');
    return;
  }

  isPlayingSequence = true;
  const audioItem = phraseQueue.shift();

  // Check if this item uses buffering
  if (audioItem.useBuffering && audioItem.bufferedAudio) {
    playBufferedAudio(audioItem);
  } else {
    // Fall back to regular playback for non-buffered items
    const audioBlob = audioItem.blob || audioItem;
    const metadata = audioItem.metadata || {
      isWaitingPhrase: false,
      originalText: '',
      language: get(selectedLanguage),
      priority: 1,
      timestamp: Date.now()
    };

    playRegularAudio(audioBlob, metadata);
  }
}

/**
 * Play buffered audio using AudioBufferManager
 * @param {Object} audioItem - Audio item with buffered data
 */
async function playBufferedAudio(audioItem) {
  try {
    const { bufferedAudio, metadata } = audioItem;

    console.log(
      `Playing buffered ${metadata.isWaitingPhrase ? 'waiting phrase' : 'response'}: "${metadata.originalText.substring(0, 30)}..."`
    );

    // Clear pending interruption if we're playing a response
    if (!metadata.isWaitingPhrase) {
      queueState.pendingInterruption = false;
    }

    // Set speaking state with smooth transition
    if (!get(isSpeaking)) {
      manageAudioStateTransition('speaking_start', metadata);
      // Start interruption detection when we start speaking
      startInterruptionDetection();
    }

    // Update currently playing metadata and waiting phrase status
    currentlyPlayingMetadata = metadata;
    waitingPhraseActive = metadata.isWaitingPhrase;

    // Play the buffered audio
    const audioSource = await audioBufferManager.playWithSmoothing(bufferedAudio, {
      volume: 1.0,
      onEnded: () => {
        console.log(
          `Finished playing buffered ${metadata.isWaitingPhrase ? 'waiting phrase' : 'response'}`
        );

        // Clear currently playing metadata
        currentlyPlayingMetadata = null;
        waitingPhraseActive = false;

        // If there are more phrases in the queue, play the next one
        if (phraseQueue.length > 0) {
          playNextBufferedInQueue();
        } else {
          // Immediately stop speaking when audio ends to prevent mouth movement lag
          console.log(
            'Buffered audio playback sequence completed - immediately stopping mouth animation'
          );
          manageAudioStateTransition('speaking_stop');
          isPlayingSequence = false;
          // Stop interruption detection when we stop speaking
          stopInterruptionDetection();

          // Force avatar mouth closure through state manager
          if (typeof avatarStateManager !== 'undefined' && avatarStateManager.transitionToState) {
            avatarStateManager.transitionToState(
              {
                speaking: false,
                currentState: 'idle',
                mouthPosition: null
              },
              { priority: 'immediate', force: true }
            );
          }
        }
      }
    });

    // Connect to analyzer for lip-sync if available
    if (audioContext && audioAnalyser && audioSource) {
      try {
        audioSource.connect(audioAnalyser);
        analyzeAudio();
        console.log('Connected buffered audio to analyzer');
      } catch (error) {
        console.log('Could not connect buffered audio to analyzer:', error.message);
      }
    }
  } catch (error) {
    console.error('Error playing buffered audio:', error);

    // Fall back to regular audio playback
    const audioBlob = audioItem.blob || audioItem.bufferedAudio.originalBlob;
    const metadata = audioItem.metadata;
    playRegularAudio(audioBlob, metadata);
  }
}

/**
 * Play regular audio (fallback method)
 * @param {Blob} audioBlob - Audio blob
 * @param {Object} metadata - Audio metadata
 */
function playRegularAudio(audioBlob, metadata) {
  console.log('Playing regular audio as fallback');

  const audioUrl = URL.createObjectURL(audioBlob);

  // Set speaking state immediately
  if (!get(isSpeaking)) {
    isSpeaking.set(true);
    audioAmplitude.set(0.15);
  }

  audioPlayer.src = audioUrl;
  audioPlayer.load();

  // Update metadata
  currentlyPlayingMetadata = metadata;
  waitingPhraseActive = metadata.isWaitingPhrase;

  // Set up event handlers
  audioPlayer.onplay = () => {
    console.log(
      `Started playing regular ${metadata.isWaitingPhrase ? 'waiting phrase' : 'response'}`
    );
    if (audioContext && audioAnalyser) {
      analyzeAudio();
    }
  };

  audioPlayer.onended = () => {
    console.log(
      `Finished playing regular ${metadata.isWaitingPhrase ? 'waiting phrase' : 'response'}`
    );

    currentlyPlayingMetadata = null;
    waitingPhraseActive = false;

    if (phraseQueue.length > 0) {
      playNextBufferedInQueue();
    } else {
      // Immediately stop speaking when audio ends to prevent mouth movement lag
      console.log('Regular audio playback completed - immediately stopping mouth animation');
      isSpeaking.set(false);
      audioAmplitude.set(0);
      isPlayingSequence = false;

      // Force avatar mouth closure through state manager
      if (typeof avatarStateManager !== 'undefined' && avatarStateManager.transitionToState) {
        avatarStateManager.transitionToState(
          {
            speaking: false,
            currentState: 'idle',
            mouthPosition: null
          },
          { priority: 'immediate', force: true }
        );
      }
    }

    URL.revokeObjectURL(audioUrl);
  };

  // Start playback
  const playPromise = audioPlayer.play();
  if (playPromise !== undefined) {
    playPromise.catch((error) => {
      console.error('Regular audio playback error:', error);
      isSpeaking.set(false);
      isPlayingSequence = false;
    });
  }
}

/**
 * Handle audio transition for buffered audio
 */
function handleBufferedAudioTransition() {
  try {
    console.log('Handling buffered audio transition');

    // Determine transition type
    const nextAudio = phraseQueue.length > 0 ? phraseQueue[0] : null;
    const transitionType = nextAudio?.metadata?.isWaitingPhrase
      ? 'transition_to_waiting'
      : 'transition_to_response';

    // Use enhanced transition management
    manageAudioStateTransition(transitionType, nextAudio?.metadata);

    // If we have a currently playing audio, fade it out smoothly
    if (currentlyPlayingMetadata && currentlyPlayingMetadata.id) {
      audioBufferManager.stopWithFadeOut(currentlyPlayingMetadata.id, 75); // Quicker fade
    }
  } catch (error) {
    console.error('Error handling buffered audio transition:', error);
    queueState.transitionInProgress = false;
  }
}

/**
 * Handle voice interruption events
 * @param {Object} interruptionEvent - Interruption event from detector
 */
async function handleVoiceInterruption(interruptionEvent) {
  try {
    console.log('Voice interruption detected:', interruptionEvent);

    // Check if we should handle this interruption
    if (!get(isVoiceModeActive) || !get(isSpeaking)) {
      console.log('Ignoring interruption - not in active voice mode or not speaking');
      return;
    }

    // Handle interruption in queue immediately
    handleInterruptionInQueue();

    // Start conversation flow tracking if not already active
    if (!conversationFlowManager.getCurrentResponse() && currentlyPlayingMetadata) {
      conversationFlowManager.startResponse({
        text: currentlyPlayingMetadata.originalText || '',
        language: currentlyPlayingMetadata.language || get(selectedLanguage),
        type: currentlyPlayingMetadata.isWaitingPhrase ? 'waiting_phrase' : 'main_response',
        isInterruptible: true
      });
    }

    // Handle the interruption through the conversation flow manager
    const interruptionResult = await conversationFlowManager.handleInterruption(interruptionEvent);

    if (interruptionResult.handled) {
      // Process the interruption through the event handler
      await interruptionEventHandler.handleInterruption(interruptionEvent);

      // Stop current audio playback
      await stopCurrentAudioForInterruption();

      // Generate and play interruption response
      if (interruptionResult.interruptionResponse) {
        await playInterruptionResponse(interruptionResult.interruptionResponse);
      }

      // Store interruption ID for tracking
      queueState.lastInterruptionId = interruptionEvent.timestamp;
    }
  } catch (error) {
    console.error('Error handling voice interruption:', error);

    // Handle error through voice error handler
    const errorContext = {
      function: 'handleVoiceInterruption',
      interruptionEvent: interruptionEvent,
      voiceState: {
        isVoiceModeActive: get(isVoiceModeActive),
        isSpeaking: get(isSpeaking)
      }
    };

    voiceErrorHandler.handleError(error, errorContext).catch((recoveryError) => {
      console.error('Error recovery failed:', recoveryError);
    });

    // Reset interruption state on error
    resetInterruptionState();
  }
}

/**
 * Stop current audio for interruption
 */
async function stopCurrentAudioForInterruption() {
  try {
    console.log('Stopping current audio for interruption');

    // Stop buffered audio if using AudioBufferManager
    if (
      currentlyPlayingMetadata &&
      currentlyPlayingMetadata.id &&
      audioBufferManager.isInitialized
    ) {
      audioBufferManager.stopWithFadeOut(currentlyPlayingMetadata.id, 50); // Quick fade for interruption
    }

    // Stop regular audio player
    if (audioPlayer && !audioPlayer.paused) {
      audioPlayer.pause();
    }

    // Clear audio queue
    clearAudioQueue();

    // Update speaking state
    manageAudioStateTransition('speaking_stop');

    // Reset playback state
    isPlayingSequence = false;
    waitingPhraseActive = false;
    currentlyPlayingMetadata = null;
  } catch (error) {
    console.error('Error stopping audio for interruption:', error);
  }
}

/**
 * Play interruption response
 * @param {Object} interruptionResponse - Response to play
 */
async function playInterruptionResponse(interruptionResponse) {
  try {
    console.log('Playing interruption response:', interruptionResponse);

    // Synthesize and play the interruption response
    await synthesizeSpeech(interruptionResponse.text, {
      isWaitingPhrase: false,
      language: interruptionResponse.language,
      priority: 1, // High priority
      isInterruptionResponse: true
    });
  } catch (error) {
    console.error('Error playing interruption response:', error);
  }
}

/**
 * Start interruption detection when bot starts speaking
 */
function startInterruptionDetection() {
  if (interruptionDetector && get(isVoiceModeActive)) {
    interruptionDetector.startListening();
    console.log('Interruption detection started');
  }
}

/**
 * Stop interruption detection when bot stops speaking
 */
function stopInterruptionDetection() {
  if (interruptionDetector) {
    interruptionDetector.stopListening();
    console.log('Interruption detection stopped');
  }
}
