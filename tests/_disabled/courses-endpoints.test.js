import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  GET as getCoursesHandler,
  POST as createCourseHandler
} from '../../../src/routes/api/courses/+server.js';
import {
  GET as getCourseHandler,
  PUT as updateCourseHandler,
  DELETE as deleteCourseHandler
} from '../../../src/routes/api/courses/[id]/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Courses API Integration Tests', () => {
  let testCourseId;
  let testUserId;
  let adminUserId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test users
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

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

  describe('GET /api/courses', () => {
    // Success scenario (200)
    it('should return list of courses for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/courses');

      const response = await getCoursesHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.courses)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/courses');

      const response = await getCoursesHandler({ locals: {}, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication');
    });

    // Error handling (500)
    it('should handle database errors gracefully', async () => {
      const mockLocals = {
        user: { id: 'invalid-id', type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/courses');

      const response = await getCoursesHandler({ locals: mockLocals, url: mockUrl });

      // Should handle error without crashing
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/courses', () => {
    // Success scenario (201)
    it('should create course successfully for admin user', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          name: 'Test Course',
          description: 'Test Description',
          language: 'en',
          subject: 'math'
        })
      };

      const response = await createCourseHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.course).toBeDefined();
      expect(data.course.name).toBe('Test Course');

      testCourseId = data.course.id;
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          name: 'Test Course',
          description: 'Test Description'
        })
      };

      const response = await createCourseHandler({ request, locals: {} });
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
          name: 'Test Course',
          description: 'Test Description'
        })
      };

      const response = await createCourseHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Admin');
    });

    // Validation error (400)
    it('should return 400 for missing required fields', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          // Missing name
          description: 'Test Description'
        })
      };

      const response = await createCourseHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await createCourseHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/courses/[id]', () => {
    // Success scenario (200)
    it('should return course details for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testCourseId };

      const response = await getCourseHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.course).toBeDefined();
      expect(data.course.id).toBe(testCourseId);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testCourseId };

      const response = await getCourseHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid course ID', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'invalid-id' };

      const response = await getCourseHandler({ locals: mockLocals, params });
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

      const response = await getCourseHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT /api/courses/[id]', () => {
    // Success scenario (200)
    it('should update course successfully for admin user', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: testCourseId };
      const request = {
        json: vi.fn().mockResolvedValue({
          name: 'Updated Course Name',
          description: 'Updated Description'
        })
      };

      const response = await updateCourseHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.course.name).toBe('Updated Course Name');
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testCourseId };
      const request = {
        json: vi.fn().mockResolvedValue({
          name: 'Updated Name'
        })
      };

      const response = await updateCourseHandler({ request, locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testCourseId };
      const request = {
        json: vi.fn().mockResolvedValue({
          name: 'Updated Name'
        })
      };

      const response = await updateCourseHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid data', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: testCourseId };
      const request = {
        json: vi.fn().mockResolvedValue({
          name: '' // Empty name
        })
      };

      const response = await updateCourseHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: testCourseId };
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await updateCourseHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/courses/[id]', () => {
    // Success scenario (200)
    it('should delete course successfully for admin user', async () => {
      // Create a course to delete
      const courseToDelete = await prisma.course.create({
        data: {
          name: 'Course to Delete',
          description: 'Will be deleted',
          language: 'en',
          subject: 'test'
        }
      });

      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: courseToDelete.id };

      const response = await deleteCourseHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testCourseId };

      const response = await deleteCourseHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 for non-admin user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testCourseId };

      const response = await deleteCourseHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for invalid course ID', async () => {
      const mockLocals = {
        user: { id: adminUserId, type: 'admin' }
      };

      const params = { id: 'invalid-id' };

      const response = await deleteCourseHandler({ locals: mockLocals, params });
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

      const response = await deleteCourseHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
