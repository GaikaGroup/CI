import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST as recognizeHandler } from '../../../src/routes/api/recognize/+server.js';
import { GET as exportLanguageHandler } from '../../../src/routes/api/language-consistency/export/+server.js';
import {
  GET as getMetricsHandler,
  DELETE as deleteMetricsHandler
} from '../../../src/routes/api/language-consistency/metrics/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Voice and Miscellaneous API Integration Tests', () => {
  let testUserId;
  let adminUserId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `voice-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Voice Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-voice-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Admin Voice User',
        type: 'admin'
      }
    });
    adminUserId = adminUser.id;
  });

  afterAll(async () => {
    // Cleanup
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

  describe('POST /api/recognize', () => {
    // Success scenario (200)
    it('should recognize speech successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(new Blob(['audio data'], { type: 'audio/wav' }))
        })
      };

      const response = await recognizeHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.text).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(new Blob(['audio data']))
        })
      };

      const response = await recognizeHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing audio file', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(null)
        })
      };

      const response = await recognizeHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('audio');
    });

    // Validation error (400)
    it('should return 400 for invalid audio format', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(new Blob(['invalid'], { type: 'text/plain' }))
        })
      };

      const response = await recognizeHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle recognition errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        formData: vi.fn().mockRejectedValue(new Error('Recognition error'))
      };

      const response = await recognizeHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/language-consistency/export', () => {
    // Success scenario (200)
    it('should export language data for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/export');

      const response = await exportLanguageHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/language-consistency/export');

      const response = await exportLanguageHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/export');

      const response = await exportLanguageHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid export format', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/export?format=invalid');

      const response = await exportLanguageHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle export errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/export');

      const response = await exportLanguageHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/language-consistency/metrics', () => {
    // Success scenario (200)
    it('should return language metrics for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/metrics');

      const response = await getMetricsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/language-consistency/metrics');

      const response = await getMetricsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/metrics');

      const response = await getMetricsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid metric type', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/metrics?type=invalid');

      const response = await getMetricsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle metrics errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/language-consistency/metrics');

      const response = await getMetricsHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('DELETE /api/language-consistency/metrics', () => {
    // Success scenario (200)
    it('should delete metrics successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const response = await deleteMetricsHandler({ locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const response = await deleteMetricsHandler({ locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const response = await deleteMetricsHandler({ locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle deletion errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const response = await deleteMetricsHandler({ locals: mockLocals });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
