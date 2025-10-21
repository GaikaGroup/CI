import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { POST as loginHandler } from '../../../src/routes/api/auth/login/+server.js';
import { POST as logoutHandler } from '../../../src/routes/api/auth/logout/+server.js';
import { POST as registerHandler } from '../../../src/routes/api/auth/register/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Authentication API Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let testUserId;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      try {
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (error) {
        console.log('User cleanup error:', error.message);
      }
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    // Success scenario (200/201)
    it('should register new user successfully', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: testEmail,
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        })
      };

      const response = await registerHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);

      testUserId = data.user.id;
    });

    // Validation error (400)
    it('should return 400 for missing required fields', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: testEmail
          // Missing password and name
        })
      };

      const response = await registerHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    // Validation error (400)
    it('should return 400 for invalid email format', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'invalid-email',
          password: testPassword,
          firstName: 'Test',
          lastName: 'User'
        })
      };

      const response = await registerHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('email');
    });

    // Validation error (400)
    it('should return 400 for duplicate email', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: testEmail,
          password: testPassword,
          firstName: 'Another',
          lastName: 'User'
        })
      };

      const response = await registerHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('exists');
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Database error'))
      };

      const response = await registerHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    // Success scenario (200)
    it('should login user successfully with correct credentials', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: testEmail,
          password: testPassword
        })
      };

      const response = await loginHandler({ request, locals: {}, cookies: { set: vi.fn() } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for incorrect password', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: testEmail,
          password: 'WrongPassword123!'
        })
      };

      const response = await loginHandler({ request, locals: {}, cookies: { set: vi.fn() } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for non-existent user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'nonexistent@example.com',
          password: testPassword
        })
      };

      const response = await loginHandler({ request, locals: {}, cookies: { set: vi.fn() } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing credentials', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: testEmail
          // Missing password
        })
      };

      const response = await loginHandler({ request, locals: {}, cookies: { set: vi.fn() } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await loginHandler({ request, locals: {}, cookies: { set: vi.fn() } });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    // Success scenario (200)
    it('should logout authenticated user successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, email: testEmail }
      };

      const response = await logoutHandler({
        locals: mockLocals,
        cookies: { delete: vi.fn() }
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const response = await logoutHandler({
        locals: {},
        cookies: { delete: vi.fn() }
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle logout errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, email: testEmail }
      };

      const mockCookies = {
        delete: vi.fn().mockImplementation(() => {
          throw new Error('Cookie error');
        })
      };

      const response = await logoutHandler({
        locals: mockLocals,
        cookies: mockCookies
      });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });
});
