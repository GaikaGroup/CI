import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../../src/lib/modules/llm/providers/OpenAIProvider.js';

describe('OpenAIProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends all messages to the API including history entries', async () => {
    const provider = new OpenAIProvider({
      API_KEY: 'test-key',
      API_URL: 'https://example.com/v1/chat/completions',
      MODEL: 'gpt-test',
      MAX_TOKENS: 100,
      TEMPERATURE: 0.7,
      TIMEOUT: 1000
    });

    const messages = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'next' }
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        model: 'gpt-test',
        usage: {}
      })
    });

    await provider.generateChatCompletion(messages);

    expect(global.fetch).toHaveBeenCalled();
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages).toEqual(messages);
  });
});
