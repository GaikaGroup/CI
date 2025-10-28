/**
 * SessionService unit tests
 * Tests for session CRUD operations, error handling, and pagination
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SessionService,
  SessionError,
  SessionNotFoundError,
  SessionValidationError
} from '../../../src/lib/modules/session/services/SessionService.js';

// Mock the database connection
vi.mock('../../../src/lib/database/index.js', () => ({
  db: {
    session: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    },
    message: {
      count: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

import { db } from '../../../src/lib/database/index.js';

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session with valid data', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        title: 'Test Session',
        mode: 'fun',
        language: 'en',
        preview: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0
      };

      db.session.create.mockResolvedValue(mockSession);

      const result = await SessionService.createSession('user-123', 'Test Session', 'fun', 'en');

      expect(db.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          title: 'Test Session',
          mode: 'fun',
          language: 'en',
          preview: null
        }
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw validation error for missing userId', async () => {
      await expect(SessionService.createSession('', 'Test Session')).rejects.toThrow(
        SessionValidationError
      );
    });

    it('should throw validation error for missing title', async () => {
      await expect(SessionService.createSession('user-123', '')).rejects.toThrow(
        SessionValidationError
      );
    });

    it('should throw validation error for invalid mode', async () => {
      await expect(
        SessionService.createSession('user-123', 'Test Session', 'invalid')
      ).rejects.toThrow(SessionValidationError);
    });

    it('should throw validation error for title too long', async () => {
      const longTitle = 'a'.repeat(501);
      await expect(SessionService.createSession('user-123', longTitle)).rejects.toThrow(
        SessionValidationError
      );
    });
  });

  describe('getUserSessions', () => {
    it('should get user sessions with pagination', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          title: 'Session 1',
          _count: { messages: 5 }
        },
        {
          id: 'session-2',
          userId: 'user-123',
          title: 'Session 2',
          _count: { messages: 3 }
        }
      ];

      db.session.findMany.mockResolvedValue(mockSessions);
      db.session.count.mockResolvedValue(2);

      const result = await SessionService.getUserSessions('user-123', {
        page: 1,
        limit: 10
      });

      expect(db.session.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 10,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].messageCount).toBe(5);
      expect(result.sessions[1].messageCount).toBe(3);
      expect(result.pagination.totalCount).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('should throw validation error for invalid userId', async () => {
      await expect(SessionService.getUserSessions('')).rejects.toThrow(SessionValidationError);
    });

    it('should throw validation error for invalid pagination', async () => {
      await expect(
        SessionService.getUserSessions('user-123', { page: 0, limit: 10 })
      ).rejects.toThrow(SessionValidationError);

      await expect(
        SessionService.getUserSessions('user-123', { page: 1, limit: 101 })
      ).rejects.toThrow(SessionValidationError);
    });
  });

  describe('getSession', () => {
    it('should get a session by ID', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        title: 'Test Session',
        _count: { messages: 5 },
        messageCount: 4 // Simulating out of sync count
      };

      db.session.findFirst.mockResolvedValue(mockSession);
      db.session.update.mockResolvedValue({ ...mockSession, messageCount: 5 });

      const result = await SessionService.getSession('session-123', 'user-123');

      expect(db.session.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-123',
          userId: 'user-123'
        },
        include: {
          messages: false,
          _count: {
            select: { messages: true }
          }
        }
      });

      // Should update message count if out of sync
      expect(db.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { messageCount: 5 }
      });

      expect(result.messageCount).toBe(5);
      expect(result._count).toBeUndefined();
    });

    it('should throw SessionNotFoundError for non-existent session', async () => {
      db.session.findFirst.mockResolvedValue(null);

      await expect(SessionService.getSession('non-existent', 'user-123')).rejects.toThrow(
        SessionNotFoundError
      );
    });
  });

  describe('updateSession', () => {
    it('should update a session', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        title: 'Old Title'
      };

      const updatedSession = {
        ...existingSession,
        title: 'New Title'
      };

      db.session.findFirst.mockResolvedValue(existingSession);
      db.session.update.mockResolvedValue(updatedSession);

      const result = await SessionService.updateSession('session-123', 'user-123', {
        title: 'New Title'
      });

      expect(db.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { title: 'New Title' }
      });

      expect(result.title).toBe('New Title');
    });

    it('should throw SessionNotFoundError for non-existent session', async () => {
      db.session.findFirst.mockResolvedValue(null);

      await expect(
        SessionService.updateSession('non-existent', 'user-123', { title: 'New Title' })
      ).rejects.toThrow(SessionNotFoundError);
    });

    it('should throw validation error for no valid fields', async () => {
      await expect(
        SessionService.updateSession('session-123', 'user-123', { invalidField: 'value' })
      ).rejects.toThrow(SessionValidationError);
    });
  });

  describe('softDeleteSession', () => {
    it('should soft delete a FUN mode session', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        mode: 'fun',
        isHidden: false
      };

      db.session.findFirst.mockResolvedValue(existingSession);
      db.session.update.mockResolvedValue({ ...existingSession, isHidden: true });

      const result = await SessionService.softDeleteSession('session-123', 'user-123');

      expect(db.session.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-123', userId: 'user-123', isHidden: false }
      });

      expect(db.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { isHidden: true }
      });

      expect(result).toBe(true);
    });

    it('should throw validation error for LEARN mode session', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123',
        mode: 'learn',
        isHidden: false
      };

      db.session.findFirst.mockResolvedValue(existingSession);

      await expect(SessionService.softDeleteSession('session-123', 'user-123')).rejects.toThrow(
        SessionValidationError
      );

      expect(db.session.update).not.toHaveBeenCalled();
    });

    it('should throw SessionNotFoundError for non-existent session', async () => {
      db.session.findFirst.mockResolvedValue(null);

      await expect(SessionService.softDeleteSession('non-existent', 'user-123')).rejects.toThrow(
        SessionNotFoundError
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const existingSession = {
        id: 'session-123',
        userId: 'user-123'
      };

      db.session.findFirst.mockResolvedValue(existingSession);
      db.session.delete.mockResolvedValue(existingSession);

      const result = await SessionService.deleteSession('session-123', 'user-123');

      expect(db.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' }
      });

      expect(result).toBe(true);
    });

    it('should throw SessionNotFoundError for non-existent session', async () => {
      db.session.findFirst.mockResolvedValue(null);

      await expect(SessionService.deleteSession('non-existent', 'user-123')).rejects.toThrow(
        SessionNotFoundError
      );
    });
  });

  describe('searchSessions', () => {
    it('should search sessions by query', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Math Session',
          _count: { messages: 5 }
        }
      ];

      db.session.findMany.mockResolvedValue(mockSessions);
      db.session.count.mockResolvedValue(1);

      const result = await SessionService.searchSessions('user-123', 'math');

      expect(db.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { title: { contains: 'math', mode: 'insensitive' } },
            { preview: { contains: 'math', mode: 'insensitive' } }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          _count: {
            select: { messages: true }
          }
        }
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.query).toBe('math');
    });

    it('should throw validation error for empty query', async () => {
      await expect(SessionService.searchSessions('user-123', '')).rejects.toThrow(
        SessionValidationError
      );
    });
  });

  describe('getSessionStats', () => {
    it('should get session statistics', async () => {
      db.session.count
        .mockResolvedValueOnce(10) // total sessions
        .mockResolvedValueOnce(6) // fun sessions
        .mockResolvedValueOnce(4); // learn sessions

      db.message.count.mockResolvedValue(50); // total messages

      db.session.findFirst.mockResolvedValue({
        updatedAt: new Date('2023-01-01')
      });

      const result = await SessionService.getSessionStats('user-123');

      expect(result).toEqual({
        totalSessions: 10,
        funSessions: 6,
        learnSessions: 4,
        totalMessages: 50,
        lastActivity: new Date('2023-01-01')
      });
    });
  });

  describe('error handling and retry logic', () => {
    it('should retry on database connection errors', async () => {
      const connectionError = new Error('Connection failed');

      db.session.create
        .mockRejectedValueOnce(connectionError)
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce({
          id: 'session-123',
          userId: 'user-123',
          title: 'Test Session'
        });

      const result = await SessionService.createSession('user-123', 'Test Session');

      expect(db.session.create).toHaveBeenCalledTimes(3);
      expect(result.id).toBe('session-123');
    });

    it('should not retry validation errors', async () => {
      await expect(SessionService.createSession('', 'Test Session')).rejects.toThrow(
        SessionValidationError
      );

      expect(db.session.create).not.toHaveBeenCalled();
    });

    it('should throw SessionError after max retry attempts', async () => {
      const connectionError = new Error('Connection failed');
      db.session.create.mockRejectedValue(connectionError);

      await expect(SessionService.createSession('user-123', 'Test Session')).rejects.toThrow(
        SessionError
      );

      expect(db.session.create).toHaveBeenCalledTimes(3); // Max retry attempts
    });
  });
});
