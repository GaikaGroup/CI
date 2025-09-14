import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writable } from 'svelte/store';

vi.mock('../../src/lib/modules/chat/waitingPhrasesService.js', () => ({
  waitingPhrasesService: {
    selectWaitingPhrase: vi.fn().mockResolvedValue('...')
  }
}));

vi.mock('../../src/lib/modules/chat/voiceServices.js', () => ({
  synthesizeWaitingPhrase: vi.fn().mockResolvedValue()
}));

vi.mock('$lib/stores/app', () => ({
  setLoading: vi.fn(),
  setError: vi.fn()
}));

vi.mock('$modules/i18n/stores', () => ({
  selectedLanguage: writable('en')
}));

import { sendMessage } from '../../src/lib/modules/chat/services.js';
import { container } from '../../src/lib/shared/di/container.js';
import { SessionFactory } from '../../src/lib/modules/session/SessionFactory.js';
import { SessionStorageAdapter } from '../../src/lib/modules/session/SessionStorageAdapter.js';

describe('sendMessage session updates', () => {
  beforeEach(() => {
    container.clear();
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
