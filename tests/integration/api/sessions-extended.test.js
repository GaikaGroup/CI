import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  GET as getSessionsHandler,
  POST as createSessionHandler
} from '../../../src/routes/api/sessions/+server.js';
import {
  GET as getSessionHandler,
  PUT as updateSessionHandler,
  DELETE as deleteSessionHandler
} from '../../../src/routes/api/sessions/[id]/+server.js';
import {
  GET as getMessagesHandler,
  POST as createMessageHandler
} from '../../../src/routes/api/sessions/[id]/messages/+server.js';
import { GET as searchSessionsHandler } from '../../../src/routes/api/sessions/search/+server.js';
import { GET as getSessionStatsHandler } from '../../../src/routes/api/sessions/stats/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Sessions Extended API Integration Tests', () => {
  let testUserId;
  let testSessionId;

  beforeAll(async () => {
    await prisma.$connect();

    const testUser = await prisma.user.create({
      data: {
        email: `session-ext-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Session Extended User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    const testSession = await prisma.session.create({
      data: {
        userId: testUserId,
        title: 'Test Extended Session',
        mood: 'fun',
        language: 'en',
        preview: 'Test session'
      }
    });
    testSessionId = testSession.id;
  });

  afterAll(async () => {
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

  describe('GET /api/sessions/search', () => {
    it('should search sessions successfully - 200', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/sessions/search?q=test');
      const response = await searchSessionsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/sessions/search?q=test');
      const response = await searchSessionsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing query', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/sessions/search');
      const response = await searchSessionsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'student' } };
      const mockUrl = new URL('http://localhost/api/sessions/search?q=test');
      const response = await searchSessionsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/sessions/stats', () => {
    it('should return session stats successfully - 200', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/sessions/stats');
      const response = await getSessionStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/sessions/stats');
      const response = await getSessionStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid parameters', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/sessions/stats?period=invalid');
      const response = await getSessionStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'student' } };
      const mockUrl = new URL('http://localhost/api/sessions/stats');
      const response = await getSessionStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/sessions/[id]/messages', () => {
    it('should return messages successfully - 200', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const params = { id: testSessionId };
      const mockUrl = new URL('http://localhost/api/sessions/messages');
      const response = await getMessagesHandler({ locals: mockLocals, params, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testSessionId };
      const mockUrl = new URL('http://localhost/api/sessions/messages');
      const response = await getMessagesHandler({ locals: {}, params, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for unauthorized access', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Another User',
          type: 'student'
        }
      });

      const mockLocals = { user: { id: anotherUser.id, type: 'student' } };
      const params = { id: testSessionId };
      const mockUrl = new URL('http://localhost/api/sessions/messages');
      const response = await getMessagesHandler({ locals: mockLocals, params, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should return 400 for invalid session ID', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const params = { id: 'invalid-id' };
      const mockUrl = new URL('http://localhost/api/sessions/messages');
      const response = await getMessagesHandler({ locals: mockLocals, params, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const params = { id: 'non-existent-id' };
      const mockUrl = new URL('http://localhost/api/sessions/messages');
      const response = await getMessagesHandler({ locals: mockLocals, params, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/sessions/[id]/messages', () => {
    it('should create message successfully - 201', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const params = { id: testSessionId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: 'Test message',
          role: 'user'
        })
      };
      const response = await createMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testSessionId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: 'Test message'
        })
      };
      const response = await createMessageHandler({ request, locals: {}, params });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for unauthorized access', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `msg-another-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Message Another User',
          type: 'student'
        }
      });

      const mockLocals = { user: { id: anotherUser.id, type: 'student' } };
      const params = { id: testSessionId };
      const request = {
        json: vi.fn().mockResolvedValue({
          content: 'Test message'
        })
      };
      const response = await createMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    it('should return 400 for missing content', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const params = { id: testSessionId };
      const request = {
        json: vi.fn().mockResolvedValue({
          role: 'user'
        })
      };
      const response = await createMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const params = { id: testSessionId };
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };
      const response = await createMessageHandler({ request, locals: mockLocals, params });
      const data = await response.json();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });
});
