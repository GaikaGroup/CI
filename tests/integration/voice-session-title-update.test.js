/**
 * Integration test for voice mode session title update
 * Tests that session titles are properly updated when users send voice messages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendTranscribedText } from '$lib/modules/chat/voiceServices.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock the stores and dependencies
vi.mock('$lib/modules/chat/stores', () => ({
  selectedImages: {
    subscribe: vi.fn(),
    set: vi.fn(),
    get: vi.fn(() => [])
  },
  addMessage: vi.fn()
}));

vi.mock('$lib/stores/app', () => ({
  setLoading: vi.fn(),
  setError: vi.fn()
}));

vi.mock('$modules/i18n/stores', () => ({
  selectedLanguage: {
    subscribe: vi.fn(),
    get: vi.fn(() => 'en')
  }
}));

vi.mock('$lib/shared/utils/constants', () => ({
  MESSAGE_TYPES: {
    USER: 'user',
    TUTOR: 'tutor'
  }
}));

vi.mock('svelte/store', () => ({
  get: vi.fn((store) => {
    if (store?.get) return store.get();
    return true; // Default for isVoiceModeActive
  }),
  writable: vi.fn(() => ({
    subscribe: vi.fn(),
    set: vi.fn(),
    update: vi.fn()
  })),
  derived: vi.fn(() => ({
    subscribe: vi.fn()
  }))
}));

describe('Voice Mode Session Title Update', () => {
  const mockSessionId = 'test-session-123';
  const mockTranscription = 'Помогите мне с математикой, пожалуйста';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should update session title when voice message is sent to a new session', async () => {
    // Mock session fetch to return a session with default title
    const mockSessionData = {
      id: mockSessionId,
      title: 'New Session 15/10/2025',
      preview: null,
      mode: 'fun'
    };

    // Mock successful session fetch
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })
      // Mock successful session update
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      // Mock chat API response
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Конечно, помогу с математикой!' })
      });

    // Mock waiting phrase and synthesis functions
    const mockTriggerWaitingPhrase = vi.fn().mockResolvedValue();
    const mockSynthesizeSpeech = vi.fn().mockResolvedValue();
    const mockDetermineEmotion = vi.fn().mockReturnValue('neutral');

    // Mock these functions in the module
    vi.doMock('$lib/modules/chat/voiceServices.js', async () => {
      const actual = await vi.importActual('$lib/modules/chat/voiceServices.js');
      return {
        ...actual,
        triggerWaitingPhrase: mockTriggerWaitingPhrase,
        synthesizeSpeech: mockSynthesizeSpeech,
        determineEmotion: mockDetermineEmotion
      };
    });

    // Call the function
    await sendTranscribedText(mockTranscription, mockSessionId);

    // Verify session was fetched
    expect(global.fetch).toHaveBeenCalledWith(`/api/sessions/${mockSessionId}`);

    // Verify session title was updated
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/sessions/${mockSessionId}`,
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Помогите мне с математикой, пожалуйста',
          preview: 'Помогите мне с математикой, пожалуйста'
        })
      })
    );

    // Verify chat API was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('should truncate long transcriptions in session title', async () => {
    const longTranscription =
      'Это очень длинное сообщение которое должно быть обрезано до пятидесяти символов максимум для заголовка сессии';

    const mockSessionData = {
      id: mockSessionId,
      title: 'New Session 15/10/2025',
      preview: null,
      mode: 'fun'
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Понял ваш вопрос!' })
      });

    await sendTranscribedText(longTranscription, mockSessionId);

    // Verify title was truncated to 50 characters + "..."
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/sessions/${mockSessionId}`,
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Это очень длинное сообщение которое должно быть обре...',
          preview: longTranscription.substring(0, 200)
        })
      })
    );
  });

  it('should not update session title if it does not start with "New Session"', async () => {
    const mockSessionData = {
      id: mockSessionId,
      title: 'Existing Custom Title',
      preview: 'Some preview text',
      mode: 'fun'
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Отвечаю на ваш вопрос!' })
      });

    await sendTranscribedText(mockTranscription, mockSessionId);

    // Verify session was fetched
    expect(global.fetch).toHaveBeenCalledWith(`/api/sessions/${mockSessionId}`);

    // Verify session title was NOT updated (only 2 fetch calls: session fetch + chat API)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).not.toHaveBeenCalledWith(
      `/api/sessions/${mockSessionId}`,
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('should handle session fetch errors gracefully', async () => {
    // Mock session fetch to fail
    global.fetch.mockRejectedValueOnce(new Error('Session not found')).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: 'Отвечаю несмотря на ошибку!' })
    });

    // Should not throw error
    await expect(sendTranscribedText(mockTranscription, mockSessionId)).resolves.not.toThrow();

    // Verify chat API was still called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('should handle session update errors gracefully', async () => {
    const mockSessionData = {
      id: mockSessionId,
      title: 'New Session 15/10/2025',
      preview: null,
      mode: 'fun'
    };

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessionData)
      })
      .mockRejectedValueOnce(new Error('Update failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Отвечаю несмотря на ошибку обновления!' })
      });

    // Should not throw error
    await expect(sendTranscribedText(mockTranscription, mockSessionId)).resolves.not.toThrow();

    // Verify chat API was still called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  it('should work without sessionId parameter', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: 'Отвечаю без sessionId!' })
    });

    // Should not throw error when sessionId is not provided
    await expect(sendTranscribedText(mockTranscription)).resolves.not.toThrow();

    // Should only call chat API, not session API
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
});
