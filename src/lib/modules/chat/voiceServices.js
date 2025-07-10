// Voice Chat Services
import { get } from 'svelte/store';
import { writable } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { setLoading, setError } from '$lib/stores/app';
import { addMessage } from './stores';

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

// Phrase queue system
let phraseQueue = [];
let isPlayingSequence = false;

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
 * @returns {Promise<string>} - AI response
 */
export async function sendTranscribedText(transcription) {
  try {
    setLoading(true);

    // Add the transcription as a user message
    addMessage('user', transcription);

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

    // Add the AI's response to the chat
    addMessage('tutor', data.response);

    // Determine emotion from the response
    determineEmotion(data.response);

    // Synthesize speech from the response
    await synthesizeSpeech(data.response);

    return data.response;
  } catch (error) {
    console.error('Error processing voice data:', error);
    setError('Failed to process voice data. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
}

/**
 * Synthesize speech from text using TTS API
 * @param {string} text - Text to synthesize
 * @returns {Promise<void>}
 */
async function synthesizeSpeech(text) {
  try {
    setLoading(true);

    const response = await fetch('/api/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language: get(selectedLanguage)
      })
    });

    if (!response.ok) {
      throw new Error('Failed to synthesize speech');
    }

    const audioBlob = await response.blob();
    playAudio(audioBlob);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    setError('Failed to synthesize speech. Please try again.');
  } finally {
    setLoading(false);
  }
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
 * Play audio from blob with optimized lip sync
 * @param {Blob} audioBlob - Audio blob to play
 */
function playAudio(audioBlob) {
  // Add to phrase queue
  phraseQueue.push(audioBlob);

  // If not already playing a sequence, start one
  if (!isPlayingSequence) {
    playNextInQueue();
  }
}

/**
 * Play the next audio blob in the queue with improved synchronization
 */
function playNextInQueue() {
  if (phraseQueue.length === 0) {
    isPlayingSequence = false;
    return;
  }

  isPlayingSequence = true;
  const audioBlob = phraseQueue.shift();
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
    // Connect audio player to analyzer if not already connected
    if (audioContext && audioAnalyser && audioPlayer) {
      try {
        const source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        console.log('Connected audio player to analyzer');

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
    // If there are more phrases in the queue, play the next one
    if (phraseQueue.length > 0) {
      // Keep speaking state true between phrases
      playNextInQueue();
    } else {
      // Add a delay before setting speaking to false
      setTimeout(() => {
        if (audioPlayer.paused && phraseQueue.length === 0) {
          isSpeaking.set(false);
          audioAmplitude.set(0);
          isPlayingSequence = false;
        }
      }, 300);
    }

    URL.revokeObjectURL(audioUrl);
  };
}
