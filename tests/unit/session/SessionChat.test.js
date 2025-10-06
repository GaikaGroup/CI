/**
 * SessionChat Component Tests
 * Tests for the chat interface component with message history and input
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import SessionChat from '$lib/modules/session/components/SessionChat.svelte';
import { chatStore } from '$lib/modules/session/stores/chatStore.js';
import { sessionStore } from '$lib/modules/session/stores/sessionStore.js';
import { get } from 'svelte/store';

// Mock the stores
vi.mock('$lib/modules/session/stores/chatStore.js', () => ({
  chatStore: {
    subscribe: vi.fn(),
    initializeSession: vi.fn(),
    sendMessage: vi.fn(),
    clearSession: vi.fn(),
    setTyping: vi.fn(),
  },
  messageStats: {
    subscribe: vi.fn((callback) => {
      callback({ total: 0, userMessages: 0, assistantMessages: 0, hasMessages: false });
      return () => {};
    }),
  },
  isChatLoading: {
    subscribe: vi.fn((callback) => {
      callback(false);
      return () => {};
    }),
  },
  chatError: {
    subscribe: vi.fn((callback) => {
      callback(null);
      return () => {};
    }),
  },
}));

vi.mock('$lib/modules/session/stores/sessionStore.js', () => ({
  sessionStore: {
    subscribe: vi.fn((callback) => {
      callback({
        currentSession: {
          id: 'test-session-id',
          title: 'Test Session',
          mode: 'fun',
          language: 'en',
        },
      });
      return () => {};
    }),
  },
}));

vi.mock('$lib/modules/theme/stores.js', () => ({
  darkMode: {
    subscribe: vi.fn((callback) => {
      callback(false);
      return () => {};
    }),
  },
}));

describe('SessionChat Component', () => {
  let mockChatState;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock chat state
    mockChatState = {
      messages: [],
      currentMessage: '',
      isTyping: false,
      loading: false,
      error: null,
      mode: 'fun',
      language: 'en',
      sessionId: 'test-session-id',
    };

    // Setup chatStore mock
    chatStore.subscribe.mockImplementation((callback) => {
      callback(mockChatState);
      return () => {};
    });

    chatStore.initializeSession.mockResolvedValue(undefined);
    chatStore.sendMessage.mockResolvedValue({
      id: 'msg-1',
      type: 'user',
      content: 'Test message',
      createdAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should render the component', () => {
      const { container } = render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(container).toBeTruthy();
    });

    it('should initialize chat when sessionId is provided', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();
      expect(chatStore.initializeSession).toHaveBeenCalledWith('test-session-id');
    });

    it('should display session title in header', () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(screen.getByText('Test Session')).toBeInTheDocument();
    });

    it('should display session mode badge', () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(screen.getByText('fun')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display empty state when no messages', () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(screen.getByText('No messages yet. Start the conversation!')).toBeInTheDocument();
    });

    it('should display user messages', async () => {
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Hello, AI!',
          createdAt: new Date().toISOString(),
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should display assistant messages', async () => {
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'assistant',
          content: 'Hello! How can I help you?',
          createdAt: new Date().toISOString(),
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    });

    it('should display multiple messages in order', async () => {
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'First message',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          type: 'assistant',
          content: 'Second message',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg-3',
          type: 'user',
          content: 'Third message',
          createdAt: new Date().toISOString(),
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      const messages = screen.getAllByText(/message/);
      expect(messages).toHaveLength(3);
    });

    it('should display message count in header', async () => {
      const mockMessageStats = {
        subscribe: vi.fn((callback) => {
          callback({ total: 5, userMessages: 3, assistantMessages: 2, hasMessages: true });
          return () => {};
        }),
      };

      vi.mocked(await import('$lib/modules/session/stores/chatStore.js')).messageStats =
        mockMessageStats;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(screen.getByText('5 messages')).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('should render message input textarea', () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      expect(textarea).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeInTheDocument();
    });

    it('should update textarea value on input', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      await fireEvent.input(textarea, { target: { value: 'Test message' } });

      expect(textarea.value).toBe('Test message');
    });

    it('should send message on button click', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: '' });

      await fireEvent.input(textarea, { target: { value: 'Test message' } });
      await fireEvent.click(sendButton);

      await tick();
      expect(chatStore.sendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should send message on Enter key', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);

      await fireEvent.input(textarea, { target: { value: 'Test message' } });
      await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      await tick();
      expect(chatStore.sendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should not send message on Shift+Enter', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);

      await fireEvent.input(textarea, { target: { value: 'Test message' } });
      await fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(chatStore.sendMessage).not.toHaveBeenCalled();
    });

    it('should clear input after sending message', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: '' });

      await fireEvent.input(textarea, { target: { value: 'Test message' } });
      await fireEvent.click(sendButton);

      await tick();
      expect(textarea.value).toBe('');
    });

    it('should not send empty messages', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: '' });

      await fireEvent.input(textarea, { target: { value: '   ' } });
      await fireEvent.click(sendButton);

      expect(chatStore.sendMessage).not.toHaveBeenCalled();
    });

    it('should disable input while loading', async () => {
      const mockLoadingState = {
        subscribe: vi.fn((callback) => {
          callback(true);
          return () => {};
        }),
      };

      vi.mocked(await import('$lib/modules/session/stores/chatStore.js')).isChatLoading =
        mockLoadingState;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      expect(textarea).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should display loading indicator when initializing', async () => {
      const mockLoadingState = {
        subscribe: vi.fn((callback) => {
          callback(true);
          return () => {};
        }),
      };

      mockChatState.messages = [];

      vi.mocked(await import('$lib/modules/session/stores/chatStore.js')).isChatLoading =
        mockLoadingState;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('should display typing indicator when assistant is typing', async () => {
      mockChatState.isTyping = true;
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Hello',
          createdAt: new Date().toISOString(),
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      // Check for typing indicator (animated dots)
      const typingIndicator = screen.getByText('Hello').parentElement.parentElement.parentElement;
      expect(typingIndicator).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when chat fails to load', async () => {
      const mockErrorState = {
        subscribe: vi.fn((callback) => {
          callback('Failed to load messages');
          return () => {};
        }),
      };

      vi.mocked(await import('$lib/modules/session/stores/chatStore.js')).chatError =
        mockErrorState;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
    });

    it('should display retry button on error', async () => {
      const mockErrorState = {
        subscribe: vi.fn((callback) => {
          callback('Failed to load messages');
          return () => {};
        }),
      };

      vi.mocked(await import('$lib/modules/session/stores/chatStore.js')).chatError =
        mockErrorState;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
    });

    it('should retry initialization on retry button click', async () => {
      const mockErrorState = {
        subscribe: vi.fn((callback) => {
          callback('Failed to load messages');
          return () => {};
        }),
      };

      vi.mocked(await import('$lib/modules/session/stores/chatStore.js')).chatError =
        mockErrorState;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const retryButton = screen.getByText('Try Again');
      await fireEvent.click(retryButton);

      await tick();
      expect(chatStore.initializeSession).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Metadata', () => {
    it('should display audio player for messages with audio', async () => {
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'assistant',
          content: 'Here is an audio response',
          createdAt: new Date().toISOString(),
          metadata: {
            audioUrl: 'https://example.com/audio.mp3',
          },
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      const audioElement = screen.getByRole('application');
      expect(audioElement).toBeInTheDocument();
      expect(audioElement.tagName).toBe('AUDIO');
    });

    it('should display image for messages with images', async () => {
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Check out this image',
          createdAt: new Date().toISOString(),
          metadata: {
            imageUrl: 'https://example.com/image.jpg',
          },
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      const imageElement = screen.getByAltText('Message attachment');
      expect(imageElement).toBeInTheDocument();
      expect(imageElement.src).toBe('https://example.com/image.jpg');
    });
  });

  describe('Cleanup', () => {
    it('should clear session on component destroy', async () => {
      const { unmount } = render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      unmount();

      expect(chatStore.clearSession).toHaveBeenCalled();
    });
  });

  describe('Multiline Support', () => {
    it('should support multiline input', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);

      const multilineText = 'Line 1\nLine 2\nLine 3';
      await fireEvent.input(textarea, { target: { value: multilineText } });

      expect(textarea.value).toBe(multilineText);
    });

    it('should preserve line breaks when sending', async () => {
      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      const textarea = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: '' });

      const multilineText = 'Line 1\nLine 2\nLine 3';
      await fireEvent.input(textarea, { target: { value: multilineText } });
      await fireEvent.click(sendButton);

      await tick();
      expect(chatStore.sendMessage).toHaveBeenCalledWith(multilineText);
    });
  });

  describe('Conversation History', () => {
    it('should preserve conversation history when continuing session', async () => {
      const existingMessages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Previous message 1',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'msg-2',
          type: 'assistant',
          content: 'Previous response 1',
          createdAt: new Date(Date.now() - 3500000).toISOString(),
        },
      ];

      mockChatState.messages = existingMessages;

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();

      expect(screen.getByText('Previous message 1')).toBeInTheDocument();
      expect(screen.getByText('Previous response 1')).toBeInTheDocument();
    });

    it('should restore conversation when returning to session', async () => {
      const { unmount } = render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      // Simulate navigating away
      unmount();

      // Simulate returning to session
      mockChatState.messages = [
        {
          id: 'msg-1',
          type: 'user',
          content: 'Restored message',
          createdAt: new Date().toISOString(),
        },
      ];

      render(SessionChat, {
        props: { sessionId: 'test-session-id' },
      });

      await tick();
      expect(chatStore.initializeSession).toHaveBeenCalledWith('test-session-id');
    });
  });
});
