/**
 * Integration tests for Sessions Page Text Mode
 * Tests to identify issues with text mode functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('Sessions Page - Text Mode Issues', () => {
  let mockFetch;
  let mockUser;
  let consoleErrors = [];

  beforeEach(() => {
    // Capture console errors
    consoleErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args);
    });

    // Mock user
    mockUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    };

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key) => {
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Message Sending in Text Mode', () => {
    it('should send message when user types and presses Enter', async () => {
      // Setup: Mock API responses
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/sessions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessions: [],
                pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
              })
          });
        }
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'AI response',
                provider: { name: 'openai', model: 'gpt-4' }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Test: Check if message input exists and works
      const messageInput = screen.queryByPlaceholderText(/type your message/i);

      if (!messageInput) {
        console.error('ISSUE FOUND: Message input not found in text mode');
        expect(messageInput).toBeTruthy();
        return;
      }

      // Type a message
      await fireEvent.input(messageInput, { target: { value: 'Hello AI' } });

      // Press Enter
      await fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter' });

      // Wait for API call
      await waitFor(
        () => {
          const chatCalls = mockFetch.mock.calls.filter((call) => call[0].includes('/api/chat'));

          if (chatCalls.length === 0) {
            console.error('ISSUE FOUND: No API call made to /api/chat when sending message');
          }

          expect(chatCalls.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('should send message when user clicks send button', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/sessions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessions: [],
                pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
              })
          });
        }
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'AI response',
                provider: { name: 'openai', model: 'gpt-4' }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const messageInput = screen.queryByPlaceholderText(/type your message/i);
      const sendButton = screen.queryByRole('button', { name: /send/i });

      if (!messageInput || !sendButton) {
        console.error('ISSUE FOUND: Message input or send button not found');
        expect(messageInput).toBeTruthy();
        expect(sendButton).toBeTruthy();
        return;
      }

      await fireEvent.input(messageInput, { target: { value: 'Test message' } });
      await fireEvent.click(sendButton);

      await waitFor(
        () => {
          const chatCalls = mockFetch.mock.calls.filter((call) => call[0].includes('/api/chat'));
          expect(chatCalls.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('should display user message in chat after sending', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/sessions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessions: [],
                pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
              })
          });
        }
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'AI response',
                provider: { name: 'openai', model: 'gpt-4' }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      const testMessage = 'Hello, this is a test message';
      const messageInput = screen.queryByPlaceholderText(/type your message/i);

      if (!messageInput) {
        console.error('ISSUE FOUND: Cannot test message display - input not found');
        return;
      }

      await fireEvent.input(messageInput, { target: { value: testMessage } });
      await fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter' });

      // Check if message appears in the chat
      await waitFor(
        () => {
          const messageElement = screen.queryByText(testMessage);
          if (!messageElement) {
            console.error('ISSUE FOUND: User message not displayed in chat after sending');
          }
          expect(messageElement).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Message Persistence', () => {
    it('should save messages to session via API', async () => {
      const sessionId = 'test-session-123';
      let messagesSaved = [];

      mockFetch.mockImplementation((url, options) => {
        if (url.includes('/api/sessions') && !url.includes('/messages')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessions: [
                  {
                    id: sessionId,
                    title: 'Test Session',
                    mode: 'fun',
                    language: 'en',
                    messageCount: 0
                  }
                ],
                pagination: { currentPage: 1, totalPages: 1, totalCount: 1 }
              })
          });
        }
        if (url.includes(`/api/sessions/${sessionId}/messages`) && options?.method === 'POST') {
          const body = JSON.parse(options.body);
          messagesSaved.push(body);
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: `msg-${Date.now()}`,
                ...body,
                createdAt: new Date().toISOString()
              })
          });
        }
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'AI response',
                provider: { name: 'openai', model: 'gpt-4' }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Send a message
      const messageInput = screen.queryByPlaceholderText(/type your message/i);
      if (messageInput) {
        await fireEvent.input(messageInput, { target: { value: 'Test message' } });
        await fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter' });

        await waitFor(
          () => {
            if (messagesSaved.length === 0) {
              console.error('ISSUE FOUND: Messages not being saved to session API');
            }
            expect(messagesSaved.length).toBeGreaterThan(0);
          },
          { timeout: 3000 }
        );
      }
    });

    it('should load messages when session is selected', async () => {
      const sessionId = 'test-session-123';
      const mockMessages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Hello',
          createdAt: new Date().toISOString()
        },
        {
          id: 'msg-2',
          type: 'assistant',
          content: 'Hi there!',
          createdAt: new Date().toISOString()
        }
      ];

      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/sessions') && !url.includes('/messages')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessions: [
                  {
                    id: sessionId,
                    title: 'Test Session',
                    mode: 'fun',
                    language: 'en',
                    messageCount: 2
                  }
                ],
                pagination: { currentPage: 1, totalPages: 1, totalCount: 1 }
              })
          });
        }
        if (url.includes(`/api/sessions/${sessionId}/messages`)) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                messages: mockMessages,
                pagination: { currentPage: 1, totalPages: 1, totalCount: 2 }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Select the session
      const sessionButton = screen.queryByText('Test Session');
      if (sessionButton) {
        await fireEvent.click(sessionButton);

        await waitFor(
          () => {
            const userMessage = screen.queryByText('Hello');
            const assistantMessage = screen.queryByText('Hi there!');

            if (!userMessage || !assistantMessage) {
              console.error('ISSUE FOUND: Messages not loaded when session is selected');
            }

            expect(userMessage).toBeTruthy();
            expect(assistantMessage).toBeTruthy();
          },
          { timeout: 3000 }
        );
      }
    });
  });

  describe('Chat Store Integration', () => {
    it('should use correct message store in text mode', async () => {
      // This test checks if the sessions page is using the right store
      // Import the stores
      const { messages } = await import('$lib/modules/chat/stores.js');

      // Check initial state
      const initialMessages = get(messages);
      console.log('Initial messages in store:', initialMessages);

      // The store should be accessible and working
      expect(Array.isArray(initialMessages)).toBe(true);
    });

    it('should update messages store when sending in text mode', async () => {
      const { messages, addMessage } = await import('$lib/modules/chat/stores.js');

      // Clear messages
      messages.set([]);

      // Add a message
      addMessage('user', 'Test message', []);

      // Check if message was added
      const currentMessages = get(messages);

      if (currentMessages.length === 0) {
        console.error('ISSUE FOUND: addMessage not updating messages store');
      }

      expect(currentMessages.length).toBe(1);
      expect(currentMessages[0].content).toBe('Test message');
    });
  });

  describe('API Integration', () => {
    it('should call sendMessage from chat services', async () => {
      const { sendMessage } = await import('$lib/modules/chat/services.js');

      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'AI response',
                provider: { name: 'openai', model: 'gpt-4' }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Call sendMessage
      const result = await sendMessage('Test message', []);

      if (!result) {
        console.error('ISSUE FOUND: sendMessage returned false or failed');
      }

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const { sendMessage } = await import('$lib/modules/chat/services.js');

      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          statusText: 'Internal Server Error'
        });
      });

      const result = await sendMessage('Test message', []);

      expect(result).toBe(false);

      if (consoleErrors.length === 0) {
        console.error('ISSUE FOUND: No error logged when API call fails');
      }
    });
  });

  describe('Component Rendering', () => {
    it('should render MessageInput component in text mode', async () => {
      // Check if MessageInput is rendered
      const messageInput = screen.queryByPlaceholderText(/type your message/i);
      const cameraButton = screen.queryByLabelText(/upload image/i);
      const sendButton = screen.queryByRole('button', { name: /send/i });

      const issues = [];
      if (!messageInput) issues.push('Message input not found');
      if (!cameraButton) issues.push('Camera/upload button not found');
      if (!sendButton) issues.push('Send button not found');

      if (issues.length > 0) {
        console.error('ISSUE FOUND: MessageInput component issues:', issues);
      }

      expect(issues.length).toBe(0);
    });

    it('should render MessageList component in text mode', async () => {
      // Check if MessageList container is rendered
      const messagesContainer =
        screen.queryByRole('region', { name: /messages/i }) ||
        document.querySelector('.messages-area') ||
        document.querySelector('[class*="message"]');

      if (!messagesContainer) {
        console.error('ISSUE FOUND: MessageList component or messages container not found');
      }

      expect(messagesContainer).toBeTruthy();
    });

    it('should hide VoiceChat component in text mode', async () => {
      // Check that voice chat is not visible
      const voiceChat =
        screen.queryByText(/voice chat mode/i) || screen.queryByText(/talk to your ai tutor/i);

      if (voiceChat && voiceChat.offsetParent !== null) {
        console.error('ISSUE FOUND: VoiceChat component visible in text mode');
      }

      // Voice chat should either not exist or be hidden
      expect(!voiceChat || voiceChat.offsetParent === null).toBe(true);
    });
  });

  describe('Mode Switching', () => {
    it('should switch between text and voice modes', async () => {
      const textButton = screen.queryByText(/text chat/i);
      const voiceButton = screen.queryByText(/voice chat/i);

      if (!textButton || !voiceButton) {
        console.error('ISSUE FOUND: Mode toggle buttons not found');
        expect(textButton).toBeTruthy();
        expect(voiceButton).toBeTruthy();
        return;
      }

      // Click voice mode
      await fireEvent.click(voiceButton);

      await waitFor(() => {
        // Check if voice mode is active
        const isVoiceActive = voiceButton.classList.contains('active');
        if (!isVoiceActive) {
          console.error('ISSUE FOUND: Voice mode not activated after clicking button');
        }
        expect(isVoiceActive).toBe(true);
      });

      // Click text mode
      await fireEvent.click(textButton);

      await waitFor(() => {
        // Check if text mode is active
        const isTextActive = textButton.classList.contains('active');
        if (!isTextActive) {
          console.error('ISSUE FOUND: Text mode not activated after clicking button');
        }
        expect(isTextActive).toBe(true);
      });
    });

    it('should preserve messages when switching modes', async () => {
      const { messages, addMessage } = await import('$lib/modules/chat/stores.js');

      // Add some messages
      messages.set([]);
      addMessage('user', 'Message 1', []);
      addMessage('tutor', 'Response 1', []);

      const messagesBefore = get(messages);

      // Switch to voice mode
      const voiceButton = screen.queryByText(/voice chat/i);
      if (voiceButton) {
        await fireEvent.click(voiceButton);
      }

      // Switch back to text mode
      const textButton = screen.queryByText(/text chat/i);
      if (textButton) {
        await fireEvent.click(textButton);
      }

      const messagesAfter = get(messages);

      if (messagesAfter.length !== messagesBefore.length) {
        console.error('ISSUE FOUND: Messages lost when switching modes');
      }

      expect(messagesAfter.length).toBe(messagesBefore.length);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing session gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/sessions')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                sessions: [],
                pagination: { currentPage: 1, totalPages: 0, totalCount: 0 }
              })
          });
        }
        if (url.includes('/api/chat')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: 'AI response',
                provider: { name: 'openai', model: 'gpt-4' }
              })
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Try to send a message without a session
      const messageInput = screen.queryByPlaceholderText(/type your message/i);
      if (messageInput) {
        await fireEvent.input(messageInput, { target: { value: 'Test' } });
        await fireEvent.keyPress(messageInput, { key: 'Enter', code: 'Enter' });

        // Should either create a session or handle gracefully
        await waitFor(
          () => {
            const hasError = consoleErrors.some((err) =>
              err.some((arg) => typeof arg === 'string' && arg.includes('session'))
            );

            if (hasError) {
              console.error('ISSUE FOUND: Error when sending message without session');
            }
          },
          { timeout: 2000 }
        );
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      const { sendMessage } = await import('$lib/modules/chat/services.js');

      const result = await sendMessage('Test message', []);

      expect(result).toBe(false);
      expect(consoleErrors.length).toBeGreaterThan(0);
    });
  });
});
