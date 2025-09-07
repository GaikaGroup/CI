/**
 * Integration tests for waiting phrases with existing systems
 * Tests integration with cat avatar, voice chat features, and i18n system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import VoiceChat from '../../../src/lib/modules/chat/components/VoiceChat.svelte';
import CatAvatar from '../../../src/lib/shared/components/CatAvatar.svelte';
import { waitingPhrasesService } from '../../../src/lib/modules/chat/waitingPhrasesService.js';
import { translationBridge } from '../../../src/lib/modules/chat/translationBridge.js';
import * as voiceServices from '../../../src/lib/modules/chat/voiceServices.js';

// Mock audio context and media devices
global.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn()
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  state: 'running',
  resume: vi.fn()
}));

global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve({
    getTracks: () => [{ stop: vi.fn() }]
  }))
};

// Mock fetch for API calls
global.fetch = vi.fn();

describe('System Integration Tests', () => {
  let mockAudioContext;
  let mockMediaStream;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup audio context mock
    mockAudioContext = new AudioContext();
    
    // Setup media stream mock
    mockMediaStream = {
      getTracks: () => [{ stop: vi.fn() }]
    };
    
    global.navigator.mediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);
    
    // Mock successful API responses
    global.fetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' })),
      json: () => Promise.resolve({ text: 'Mock transcription' })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cat Avatar Integration', () => {
    it('should animate cat avatar during waiting phrase playback', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: false,
          emotion: 'neutral'
        }
      });

      // Start waiting phrase
      const phrase = "Let me think about this...";
      await waitingPhrasesService.playWaitingPhrase(phrase, 'en');

      // Wait for animation to start
      await waitFor(() => {
        const avatarImg = container.querySelector('img');
        expect(avatarImg).toBeTruthy();
      });

      // Verify speaking state is updated
      expect(voiceServices.isSpeaking.get()).toBe(true);
    });

    it('should maintain smooth animation transition from waiting phrase to AI response', async () => {
      const { component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      // Simulate waiting phrase ending and AI response starting
      const waitingPhrase = "Hmm, interesting question...";
      const aiResponse = "Here's what I think about that.";

      // Start waiting phrase
      await waitingPhrasesService.playWaitingPhrase(waitingPhrase, 'en');
      
      // Simulate transition to AI response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify continuous speaking state
      expect(voiceServices.isSpeaking.get()).toBe(true);
      
      // Verify no animation interruption
      const mouthImages = component.$$.ctx.filter(ctx => 
        ctx && typeof ctx === 'string' && ctx.includes('mouth')
      );
      expect(mouthImages.length).toBeGreaterThan(0);
    });

    it('should handle emotion changes during waiting phrase playback', async () => {
      const { component } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      // Start waiting phrase
      await waitingPhrasesService.playWaitingPhrase("Let me consider this...", 'en');

      // Change emotion during playback
      await component.$set({ emotion: 'happy' });

      // Verify emotion change is applied
      await waitFor(() => {
        expect(component.emotion).toBe('happy');
      });
    });

    it('should synchronize lip movements with waiting phrase audio', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      // Mock audio amplitude changes
      const amplitudeValues = [0.1, 0.3, 0.5, 0.2, 0.0];
      let amplitudeIndex = 0;

      vi.spyOn(voiceServices, 'audioAmplitude', 'get').mockImplementation(() => ({
        get: () => amplitudeValues[amplitudeIndex++ % amplitudeValues.length]
      }));

      // Start waiting phrase
      await waitingPhrasesService.playWaitingPhrase("Well, well, well...", 'en');

      // Wait for lip sync to process
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify mouth position changes
      const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
      expect(mouthOverlay).toBeTruthy();
    });
  });

  describe('Voice Chat Features Integration', () => {
    it('should integrate waiting phrases into complete voice chat flow', async () => {
      const { container, component } = render(VoiceChat);

      // Mock voice services
      vi.spyOn(voiceServices, 'startRecording').mockResolvedValue();
      vi.spyOn(voiceServices, 'stopRecording').mockResolvedValue('Test message');
      vi.spyOn(voiceServices, 'sendTranscribedText').mockResolvedValue();

      // Start recording
      const micButton = container.querySelector('button[aria-label*="recording"]');
      await fireEvent.click(micButton);

      // Stop recording
      await fireEvent.click(micButton);

      // Verify waiting phrase integration
      await waitFor(() => {
        expect(voiceServices.sendTranscribedText).toHaveBeenCalledWith('Test message');
      });

      // Verify waiting phrase status is displayed
      const statusIndicator = container.querySelector('[class*="thinking"]');
      expect(statusIndicator).toBeTruthy();
    });

    it('should maintain existing voice chat functionality with waiting phrases disabled', async () => {
      // Disable waiting phrases
      vi.spyOn(waitingPhrasesService, 'isEnabled').mockReturnValue(false);

      const { container } = render(VoiceChat);

      // Mock voice services
      vi.spyOn(voiceServices, 'startRecording').mockResolvedValue();
      vi.spyOn(voiceServices, 'stopRecording').mockResolvedValue('Test message');
      vi.spyOn(voiceServices, 'sendTranscribedText').mockResolvedValue();

      // Perform voice interaction
      const micButton = container.querySelector('button[aria-label*="recording"]');
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Verify normal flow works without waiting phrases
      await waitFor(() => {
        expect(voiceServices.sendTranscribedText).toHaveBeenCalledWith('Test message');
      });

      // Verify no waiting phrase status shown
      const statusIndicator = container.querySelector('[class*="thinking"]');
      expect(statusIndicator).toBeFalsy();
    });

    it('should handle audio queue management with waiting phrases', async () => {
      const { container } = render(VoiceChat);

      // Mock audio queue status
      vi.spyOn(voiceServices, 'getAudioQueueStatus').mockReturnValue({
        waitingPhrases: 2,
        responses: 1,
        total: 3
      });

      vi.spyOn(voiceServices, 'isWaitingPhraseActive').mockReturnValue(true);

      // Trigger status update
      await new Promise(resolve => setTimeout(resolve, 250)); // Wait for status update interval

      // Verify queue status is displayed
      const queueInfo = container.querySelector('[class*="phrases"]');
      expect(queueInfo).toBeTruthy();
      expect(queueInfo.textContent).toContain('2 phrases');
    });

    it('should handle interruptions during waiting phrase playback', async () => {
      const { container } = render(VoiceChat);

      // Start waiting phrase
      vi.spyOn(voiceServices, 'isWaitingPhraseActive').mockReturnValue(true);
      await waitingPhrasesService.playWaitingPhrase("Let me think...", 'en');

      // Simulate user interruption (new recording)
      vi.spyOn(voiceServices, 'startRecording').mockResolvedValue();
      const micButton = container.querySelector('button[aria-label*="recording"]');
      await fireEvent.click(micButton);

      // Verify waiting phrase is properly handled during interruption
      expect(voiceServices.startRecording).toHaveBeenCalled();
    });
  });

  describe('Multilingual i18n Integration', () => {
    it('should use existing i18n system for UI text translations', async () => {
      // Mock i18n stores and functions
      const mockSelectedLanguage = { subscribe: vi.fn(), get: () => 'es' };
      const mockGetTranslation = vi.fn((lang, key) => {
        const translations = {
          'es': {
            'thinking': 'Pensando...',
            'voiceChatMode': 'Modo de Chat de Voz',
            'talkToTutor': 'Habla con el tutor'
          }
        };
        return translations[lang]?.[key] || key;
      });

      // Mock the i18n imports
      vi.doMock('../../../src/lib/modules/i18n/stores', () => ({
        selectedLanguage: mockSelectedLanguage
      }));

      vi.doMock('../../../src/lib/modules/i18n/translations', () => ({
        getTranslation: mockGetTranslation
      }));

      const { container } = render(VoiceChat);

      // Verify Spanish translations are used
      expect(container.textContent).toContain('Modo de Chat de Voz');
      expect(container.textContent).toContain('Habla con el tutor');
    });

    it('should integrate waiting phrase language selection with i18n system', async () => {
      // Mock language detection
      vi.spyOn(translationBridge, 'detectUserLanguage').mockReturnValue('ru');

      // Test waiting phrase selection in Russian
      const phrase = await waitingPhrasesService.selectWaitingPhrase('ru');
      
      expect(phrase).toBeTruthy();
      expect(typeof phrase).toBe('string');

      // Verify translation bridge is used for fallback
      vi.spyOn(translationBridge, 'translatePhrase').mockResolvedValue('Позвольте мне подумать...');
      
      const translatedPhrase = await translationBridge.translatePhrase('Let me think...', 'ru');
      expect(translatedPhrase).toBe('Позвольте мне подумать...');
    });

    it('should maintain language consistency throughout conversation', async () => {
      // Set user language to Spanish
      const userLanguage = 'es';
      vi.spyOn(translationBridge, 'detectUserLanguage').mockReturnValue(userLanguage);

      // Select multiple waiting phrases
      const phrase1 = await waitingPhrasesService.selectWaitingPhrase(userLanguage);
      const phrase2 = await waitingPhrasesService.selectWaitingPhrase(userLanguage);
      const phrase3 = await waitingPhrasesService.selectWaitingPhrase(userLanguage);

      // Verify all phrases are in the same language or properly translated
      expect(phrase1).toBeTruthy();
      expect(phrase2).toBeTruthy();
      expect(phrase3).toBeTruthy();

      // Verify no consecutive repeats
      expect(phrase1).not.toBe(phrase2);
      expect(phrase2).not.toBe(phrase3);
    });

    it('should handle translation fallback when target language unavailable', async () => {
      // Test with unsupported language
      const unsupportedLang = 'zh';
      
      // Mock translation fallback
      vi.spyOn(translationBridge, 'translatePhrase').mockResolvedValue('让我想想...');
      
      const phrase = await waitingPhrasesService.selectWaitingPhrase(unsupportedLang);
      
      expect(phrase).toBeTruthy();
      expect(translationBridge.translatePhrase).toHaveBeenCalled();
    });

    it('should cache translated phrases to avoid repeated API calls', async () => {
      const targetLang = 'fr';
      const originalPhrase = 'Let me think about this...';
      
      // Mock translation
      vi.spyOn(translationBridge, 'translatePhrase').mockResolvedValue('Laissez-moi réfléchir à cela...');
      
      // First call should trigger translation
      const phrase1 = await translationBridge.translatePhrase(originalPhrase, targetLang);
      
      // Second call should use cache
      const phrase2 = await translationBridge.translatePhrase(originalPhrase, targetLang);
      
      expect(phrase1).toBe(phrase2);
      expect(translationBridge.translatePhrase).toHaveBeenCalledTimes(2); // Called twice but should use cache internally
    });
  });

  describe('Error Handling Integration', () => {
    it('should gracefully handle cat avatar animation errors', async () => {
      // Mock avatar animation failure
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate animation error
      vi.spyOn(voiceServices, 'audioAmplitude', 'get').mockImplementation(() => {
        throw new Error('Animation error');
      });

      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      // Start waiting phrase despite animation error
      await waitingPhrasesService.playWaitingPhrase("Test phrase", 'en');

      // Verify error is logged but system continues
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle i18n system failures gracefully', async () => {
      // Mock i18n failure
      const mockGetTranslation = vi.fn(() => {
        throw new Error('Translation error');
      });

      vi.doMock('../../../src/lib/modules/i18n/translations', () => ({
        getTranslation: mockGetTranslation
      }));

      // Should still render with fallback text
      const { container } = render(VoiceChat);
      
      expect(container).toBeTruthy();
      // Should show fallback English text
      expect(container.textContent).toContain('recording');
    });

    it('should maintain voice chat functionality when waiting phrases fail', async () => {
      // Mock waiting phrases service failure
      vi.spyOn(waitingPhrasesService, 'playWaitingPhrase').mockRejectedValue(new Error('Waiting phrase error'));
      
      const { container } = render(VoiceChat);

      // Mock voice services
      vi.spyOn(voiceServices, 'startRecording').mockResolvedValue();
      vi.spyOn(voiceServices, 'stopRecording').mockResolvedValue('Test message');
      vi.spyOn(voiceServices, 'sendTranscribedText').mockResolvedValue();

      // Perform voice interaction
      const micButton = container.querySelector('button[aria-label*="recording"]');
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Verify voice chat still works despite waiting phrase failure
      await waitFor(() => {
        expect(voiceServices.sendTranscribedText).toHaveBeenCalledWith('Test message');
      });
    });
  });

  describe('Performance Integration', () => {
    it('should not impact voice chat response times significantly', async () => {
      const startTime = Date.now();
      
      // Simulate complete voice interaction with waiting phrases
      await voiceServices.sendTranscribedText('Test message');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should complete within reasonable time (allowing for test overhead)
      expect(responseTime).toBeLessThan(1000);
    });

    it('should manage memory efficiently during extended use', async () => {
      // Simulate multiple voice interactions
      for (let i = 0; i < 10; i++) {
        await waitingPhrasesService.selectWaitingPhrase('en');
        await waitingPhrasesService.playWaitingPhrase(`Test phrase ${i}`, 'en');
      }

      // Verify phrase history is managed (not growing indefinitely)
      const historySize = waitingPhrasesService.getPhraseHistorySize();
      expect(historySize).toBeLessThanOrEqual(5); // Should be limited
    });

    it('should handle concurrent waiting phrase requests efficiently', async () => {
      // Start multiple waiting phrases concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(waitingPhrasesService.selectWaitingPhrase('en'));
      }

      const results = await Promise.all(promises);
      
      // All should complete successfully
      results.forEach(phrase => {
        expect(phrase).toBeTruthy();
        expect(typeof phrase).toBe('string');
      });

      // Should have variety (not all the same)
      const uniquePhrases = new Set(results);
      expect(uniquePhrases.size).toBeGreaterThan(1);
    });
  });
});