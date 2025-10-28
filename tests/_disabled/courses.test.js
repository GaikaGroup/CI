/**
 * Integration tests for Courses API
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '../../../src/generated/prisma/index.js';

const prisma = new PrismaClient();

describe('Courses API', () => {
  let testUser;
  let testCourse;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword',
        type: 'regular'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    if (testCourse) {
      await prisma.course.delete({ where: { id: testCourse.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  describe('POST /api/courses', () => {
    it('should create a new course', async () => {
      const courseData = {
        name: 'Test Course',
        description: 'A test course',
        language: 'en',
        level: 'beginner',
        skills: ['reading', 'writing']
      };

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `user=${JSON.stringify(testUser)}`
        },
        body: JSON.stringify(courseData)
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.course).toBeDefined();
      expect(data.course.name).toBe(courseData.name);
      expect(data.course.creatorId).toBe(testUser.id);

      testCourse = data.course;
    });

    it('should require authentication', async () => {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Course' })
      });

      expect(response.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `user=${JSON.stringify(testUser)}`
        },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.message).toContain('required');
    });
  });

  describe('GET /api/courses', () => {
    beforeEach(async () => {
      testCourse = await prisma.course.create({
        data: {
          name: 'Test Course',
          description: 'A test course',
          language: 'en',
          level: 'beginner',
          creatorId: testUser.id
        }
      });
    });

    it('should get courses with pagination', async () => {
      const response = await fetch('/api/courses?page=1&limit=10', {
        headers: {
          Cookie: `user=${JSON.stringify(testUser)}`
        }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(10);
    });

    it('should filter courses by search query', async () => {
      const response = await fetch('/api/courses?search=Test', {
        headers: {
          Cookie: `user=${JSON.stringify(testUser)}`
        }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.courses.length).toBeGreaterThan(0);
      expect(data.courses[0].name).toContain('Test');
    });

    it('should require authentication', async () => {
      const response = await fetch('/api/courses');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/courses/[id]', () => {
    beforeEach(async () => {
      testCourse = await prisma.course.create({
        data: {
          name: 'Test Course',
          description: 'A test course',
          language: 'en',
          level: 'beginner',
          creatorId: testUser.id
        }
      });
    });

    it('should get course by ID', async () => {
      const response = await fetch(`/api/courses/${testCourse.id}`, {
        headers: {
          Cookie: `user=${JSON.stringify(testUser)}`
        }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.course).toBeDefined();
      expect(data.course.id).toBe(testCourse.id);
      expect(data.course.name).toBe('Test Course');
    });

    it('should return 404 for non-existent course', async () => {
      const response = await fetch('/api/courses/non-existent-id', {
        headers: {
          Cookie: `user=${JSON.stringify(testUser)}`
        }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/courses/[id]', () => {
    beforeEach(async () => {
      testCourse = await prisma.course.create({
        data: {
          name: 'Test Course',
          description: 'A test course',
          language: 'en',
          level: 'beginner',
          creatorId: testUser.id
        }
      });
    });

    it('should update course', async () => {
      const updates = {
        name: 'Updated Course',
        description: 'Updated description'
      };

      const response = await fetch(`/api/courses/${testCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `user=${JSON.stringify(testUser)}`
        },
        body: JSON.stringify(updates)
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.course.name).toBe(updates.name);
      expect(data.course.description).toBe(updates.description);
    });

    it('should require permission to update', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          password: 'hashedpassword',
          type: 'regular'
        }
      });

      const response = await fetch(`/api/courses/${testCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `user=${JSON.stringify(otherUser)}`
        },
        body: JSON.stringify({ name: 'Hacked Course' })
      });

      expect(response.status).toBe(400);

      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('DELETE /api/courses/[id]', () => {
    beforeEach(async () => {
      testCourse = await prisma.course.create({
        data: {
          name: 'Test Course',
          description: 'A test course',
          language: 'en',
          level: 'beginner',
          creatorId: testUser.id
        }
      });
    });

    it('should soft delete course', async () => {
      const response = await fetch(`/api/courses/${testCourse.id}`, {
        method: 'DELETE',
        headers: {
          Cookie: `user=${JSON.stringify(testUser)}`
        }
      });

      expect(response.status).toBe(200);

      // Verify course is soft deleted
      const course = await prisma.course.findUnique({
        where: { id: testCourse.id }
      });
      expect(course.status).toBe('deleted');
      expect(course.isActive).toBe(false);
    });

    it('should require permission to delete', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          firstName: 'Other',
          lastName: 'User',
          password: 'hashedpassword',
          type: 'regular'
        }
      });

      const response = await fetch(`/api/courses/${testCourse.id}`, {
        method: 'DELETE',
        headers: {
          Cookie: `user=${JSON.stringify(otherUser)}`
        }
      });

      expect(response.status).toBe(400);

      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});
