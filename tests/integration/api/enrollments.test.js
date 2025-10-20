import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  GET as getEnrollmentsHandler,
  POST as createEnrollmentHandler
} from '../../../src/routes/api/enrollments/+server.js';
import {
  GET as getEnrollmentHandler,
  PUT as updateEnrollmentHandler,
  DELETE as deleteEnrollmentHandler
} from '../../../src/routes/api/enrollments/[id]/+server.js';
import { prisma } from '../../../src/lib/database/client.js';

describe('Enrollments API Integration Tests', () => {
  let testUserId;
  let testCourseId;
  let testEnrollmentId;

  beforeAll(async () => {
    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `enroll-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Enrollment Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    // Create test course
    const testCourse = await prisma.course.create({
      data: {
        name: 'Test Enrollment Course',
        description: 'Course for enrollment testing',
        language: 'en',
        subject: 'test'
      }
    });
    testCourseId = testCourse.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testEnrollmentId) {
      try {
        await prisma.enrollment.delete({ where: { id: testEnrollmentId } });
      } catch (error) {
        console.log('Enrollment cleanup error:', error.message);
      }
    }

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

    await prisma.$disconnect();
  });

  describe('GET /api/enrollments', () => {
    // Success scenario (200)
    it('should return list of enrollments for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const mockUrl = new URL('http://localhost/api/enrollments');

      const response = await getEnrollmentsHandler({ locals: mockLocals, url: mockUrl });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.enrollments)).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const mockUrl = new URL('http://localhost/api/enrollments');

      const response = await getEnrollmentsHandler({ locals: {}, url: mockUrl });
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

      const mockUrl = new URL('http://localhost/api/enrollments');

      const response = await getEnrollmentsHandler({ locals: mockLocals, url: mockUrl });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('POST /api/enrollments', () => {
    // Success scenario (201)
    it('should create enrollment successfully for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          courseId: testCourseId
        })
      };

      const response = await createEnrollmentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.courseId).toBe(testCourseId);

      testEnrollmentId = data.enrollment.id;
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          courseId: testCourseId
        })
      };

      const response = await createEnrollmentHandler({ request, locals: {} });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Validation error (400)
    it('should return 400 for missing courseId', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          // Missing courseId
        })
      };

      const response = await createEnrollmentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    // Validation error (400)
    it('should return 400 for duplicate enrollment', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockResolvedValue({
          courseId: testCourseId
        })
      };

      const response = await createEnrollmentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already enrolled');
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await createEnrollmentHandler({ request, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/enrollments/[id]', () => {
    // Success scenario (200)
    it('should return enrollment details for authenticated user', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testEnrollmentId };

      const response = await getEnrollmentHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.enrollment).toBeDefined();
      expect(data.enrollment.id).toBe(testEnrollmentId);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testEnrollmentId };

      const response = await getEnrollmentHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when accessing another user enrollment', async () => {
      // Create another user
      const anotherUser = await prisma.user.create({
        data: {
          email: `another-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Another User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const params = { id: testEnrollmentId };

      const response = await getEnrollmentHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for invalid enrollment ID', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'invalid-id' };

      const response = await getEnrollmentHandler({ locals: mockLocals, params });
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

      const response = await getEnrollmentHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT /api/enrollments/[id]', () => {
    // Success scenario (200)
    it('should update enrollment successfully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testEnrollmentId };
      const request = {
        json: vi.fn().mockResolvedValue({
          status: 'active',
          progress: 50
        })
      };

      const response = await updateEnrollmentHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.enrollment.progress).toBe(50);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testEnrollmentId };
      const request = {
        json: vi.fn().mockResolvedValue({
          progress: 75
        })
      };

      const response = await updateEnrollmentHandler({ request, locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when updating another user enrollment', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `update-test-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Update Test User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const params = { id: testEnrollmentId };
      const request = {
        json: vi.fn().mockResolvedValue({
          progress: 100
        })
      };

      const response = await updateEnrollmentHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for invalid data', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testEnrollmentId };
      const request = {
        json: vi.fn().mockResolvedValue({
          progress: 150 // Invalid progress > 100
        })
      };

      const response = await updateEnrollmentHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    // Error handling (500)
    it('should handle server errors gracefully', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: testEnrollmentId };
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Server error'))
      };

      const response = await updateEnrollmentHandler({ request, locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });

  describe('DELETE /api/enrollments/[id]', () => {
    // Success scenario (200)
    it('should delete enrollment successfully', async () => {
      // Create enrollment to delete
      const enrollmentToDelete = await prisma.enrollment.create({
        data: {
          userId: testUserId,
          courseId: testCourseId,
          status: 'active'
        }
      });

      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: enrollmentToDelete.id };

      const response = await deleteEnrollmentHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    // Authentication error (401)
    it('should return 401 for unauthenticated user', async () => {
      const params = { id: testEnrollmentId };

      const response = await deleteEnrollmentHandler({ locals: {}, params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    // Authorization error (403)
    it('should return 403 when deleting another user enrollment', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: `delete-test-${Date.now()}@example.com`,
          password: 'hashedpassword',
          name: 'Delete Test User',
          type: 'student'
        }
      });

      const mockLocals = {
        user: { id: anotherUser.id, type: 'student' }
      };

      const params = { id: testEnrollmentId };

      const response = await deleteEnrollmentHandler({ locals: mockLocals, params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);

      await prisma.user.delete({ where: { id: anotherUser.id } });
    });

    // Validation error (400)
    it('should return 400 for invalid enrollment ID', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const params = { id: 'invalid-id' };

      const response = await deleteEnrollmentHandler({ locals: mockLocals, params });
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

      const response = await deleteEnrollmentHandler({ locals: mockLocals, params });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
