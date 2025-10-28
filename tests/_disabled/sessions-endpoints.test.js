import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the session services
vi.mock('../../../src/lib/modules/session/services/SessionService.js', () => ({
  SessionService: {
    createSession: vi.fn(),
    getUserSessions: vi.fn(),
    getSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    softDeleteSession: vi.fn(),
    searchSessions: vi.fn(),
    getSessionStats: vi.fn()
  },
  SessionError: class SessionError extends Error {
    constructor(message, code = 'SESSION_ERROR', details = null) {
      super(message);
      this.name = 'SessionError';
      this.code = code;
      this.details = details;
    }
  },
  SessionNotFoundError: class SessionNotFoundError extends Error {
    constructor(sessionId) {
      super(`Session not found: ${sessionId}`);
      this.name = 'SessionNotFoundError';
    }
  },
  SessionValidationError: class SessionValidationError extends Error {
    constructor(message, field = null) {
      super(message);
      this.name = 'SessionValidationError';
      this.field = field;
    }
  }
}));

vi.mock('../../../src/lib/modules/session/services/MessageService.js', () => ({
  MessageService: {
    addMessage: vi.fn(),
    getSessionMessages: vi.fn(),
    getMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn(),
    searchMessages: vi.fn(),
    getRecentMessages: vi.fn(),
    getMessageStats: vi.fn(),
    bulkDeleteMessages: vi.fn()
  },
  MessageError: class MessageError extends Error {
    constructor(message, code = 'MESSAGE_ERROR', details = null) {
      super(message);
      this.name = 'MessageError';
      this.code = code;
      this.details = details;
    }
  },
  MessageNotFoundError: class MessageNotFoundError extends Error {
    constructor(messageId) {
      super(`Message not found: ${messageId}`);
      this.name = 'MessageNotFoundError';
    }
  },
  MessageValidationError: class MessageValidationError extends Error {
    constructor(message, field = null) {
      super(message);
      this.name = 'MessageValidationError';
      this.field = field;
    }
  }
}));

// Import the API handlers after mocking
import {
  GET as getSessionsHandler,
  POST as postSessionsHandler
} from '../../../src/routes/api/sessions/+server.js';
import {
  GET as getSessionHandler,
  PUT as putSessionHandler,
  DELETE as deleteSessionHandler
} from '../../../src/routes/api/sessions/[id]/+server.js';
import {
  GET as getMessagesHandler,
  POST as postMessagesHandler
} from '../../../src/routes/api/sessions/[id]/messages/+server.js';
import { GET as getSearchHandler } from '../../../src/routes/api/sessions/search/+server.js';
import { GET as getStatsHandler } from '../../../src/routes/api/sessions/stats/+server.js';

import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';
import { MessageService } from '../../../src/lib/modules/session/services/MessageService.js';

describe('Sessions API Endpoints', () => {
  const mockUser = {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com'
  };

  const mockSession = {
    id: 'session-123',
    userId: 'test-user-123',
    title: 'Test Session',
    mode: 'fun',
    language: 'en',
    preview: 'Test preview',
    messageCount: 0,
    createdAt: '2025-10-05T17:04:51.612Z',
    updatedAt: '2025-10-05T17:04:51.612Z'
  };

  const mockMessage = {
    id: 'message-123',
    sessionId: 'session-123',
    type: 'user',
    content: 'Test message',
    metadata: null,
    createdAt: '2025-10-05T17:04:51.612Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/sessions', () => {
    it('should return 401 when user is not authenticated', async () => {
      const url = new URL('http://localhost/api/sessions');
      const locals = {};

      const response = await getSessionsHandler({ url, locals });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should get user sessions successfully', async () => {
      const mockResult = {
        sessions: [mockSession],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      SessionService.getUserSessions.mockResolvedValue(mockResult);

      const url = new URL('http://localhost/api/sessions');
      const locals = { user: mockUser };

      const response = await getSessionsHandler({ url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(SessionService.getUserSessions).toHaveBeenCalledWith(mockUser.id, {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        mode: null,
        language: null
      });
    });

    it('should handle search queries', async () => {
      const mockResult = {
        sessions: [mockSession],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20,
          hasNextPage: false,
          hasPreviousPage: false
        },
        query: 'test'
      };

      SessionService.searchSessions.mockResolvedValue(mockResult);

      const url = new URL('http://localhost/api/sessions?search=test');
      const locals = { user: mockUser };

      const response = await getSessionsHandler({ url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(SessionService.searchSessions).toHaveBeenCalledWith(mockUser.id, 'test', {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        mode: null,
        language: null
      });
    });
  });

  describe('POST /api/sessions', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ title: 'Test Session' })
      };
      const locals = {};

      const response = await postSessionsHandler({ request, locals });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should create a session successfully', async () => {
      SessionService.createSession.mockResolvedValue(mockSession);

      const request = {
        json: vi.fn().mockResolvedValue({
          title: 'Test Session',
          mode: 'fun',
          language: 'en',
          preview: 'Test preview'
        })
      };
      const locals = { user: mockUser };

      const response = await postSessionsHandler({ request, locals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockSession);
      expect(SessionService.createSession).toHaveBeenCalledWith(
        mockUser.id,
        'Test Session',
        'fun',
        'en',
        'Test preview'
      );
    });

    it('should return 400 for missing title', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ mode: 'fun' })
      };
      const locals = { user: mockUser };

      const response = await postSessionsHandler({ request, locals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session title is required');
    });
  });

  describe('GET /api/sessions/[id]', () => {
    it('should get a session successfully', async () => {
      SessionService.getSession.mockResolvedValue(mockSession);

      const params = { id: 'session-123' };
      const url = new URL('http://localhost/api/sessions/session-123');
      const locals = { user: mockUser };

      const response = await getSessionHandler({ params, url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSession);
      expect(SessionService.getSession).toHaveBeenCalledWith('session-123', mockUser.id, false);
    });
  });

  describe('PUT /api/sessions/[id]', () => {
    it('should update a session successfully', async () => {
      const updatedSession = { ...mockSession, title: 'Updated Session' };
      SessionService.updateSession.mockResolvedValue(updatedSession);

      const params = { id: 'session-123' };
      const request = {
        json: vi.fn().mockResolvedValue({ title: 'Updated Session' })
      };
      const locals = { user: mockUser };

      const response = await putSessionHandler({ params, request, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSession);
      expect(SessionService.updateSession).toHaveBeenCalledWith('session-123', mockUser.id, {
        title: 'Updated Session'
      });
    });
  });

  describe('DELETE /api/sessions/[id]', () => {
    it('should soft delete a session successfully', async () => {
      SessionService.softDeleteSession.mockResolvedValue(true);

      const params = { id: 'session-123' };
      const url = new URL('http://localhost/api/sessions/session-123');
      const locals = { user: mockUser };

      const response = await deleteSessionHandler({ params, url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session deleted successfully');
      expect(SessionService.softDeleteSession).toHaveBeenCalledWith('session-123', mockUser.id);
    });

    it('should hard delete a session when hard=true', async () => {
      SessionService.deleteSession.mockResolvedValue(true);

      const params = { id: 'session-123' };
      const url = new URL('http://localhost/api/sessions/session-123?hard=true');
      const locals = { user: mockUser };

      const response = await deleteSessionHandler({ params, url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session permanently deleted');
      expect(SessionService.deleteSession).toHaveBeenCalledWith('session-123', mockUser.id);
    });
  });

  describe('GET /api/sessions/[id]/messages', () => {
    it('should get session messages successfully', async () => {
      const mockResult = {
        messages: [mockMessage],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 50,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      MessageService.getSessionMessages.mockResolvedValue(mockResult);

      const params = { id: 'session-123' };
      const url = new URL('http://localhost/api/sessions/session-123/messages');
      const locals = { user: mockUser };

      const response = await getMessagesHandler({ params, url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(MessageService.getSessionMessages).toHaveBeenCalledWith(
        'session-123',
        {
          page: 1,
          limit: 50,
          sortOrder: 'asc',
          type: null
        },
        mockUser.id
      );
    });
  });

  describe('POST /api/sessions/[id]/messages', () => {
    it('should add a message successfully', async () => {
      MessageService.addMessage.mockResolvedValue(mockMessage);

      const params = { id: 'session-123' };
      const request = {
        json: vi.fn().mockResolvedValue({
          type: 'user',
          content: 'Test message',
          metadata: null
        })
      };
      const locals = { user: mockUser };

      const response = await postMessagesHandler({ params, request, locals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockMessage);
      expect(MessageService.addMessage).toHaveBeenCalledWith(
        'session-123',
        'user',
        'Test message',
        null,
        mockUser.id
      );
    });
  });

  describe('GET /api/sessions/search', () => {
    it('should search sessions successfully', async () => {
      const mockResult = {
        sessions: [mockSession],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20,
          hasNextPage: false,
          hasPreviousPage: false
        },
        query: 'test'
      };

      SessionService.searchSessions.mockResolvedValue(mockResult);

      const url = new URL('http://localhost/api/sessions/search?q=test');
      const locals = { user: mockUser };

      const response = await getSearchHandler({ url, locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(SessionService.searchSessions).toHaveBeenCalledWith(mockUser.id, 'test', {
        page: 1,
        limit: 20,
        mode: null,
        language: null
      });
    });

    it('should return 400 for missing search query', async () => {
      const url = new URL('http://localhost/api/sessions/search');
      const locals = { user: mockUser };

      const response = await getSearchHandler({ url, locals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Search query (q) is required');
    });
  });

  describe('GET /api/sessions/stats', () => {
    it('should get session statistics successfully', async () => {
      const mockSessionStats = {
        totalSessions: 5,
        funSessions: 3,
        learnSessions: 2,
        totalMessages: 50,
        lastActivity: '2025-10-05T17:04:51.612Z'
      };

      const mockMessageStats = {
        totalMessages: 50,
        userMessages: 25,
        assistantMessages: 25,
        lastMessage: '2025-10-05T17:04:51.612Z'
      };

      SessionService.getSessionStats.mockResolvedValue(mockSessionStats);
      MessageService.getMessageStats.mockResolvedValue(mockMessageStats);

      const locals = { user: mockUser };

      const response = await getStatsHandler({ locals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions.total).toBe(5);
      expect(data.messages.total).toBe(50);
      expect(data.overview.averageMessagesPerSession).toBe(10);
    });
  });
});
