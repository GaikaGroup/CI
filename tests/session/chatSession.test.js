import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../../src/routes/api/chat/+server.js';
import { container } from '../../src/lib/shared/di/container.js';
import { SessionFactory } from '../../src/lib/modules/session/SessionFactory.js';

// Helper to create Request with body
function makeRequest(body) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('chat API session memory', () => {
  beforeEach(() => {
    container.clear();
  });

  it('reuses session context across sequential calls', async () => {
    const sessionFactory = new SessionFactory();
    container.register('sessionFactory', sessionFactory);

    // mock provider manager
    const generateChatCompletion = vi.fn().mockImplementation((messages) => {
      const last = messages[messages.length - 1];
      const hasName = messages.some((m) => m.content.includes('My name is Alice'));
      if (last.content.includes("What's my name") && hasName) {
        return Promise.resolve({ content: 'Your name is Alice.', provider: 'mock', model: 'mock' });
      }
      return Promise.resolve({
        content: 'Nice to meet you, Alice.',
        provider: 'mock',
        model: 'mock'
      });
    });
    container.register('llmProviderManager', { generateChatCompletion });

    const sessionId = 'session-123';

    // First exchange
    const session1 = sessionFactory.getOrCreateSession(sessionId);
    const req1 = makeRequest({
      content: 'My name is Alice',
      language: 'en',
      sessionContext: session1.getContext()
    });
    const res1 = await POST({ request: req1 });
    const body1 = await res1.json();
    session1.addToConversation('My name is Alice', true);
    session1.addToConversation(body1.response, false);

    // Second exchange using same session
    const req2 = makeRequest({
      content: "What's my name?",
      language: 'en',
      sessionContext: session1.getContext()
    });
    const res2 = await POST({ request: req2 });
    const body2 = await res2.json();

    expect(body2.response).toContain('Alice');
    expect(generateChatCompletion).toHaveBeenCalledTimes(2);
  });
});
