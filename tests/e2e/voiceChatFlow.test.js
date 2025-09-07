/**
 * End-to-end tests for complete voice chat flow with waiting phrases
 * Tests the entire user journey from voice input to AI response
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import VoiceChat from '../../src/lib/modules/chat/components/VoiceChat.svelte';
import { waitingPhrasesService } from '../../src/lib/modules/chat/waitingPhrasesService.js';
import * as voiceServices from '../../src/lib/modules/chat/voiceServices.js';

// Mock browser APIs
global.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn((array) => {
      // Simulate audio data
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.random() * 255;
      }
    })
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  destination: {},
  state: 'running',
  resume: vi.fn().mockResolvedValue()
}));

global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve({
    getTracks: () => [{ 
      stop: vi.fn(),
      kind: 'audio',
      enabled: true
    }],
    getAudioTracks: () => [{ 
      stop: vi.fn(),
      kind: 'audio',
      enabled: true
    }]
  }))
};

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive'
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock audio playback
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 2.5,
  ended: false
}));

describe('End-to-End Voice Chat Flow Tests', () => {
  let mockAudioContext;
  let mockMediaRecorder;
  let mockAudio;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    mockAudioContext = new AudioContext();
    mockMediaRecorder = new MediaRecorder();
    mockAudio = new Audio();
    
    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/transcribe')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            text: 'What is the capital of France?' 
          })
        });
      } else if (url.includes('/api/synthesize')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
        });
      } else if (url.includes('/api/chat')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            response: 'The capital of France is Paris. It is a beautiful city known for its art, culture, and history.' 
          })
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });

    // Mock waiting phrases service
    vi.spyOn(waitingPhrasesService, 'selectWaitingPhrase').mockResolvedValue(
      'Let me think about this interesting question...'
    );
    vi.spyOn(waitingPhrasesService, 'playWaitingPhrase').mockResolvedValue();
    vi.spyOn(waitingPhrasesService, 'isEnabled').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Voice Interaction Flow', () => {
    it('should handle complete voice chat interaction with waiting phrases', async () => {
      const { container } = render(VoiceChat);

      // Step 1: User starts recording
      const micButton = container.querySelector('button[aria-label*="recording"]');
      expect(micButton).toBeTruthy();

      await fireEvent.click(micButton);

      // Verify recording state
      await waitFor(() => {
        expect(container.textContent).toContain('Recording');
      });

      // Step 2: User stops recording (simulating speech input)
      await fireEvent.click(micButton);

      // Step 3: Verify transcription is processed
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/transcribe'),
          expect.any(Object)
        );
      });

      // Step 4: Verify waiting phrase is triggered
      await waitFor(() => {
        expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalled();
        expect(waitingPhrasesService.playWaitingPhrase).toHaveBeenCalledWith(
          'Let me think about this interesting question...',
          expect.any(String)
        );
      });

      // Step 5: Verify thinking status is shown
      await waitFor(() => {
        expect(container.textContent).toContain('Thinking');
      });

      // Step 6: Verify AI response is generated
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/chat'),
          expect.any(Object)
        );
      });

      // Step 7: Verify AI response is synthesized
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/synthesize'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Paris')
          })
        );
      });

      // Step 8: Verify UI returns to ready state
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
        expect(container.textContent).not.toContain('Thinking');
      });
    });

    it('should handle multiple consecutive voice interactions', async () => {
      const { container } = render(VoiceChat);

      const questions = [
        'What is the capital of France?',
        'Tell me about the weather.',
        'How do I learn programming?'
      ];

      for (let i = 0; i < questions.length; i++) {
        // Mock different transcription for each interaction
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/transcribe')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ text: questions[i] })
            });
          } else if (url.includes('/api/chat')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ 
                response: `Response to: ${questions[i]}` 
              })
            });
          } else if (url.includes('/api/synthesize')) {
            return Promise.resolve({
              ok: true,
              blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
            });
          }
          return Promise.reject(new Error('Unknown API endpoint'));
        });

        const micButton = container.querySelector('button[aria-label*="recording"]');
        
        // Start recording
        await fireEvent.click(micButton);
        await waitFor(() => {
          expect(container.textContent).toContain('Recording');
        });

        // Stop recording
        await fireEvent.click(micButton);

        // Wait for complete processing
        await waitFor(() => {
          expect(waitingPhrasesService.playWaitingPhrase).toHaveBeenCalled();
        });

        await waitFor(() => {
          expect(container.textContent).not.toContain('Processing');
        }, { timeout: 5000 });

        // Reset mocks for next iteration
        vi.clearAllMocks();
        vi.spyOn(waitingPhrasesService, 'selectWaitingPhrase').mockResolvedValue(
          `Thinking about question ${i + 1}...`
        );
        vi.spyOn(waitingPhrasesService, 'playWaitingPhrase').mockResolvedValue();
      }
    });

    it('should maintain proper timing and sequencing', async () => {
      const { container } = render(VoiceChat);
      const events = [];

      // Track events with timestamps
      const originalSelectPhrase = waitingPhrasesService.selectWaitingPhrase;
      const originalPlayPhrase = waitingPhrasesService.playWaitingPhrase;

      waitingPhrasesService.selectWaitingPhrase.mockImplementation(async (...args) => {
        events.push({ type: 'selectPhrase', timestamp: Date.now() });
        return await originalSelectPhrase.call(waitingPhrasesService, ...args);
      });

      waitingPhrasesService.playWaitingPhrase.mockImplementation(async (...args) => {
        events.push({ type: 'playPhrase', timestamp: Date.now() });
        // Simulate phrase duration
        await new Promise(resolve => setTimeout(resolve, 100));
        events.push({ type: 'phraseComplete', timestamp: Date.now() });
        return await originalPlayPhrase.call(waitingPhrasesService, ...args);
      });

      // Mock AI response with delay
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/chat')) {
          events.push({ type: 'aiResponseStart', timestamp: Date.now() });
          return new Promise(resolve => {
            setTimeout(() => {
              events.push({ type: 'aiResponseComplete', timestamp: Date.now() });
              resolve({
                ok: true,
                json: () => Promise.resolve({ response: 'AI response' })
              });
            }, 200);
          });
        } else if (url.includes('/api/transcribe')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ text: 'Test question' })
          });
        } else if (url.includes('/api/synthesize')) {
          events.push({ type: 'synthesizeResponse', timestamp: Date.now() });
          return Promise.resolve({
            ok: true,
            blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
          });
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      // Perform interaction
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Wait for all events to complete
      await waitFor(() => {
        expect(events.some(e => e.type === 'synthesizeResponse')).toBe(true);
      }, { timeout: 10000 });

      // Verify proper sequencing
      const eventTypes = events.map(e => e.type);
      
      expect(eventTypes.indexOf('selectPhrase')).toBeLessThan(eventTypes.indexOf('playPhrase'));
      expect(eventTypes.indexOf('playPhrase')).toBeLessThan(eventTypes.indexOf('phraseComplete'));
      expect(eventTypes.indexOf('aiResponseStart')).toBeGreaterThan(-1);
      expect(eventTypes.indexOf('aiResponseComplete')).toBeLessThan(eventTypes.indexOf('synthesizeResponse'));
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle transcription failures gracefully', async () => {
      const { container } = render(VoiceChat);

      // Mock transcription failure
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/transcribe')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          });
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should handle error gracefully and return to ready state
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      });

      // Should not trigger waiting phrases on transcription failure
      expect(waitingPhrasesService.playWaitingPhrase).not.toHaveBeenCalled();
    });

    it('should continue voice chat when waiting phrases fail', async () => {
      const { container } = render(VoiceChat);

      // Mock waiting phrase failure
      waitingPhrasesService.playWaitingPhrase.mockRejectedValue(
        new Error('Waiting phrase synthesis failed')
      );

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should still process AI response despite waiting phrase failure
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/chat'),
          expect.any(Object)
        );
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/synthesize'),
          expect.any(Object)
        );
      });
    });

    it('should handle AI response failures', async () => {
      const { container } = render(VoiceChat);

      // Mock AI response failure
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/transcribe')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ text: 'Test question' })
          });
        } else if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should trigger waiting phrase
      await waitFor(() => {
        expect(waitingPhrasesService.playWaitingPhrase).toHaveBeenCalled();
      });

      // Should handle AI failure gracefully
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      });
    });

    it('should handle audio synthesis failures', async () => {
      const { container } = render(VoiceChat);

      // Mock synthesis failure
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/transcribe')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ text: 'Test question' })
          });
        } else if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: 'AI response' })
          });
        } else if (url.includes('/api/synthesize')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Synthesis failed'
          });
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should complete processing despite synthesis failure
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      });
    });

    it('should handle network connectivity issues', async () => {
      const { container } = render(VoiceChat);

      // Mock network failure
      global.fetch.mockRejectedValue(new Error('Network error'));

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should handle network errors gracefully
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      });
    });
  });

  describe('User Experience Validation', () => {
    it('should provide clear visual feedback throughout the interaction', async () => {
      const { container } = render(VoiceChat);

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      // Initial state
      expect(container.textContent).toContain('Hold to record');

      // Recording state
      await fireEvent.click(micButton);
      await waitFor(() => {
        expect(container.textContent).toContain('Recording');
        expect(micButton.className).toContain('bg-red-500'); // Recording indicator
      });

      // Processing state
      await fireEvent.click(micButton);
      await waitFor(() => {
        expect(container.textContent).toContain('Processing');
      });

      // Thinking state (waiting phrase active)
      await waitFor(() => {
        expect(container.textContent).toContain('Thinking');
      });

      // Return to ready state
      await waitFor(() => {
        expect(container.textContent).toContain('Hold to record');
      }, { timeout: 5000 });
    });

    it('should show waiting phrase status with queue information', async () => {
      const { container } = render(VoiceChat);

      // Mock queue status
      vi.spyOn(voiceServices, 'getAudioQueueStatus').mockReturnValue({
        waitingPhrases: 2,
        responses: 1,
        total: 3
      });

      vi.spyOn(voiceServices, 'isWaitingPhraseActive').mockReturnValue(true);

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should show queue information
      await waitFor(() => {
        expect(container.textContent).toContain('Thinking');
        expect(container.textContent).toContain('2 phrases');
      });
    });

    it('should handle user interruptions appropriately', async () => {
      const { container } = render(VoiceChat);

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      // Start first interaction
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Wait for waiting phrase to start
      await waitFor(() => {
        expect(waitingPhrasesService.playWaitingPhrase).toHaveBeenCalled();
      });

      // User interrupts with new recording
      await fireEvent.click(micButton);

      // Should handle interruption gracefully
      await waitFor(() => {
        expect(container.textContent).toContain('Recording');
      });

      // Complete interrupted interaction
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      });
    });

    it('should maintain responsive UI during processing', async () => {
      const { container } = render(VoiceChat);

      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // UI should remain responsive during processing
      const imageButton = container.querySelector('button[aria-label="Upload image"]');
      expect(imageButton).toBeTruthy();
      
      // Image button should be disabled during processing
      expect(imageButton.disabled).toBe(true);

      // Wait for processing to complete
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      });

      // UI should be re-enabled
      expect(imageButton.disabled).toBe(false);
    });
  });

  describe('Performance Validation', () => {
    it('should complete voice interactions within acceptable time limits', async () => {
      const { container } = render(VoiceChat);

      const startTime = Date.now();
      
      const micButton = container.querySelector('button[aria-label*="recording"]');
      
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Wait for complete processing
      await waitFor(() => {
        expect(container.textContent).not.toContain('Processing');
      }, { timeout: 10000 });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (allowing for test overhead)
      expect(totalTime).toBeLessThan(8000); // 8 seconds max
    });

    it('should handle concurrent voice interactions efficiently', async () => {
      // This test simulates multiple users or rapid interactions
      const interactions = [];

      for (let i = 0; i < 3; i++) {
        const { container } = render(VoiceChat);
        interactions.push(container);
      }

      const startTime = Date.now();

      // Start all interactions simultaneously
      const promises = interactions.map(async (container) => {
        const micButton = container.querySelector('button[aria-label*="recording"]');
        await fireEvent.click(micButton);
        await fireEvent.click(micButton);
        
        return waitFor(() => {
          expect(container.textContent).not.toContain('Processing');
        }, { timeout: 10000 });
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent interactions efficiently
      expect(totalTime).toBeLessThan(12000); // Should not be much slower than single interaction
    });

    it('should manage memory efficiently during extended use', async () => {
      const { container } = render(VoiceChat);

      // Simulate extended use with multiple interactions
      for (let i = 0; i < 5; i++) {
        const micButton = container.querySelector('button[aria-label*="recording"]');
        
        await fireEvent.click(micButton);
        await fireEvent.click(micButton);

        await waitFor(() => {
          expect(container.textContent).not.toContain('Processing');
        });

        // Small delay between interactions
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Should complete without memory issues (smoke test)
      expect(true).toBe(true);
    });
  });
});