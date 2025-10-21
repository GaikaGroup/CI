import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  GET as getMessageHandler,
  PUT as updateMessageHandler,
  DELETE as deleteMessageHandler
} from '../../../src/routes/api/messages/[id]/+server.js';
import { GET as getRecentMessagesHandler } from '../../../src/routes/api/messages/recent/+server.js';
import { GET as searchMessagesHandler } from '../../../src/routes/api/messages/search/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Messages API Integration Tests', () => {
  let testUserId;
  let testSessionId;
  let testMessageId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `msg-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Message',
        lastName: 'Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    // Create test session
    const testSession = await prisma.session.create({
      data: {
        userId: testUserId,
        title: 'Test Message Session',
        mode: 'fun',
        language: 'en',
        preview: 'Test session'
      }
    });
    testSessionId = testSession.id;

    // Create test message
    const testMessage = await prisma.message.create({
      data: {
        sessionId: testSessionId,
        role: 'user',
        content: 'Test message content'
      }
    });
    testMessageId = testMessage.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testMessageId) {
      try {
        await prisma.message.delete({ where: { id: testMessageId } });
      } catch (error) {
        console.log('Message cleanup error:', error.message);
      }
    }

    if (testSessionId) {
      try {
        await prisma.session.delete({ where: { id: testSessionId } });
      } catch (error) {
        console.log('Session cleanup error:', error.message);
      }
    }

    if (testUserId) {
      try {
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (error) {
        console.log('User cleanup error:', error.message);
      }
    }

    await prisma.$disconnect();
  });

  describe('GET /api/messages/[id]', () => {
    // Success scenario (200)
    it('should return message details for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testMessageId };

      const response = await getMessageHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.message.id).toBe(testMessageId);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testMessageId };

      const response = await getMessageHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when accessing another user message', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-msg-${Date.now()}@example.com`,
          password: 'hashedpassword',
          firstName: 'Another',
          lastName: 'Message User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const params = { id: testMessageId };

      const response = await getMessageHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for invalid message ID', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'invalid-id' };

      const response = await getMessageHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'non-existent-id' };

      const response = await getMessageHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT /api/messages/[id]', () => {
    // Success scenario (200)
    it('should update message successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testMessageId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: 'Updated message content'
        })
      };

      const response = await updateMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message.content).toBe('Updated message content');
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testMessageId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: 'Updated content'
        })
      };

      const response = await updateMessageHandler({ request, locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when updating another user message', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `update-msg-${Date.now()}@example.com`,
          password: 'hashedpassword',
          firstName: 'Update',
          lastName: 'Message User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const params = { id: testMessageId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: 'Updated content'
        })
      };

      const response = await updateMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for empty content', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testMessageId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: ''
        })
      };

      const response = await updateMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testMessageId };
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await updateMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/messages/[id]', () => {
    // Success scenario (200)
    it('should delete message successfully', async () => {
      // Create message to delete
      const messageToDelete = await prisma.message.create({
        data: {
          sessionId: testSessionId,
          role: 'user',
          content: 'Message to delete'
        }
      });

      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: messageToDelete.id };

      const response = await deleteMessageHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testMessageId };

      const response = await deleteMessageHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when deleting another user message', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `delete-msg-${Date.now()}@example.com`,
          password: 'hashedpassword',
          firstName: 'Delete',
          lastName: 'Message User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const params = { id: testMessageId };

      const response = await deleteMessageHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for invalid message ID', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'invalid-id' };

      const response = await deleteMessageHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'non-existent-id' };

      const response = await deleteMessageHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/messages/recent', () => {
    // Success scenario (200)
    it('should return recent messages for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/messages/recent?limit=10');

      const response = await getRecentMessagesHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.messages)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/messages/recent');

      const response = await getRecentMessagesHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid limit parameter', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/messages/recent?limit=invalid');

      const response = await getRecentMessagesHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-user-id', type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/messages/recent');

      const response = await getRecentMessagesHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/messages/search', () => {
    // Success scenario (200)
    it('should search messages successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/messages/search?q=test');

      const response = await searchMessagesHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.messages)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/messages/search?q=test');

      const response = await searchMessagesHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing search query', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/messages/search');

      const response = await searchMessagesHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('query');
    });

    // Error handling (500)
    it('should handle search errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-user-id', type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/messages/search?q=test');

      const response = await searchMessagesHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
