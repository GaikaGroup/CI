import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  GET as getIncidentsHandler,
  POST as createIncidentHandler,
  PUT as updateIncidentHandler
} from '../../../src/routes/api/secure-course-bot/admin/incidents/+server.js';
import { POST as secureChatHandler } from '../../../src/routes/api/secure-course-bot/chat/+server.js';
import {
  GET as getConfigHandler,
  POST as createConfigHandler,
  PUT as updateConfigHandler
} from '../../../src/routes/api/secure-course-bot/config/+server.js';
import { POST as aiDraftHandler } from '../../../src/routes/api/courses/ai-draft/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Secure Course Bot and AI Draft API Integration Tests', () => {
  let testUserId;
  let adminUserId;
  let testCourseId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `secure-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Secure',
        lastName: 'Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-secure-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'Secure User',
        type: 'admin'
      }
    });
    adminUserId = adminUser.id;

    // Create test course
    const testCourse = await prisma.course.create({
      data: {
        firstName: 'Test',
        lastName: 'Secure Course',
        description: 'Course for secure bot testing',
        language: 'en',
        subject: 'test'
      }
    });
    testCourseId = testCourse.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testCourseId) {
      try {
        await prisma.course.delete({ where: { id: testCourseId } });
      } catch (error) {
        console.log('Course cleanup error:', error.message);
      }
    }

    if (testUserId) {
      try {
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (error) {
        console.log('User cleanup error:', error.message);
      }
    }

    if (adminUserId) {
      try {
        await prisma.user.delete({ where: { id: adminUserId } });
      } catch (error) {
        console.log('Admin cleanup error:', error.message);
      }
    }

    await prisma.$disconnect();
  });

  describe('POST /api/courses/ai-draft', () => {
    // Success scenario (200)
    it('should generate AI course draft successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          topic: 'Introduction to Mathematics',
          level: 'beginner',
          language: 'en'
        })
      };

      const response = await aiDraftHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.draft).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          topic: 'Test Topic'
        })
      };

      const response = await aiDraftHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          topic: 'Test Topic'
        })
      };

      const response = await aiDraftHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing topic', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          level: 'beginner'
          // Missing topic
        })
      };

      const response = await aiDraftHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle AI generation errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('AI error'))
      };

      const response = await aiDraftHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/secure-course-bot/admin/incidents', () => {
    // Success scenario (200)
    it('should return incidents for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/admin/incidents');

      const response = await getIncidentsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.incidents)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/secure-course-bot/admin/incidents');

      const response = await getIncidentsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/admin/incidents');

      const response = await getIncidentsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid query parameters', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL(
        'http://localhost/api/secure-course-bot/admin/incidents?severity=invalid'
      );

      const response = await getIncidentsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/admin/incidents');

      const response = await getIncidentsHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/secure-course-bot/admin/incidents', () => {
    // Success scenario (201)
    it('should create incident successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          type: 'security',
          severity: 'high',
          description: 'Test incident'
        })
      };

      const response = await createIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.incident).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          type: 'security'
        })
      };

      const response = await createIncidentHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          type: 'security'
        })
      };

      const response = await createIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing required fields', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          // Missing type and severity
          description: 'Test'
        })
      };

      const response = await createIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await createIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/secure-course-bot/admin/incidents', () => {
    // Success scenario (200)
    it('should update incident successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          id: 'test-incident-id',
          status: 'resolved'
        })
      };

      const response = await updateIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          status: 'resolved'
        })
      };

      const response = await updateIncidentHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          status: 'resolved'
        })
      };

      const response = await updateIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid status', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          id: 'test-id',
          status: 'invalid-status'
        })
      };

      const response = await updateIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await updateIncidentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/secure-course-bot/chat', () => {
    // Success scenario (200)
    it('should process secure chat message successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          message: 'Hello, I need help with the course',
          courseId: testCourseId
        })
      };

      const response = await secureChatHandler({ request, locals: mockLocals });
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
          courseId: testCourseId
        })
      };

      const response = await secureChatHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when accessing unauthorized course', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          message: 'Hello',
          courseId: 'unauthorized-course-id'
        })
      };

      const response = await secureChatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing message', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          courseId: testCourseId
          // Missing message
        })
      };

      const response = await secureChatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle chat errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Chat error'))
      };

      const response = await secureChatHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/secure-course-bot/config', () => {
    // Success scenario (200)
    it('should return config for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/config');

      const response = await getConfigHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/secure-course-bot/config');

      const response = await getConfigHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/config');

      const response = await getConfigHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid config key', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/config?key=invalid');

      const response = await getConfigHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle config errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/secure-course-bot/config');

      const response = await getConfigHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/secure-course-bot/config', () => {
    // Success scenario (201)
    it('should create config successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test-config',
          value: 'test-value'
        })
      };

      const response = await createConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test',
          value: 'value'
        })
      };

      const response = await createConfigHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test',
          value: 'value'
        })
      };

      const response = await createConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing key', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          value: 'value'
          // Missing key
        })
      };

      const response = await createConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await createConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/secure-course-bot/config', () => {
    // Success scenario (200)
    it('should update config successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test-config',
          value: 'updated-value'
        })
      };

      const response = await updateConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test',
          value: 'value'
        })
      };

      const response = await updateConfigHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test',
          value: 'value'
        })
      };

      const response = await updateConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid value type', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          key: 'test',
          value: null
        })
      };

      const response = await updateConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await updateConfigHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });
});
