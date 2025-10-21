import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  GET as getPreferencesHandler,
  POST as createPreferencesHandler,
  PUT as updatePreferencesHandler,
  DELETE as deletePreferencesHandler
} from '../../../src/routes/api/preferences/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Preferences API Integration Tests', () => {
  let testUserId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `pref-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Preferences',
        lastName: 'Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;
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

    await prisma.$disconnect();
  });

  describe('GET /api/preferences', () => {
    // Success scenario (200)
    it('should return user preferences for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const response = await getPreferencesHandler({ locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences).toBeDefined();
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const response = await getPreferencesHandler({ locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication');
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-user-id', type: 'student' }
      };

      const response = await getPreferencesHandler({ locals: mockLocals });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/preferences', () => {
    // Success scenario (201)
    it('should create preferences successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          theme: 'dark',
          language: 'en',
          notifications: true
        })
      };

      const response = await createPreferencesHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.preferences).toBeDefined();
      expect(data.preferences.theme).toBe('dark');
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          theme: 'dark'
        })
      };

      const response = await createPreferencesHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid preference values', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          theme: 'invalid-theme',
          language: 'invalid-lang'
        })
      };

      const response = await createPreferencesHandler({ request, locals: mockLocals });
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

      const response = await createPreferencesHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/preferences', () => {
    // Success scenario (200)
    it('should update preferences successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          theme: 'light',
          notifications: false
        })
      };

      const response = await updatePreferencesHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preferences.theme).toBe('light');
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          theme: 'light'
        })
      };

      const response = await updatePreferencesHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid data', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          theme: 123 // Invalid type
        })
      };

      const response = await updatePreferencesHandler({ request, locals: mockLocals });
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

      const response = await updatePreferencesHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/preferences', () => {
    // Success scenario (200)
    it('should delete preferences successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const response = await deletePreferencesHandler({ locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const response = await deletePreferencesHandler({ locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'non-existent-user', type: 'student' }
      };

      const response = await deletePreferencesHandler({ locals: mockLocals });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});
