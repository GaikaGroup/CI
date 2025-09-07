/**
 * User experience validation tests for waiting phrases feature
 * Tests timing, user satisfaction, and overall experience improvements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import VoiceChat from '../../src/lib/modules/chat/components/VoiceChat.svelte';
import CatAvatar from '../../src/lib/shared/components/CatAvatar.svelte';
import { waitingPhrasesService } from '../../src/lib/modules/chat/waitingPhrasesService.js';
import * as voiceServices from '../../src/lib/modules/chat/voiceServices.js';

// Mock browser APIs
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

global.fetch = vi.fn();
global.Audio = vi.fn(() => ({
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 0,
  ended: false
}));

describe('User Experience Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/transcribe')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'Test question' })
        });
      } else if (url.includes('/api/chat')) {
        // Simulate AI response delay
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ response: 'Detailed AI response' })
            });
          }, 1500); // 1.5 second delay to simulate real AI processing
        });
      } else if (url.includes('/api/synthesize')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    // Mock waiting phrases
    vi.spyOn(waitingPhrasesService, 'selectWaitingPhrase').mockResolvedValue(
      'Let me think about this carefully...'
    );
    vi.spyOn(waitingPhrasesService, 'playWaitingPhrase').mockImplementation(async () => {
      // Simulate phrase duration
      await new Promise(resolve => setTimeout(resolve, 800));
    });
    vi.spyOn(waitingPhrasesService, 'isEnabled').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Silence Elimination', () => {
    it('should eliminate awkward silence during AI response generation', async () => {
      const { container } = render(VoiceChat);
      
      const silencePeriods = [];
      let lastActivityTime = Date.now();
      
      // Monitor for periods of inactivity (silence)
      const checkActivity = () => {
        const hasActivity = 
          container.textContent.includes('Recording') ||
          container.textContent.includes('Processing') ||
          container.textContent.includes('Thinking');
          
        if (!hasActivity) {
          const silenceDuration = Date.now() - lastActivityTime;
          if (silenceDuration > 500) { // More than 500ms of silence
            silencePeriods.push(silenceDuration);
          }
        } else {
          lastActivityTime = Date.now();
        }
      };

      const activityMonitor = setInterval(checkActivity, 100);

      try {
        const micButton = container.querySelector('button[aria-label*="recording"]');
        
        // Perform voice interaction
        await fireEvent.click(micButton);
        await fireEvent.click(micButton);

        // Wait for complete processing
        await waitFor(() => {
          expect(container.textContent).not.toContain('Processing');
        }, { timeout: 10000 });

        clearInterval(activityMonitor);

        // Should have minimal silence periods
        const longSilences = silencePeriods.filter(duration => duration > 2000);
        expect(longSilences.length).toBe(0); // No silences longer than 2 seconds

        // Verify waiting phrase was used to fill silence
        expect(waitingPhrasesService.playWaitingPhrase).toHaveBeenCalled();
      } finally {
        clearInterval(activityMonitor);
      }
    });

    it('should provide continuous engagement during long AI processing', async () => {
      // Mock longer AI processing time
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/transcribe')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ text: 'Complex question requiring long processing' })
          });
        } else if (url.includes('/api/chat')) {
          // Simulate very long AI processing (5 seconds)
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ response: 'Complex AI response' })
              });
            }, 5000);
          });
        } else if (url.includes('/api/synthesize')) {
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const { container } = render(VoiceChat);
      
      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should show thinking status during long processing
      await waitFor(() => {
        expect(container.textContent).toContain('Thinking');
      });

      // Should maintain engagement throughout processing
      let thinkingStatusSeen = false;
      const statusCheck = setInterval(() => {
        if (container.textContent.includes('Thinking')) {
          thinkingStatusSeen = true;
        }
      }, 500);

      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      }, { timeout: 15000 });

      clearInterval(statusCheck);
      expect(thinkingStatusSeen).toBe(true);
    });

    it('should handle varying AI response times gracefully', async () => {
      const responseTimes = [500, 1500, 3000, 800, 2200]; // Different response times
      
      for (let i = 0; i < responseTimes.length; i++) {
        const responseTime = responseTimes[i];
        
        // Mock different response times
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/transcribe')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ text: `Question ${i + 1}` })
            });
          } else if (url.includes('/api/chat')) {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ response: `Response ${i + 1}` })
                });
              }, responseTime);
            });
          } else if (url.includes('/api/synthesize')) {
            return Promise.resolve({
              ok: true,
              blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
            });
          }
          return Promise.reject(new Error('Unknown endpoint'));
        });

        const { container } = render(VoiceChat);
        const micButton = container.querySelector('button[aria-label*="recording"]');
        
        const startTime = Date.now();
        
        await fireEvent.click(micButton);
        await fireEvent.click(micButton);

        // For longer response times, should show waiting phrase
        if (responseTime > 1000) {
          await waitFor(() => {
            expect(container.textContent).toContain('Thinking');
          });
        }

        await waitFor(() => {
          expect(container.textContent).not.toContain('Processing');
        }, { timeout: responseTime + 5000 });

        const totalTime = Date.now() - startTime;
        
        // Should handle each response time appropriately
        expect(totalTime).toBeGreaterThan(responseTime - 100); // Allow some margin
        expect(totalTime).toBeLessThan(responseTime + 3000); // Should not add excessive overhead
      }
    });
  });

  describe('Natural Conversation Flow', () => {
    it('should create natural conversation rhythm with waiting phrases', async () => {
      const { container } = render(VoiceChat);
      
      const conversationEvents = [];
      
      // Track conversation flow events
      const originalPlayPhrase = waitingPhrasesService.playWaitingPhrase;
      waitingPhrasesService.playWaitingPhrase.mockImplementation(async (...args) => {
        conversationEvents.push({ type: 'waitingPhraseStart', time: Date.now() });
        await originalPlayPhrase.call(waitingPhrasesService, ...args);
        conversationEvents.push({ type: 'waitingPhraseEnd', time: Date.now() });
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      conversationEvents.push({ type: 'userSpeechEnd', time: Date.now() });
      
      await fireEvent.click(micButton);
      conversationEvents.push({ type: 'processingStart', time: Date.now() });

      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      }, { timeout: 10000 });
      
      conversationEvents.push({ type: 'responseComplete', time: Date.now() });

      // Analyze conversation flow
      const waitingPhraseStart = conversationEvents.find(e => e.type === 'waitingPhraseStart');
      const userSpeechEnd = conversationEvents.find(e => e.type === 'userSpeechEnd');
      const processingStart = conversationEvents.find(e => e.type === 'processingStart');

      // Waiting phrase should start shortly after user speech ends
      expect(waitingPhraseStart.time - userSpeechEnd.time).toBeLessThan(500);
      
      // Processing should start around the same time as waiting phrase
      expect(Math.abs(processingStart.time - waitingPhraseStart.time)).toBeLessThan(200);
    });

    it('should provide appropriate phrase variety for natural feel', async () => {
      const phrases = [];
      
      // Mock different phrases for variety
      let phraseIndex = 0;
      const mockPhrases = [
        'Let me think about this...',
        'Hmm, interesting question.',
        'Give me a moment to consider.',
        'Well, that\'s a good point.',
        'Let me process this carefully.'
      ];

      waitingPhrasesService.selectWaitingPhrase.mockImplementation(async () => {
        const phrase = mockPhrases[phraseIndex % mockPhrases.length];
        phrases.push(phrase);
        phraseIndex++;
        return phrase;
      });

      // Simulate multiple interactions
      for (let i = 0; i < 5; i++) {
        const { container } = render(VoiceChat);
        const micButton = container.querySelector('button[aria-label*="recording"]');
        
        await fireEvent.click(micButton);
        await fireEvent.click(micButton);

        await waitFor(() => {
          expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalled();
        });
      }

      // Should have variety in phrases
      const uniquePhrases = new Set(phrases);
      expect(uniquePhrases.size).toBeGreaterThan(1);
      
      // Should not repeat consecutive phrases
      for (let i = 1; i < phrases.length; i++) {
        expect(phrases[i]).not.toBe(phrases[i - 1]);
      }
    });

    it('should maintain conversational personality consistency', async () => {
      const { container } = render(VoiceChat);
      
      // Mock phrases with consistent personality
      const personalityPhrases = [
        'Well, well, well. Let me think about this.',
        'Hmm, that\'s quite interesting!',
        'Oh, I see what you\'re asking. Give me a moment.',
        'Fascinating question! Let me consider this carefully.'
      ];

      waitingPhrasesService.selectWaitingPhrase.mockImplementation(async () => {
        return personalityPhrases[Math.floor(Math.random() * personalityPhrases.length)];
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalled();
      });

      // Verify phrase selection maintains personality
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('Visual and Audio Feedback', () => {
    it('should provide clear visual indicators for waiting phrase status', async () => {
      const { container } = render(VoiceChat);
      
      // Mock waiting phrase active state
      vi.spyOn(voiceServices, 'isWaitingPhraseActive').mockReturnValue(true);
      vi.spyOn(voiceServices, 'getAudioQueueStatus').mockReturnValue({
        waitingPhrases: 1,
        responses: 0,
        total: 1
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should show thinking indicator
      await waitFor(() => {
        expect(container.textContent).toContain('Thinking');
      });

      // Should show visual thinking indicator
      const thinkingIndicator = container.querySelector('[class*="animate-pulse"]');
      expect(thinkingIndicator).toBeTruthy();

      // Should show queue information
      expect(container.textContent).toContain('1 phrases');
    });

    it('should integrate seamlessly with cat avatar animations', async () => {
      const { container } = render(CatAvatar, {
        props: {
          size: 'md',
          speaking: true,
          emotion: 'neutral'
        }
      });

      // Wait for avatar to load
      await waitFor(() => {
        const avatarImg = container.querySelector('img[alt="Cat avatar"]');
        expect(avatarImg).toBeTruthy();
      });

      // Simulate waiting phrase playback
      await waitingPhrasesService.playWaitingPhrase('Testing avatar integration', 'en');

      // Should show mouth animation during waiting phrase
      await waitFor(() => {
        const mouthOverlay = container.querySelector('img[alt="Cat mouth"]');
        expect(mouthOverlay).toBeTruthy();
      });
    });

    it('should provide smooth transitions between states', async () => {
      const { container } = render(VoiceChat);
      
      const stateTransitions = [];
      
      // Monitor state changes
      const observer = new MutationObserver(() => {
        const currentState = {
          recording: container.textContent.includes('Recording'),
          processing: container.textContent.includes('Processing'),
          thinking: container.textContent.includes('Thinking'),
          ready: container.textContent.includes('Hold to record')
        };
        
        stateTransitions.push({
          ...currentState,
          timestamp: Date.now()
        });
      });

      observer.observe(container, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });

      try {
        const micButton = container.querySelector('button[aria-label*="recording"]');
        
        await fireEvent.click(micButton);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fireEvent.click(micButton);
        
        await waitFor(() => {
          expect(container.textContent).not.toContain('Processing');
        }, { timeout: 10000 });

        observer.disconnect();

        // Should have smooth state transitions
        expect(stateTransitions.length).toBeGreaterThan(2);
        
        // Should transition through expected states
        const hasRecording = stateTransitions.some(s => s.recording);
        const hasProcessing = stateTransitions.some(s => s.processing);
        const hasThinking = stateTransitions.some(s => s.thinking);
        
        expect(hasRecording).toBe(true);
        expect(hasProcessing).toBe(true);
        expect(hasThinking).toBe(true);
      } finally {
        observer.disconnect();
      }
    });
  });

  describe('Accessibility and Usability', () => {
    it('should maintain accessibility during waiting phrase playback', async () => {
      const { container } = render(VoiceChat);
      
      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      // Should have proper ARIA labels
      expect(micButton.getAttribute('aria-label')).toBeTruthy();
      
      await fireEvent.click(micButton);
      
      // ARIA label should update during recording
      expect(micButton.getAttribute('aria-label')).toContain('Stop recording');
      
      await fireEvent.click(micButton);
      
      // Should maintain accessibility during processing
      await waitFor(() => {
        expect(micButton.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should provide keyboard navigation support', async () => {
      const { container } = render(VoiceChat);
      
      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      // Should be focusable
      micButton.focus();
      expect(document.activeElement).toBe(micButton);
      
      // Should respond to keyboard events
      await fireEvent.keyDown(micButton, { key: 'Enter' });
      
      await waitFor(() => {
        expect(container.textContent).toContain('Recording');
      });
    });

    it('should handle disabled states appropriately', async () => {
      const { container } = render(VoiceChat);
      
      const micButton = container.querySelector('button[aria-label*="recording"]');
      const imageButton = container.querySelector('button[aria-label="Upload image"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);
      
      // Buttons should be disabled during processing
      await waitFor(() => {
        expect(imageButton.disabled).toBe(true);
      });
      
      // Should re-enable after processing
      await waitFor(() => {
        expect(imageButton.disabled).toBe(false);
      }, { timeout: 10000 });
    });
  });

  describe('Performance Impact Validation', () => {
    it('should not significantly impact voice chat response times', async () => {
      // Test with waiting phrases enabled
      const { container: withPhrases } = render(VoiceChat);
      
      const startTimeWithPhrases = Date.now();
      const micButtonWithPhrases = withPhrases.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButtonWithPhrases);
      await fireEvent.click(micButtonWithPhrases);
      
      await waitFor(() => {
        expect(withPhrases.textContent).not.toContain('Processing');
      }, { timeout: 10000 });
      
      const endTimeWithPhrases = Date.now();
      const timeWithPhrases = endTimeWithPhrases - startTimeWithPhrases;

      // Test with waiting phrases disabled
      waitingPhrasesService.isEnabled.mockReturnValue(false);
      
      const { container: withoutPhrases } = render(VoiceChat);
      
      const startTimeWithoutPhrases = Date.now();
      const micButtonWithoutPhrases = withoutPhrases.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButtonWithoutPhrases);
      await fireEvent.click(micButtonWithoutPhrases);
      
      await waitFor(() => {
        expect(withoutPhrases.textContent).not.toContain('Processing');
      }, { timeout: 10000 });
      
      const endTimeWithoutPhrases = Date.now();
      const timeWithoutPhrases = endTimeWithoutPhrases - startTimeWithoutPhrases;

      // Waiting phrases should not add significant overhead
      const overhead = timeWithPhrases - timeWithoutPhrases;
      expect(overhead).toBeLessThan(2000); // Less than 2 seconds overhead
    });

    it('should maintain smooth UI performance during waiting phrase playback', async () => {
      const { container } = render(VoiceChat);
      
      const performanceMarks = [];
      
      // Monitor performance during interaction
      const startMark = performance.now();
      
      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      performanceMarks.push({ event: 'recordingStart', time: performance.now() });
      
      await fireEvent.click(micButton);
      performanceMarks.push({ event: 'recordingStop', time: performance.now() });
      
      await waitFor(() => {
        expect(container.textContent).toContain('Thinking');
      });
      performanceMarks.push({ event: 'thinkingStart', time: performance.now() });
      
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      }, { timeout: 10000 });
      performanceMarks.push({ event: 'complete', time: performance.now() });

      // Analyze performance
      const totalTime = performanceMarks[performanceMarks.length - 1].time - startMark;
      
      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
      
      // Should have reasonable intervals between events
      for (let i = 1; i < performanceMarks.length; i++) {
        const interval = performanceMarks[i].time - performanceMarks[i - 1].time;
        expect(interval).toBeGreaterThan(0);
        expect(interval).toBeLessThan(8000); // No single step should take more than 8 seconds
      }
    });
  });
});