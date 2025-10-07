/**
 * MessageService unit tests
 * Tests for message CRUD operations, error handling, and pagination
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MessageService,
  MessageError,
  MessageNotFoundError,
  MessageValidationError
} from '../../../src/lib/modules/session/services/MessageService.js';
import { SessionNotFoundError } from '../../../src/lib/modules/session/services/SessionService.js';

// Mock the database connection
vi.mock('../../../src/lib/database/index.js', () => ({
  db: {
    session: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

// Mock SessionService
vi.mock('../../../src/lib/modules/session/services/SessionService.js', async () => {
  const actual = await vi.importActual(
    '../../../src/lib/modules/session/services/SessionService.js'
  );
  return {
    ...actual,
    SessionService: {
      getSession: vi.fn()
    }
  };
});

import { db } from '../../../src/lib/database/index.js';
import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';

describe('MessageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addMessage', () => {
    it('should add a message with valid data', async () => {
      const mockMessage = {
        id: 'message-123',
        sessionId: 'session-123',
        type: 'user',
        content: 'Hello, world!',
        metadata: null,
        createdAt: new Date()
      };

      SessionService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123'
      });

      db.$transaction.mockImplementation(async (callback) => {
        return await callback({
          message: {
            create: vi.fn().mockResolvedValue(mockMessage)
          },
          session: {
            update: vi.fn().mockResolvedValue({})
          }
        });
      });

      const result = await MessageService.addMessage(
        'session-123',
        'user',
        'Hello, world!',
        null,
        'user-123'
      );

      expect(SessionService.getSession).toHaveBeenCalledWith('session-123', 'user-123', false);
      expect(result).toEqual(mockMessage);
    });

    it('should add a message with metadata', async () => {
      const metadata = {
        audioUrl: 'https://example.com/audio.mp3',
        language: 'en',
        timestamp: new Date().toISOString()
      };

      const mockMessage = {
        id: 'message-123',
        sessionId: 'session-123',
        type: 'assistant',
        content: 'Hello back!',
        metadata,
        createdAt: new Date()
      };

      SessionService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123'
      });

      db.$transaction.mockImplementation(async (callback) => {
        return await callback({
          message: {
            create: vi.fn().mockResolvedValue(mockMessage)
          },
          session: {
            update: vi.fn().mockResolvedValue({})
          }
        });
      });

      const result = await MessageService.addMessage(
        'session-123',
        'assistant',
        'Hello back!',
        metadata,
        'user-123'
      );

      expect(result.metadata).toEqual(metadata);
    });

    it('should throw validation error for missing sessionId', async () => {
      await expect(MessageService.addMessage('', 'user', 'Hello')).rejects.toThrow(
        MessageValidationError
      );
    });

    it('should throw validation error for invalid message type', async () => {
      await expect(MessageService.addMessage('session-123', 'invalid', 'Hello')).rejects.toThrow(
        MessageValidationError
      );
    });

    it('should throw validation error for empty content', async () => {
      await expect(MessageService.addMessage('session-123', 'user', '')).rejects.toThrow(
        MessageValidationError
      );
    });

    it('should throw validation error for content too long', async () => {
      const longContent = 'a'.repeat(50001);
      await expect(MessageService.addMessage('session-123', 'user', longContent)).rejects.toThrow(
        MessageValidationError
      );
    });

    it('should throw validation error for invalid metadata', async () => {
      await expect(
        MessageService.addMessage('session-123', 'user', 'Hello', 'invalid-metadata')
      ).rejects.toThrow(MessageValidationError);
    });

    it('should throw SessionNotFoundError for non-existent session', async () => {
      SessionService.getSession.mockRejectedValue(new SessionNotFoundError('session-123'));

      await expect(
        MessageService.addMessage('session-123', 'user', 'Hello', null, 'user-123')
      ).rejects.toThrow(SessionNotFoundError);
    });
  });

  describe('getSessionMessages', () => {
    it('should get messages with pagination', async () => {
      const mockMessages = [
        {
          id: 'message-1',
          sessionId: 'session-123',
          type: 'user',
          content: 'Hello',
          createdAt: new Date()
        },
        {
          id: 'message-2',
          sessionId: 'session-123',
          type: 'assistant',
          content: 'Hi there!',
          createdAt: new Date()
        }
      ];

      SessionService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123'
      });

      db.message.findMany.mockResolvedValue(mockMessages);
      db.message.count.mockResolvedValue(2);

      const result = await MessageService.getSessionMessages(
        'session-123',
        { page: 1, limit: 10 },
        'user-123'
      );

      expect(db.message.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123' },
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 10
      });

      expect(result.messages).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('should filter messages by type', async () => {
      const mockMessages = [
        {
          id: 'message-1',
          sessionId: 'session-123',
          type: 'user',
          content: 'Hello'
        }
      ];

      db.message.findMany.mockResolvedValue(mockMessages);
      db.message.count.mockResolvedValue(1);

      const result = await MessageService.getSessionMessages('session-123', { type: 'user' });

      expect(db.message.findMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-123', type: 'user' },
        orderBy: { createdAt: 'asc' },
        skip: 0,
        take: 50
      });

      expect(result.messages).toHaveLength(1);
    });

    it('should throw validation error for invalid pagination', async () => {
      await expect(
        MessageService.getSessionMessages('session-123', { page: 0, limit: 10 })
      ).rejects.toThrow(MessageValidationError);

      await expect(
        MessageService.getSessionMessages('session-123', { page: 1, limit: 201 })
      ).rejects.toThrow(MessageValidationError);
    });
  });

  describe('getMessage', () => {
    it('should get a message by ID', async () => {
      const mockMessage = {
        id: 'message-123',
        sessionId: 'session-123',
        type: 'user',
        content: 'Hello',
        session: {
          userId: 'user-123'
        }
      };

      db.message.findUnique.mockResolvedValue(mockMessage);

      const result = await MessageService.getMessage('message-123', 'user-123');

      expect(db.message.findUnique).toHaveBeenCalledWith({
        where: { id: 'message-123' },
        include: {
          session: {
            select: { userId: true }
          }
        }
      });

      expect(result.session).toBeUndefined(); // Should be removed from response
    });

    it('should throw MessageNotFoundError for non-existent message', async () => {
      db.message.findUnique.mockResolvedValue(null);

      await expect(MessageService.getMessage('non-existent', 'user-123')).rejects.toThrow(
        MessageNotFoundError
      );
    });

    it('should throw access denied error for unauthorized user', async () => {
      const mockMessage = {
        id: 'message-123',
        session: {
          userId: 'other-user'
        }
      };

      db.message.findUnique.mockResolvedValue(mockMessage);

      await expect(MessageService.getMessage('message-123', 'user-123')).rejects.toThrow(
        MessageError
      );
    });
  });

  describe('updateMessage', () => {
    it('should update a message', async () => {
      const existingMessage = {
        id: 'message-123',
        content: 'Old content',
        session: {
          userId: 'user-123'
        }
      };

      const updatedMessage = {
        ...existingMessage,
        content: 'New content'
      };

      db.message.findUnique.mockResolvedValue(existingMessage);
      db.message.update.mockResolvedValue(updatedMessage);

      const result = await MessageService.updateMessage(
        'message-123',
        { content: 'New content' },
        'user-123'
      );

      expect(db.message.update).toHaveBeenCalledWith({
        where: { id: 'message-123' },
        data: { content: 'New content' }
      });

      expect(result.content).toBe('New content');
    });

    it('should throw validation error for no valid fields', async () => {
      await expect(
        MessageService.updateMessage('message-123', { invalidField: 'value' }, 'user-123')
      ).rejects.toThrow(MessageValidationError);
    });

    it('should throw validation error for empty content', async () => {
      await expect(
        MessageService.updateMessage('message-123', { content: '' }, 'user-123')
      ).rejects.toThrow(MessageValidationError);
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const existingMessage = {
        id: 'message-123',
        session: {
          id: 'session-123',
          userId: 'user-123'
        }
      };

      db.message.findUnique.mockResolvedValue(existingMessage);

      db.$transaction.mockImplementation(async (callback) => {
        return await callback({
          message: {
            delete: vi.fn().mockResolvedValue(existingMessage)
          },
          session: {
            update: vi.fn().mockResolvedValue({})
          }
        });
      });

      const result = await MessageService.deleteMessage('message-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should throw MessageNotFoundError for non-existent message', async () => {
      db.message.findUnique.mockResolvedValue(null);

      await expect(MessageService.deleteMessage('non-existent', 'user-123')).rejects.toThrow(
        MessageNotFoundError
      );
    });
  });

  describe('getRecentMessages', () => {
    it('should get recent messages for a user', async () => {
      const mockMessages = [
        {
          id: 'message-1',
          content: 'Recent message',
          session: {
            id: 'session-123',
            title: 'Test Session',
            mode: 'fun',
            language: 'en'
          }
        }
      ];

      db.message.findMany.mockResolvedValue(mockMessages);

      const result = await MessageService.getRecentMessages('user-123', 5);

      expect(db.message.findMany).toHaveBeenCalledWith({
        where: {
          session: {
            userId: 'user-123'
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          session: {
            select: {
              id: true,
              title: true,
              mode: true,
              language: true
            }
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].session.title).toBe('Test Session');
    });

    it('should throw validation error for invalid limit', async () => {
      await expect(MessageService.getRecentMessages('user-123', 0)).rejects.toThrow(
        MessageValidationError
      );

      await expect(MessageService.getRecentMessages('user-123', 101)).rejects.toThrow(
        MessageValidationError
      );
    });
  });

  describe('searchMessages', () => {
    it('should search messages by content', async () => {
      const mockMessages = [
        {
          id: 'message-1',
          content: 'Hello world',
          session: {
            id: 'session-123',
            title: 'Test Session'
          }
        }
      ];

      db.message.findMany.mockResolvedValue(mockMessages);
      db.message.count.mockResolvedValue(1);

      const result = await MessageService.searchMessages('user-123', 'hello');

      expect(db.message.findMany).toHaveBeenCalledWith({
        where: {
          session: { userId: 'user-123' },
          content: { contains: 'hello', mode: 'insensitive' }
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          session: {
            select: {
              id: true,
              title: true,
              mode: true,
              language: true
            }
          }
        }
      });

      expect(result.messages).toHaveLength(1);
      expect(result.query).toBe('hello');
    });

    it('should throw validation error for empty query', async () => {
      await expect(MessageService.searchMessages('user-123', '')).rejects.toThrow(
        MessageValidationError
      );
    });
  });

  describe('bulkDeleteMessages', () => {
    it('should bulk delete messages', async () => {
      const messageIds = ['message-1', 'message-2', 'message-3'];

      SessionService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123'
      });

      db.$transaction.mockImplementation(async (callback) => {
        return await callback({
          message: {
            deleteMany: vi.fn().mockResolvedValue({ count: 3 })
          },
          session: {
            update: vi.fn().mockResolvedValue({})
          }
        });
      });

      const result = await MessageService.bulkDeleteMessages('session-123', messageIds, 'user-123');

      expect(result).toBe(3);
    });

    it('should throw validation error for empty message IDs array', async () => {
      await expect(
        MessageService.bulkDeleteMessages('session-123', [], 'user-123')
      ).rejects.toThrow(MessageValidationError);
    });

    it('should throw validation error for too many message IDs', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `message-${i}`);

      await expect(
        MessageService.bulkDeleteMessages('session-123', tooManyIds, 'user-123')
      ).rejects.toThrow(MessageValidationError);
    });
  });

  describe('getMessageStats', () => {
    it('should get message statistics', async () => {
      db.message.count
        .mockResolvedValueOnce(100) // total messages
        .mockResolvedValueOnce(60) // user messages
        .mockResolvedValueOnce(40); // assistant messages

      db.message.findFirst.mockResolvedValue({
        createdAt: new Date('2023-01-01')
      });

      const result = await MessageService.getMessageStats('user-123');

      expect(result).toEqual({
        totalMessages: 100,
        userMessages: 60,
        assistantMessages: 40,
        lastMessage: new Date('2023-01-01')
      });
    });
  });

  describe('error handling and retry logic', () => {
    it('should retry on database connection errors', async () => {
      const connectionError = new Error('Connection failed');

      SessionService.getSession.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123'
      });

      db.$transaction
        .mockRejectedValueOnce(connectionError)
        .mockRejectedValueOnce(connectionError)
        .mockImplementation(async (callback) => {
          return await callback({
            message: {
              create: vi.fn().mockResolvedValue({
                id: 'message-123',
                sessionId: 'session-123',
                type: 'user',
                content: 'Hello'
              })
            },
            session: {
              update: vi.fn().mockResolvedValue({})
            }
          });
        });

      const result = await MessageService.addMessage(
        'session-123',
        'user',
        'Hello',
        null,
        'user-123'
      );

      expect(db.$transaction).toHaveBeenCalledTimes(3);
      expect(result.id).toBe('message-123');
    });

    it('should not retry validation errors', async () => {
      await expect(MessageService.addMessage('', 'user', 'Hello')).rejects.toThrow(
        MessageValidationError
      );

      expect(db.$transaction).not.toHaveBeenCalled();
    });
  });
});
