import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('../../src/lib/modules/chat/waitingPhrasesService.js', () => ({
  waitingPhrasesService: {
    selectWaitingPhrase: vi.fn().mockResolvedValue('...')
  }
}));

vi.mock('../../src/lib/modules/chat/voiceServices.js', async () => {
  const { writable } = await import('svelte/store');

  return {
    synthesizeWaitingPhrase: vi.fn().mockResolvedValue(),
    isVoiceModeActive: writable(false)
  };
});

vi.mock('$lib/stores/app', () => ({
  setLoading: vi.fn(),
  setError: vi.fn()
}));

vi.mock('$modules/i18n/stores', async () => {
  const { writable } = await import('svelte/store');
  const selectedLanguage = writable('en');

  return {
    selectedLanguage,
    languages: [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' }
    ]
  };
});

import { sendMessage } from '../../src/lib/modules/chat/services.js';
import { container } from '../../src/lib/shared/di/container.js';
import { SessionFactory } from '../../src/lib/modules/session/SessionFactory.js';
import { SessionStorageAdapter } from '../../src/lib/modules/session/SessionStorageAdapter.js';
import { selectedLanguage } from '../../src/lib/modules/i18n/stores.js';
import { waitingPhrasesService } from '../../src/lib/modules/chat/waitingPhrasesService.js';

describe('sendMessage session updates', () => {
  beforeEach(() => {
    container.clear();
    fetch.mockReset();
    waitingPhrasesService.selectWaitingPhrase.mockClear();
    waitingPhrasesService.selectWaitingPhrase.mockResolvedValue('...');
    selectedLanguage.set('en');
  });

  it('includes previous turn when messages are sent sequentially', async () => {
    const sessionFactory = new SessionFactory();
    const adapter = new SessionStorageAdapter(sessionFactory);
    container.register('sessionFactory', sessionFactory);
    container.register('sessionStorageAdapter', adapter);

    const sessionId = 'abc';

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Hi there', provider: 'mock' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Doing well', provider: 'mock' })
      });

    await sendMessage('Hello', [], sessionId);
    await sendMessage('How are you?', [], sessionId);

    expect(fetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(secondBody.sessionContext.history).toHaveLength(2);
    expect(secondBody.sessionContext.history[0].content).toBe('Hello');
    expect(secondBody.sessionContext.history[1].content).toBe('Hi there');
  });
});

describe('sendMessage language detection', () => {
  beforeEach(() => {
    container.clear();
    fetch.mockReset();
    waitingPhrasesService.selectWaitingPhrase.mockClear();
    waitingPhrasesService.selectWaitingPhrase.mockResolvedValue('...');
    selectedLanguage.set('en');
  });

  it('detects language before selecting waiting phrase', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Acknowledged', provider: 'mock' })
    });

    const prompts = [
      {
        text: 'Who is stronger la lion or a tiger?',
        expected: 'en'
      },
      {
        text: 'Cual es tu comida favorita una saladilla or una paella?',
        expected: 'es'
      },
      {
        text: 'кто сильнее горилла или лев?',
        expected: 'ru'
      }
    ];

    for (const { text, expected } of prompts) {
      await sendMessage(text, []);

      const lastCall =
        waitingPhrasesService.selectWaitingPhrase.mock.calls[
          waitingPhrasesService.selectWaitingPhrase.mock.calls.length - 1
        ];

      expect(lastCall[0]).toBe(expected);
      expect(get(selectedLanguage)).toBe(expected);
    }
  });
});
