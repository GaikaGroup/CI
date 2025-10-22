/**
 * User Role Service
 *
 * Determines user roles (Student/Tutor) based on enrollments and created courses
 */

import { db } from '$lib/database/connection.js';

export class UserRoleService {
  /**
   * Get user roles based on their activity
   * @param {string} userId - User ID
   * @returns {Promise<{isStudent: boolean, isTutor: boolean, roles: string[]}>}
   */
  static async getUserRoles(userId) {
    try {
      // Get user's enrollments
      const enrollments = await db.enrollment.findMany({
        where: {
          userId: userId,
          status: 'active'
        }
      });

      // Get user's created courses
      const createdCourses = await db.course.findMany({
        where: {
          creatorId: userId,
          status: 'active'
        }
      });

      const isStudent = enrollments.length > 0;
      const isTutor = createdCourses.length > 0;

      const roles = [];
      if (isStudent) roles.push('Student');
      if (isTutor) roles.push('Tutor');
      if (roles.length === 0) roles.push('Regular');

      return {
        isStudent,
        isTutor,
        roles
      };
    } catch (error) {
      console.error('Error getting user roles:', error);
      return {
        isStudent: false,
        isTutor: false,
        roles: ['Regular']
      };
    }
  }

  /**
   * Get roles for multiple users
   * @param {string[]} userIds - Array of user IDs
   * @returns {Promise<Map<string, {isStudent: boolean, isTutor: boolean, roles: string[]}>>}
   */
  static async getUserRolesBatch(userIds) {
    try {
      // Get all enrollments for these users
      const enrollments = await db.enrollment.findMany({
        where: {
          userId: { in: userIds },
          status: 'active'
        },
        select: {
          userId: true
        }
      });

      // Get all created courses for these users
      const createdCourses = await db.course.findMany({
        where: {
          creatorId: { in: userIds },
          status: 'active'
        },
        select: {
          creatorId: true
        }
      });

      // Create maps for quick lookup
      const studentsSet = new Set(enrollments.map((e) => e.userId));
      const tutorsSet = new Set(createdCourses.map((c) => c.creatorId));

      // Build result map
      const result = new Map();

      for (const userId of userIds) {
        const isStudent = studentsSet.has(userId);
        const isTutor = tutorsSet.has(userId);

        const roles = [];
        if (isStudent) roles.push('Student');
        if (isTutor) roles.push('Tutor');
        if (roles.length === 0) roles.push('Regular');

        result.set(userId, {
          isStudent,
          isTutor,
          roles
        });
      }

      return result;
    } catch (error) {
      console.error('Error getting user roles batch:', error);
      // Return default roles for all users
      const result = new Map();
      for (const userId of userIds) {
        result.set(userId, {
          isStudent: false,
          isTutor: false,
          roles: ['Regular']
        });
      }
      return result;
    }
  }

  /**
   * Check if user can access a specific course as student
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<boolean>}
   */
  static async canAccessCourseAsStudent(userId, courseId) {
    try {
      const enrollment = await db.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      return enrollment && enrollment.status === 'active';
    } catch (error) {
      console.error('Error checking student access:', error);
      return false;
    }
  }

  /**
   * Check if user can access a specific course as tutor
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<boolean>}
   */
  static async canAccessCourseAsTutor(userId, courseId) {
    try {
      const course = await db.course.findUnique({
        where: {
          id: courseId,
          creatorId: userId,
          status: 'active'
        }
      });

      return !!course;
    } catch (error) {
      console.error('Error checking tutor access:', error);
      return false;
    }
  }

  /**
   * Get user's role in a specific course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Promise<'student' | 'tutor' | 'both' | 'none'>}
   */
  static async getUserRoleInCourse(userId, courseId) {
    try {
      const [isStudent, isTutor] = await Promise.all([
        this.canAccessCourseAsStudent(userId, courseId),
        this.canAccessCourseAsTutor(userId, courseId)
      ]);

      if (isStudent && isTutor) return 'both';
      if (isStudent) return 'student';
      if (isTutor) return 'tutor';
      return 'none';
    } catch (error) {
      console.error('Error getting user role in course:', error);
      return 'none';
    }
  }
}
