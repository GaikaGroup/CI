/**
 * Integration tests for voice mode second opinion feature
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import VoiceChat from '../../../src/lib/modules/chat/components/VoiceChat.svelte';
import * as voiceServices from '../../../src/lib/modules/chat/voiceServices.js';
import { secondOpinionService } from '../../../src/lib/modules/chat/services/SecondOpinionService.js';

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
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  destination: {},
  state: 'running',
  resume: vi.fn().mockResolvedValue()
}));

global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() =>
    Promise.resolve({
      getTracks: () => [{ stop: vi.fn(), kind: 'audio', enabled: true }],
      getAudioTracks: () => [{ stop: vi.fn(), kind: 'audio', enabled: true }]
    })
  )
};

global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive'
}));

global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 2.5,
  ended: false
}));

global.fetch = vi.fn();

describe('Voice Mode Second Opinion Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock transcription API
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/transcribe')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: 'second opinion' })
        });
      } else if (url.includes('/api/synthesize')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock audio'], { type: 'audio/wav' }))
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });

    // Mock voice services
    vi.spyOn(voiceServices, 'startRecording').mockResolvedValue(true);
    vi.spyOn(voiceServices, 'stopRecording').mockResolvedValue('second opinion');
    vi.spyOn(voiceServices, 'synthesizeSpeech').mockResolvedValue();
    vi.spyOn(voiceServices, 'initAudioContext').mockImplementation(() => {});

    // Mock second opinion service
    vi.spyOn(secondOpinionService, 'requestSecondOpinion').mockResolvedValue({
      success: true,
      data: {
        opinionId: 'opinion-123',
        messageId: 'msg-456',
        content: 'This is a second opinion from Ollama.',
        provider: 'ollama',
        model: 'llama3',
        divergence: null
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Voice command recognition', () => {
    it('should recognize "second opinion" voice command', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      // Set up last message context
      const voiceChat = container.querySelector('[data-testid="voice-chat"]');
      if (voiceChat && voiceChat.__svelte_meta) {
        voiceChat.__svelte_meta.updateLastMessage('msg-123', 'Previous response', 'openai');
      }

      const micButton = container.querySelector('button[aria-label*="recording"]');

      // Start recording
      await fireEvent.click(micButton);
      expect(voiceServices.startRecording).toHaveBeenCalled();

      // Stop recording (will transcribe to "second opinion")
      await fireEvent.click(micButton);
      expect(voiceServices.stopRecording).toHaveBeenCalled();

      // Wait for command processing
      await waitFor(() => {
        expect(secondOpinionService.requestSecondOpinion).toHaveBeenCalled();
      });
    });

    it('should display "Getting second opinion..." status', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should show generating status
      await waitFor(() => {
        expect(container.textContent).toContain('Getting second opinion');
      });
    });

    it('should announce provider before speaking opinion', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.stringContaining('ollama'),
          expect.any(Object)
        );
      });
    });

    it('should synthesize second opinion content', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          'This is a second opinion from Ollama.',
          expect.any(Object)
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should handle no alternative providers error', async () => {
      secondOpinionService.requestSecondOpinion.mockRejectedValue(
        new Error('No alternative providers available')
      );

      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.stringContaining('alternative'),
          expect.any(Object)
        );
      });
    });

    it('should handle second opinion service error', async () => {
      secondOpinionService.requestSecondOpinion.mockRejectedValue(new Error('Service unavailable'));

      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.stringContaining('error'),
          expect.any(Object)
        );
      });
    });

    it('should handle missing last message', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.stringContaining('no previous message'),
          expect.any(Object)
        );
      });

      expect(secondOpinionService.requestSecondOpinion).not.toHaveBeenCalled();
    });
  });

  describe('Multilingual support', () => {
    it('should handle Russian voice commands', async () => {
      voiceServices.stopRecording.mockResolvedValue('второе мнение');

      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(secondOpinionService.requestSecondOpinion).toHaveBeenCalledWith(
          expect.any(String),
          'test-session',
          expect.objectContaining({ language: 'ru' })
        );
      });
    });

    it('should handle Spanish voice commands', async () => {
      voiceServices.stopRecording.mockResolvedValue('segunda opinión');

      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(secondOpinionService.requestSecondOpinion).toHaveBeenCalledWith(
          expect.any(String),
          'test-session',
          expect.objectContaining({ language: 'es' })
        );
      });
    });
  });

  describe('UI updates', () => {
    it('should show provider indicator while speaking', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(container.textContent).toContain('ollama');
      });
    });

    it('should clear status after completion', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Wait for processing to complete
      await waitFor(
        () => {
          expect(container.textContent).not.toContain('Getting second opinion');
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Audio cues', () => {
    it('should play audio cue for model switching', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        // Provider announcement serves as audio cue
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.stringContaining('second opinion from'),
          expect.objectContaining({ priority: 1 })
        );
      });
    });

    it('should use high priority for second opinion audio', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ priority: 1 })
        );
      });
    });
  });

  describe('User experience flow', () => {
    it('should complete full second opinion flow', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      // 1. Start recording
      await fireEvent.click(micButton);
      expect(container.textContent).toContain('Recording');

      // 2. Stop recording
      await fireEvent.click(micButton);

      // 3. Should show processing
      await waitFor(() => {
        expect(container.textContent).toContain('Getting second opinion');
      });

      // 4. Should request second opinion
      await waitFor(() => {
        expect(secondOpinionService.requestSecondOpinion).toHaveBeenCalled();
      });

      // 5. Should announce provider
      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          expect.stringContaining('ollama'),
          expect.any(Object)
        );
      });

      // 6. Should speak opinion content
      await waitFor(() => {
        expect(voiceServices.synthesizeSpeech).toHaveBeenCalledWith(
          'This is a second opinion from Ollama.',
          expect.any(Object)
        );
      });

      // 7. Should return to ready state
      await waitFor(
        () => {
          expect(container.textContent).not.toContain('Processing');
        },
        { timeout: 5000 }
      );
    });

    it('should handle rapid consecutive commands', async () => {
      const { container } = render(VoiceChat, {
        props: { sessionId: 'test-session' }
      });

      const micButton = container.querySelector('button[aria-label*="recording"]');

      // First command
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      await waitFor(() => {
        expect(secondOpinionService.requestSecondOpinion).toHaveBeenCalledTimes(1);
      });

      // Second command (should be queued or handled gracefully)
      await fireEvent.click(micButton);
      await fireEvent.click(micButton);

      // Should not break the system
      await waitFor(
        () => {
          expect(container.textContent).not.toContain('Processing');
        },
        { timeout: 5000 }
      );
    });
  });
});
