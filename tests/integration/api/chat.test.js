import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST as chatHandler } from '../../../src/routes/api/chat/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Chat API Integration Tests', () => {
  let testUserId;
  let testSessionId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `chat-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Chat Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    // Create test session
    const testSession = await prisma.session.create({
      data: {
        userId: testUserId,
        title: 'Test Chat Session',
        mood: 'fun',
        language: 'en',
        preview: 'Test session'
      }
    });
    testSessionId = testSession.id;
  });

  afterAll(async () => {
    // Cleanup
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

  describe('POST /api/chat', () => {
    // Success scenario (200)
    it('should process chat message successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          message: 'Hello, can you help me with math?',
          sessionId: testSessionId,
          language: 'en'
        })
      };

      const response = await chatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.response).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          message: 'Hello',
          sessionId: testSessionId
        })
      };

      const response = await chatHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication');
    });

    // Authorization error (403)
    it('should return 403 when accessing another user session', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-chat-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Another Chat User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          message: 'Hello',
          sessionId: testSessionId
        })
      };

      const response = await chatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for missing message', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          sessionId: testSessionId
          // Missing message
        })
      };

      const response = await chatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    // Validation error (400)
    it('should return 400 for empty message', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          message: '',
          sessionId: testSessionId
        })
      };

      const response = await chatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid session ID', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          message: 'Hello',
          sessionId: 'invalid-session-id'
        })
      };

      const response = await chatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await chatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });
});
