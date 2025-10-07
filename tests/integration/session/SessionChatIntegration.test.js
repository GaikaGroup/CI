/**
 * Integration tests for SessionChat with voice and chat functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';
import SessionChat from '$lib/modules/session/components/SessionChat.svelte';
import { chatStore } from '$lib/modules/session/stores/chatStore.js';
import { sessionStore } from '$lib/modules/session/stores/sessionStore.js';
import { selectedLanguage } from '$lib/modules/i18n/stores';
import { darkMode } from '$lib/modules/theme/stores';
import * as voiceServices from '$lib/modules/chat/voiceServices';

// Mock voice services
vi.mock('$lib/modules/chat/voiceServices', () => {
  const createMockStore = (initialValue) => {
    let value = initialValue;
    const subscribers = new Set();
    return {
      subscribe: (fn) => {
        fn(value);
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      set: (newValue) => {
        value = newValue;
        subscribers.forEach((fn) => fn(value));
      }
    };
  };

  return {
    startRecording: vi.fn().mockResolvedValue(true),
    stopRecording: vi.fn().mockResolvedValue('Test transcription'),
    sendTranscribedText: vi.fn().mockResolvedValue('AI response'),
    initAudioContext: vi.fn(),
    isSpeaking: createMockStore(false),
    currentEmotion: createMockStore('neutral'),
    isWaitingPhraseActive: vi.fn().mockReturnValue(false),
    getAudioQueueStatus: vi.fn().mockReturnValue({ waitingPhrases: 0 }),
    setVoiceModeActive: vi.fn(),
    isVoiceModeActive: createMockStore(false)
  };
});

// Mock chat stores
vi.mock('$lib/modules/chat/stores', () => {
  const createMockStore = (initialValue) => {
    let value = initialValue;
    const subscribers = new Set();
    return {
      subscribe: (fn) => {
        fn(value);
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      set: (newValue) => {
        value = newValue;
        subscribers.forEach((fn) => fn(value));
      }
    };
  };

  return {
    isRecording: createMockStore(false),
    selectedImages: createMockStore([])
  };
});

// Mock CatAvatar component
vi.mock('$shared/components/CatAvatar.svelte', () => ({
  default: vi.fn()
}));

describe('SessionChat Integration', () => {
  let mockSession;

  beforeEach(() => {
    // Reset stores
    chatStore.reset();
    sessionStore.reset();
    selectedLanguage.set('en');
    darkMode.set(false);

    // Create mock session
    mockSession = {
      id: 'test-session-123',
      userId: 'user-123',
      title: 'Test Session',
      mode: 'fun',
      language: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0
    };

    // Mock session store methods
    vi.spyOn(sessionStore, 'updateSession').mockResolvedValue(mockSession);
    vi.spyOn(chatStore, 'initializeSession').mockResolvedValue();
    vi.spyOn(chatStore, 'sendMessage').mockResolvedValue({
      id: 'msg-1',
      type: 'user',
      content: 'Test message',
      createdAt: new Date()
    });
    vi.spyOn(chatStore, 'addAssistantMessage').mockResolvedValue({
      id: 'msg-2',
      type: 'assistant',
      content: 'AI response',
      createdAt: new Date()
    });

    // Mock fetch for AI responses
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'AI response' })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mode Switching', () => {
    it('should switch between text and voice modes', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      // Wait for initialization
      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalledWith(mockSession.id);
      });

      // Find mode toggle buttons
      const textButton = container.querySelector('button:has-text("Text")');
      const voiceButton = container.querySelector('button:has-text("Voice")');

      expect(textButton).toBeTruthy();
      expect(voiceButton).toBeTruthy();

      // Switch to voice mode
      await fireEvent.click(voiceButton);

      await waitFor(() => {
        expect(voiceServices.setVoiceModeActive).toHaveBeenCalledWith(true);
      });

      // Switch back to text mode
      await fireEvent.click(textButton);

      await waitFor(() => {
        expect(voiceServices.setVoiceModeActive).toHaveBeenCalledWith(false);
      });
    });

    it('should display CatAvatar in voice mode', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Switch to voice mode
      const voiceButton = container.querySelector('button:has-text("Voice")');
      await fireEvent.click(voiceButton);

      // Check for voice mode header
      await waitFor(() => {
        const voiceHeader = container.querySelector('.bg-gradient-to-r');
        expect(voiceHeader).toBeTruthy();
      });
    });
  });

  describe('Session Mode Switching (Fun/Learn)', () => {
    it('should switch between Fun and Learn modes', async () => {
      // Set up session store with current session
      sessionStore.currentSession = mockSession;

      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Find mode selector
      const modeSelect = container.querySelector('select');
      expect(modeSelect).toBeTruthy();
      expect(modeSelect.value).toBe('fun');

      // Change to learn mode
      await fireEvent.change(modeSelect, { target: { value: 'learn' } });

      await waitFor(() => {
        expect(sessionStore.updateSession).toHaveBeenCalledWith(
          mockSession.id,
          expect.objectContaining({ mode: 'learn' })
        );
      });
    });

    it('should preserve mode settings in session data', async () => {
      const learnSession = { ...mockSession, mode: 'learn' };
      sessionStore.currentSession = learnSession;

      const { container } = render(SessionChat, {
        props: { sessionId: learnSession.id }
      });

      await waitFor(() => {
        const modeSelect = container.querySelector('select');
        expect(modeSelect.value).toBe('learn');
      });
    });
  });

  describe('Voice Recording Integration', () => {
    it('should handle voice recording and transcription', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Switch to voice mode
      const voiceButton = container.querySelector('button:has-text("Voice")');
      await fireEvent.click(voiceButton);

      // Find and click record button
      const recordButton = container.querySelector('button[aria-label*="recording"]');
      expect(recordButton).toBeTruthy();

      // Start recording
      await fireEvent.click(recordButton);

      await waitFor(() => {
        expect(voiceServices.startRecording).toHaveBeenCalled();
      });

      // Stop recording
      await fireEvent.click(recordButton);

      await waitFor(() => {
        expect(voiceServices.stopRecording).toHaveBeenCalled();
        expect(voiceServices.sendTranscribedText).toHaveBeenCalledWith('Test transcription');
      });
    });

    it('should add transcribed message to chat store', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Switch to voice mode and record
      const voiceButton = container.querySelector('button:has-text("Voice")');
      await fireEvent.click(voiceButton);

      const recordButton = container.querySelector('button[aria-label*="recording"]');
      await fireEvent.click(recordButton);
      await fireEvent.click(recordButton);

      await waitFor(() => {
        expect(chatStore.sendMessage).toHaveBeenCalledWith('Test transcription');
        expect(chatStore.addAssistantMessage).toHaveBeenCalledWith('AI response');
      });
    });
  });

  describe('Text Chat Integration', () => {
    it('should send text messages in text mode', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Find message input
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeTruthy();

      // Type message
      await fireEvent.input(textarea, { target: { value: 'Hello AI' } });

      // Submit form
      const form = container.querySelector('form');
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(chatStore.sendMessage).toHaveBeenCalledWith('Hello AI', null);
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/chat',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Hello AI')
          })
        );
      });
    });

    it('should handle Enter key to send message', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      const textarea = container.querySelector('textarea');
      await fireEvent.input(textarea, { target: { value: 'Test message' } });

      // Press Enter (without Shift)
      await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(chatStore.sendMessage).toHaveBeenCalled();
      });
    });

    it('should not send on Shift+Enter', async () => {
      const { container } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      const textarea = container.querySelector('textarea');
      await fireEvent.input(textarea, { target: { value: 'Test message' } });

      // Press Shift+Enter
      await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      // Should not send
      expect(chatStore.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Language and Mode Preservation', () => {
    it('should preserve language settings in session data', async () => {
      const spanishSession = { ...mockSession, language: 'es' };
      sessionStore.currentSession = spanishSession;

      render(SessionChat, {
        props: { sessionId: spanishSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Verify language is used in API calls
      const textarea = container.querySelector('textarea');
      await fireEvent.input(textarea, { target: { value: 'Hola' } });
      const form = container.querySelector('form');
      await fireEvent.submit(form);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/chat',
          expect.objectContaining({
            body: expect.stringContaining('"language":"es"')
          })
        );
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup voice mode on unmount', async () => {
      const { unmount } = render(SessionChat, {
        props: { sessionId: mockSession.id }
      });

      await waitFor(() => {
        expect(chatStore.initializeSession).toHaveBeenCalled();
      });

      // Switch to voice mode
      const voiceButton = container.querySelector('button:has-text("Voice")');
      await fireEvent.click(voiceButton);

      // Unmount component
      unmount();

      await waitFor(() => {
        expect(voiceServices.setVoiceModeActive).toHaveBeenCalledWith(false);
        expect(chatStore.clearSession).toHaveBeenCalled();
      });
    });
  });
});
