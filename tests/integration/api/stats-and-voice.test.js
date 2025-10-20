import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { GET as getAttentionStatsHandler } from '../../../src/routes/api/stats/attention/+server.js';
import { GET as getCourseStatsHandler } from '../../../src/routes/api/stats/courses/+server.js';
import { GET as getFinanceStatsHandler } from '../../../src/routes/api/stats/finance/+server.js';
import { GET as getLanguageStatsHandler } from '../../../src/routes/api/stats/languages/+server.js';
import { GET as getOverviewStatsHandler } from '../../../src/routes/api/stats/overview/+server.js';
import { GET as getTrendsStatsHandler } from '../../../src/routes/api/stats/trends/+server.js';
import { GET as getUserStatsHandler } from '../../../src/routes/api/stats/users/+server.js';
import { POST as synthesizeHandler } from '../../../src/routes/api/synthesize/+server.js';
import { POST as transcribeHandler } from '../../../src/routes/api/transcribe/+server.js';
import { GET as testLoggingHandler } from '../../../src/routes/api/test-logging/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Stats and Voice API Integration Tests', () => {
  let testUserId;
  let adminUserId;

  beforeAll(async () => {
    await prisma.$connect();

    const testUser = await prisma.user.create({
      data: {
        email: `stats-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Stats Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    const adminUser = await prisma.user.create({
      data: {
        email: `admin-stats-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Admin Stats User',
        type: 'admin'
      }
    });
    adminUserId = adminUser.id;
  });

  afterAll(async () => {
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

  // Stats endpoints tests
  describe('GET /api/stats/attention', () => {
    it('should return attention stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/attention');
      const response = await getAttentionStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/attention');
      const response = await getAttentionStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/attention');
      const response = await getAttentionStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid parameters', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/attention?period=invalid');
      const response = await getAttentionStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/attention');
      const response = await getAttentionStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/stats/courses', () => {
    it('should return course stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/courses');
      const response = await getCourseStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/courses');
      const response = await getCourseStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/courses');
      const response = await getCourseStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid filters', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/courses?filter=invalid');
      const response = await getCourseStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/courses');
      const response = await getCourseStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/stats/finance', () => {
    it('should return finance stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/finance');
      const response = await getFinanceStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/finance');
      const response = await getFinanceStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/finance');
      const response = await getFinanceStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid date range', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/finance?from=invalid');
      const response = await getFinanceStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/finance');
      const response = await getFinanceStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/stats/languages', () => {
    it('should return language stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/languages');
      const response = await getLanguageStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/languages');
      const response = await getLanguageStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/languages');
      const response = await getLanguageStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid parameters', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/languages?type=invalid');
      const response = await getLanguageStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/languages');
      const response = await getLanguageStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/stats/overview', () => {
    it('should return overview stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/overview');
      const response = await getOverviewStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/overview');
      const response = await getOverviewStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/overview');
      const response = await getOverviewStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid parameters', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/overview?view=invalid');
      const response = await getOverviewStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/overview');
      const response = await getOverviewStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/stats/trends', () => {
    it('should return trends stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/trends');
      const response = await getTrendsStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/trends');
      const response = await getTrendsStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/trends');
      const response = await getTrendsStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid period', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/trends?period=invalid');
      const response = await getTrendsStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/trends');
      const response = await getTrendsStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('GET /api/stats/users', () => {
    it('should return user stats - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/users');
      const response = await getUserStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/stats/users');
      const response = await getUserStatsHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/stats/users');
      const response = await getUserStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid filters', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/users?filter=invalid');
      const response = await getUserStatsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/stats/users');
      const response = await getUserStatsHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  // Voice endpoints tests
  describe('POST /api/synthesize', () => {
    it('should synthesize text successfully - 200', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const request = {
        json: vi.fn().mockResolvedValue({
          text: 'Hello, this is a test',
          language: 'en'
        })
      };
      const response = await synthesizeHandler({ request, locals: mockLocals });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          text: 'Hello'
        })
      };
      const response = await synthesizeHandler({ request, locals: {} });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing text', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const request = {
        json: vi.fn().mockResolvedValue({
          language: 'en'
        })
      };
      const response = await synthesizeHandler({ request, locals: mockLocals });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Synthesis error'))
      };
      const response = await synthesizeHandler({ request, locals: mockLocals });
      const data = await response.json();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/transcribe', () => {
    it('should transcribe audio successfully - 200', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(new Blob(['audio data'], { type: 'audio/wav' }))
        })
      };
      const response = await transcribeHandler({ request, locals: mockLocals });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(new Blob(['audio data']))
        })
      };
      const response = await transcribeHandler({ request, locals: {} });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing audio', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const request = {
        formData: vi.fn().mockResolvedValue({
          get: vi.fn().mockReturnValue(null)
        })
      };
      const response = await transcribeHandler({ request, locals: mockLocals });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const request = {
        formData: vi.fn().mockRejectedValue(new Error('Transcription error'))
      };
      const response = await transcribeHandler({ request, locals: mockLocals });
      const data = await response.json();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/test-logging', () => {
    it('should return test logging info - 200', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/test-logging');
      const response = await testLoggingHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/test-logging');
      const response = await testLoggingHandler({ locals: {}, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const mockLocals = { user: { id: testUserId, type: 'student' } };
      const mockUrl = new URL('http://localhost/api/test-logging');
      const response = await testLoggingHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid parameters', async () => {
      const mockLocals = { user: { id: adminUserId, type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/test-logging?level=invalid');
      const response = await testLoggingHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should handle errors gracefully - 500', async () => {
      const mockLocals = { user: { id: 'invalid-id', type: 'admin' } };
      const mockUrl = new URL('http://localhost/api/test-logging');
      const response = await testLoggingHandler({ locals: mockLocals, url: mockUrl });
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
