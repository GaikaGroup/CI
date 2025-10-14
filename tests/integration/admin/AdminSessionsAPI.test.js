import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionService } from '$lib/modules/session/services/SessionService.js';

// Mock the SessionService
vi.mock('$lib/modules/session/services/SessionService.js', () => ({
  SessionService: {
    getAllSessions: vi.fn(),
    getUserSessions: vi.fn(),
    searchSessions: vi.fn(),
    getSessionById: vi.fn(),
    restoreSession: vi.fn()
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

describe('Admin Sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/sessions', () => {
    it('should require authentication', async () => {
      const { GET } = await import('$routes/api/admin/sessions/+server.js');
      
      const mockRequest = {
        url: new URL('http://localhost/api/admin/sessions'),
        locals: {}
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const { GET } = await import('$routes/api/admin/sessions/+server.js');
      
      const mockRequest = {
        url: new URL('http://localhost/api/admin/sessions'),
        locals: {
          user: { id: '1', role: 'student' }
        }
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return sessions for admin user', async () => {
      const mockSessions = {
        sessions: [
          {
            id: 'session1',
            title: 'Test Session',
            userId: 'user1',
            isHidden: false,
            mode: 'fun',
            messageCount: 5
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 1,
          limit: 20
        }
      };

      SessionService.getAllSessions.mockResolvedValue(mockSessions);

      const { GET } = await import('$routes/api/admin/sessions/+server.js');
      
      const mockRequest = {
        url: new URL('http://localhost/api/admin/sessions'),
        locals: {
          user: { id: '1', role: 'admin' }
        }
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSessions);
      expect(SessionService.getAllSessions).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        mode: null,
        language: null,
        dateFrom: null,
        dateTo: null,
        includeHidden: true,
        hiddenOnly: false
      });
    });

    it('should handle search queries', async () => {
      const mockSearchResults = {
        sessions: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, limit: 20 },
        query: 'test'
      };

      SessionService.searchSessions.mockResolvedValue(mockSearchResults);

      const { GET } = await import('$routes/api/admin/sessions/+server.js');
      
      const mockRequest = {
        url: new URL('http://localhost/api/admin/sessions?search=test&userId=user1'),
        locals: {
          user: { id: '1', role: 'admin' }
        }
      };

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(SessionService.searchSessions).toHaveBeenCalledWith('user1', 'test', expect.any(Object));
    });
  });

  describe('POST /api/admin/sessions/[id]/restore', () => {
    it('should require authentication', async () => {
      const { POST } = await import('$routes/api/admin/sessions/[id]/restore/+server.js');
      
      const mockRequest = {
        params: { id: 'session1' },
        locals: {}
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should require admin role', async () => {
      const { POST } = await import('$routes/api/admin/sessions/[id]/restore/+server.js');
      
      const mockRequest = {
        params: { id: 'session1' },
        locals: {
          user: { id: '1', role: 'student' }
        }
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should restore session for admin user', async () => {
      const mockSession = {
        id: 'session1',
        title: 'Test Session',
        userId: 'user1',
        isHidden: true
      };

      SessionService.getSessionById.mockResolvedValue(mockSession);
      SessionService.restoreSession.mockResolvedValue(true);

      const { POST } = await import('$routes/api/admin/sessions/[id]/restore/+server.js');
      
      const mockRequest = {
        params: { id: 'session1' },
        locals: {
          user: { id: '1', role: 'admin' }
        }
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Session restored successfully');
      expect(SessionService.getSessionById).toHaveBeenCalledWith('session1', true);
      expect(SessionService.restoreSession).toHaveBeenCalledWith('session1', 'user1');
    });

    it('should return 404 for non-existent session', async () => {
      SessionService.getSessionById.mockResolvedValue(null);

      const { POST } = await import('$routes/api/admin/sessions/[id]/restore/+server.js');
      
      const mockRequest = {
        params: { id: 'nonexistent' },
        locals: {
          user: { id: '1', role: 'admin' }
        }
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
    });

    it('should return 400 for non-hidden session', async () => {
      const mockSession = {
        id: 'session1',
        title: 'Test Session',
        userId: 'user1',
        isHidden: false
      };

      SessionService.getSessionById.mockResolvedValue(mockSession);

      const { POST } = await import('$routes/api/admin/sessions/[id]/restore/+server.js');
      
      const mockRequest = {
        params: { id: 'session1' },
        locals: {
          user: { id: '1', role: 'admin' }
        }
      };

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session is not hidden');
    });
  });
});