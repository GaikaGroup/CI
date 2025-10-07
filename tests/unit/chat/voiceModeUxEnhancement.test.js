/**
 * Voice Mode UX Enhancement Tests
 * Unit tests for audio processing components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioBufferManager } from '../../../src/lib/modules/chat/AudioBufferManager.js';
import { InterruptionDetector } from '../../../src/lib/modules/chat/InterruptionDetector.js';
import { LanguageDetector } from '../../../src/lib/modules/chat/LanguageDetector.js';
import { ConversationFlowManager } from '../../../src/lib/modules/chat/ConversationFlowManager.js';
import { AvatarStateManager } from '../../../src/lib/modules/chat/AvatarStateManager.js';

// Mock Web Audio API
const mockAudioContext = {
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  createAnalyser: vi.fn(),
  createMediaStreamSource: vi.fn(),
  decodeAudioData: vi.fn(),
  resume: vi.fn(),
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {}
};

const mockAudioBuffer = {
  duration: 2.5,
  sampleRate: 44100,
  numberOfChannels: 1,
  length: 110250,
  getChannelData: vi.fn(() => new Float32Array(110250))
};

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn()
  }
});

describe('AudioBufferManager', () => {
  let audioBufferManager;
  let mockBlob;

  beforeEach(() => {
    audioBufferManager = new AudioBufferManager();
    mockBlob = new Blob(['test audio data'], { type: 'audio/wav' });

    // Mock AudioContext methods
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    mockAudioContext.createBuffer.mockReturnValue(mockAudioBuffer);
    mockAudioContext.createBufferSource.mockReturnValue({
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      onended: null
    });
    mockAudioContext.createGain.mockReturnValue({
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 1 },
      connect: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(audioBufferManager.bufferSize).toBe(4096);
      expect(audioBufferManager.smoothingWindow).toBe(150);
      expect(audioBufferManager.isInitialized).toBe(false);
    });

    it('should initialize with audio context', async () => {
      await audioBufferManager.initialize(mockAudioContext);
      expect(audioBufferManager.isInitialized).toBe(true);
      expect(audioBufferManager.audioContext).toBe(mockAudioContext);
    });
  });

  describe('audio buffering', () => {
    beforeEach(async () => {
      await audioBufferManager.initialize(mockAudioContext);
    });

    it('should buffer audio successfully', async () => {
      const metadata = { id: 'test-audio', isWaitingPhrase: false };
      const result = await audioBufferManager.bufferAudio(mockBlob, metadata);

      expect(result.processingInfo.buffered).toBe(true);
      expect(result.metadata.duration).toBe(2.5);
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    });

    it('should handle buffering errors gracefully', async () => {
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode failed'));

      const metadata = { id: 'test-audio' };
      const result = await audioBufferManager.bufferAudio(mockBlob, metadata);

      expect(result.processingInfo.buffered).toBe(false);
      expect(result.metadata.error).toBeDefined();
    });
  });
});
descri;
be('InterruptionDetector', () => {
  let interruptionDetector;
  let mockMediaStream;

  beforeEach(() => {
    interruptionDetector = new InterruptionDetector();

    mockMediaStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    };

    navigator.mediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);

    mockAudioContext.createMediaStreamSource.mockReturnValue({
      connect: vi.fn()
    });

    mockAudioContext.createAnalyser.mockReturnValue({
      fftSize: 256,
      smoothingTimeConstant: 0.3,
      minDecibels: -90,
      maxDecibels: -10,
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default settings', () => {
      expect(interruptionDetector.isListening).toBe(false);
      expect(interruptionDetector.speechThreshold).toBe(0.1);
      expect(interruptionDetector.interruptionTimeout).toBe(500);
    });

    it('should initialize with audio context and media stream', async () => {
      await interruptionDetector.initialize(mockAudioContext);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      expect(interruptionDetector.audioContext).toBe(mockAudioContext);
    });
  });

  describe('voice activity detection', () => {
    beforeEach(async () => {
      await interruptionDetector.initialize(mockAudioContext);
    });

    it('should detect voice activity above threshold', () => {
      const energy = 0.2; // Above threshold
      interruptionDetector.vadBuffer = [0.2, 0.25, 0.22]; // Fill buffer

      const result = interruptionDetector.detectVoiceActivity(energy);
      expect(result).toBe(true);
    });

    it('should not detect voice activity below threshold', () => {
      const energy = 0.05; // Below threshold

      const result = interruptionDetector.detectVoiceActivity(energy);
      expect(result).toBe(false);
    });
  });

  describe('interruption callbacks', () => {
    it('should register and call interruption callbacks', async () => {
      const callback = vi.fn();
      interruptionDetector.onInterruption(callback);

      // Simulate interruption
      const mockEvent = {
        timestamp: Date.now(),
        energy: 0.3,
        confidence: 0.8
      };

      await interruptionDetector.triggerInterruption(0.3);

      expect(callback).toHaveBeenCalled();
    });
  });
});

describe('LanguageDetector', () => {
  let languageDetector;

  beforeEach(() => {
    languageDetector = new LanguageDetector();
  });

  describe('language detection from text', () => {
    it('should detect Russian from Cyrillic text', () => {
      const result = languageDetector.detectLanguageFromText('Привет мир');

      expect(result.language).toBe('ru');
      expect(result.confidence).toBe(0.9);
      expect(result.method).toBe('text_analysis');
    });

    it('should detect Spanish from Spanish text', () => {
      const result = languageDetector.detectLanguageFromText('Hola, ¿cómo estás?');

      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.8);
    });

    it('should default to English for Latin text', () => {
      const result = languageDetector.detectLanguageFromText('Hello world');

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.7);
    });

    it('should handle empty text gracefully', () => {
      const result = languageDetector.detectLanguageFromText('');

      expect(result.language).toBe('en'); // Fallback
      expect(result.method).toBe('fallback');
    });
  });

  describe('audio characteristics analysis', () => {
    it('should analyze audio characteristics for language detection', () => {
      const audioMetrics = {
        energy: 0.3,
        backgroundNoise: 0.02,
        vadThreshold: 0.15,
        energyHistory: [0.2, 0.25, 0.3, 0.28, 0.32]
      };

      const scores = languageDetector.analyzeAudioCharacteristics(audioMetrics);

      expect(scores).toHaveProperty('en');
      expect(scores).toHaveProperty('es');
      expect(scores).toHaveProperty('ru');
      expect(Object.values(scores).every((score) => score >= 0 && score <= 1)).toBe(true);
    });
  });
});

describe('ConversationFlowManager', () => {
  let conversationFlowManager;

  beforeEach(() => {
    conversationFlowManager = new ConversationFlowManager();
  });

  describe('response tracking', () => {
    it('should start tracking a response', () => {
      const response = {
        text: 'This is a test response.',
        language: 'en',
        type: 'main_response'
      };

      const responseId = conversationFlowManager.startResponse(response);

      expect(responseId).toMatch(/^resp_\d+_[a-z0-9]+$/);
      expect(conversationFlowManager.currentResponse).toBeDefined();
      expect(conversationFlowManager.currentResponse.text).toBe(response.text);
    });

    it('should segment response text properly', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const segments = conversationFlowManager.segmentResponse(text);

      expect(segments).toHaveLength(3);
      expect(segments[0]).toBe('First sentence.');
      expect(segments[1]).toBe('Second sentence!');
      expect(segments[2]).toBe('Third sentence?');
    });

    it('should estimate response duration', () => {
      const text = 'This is a test response with multiple words.';
      const duration = conversationFlowManager.estimateResponseDuration(text);

      expect(duration).toBeGreaterThan(1000); // At least 1 second
      expect(typeof duration).toBe('number');
    });
  });

  describe('interruption handling', () => {
    it('should handle interruption and preserve state', async () => {
      // Start a response
      const response = {
        text: 'This is a long response that can be interrupted.',
        language: 'en',
        type: 'main_response'
      };
      conversationFlowManager.startResponse(response);

      // Simulate interruption
      const interruptionEvent = {
        timestamp: Date.now(),
        confidence: 0.8,
        detectedLanguage: 'en'
      };

      const result = await conversationFlowManager.handleInterruption(interruptionEvent);

      expect(result.handled).toBe(true);
      expect(result.preservedState).toBeDefined();
      expect(result.interruptionResponse).toBeDefined();
    });
  });
});

describe('AvatarStateManager', () => {
  let avatarStateManager;

  beforeEach(() => {
    avatarStateManager = new AvatarStateManager();
  });

  describe('state transitions', () => {
    it('should transition to new state', async () => {
      const newState = {
        currentState: 'speaking',
        emotion: 'happy',
        speaking: true
      };

      await avatarStateManager.transitionToState(newState);

      const currentState = avatarStateManager.getCurrentState();
      expect(currentState.currentState).toBe('speaking');
      expect(currentState.emotion).toBe('happy');
      expect(currentState.speaking).toBe(true);
    });

    it('should validate state properties', () => {
      const invalidState = {
        currentState: 'invalid_state',
        emotion: 'invalid_emotion'
      };

      const validatedState = avatarStateManager.validateState(invalidState);
      expect(validatedState).toBeNull();
    });

    it('should calculate appropriate transition duration', () => {
      const targetState = {
        emotion: 'happy',
        speaking: true,
        currentState: 'speaking'
      };

      const duration = avatarStateManager.calculateTransitionDuration(targetState);
      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });
  });

  describe('state history', () => {
    it('should maintain state history', async () => {
      const state1 = { currentState: 'idle', emotion: 'neutral' };
      const state2 = { currentState: 'speaking', emotion: 'happy' };

      await avatarStateManager.transitionToState(state1);
      await avatarStateManager.transitionToState(state2);

      const history = avatarStateManager.getStateHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });
});
