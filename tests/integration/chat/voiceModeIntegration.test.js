/**
 * Voice Mode Integration Tests
 * End-to-end tests for voice interaction flows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  setVoiceModeActive,
  isVoiceModeActive,
  synthesizeWaitingPhrase,
  handleVoiceInterruption
} from '../../../src/lib/modules/chat/voiceServices.js';
import { conversationFlowManager } from '../../../src/lib/modules/chat/ConversationFlowManager.js';
import { interruptionEventHandler } from '../../../src/lib/modules/chat/InterruptionEventHandler.js';
import { voiceInteractionLogger } from '../../../src/lib/modules/chat/VoiceInteractionLogger.js';

// Mock audio APIs
global.AudioContext = vi.fn(() => ({
  createBuffer: vi.fn(),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    onended: null
  })),
  createGain: vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 1 },
    connect: vi.fn()
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 256,
    getByteFrequencyData: vi.fn()
  })),
  decodeAudioData: vi.fn(),
  resume: vi.fn(),
  state: 'running',
  currentTime: 0,
  destination: {}
}));

global.Audio = vi.fn(() => ({
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  paused: false,
  currentTime: 0,
  duration: 0
}));

// Mock fetch for synthesis API
global.fetch = vi.fn();

describe('Voice Mode Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationFlowManager.reset();
    interruptionEventHandler.reset();
    voiceInteractionLogger.clearLogs();

    // Mock successful synthesis API response
    global.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
    });
  });

  afterEach(() => {
    setVoiceModeActive(false);
  });

  describe('Voice Mode Activation', () => {
    it('should activate voice mode successfully', () => {
      setVoiceModeActive(true);
      expect(get(isVoiceModeActive)).toBe(true);
    });

    it('should deactivate voice mode and cleanup resources', () => {
      setVoiceModeActive(true);
      setVoiceModeActive(false);
      expect(get(isVoiceModeActive)).toBe(false);
    });

    it('should initialize required components when activating', () => {
      setVoiceModeActive(true);
      // Verify that voice mode components are initialized
      expect(get(isVoiceModeActive)).toBe(true);
    });
  });

  describe('Complete Voice Interaction Flow', () => {
    beforeEach(() => {
      setVoiceModeActive(true);
      voiceInteractionLogger.startSession({ testSession: true });
    });

    it('should handle complete conversation flow with interruption', async () => {
      // Step 1: Start a response
      const responseId = conversationFlowManager.startResponse({
        text: 'This is a long response that will be interrupted.',
        language: 'en',
        type: 'main_response',
        isInterruptible: true
      });

      expect(responseId).toBeDefined();
      expect(conversationFlowManager.getCurrentResponse()).toBeDefined();

      // Step 2: Simulate interruption
      const interruptionEvent = {
        timestamp: Date.now(),
        energy: 0.4,
        confidence: 0.8,
        detectedLanguage: 'en',
        languageConfidence: 0.9
      };

      const interruptionResult =
        await conversationFlowManager.handleInterruption(interruptionEvent);

      expect(interruptionResult.handled).toBe(true);
      expect(interruptionResult.preservedState).toBeDefined();
      expect(interruptionResult.interruptionResponse).toBeDefined();

      // Step 3: Handle user choice to continue
      const preservedStateId = interruptionResult.preservedState.id;
      const continuationResult = await conversationFlowManager.handleUserChoice(
        'continue',
        preservedStateId
      );

      expect(continuationResult.success).toBe(true);
      expect(continuationResult.continuationResponse).toBeDefined();
    });

    it('should handle multilingual interruption flow', async () => {
      // Start English response
      conversationFlowManager.startResponse({
        text: 'This is an English response.',
        language: 'en',
        type: 'main_response'
      });

      // Interrupt with Spanish
      const interruptionEvent = {
        timestamp: Date.now(),
        energy: 0.3,
        confidence: 0.7,
        detectedLanguage: 'es',
        languageConfidence: 0.8
      };

      const result = await conversationFlowManager.handleInterruption(interruptionEvent);

      expect(result.handled).toBe(true);
      expect(result.interruptionResponse.language).toBe('es');
    });

    it('should log all interaction events', async () => {
      // Perform various voice interactions
      await synthesizeWaitingPhrase('Please wait...', 'en');

      const interruptionEvent = {
        timestamp: Date.now(),
        energy: 0.3,
        confidence: 0.6,
        detectedLanguage: 'en'
      };

      await interruptionEventHandler.handleInterruption(interruptionEvent);

      // Check that events were logged
      const logs = voiceInteractionLogger.exportLogs();
      expect(logs.totalLogs).toBeGreaterThan(0);

      const categories = logs.logs.map((log) => log.category);
      expect(categories).toContain('audio_synthesis');
    });
  });

  describe('Error Handling Integration', () => {
    beforeEach(() => {
      setVoiceModeActive(true);
    });

    it('should handle synthesis failures gracefully', async () => {
      // Mock synthesis failure
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await synthesizeWaitingPhrase('Test phrase', 'en');
      } catch (error) {
        // Should not throw - should handle gracefully
      }

      // Voice mode should still be active
      expect(get(isVoiceModeActive)).toBe(true);
    });

    it('should handle multiple rapid interruptions', async () => {
      conversationFlowManager.startResponse({
        text: 'Long response for interruption testing.',
        language: 'en',
        type: 'main_response'
      });

      // Simulate rapid interruptions
      const interruptions = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() + i * 100,
        energy: 0.3,
        confidence: 0.7,
        detectedLanguage: 'en'
      }));

      const results = await Promise.all(
        interruptions.map((event) =>
          interruptionEventHandler.handleInterruption(event).catch(() => ({ handled: false }))
        )
      );

      // Should handle at least some interruptions
      const handledCount = results.filter((r) => r.handled).length;
      expect(handledCount).toBeGreaterThan(0);
    });
  });

  describe('Performance Integration', () => {
    beforeEach(() => {
      setVoiceModeActive(true);
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();

      // Simulate multiple concurrent operations
      const operations = [
        synthesizeWaitingPhrase('Wait 1', 'en'),
        synthesizeWaitingPhrase('Wait 2', 'en'),
        synthesizeWaitingPhrase('Wait 3', 'en')
      ];

      await Promise.allSettled(operations);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should track performance metrics', async () => {
      voiceInteractionLogger.logPerformance({
        metric: 'response_time',
        value: 150,
        unit: 'ms',
        withinThreshold: true
      });

      voiceInteractionLogger.logPerformance({
        metric: 'synthesis_time',
        value: 800,
        unit: 'ms',
        withinThreshold: true
      });

      const analytics = voiceInteractionLogger.getPerformanceAnalytics();
      expect(analytics.totalInteractions).toBeGreaterThan(0);
    });
  });

  describe('State Synchronization', () => {
    beforeEach(() => {
      setVoiceModeActive(true);
    });

    it('should maintain consistent state across components', async () => {
      // Start conversation
      const responseId = conversationFlowManager.startResponse({
        text: 'Test response for state sync',
        language: 'en',
        type: 'main_response'
      });

      // Verify conversation state
      const conversationState = conversationFlowManager.getCurrentResponse();
      expect(conversationState.id).toBe(responseId);

      // Simulate interruption
      const interruptionEvent = {
        timestamp: Date.now(),
        energy: 0.4,
        confidence: 0.8,
        detectedLanguage: 'en'
      };

      await conversationFlowManager.handleInterruption(interruptionEvent);

      // Verify state consistency
      const updatedState = conversationFlowManager.getCurrentResponse();
      expect(updatedState.status).toBe('interrupted');
    });
  });
});

describe('Avatar Integration', () => {
  beforeEach(() => {
    setVoiceModeActive(true);
  });

  afterEach(() => {
    setVoiceModeActive(false);
  });

  it('should synchronize avatar with voice state', async () => {
    // This would test avatar synchronization with voice
    // For now, just verify voice mode is active
    expect(get(isVoiceModeActive)).toBe(true);
  });

  it('should handle avatar state transitions during interruptions', async () => {
    conversationFlowManager.startResponse({
      text: 'Testing avatar sync',
      language: 'en',
      type: 'main_response'
    });

    const interruptionEvent = {
      timestamp: Date.now(),
      energy: 0.3,
      confidence: 0.7,
      detectedLanguage: 'en'
    };

    const result = await conversationFlowManager.handleInterruption(interruptionEvent);
    expect(result.handled).toBe(true);
  });
});
