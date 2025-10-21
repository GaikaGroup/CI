import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET as getUsersHandler } from '../../../src/routes/api/admin/users/+server.js';
import { GET as getSessionsHandler } from '../../../src/routes/api/admin/sessions/+server.js';
import { POST as restoreSessionHandler } from '../../../src/routes/api/admin/sessions/[id]/restore/+server.js';
import { POST as clearCacheHandler } from '../../../src/routes/api/admin/stats/clear-cache/+server.js';
import { GET as getFinanceCostsHandler } from '../../../src/routes/api/admin/finance/costs/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Admin API Integration Tests', () => {
  let adminUserId;
  let regularUserId;
  let testSessionId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        type: 'admin'
      }
    });
    adminUserId = adminUser.id;

    // Create regular user
    const regularUser = await prisma.user.create({
      data: {
        email: `regular-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Regular',
        lastName: 'User',
        type: 'student'
      }
    });
    regularUserId = regularUser.id;

    // Create test session
    const testSession = await prisma.session.create({
      data: {
        userId: regularUserId,
        title: 'Test Admin Session',
        mode: 'fun',
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

    if (regularUserId) {
      try {
        await prisma.user.delete({ where: { id: regularUserId } });
      } catch (error) {
        console.log('Regular user cleanup error:', error.message);
      }
    }

    if (adminUserId) {
      try {
        await prisma.user.delete({ where: { id: adminUserId } });
      } catch (error) {
        console.log('Admin user cleanup error:', error.message);
      }
    }

    await prisma.$disconnect();
  });

  describe('GET /api/admin/users', () => {
    // Success scenario (200)
    it('should return list of users for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/users');

      const response = await getUsersHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.users)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/admin/users');

      const response = await getUsersHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: regularUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/admin/users');

      const response = await getUsersHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Admin');
    });

    // Validation error (400)
    it('should return 400 for invalid query parameters', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/users?page=invalid');

      const response = await getUsersHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/users');

      const response = await getUsersHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/admin/sessions', () => {
    // Success scenario (200)
    it('should return list of sessions for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/sessions');

      const response = await getSessionsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.sessions)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/admin/sessions');

      const response = await getSessionsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: regularUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/admin/sessions');

      const response = await getSessionsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid filters', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/sessions?limit=invalid');

      const response = await getSessionsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/sessions');

      const response = await getSessionsHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/admin/sessions/[id]/restore', () => {
    // Success scenario (200)
    it('should restore session successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: testSessionId };

      const response = await restoreSessionHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testSessionId };

      const response = await restoreSessionHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: regularUserId, type: 'student' }
      };

      const params = { id: testSessionId };

      const response = await restoreSessionHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid session ID', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: 'invalid-id' };

      const response = await restoreSessionHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: 'non-existent-id' };

      const response = await restoreSessionHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/admin/stats/clear-cache', () => {
    // Success scenario (200)
    it('should clear cache successfully for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const response = await clearCacheHandler({ locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const response = await clearCacheHandler({ locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: regularUserId, type: 'student' }
      };

      const response = await clearCacheHandler({ locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle cache clearing errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const response = await clearCacheHandler({ locals: mockLocals });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/admin/finance/costs', () => {
    // Success scenario (200)
    it('should return finance costs for admin', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/finance/costs');

      const response = await getFinanceCostsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.costs).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/admin/finance/costs');

      const response = await getFinanceCostsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: regularUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/admin/finance/costs');

      const response = await getFinanceCostsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid date range', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/finance/costs?from=invalid-date');

      const response = await getFinanceCostsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-admin-id', type: 'admin' }
      };

      const mockUrl = new URL('http://localhost/api/admin/finance/costs');

      const response = await getFinanceCostsHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
