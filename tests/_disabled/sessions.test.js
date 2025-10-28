import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';
import { MessageService } from '../../../src/lib/modules/session/services/MessageService.js';

// Mock user for testing
const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com'
};

describe('Sessions API Integration Tests', () => {
  let testSessionId;

  beforeEach(async () => {
    // Create a test session for each test
    const session = await SessionService.createSession(
      mockUser.id,
      'Test Session',
      'fun',
      'en',
      'Test session preview'
    );
    testSessionId = session.id;
  });

  afterEach(async () => {
    // Clean up test session
    if (testSessionId) {
      try {
        await SessionService.deleteSession(testSessionId, mockUser.id);
      } catch (error) {
        // Session might already be deleted
        console.log('Session cleanup error (expected):', error.message);
      }
    }
  });

  describe('SessionService', () => {
    it('should create a session successfully', async () => {
      const session = await SessionService.createSession(
        mockUser.id,
        'New Test Session',
        'learn',
        'es',
        'Spanish learning session'
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(mockUser.id);
      expect(session.title).toBe('New Test Session');
      expect(session.mode).toBe('learn');
      expect(session.language).toBe('es');
      expect(session.preview).toBe('Spanish learning session');
      expect(session.messageCount).toBe(0);

      // Clean up
      await SessionService.deleteSession(session.id, mockUser.id);
    });

    it('should get user sessions with pagination', async () => {
      const result = await SessionService.getUserSessions(mockUser.id, {
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.sessions).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.sessions.length).toBeGreaterThan(0);
    });

    it('should get a specific session', async () => {
      const session = await SessionService.getSession(testSessionId, mockUser.id);

      expect(session).toBeDefined();
      expect(session.id).toBe(testSessionId);
      expect(session.userId).toBe(mockUser.id);
      expect(session.title).toBe('Test Session');
    });

    it('should update a session', async () => {
      const updates = {
        title: 'Updated Test Session',
        preview: 'Updated preview'
      };

      const updatedSession = await SessionService.updateSession(
        testSessionId,
        mockUser.id,
        updates
      );

      expect(updatedSession.title).toBe('Updated Test Session');
      expect(updatedSession.preview).toBe('Updated preview');
    });

    it('should search sessions', async () => {
      const result = await SessionService.searchSessions(mockUser.id, 'Test', {
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.sessions).toBeInstanceOf(Array);
      expect(result.query).toBe('Test');
      expect(result.sessions.length).toBeGreaterThan(0);
    });

    it('should get session statistics', async () => {
      const stats = await SessionService.getSessionStats(mockUser.id);

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThan(0);
      expect(typeof stats.funSessions).toBe('number');
      expect(typeof stats.learnSessions).toBe('number');
      expect(typeof stats.totalMessages).toBe('number');
    });
  });

  describe('MessageService', () => {
    it('should add a message to a session', async () => {
      const message = await MessageService.addMessage(
        testSessionId,
        'user',
        'Hello, this is a test message',
        { timestamp: new Date().toISOString() },
        mockUser.id
      );

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.sessionId).toBe(testSessionId);
      expect(message.type).toBe('user');
      expect(message.content).toBe('Hello, this is a test message');
      expect(message.metadata).toBeDefined();
    });

    it('should get session messages with pagination', async () => {
      // Add a test message first
      await MessageService.addMessage(
        testSessionId,
        'user',
        'Test message for pagination',
        null,
        mockUser.id
      );

      const result = await MessageService.getSessionMessages(
        testSessionId,
        { page: 1, limit: 10 },
        mockUser.id
      );

      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should search messages', async () => {
      // Add a test message first
      await MessageService.addMessage(
        testSessionId,
        'user',
        'Searchable test message content',
        null,
        mockUser.id
      );

      const result = await MessageService.searchMessages(mockUser.id, 'Searchable', {
        page: 1,
        limit: 10
      });

      expect(result).toBeDefined();
      expect(result.messages).toBeInstanceOf(Array);
      expect(result.query).toBe('Searchable');
    });

    it('should get recent messages', async () => {
      // Add a test message first
      await MessageService.addMessage(
        testSessionId,
        'assistant',
        'Recent test message',
        null,
        mockUser.id
      );

      const messages = await MessageService.getRecentMessages(mockUser.id, 5);

      expect(messages).toBeInstanceOf(Array);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].session).toBeDefined();
    });

    it('should get message statistics', async () => {
      // Add test messages
      await MessageService.addMessage(testSessionId, 'user', 'User message', null, mockUser.id);
      await MessageService.addMessage(
        testSessionId,
        'assistant',
        'Assistant message',
        null,
        mockUser.id
      );

      const stats = await MessageService.getMessageStats(mockUser.id);

      expect(stats).toBeDefined();
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(typeof stats.userMessages).toBe('number');
      expect(typeof stats.assistantMessages).toBe('number');
    });
  });
});
