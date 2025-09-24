/**
 * Course Service
 *
 * This service handles CRUD operations for courses with role-based access control
 * and validation. It integrates with the existing courses store and provides
 * enhanced functionality for the admin course management system.
 */

import { validateCourse, createDefaultCourse } from '../types.js';
import { validateAgentConfiguration } from '../agents.js';

/**
 * Course status enumeration
 */
export const COURSE_STATUS = {
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
};

/**
 * Course Service class
 */
export class CourseService {
  constructor(coursesStore, reportsStore = null) {
    this.coursesStore = coursesStore;
    this.reportsStore = reportsStore;
  }

  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @param {string} creatorId - ID of the user creating the course
   * @param {string} creatorRole - Role of the creator ('admin' or 'user')
   * @returns {Promise<Object>} Created course or error
   */
  async createCourse(courseData, creatorId, creatorRole) {
    try {
      // Validate creator role
      if (!['admin', 'user'].includes(creatorRole)) {
        throw new Error('Invalid creator role. Must be "admin" or "user"');
      }

      // Create course with creator information
      const courseWithCreator = {
        ...courseData,
        creatorId,
        creatorRole,
        status: COURSE_STATUS.ACTIVE
      };

      // Create default course structure
      const course = createDefaultCourse(courseWithCreator);

      // Validate course data
      const validation = validateCourse(course);
      if (!validation.isValid) {
        throw new Error(`Course validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate agent configuration
      const agentValidation = validateAgentConfiguration(course.agents, course.orchestrationAgent);
      if (!agentValidation.isValid) {
        throw new Error(`Agent configuration invalid: ${agentValidation.errors.join(', ')}`);
      }

      // Add course to store
      this.coursesStore.addCourse(course);

      return {
        success: true,
        course,
        message: 'Course created successfully'
      };
    } catch (error) {
      console.error('Error creating course:', error);
      return {
        success: false,
        error: error.message,
        course: null
      };
    }
  }

  /**
   * Update an existing course
   * @param {string} courseId - ID of the course to update
   * @param {Object} updates - Updates to apply
   * @param {string} userId - ID of the user making the update
   * @param {string} userRole - Role of the user making the update
   * @returns {Promise<Object>} Update result
   */
  async updateCourse(courseId, updates, userId, userRole) {
    try {
      // Get current course
      const currentCourse = await this.getCourse(courseId);
      if (!currentCourse.success) {
        throw new Error('Course not found');
      }

      const course = currentCourse.course;

      // Check permissions
      const canUpdate = this.canUserModifyCourse(course, userId, userRole);
      if (!canUpdate.allowed) {
        throw new Error(canUpdate.reason);
      }

      // Apply updates
      const updatedCourse = {
        ...course,
        ...updates,
        metadata: {
          ...course.metadata,
          updatedAt: new Date()
        }
      };

      // Validate updated course
      const validation = validateCourse(updatedCourse);
      if (!validation.isValid) {
        throw new Error(`Course validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate agent configuration if agents were updated
      if (updates.agents || updates.orchestrationAgent) {
        const agentValidation = validateAgentConfiguration(
          updatedCourse.agents,
          updatedCourse.orchestrationAgent
        );
        if (!agentValidation.isValid) {
          throw new Error(`Agent configuration invalid: ${agentValidation.errors.join(', ')}`);
        }
      }

      // Update course in store
      this.coursesStore.updateCourse(courseId, updatedCourse);

      return {
        success: true,
        course: updatedCourse,
        message: 'Course updated successfully'
      };
    } catch (error) {
      console.error('Error updating course:', error);
      return {
        success: false,
        error: error.message,
        course: null
      };
    }
  }

  /**
   * Delete a course
   * @param {string} courseId - ID of the course to delete
   * @param {string} userId - ID of the user deleting the course
   * @param {string} userRole - Role of the user deleting the course
   * @returns {Promise<Object>} Deletion result
   */
  async deleteCourse(courseId, userId, userRole) {
    try {
      // Get current course
      const currentCourse = await this.getCourse(courseId);
      if (!currentCourse.success) {
        throw new Error('Course not found');
      }

      const course = currentCourse.course;

      // Check permissions
      const canDelete = this.canUserModifyCourse(course, userId, userRole);
      if (!canDelete.allowed) {
        throw new Error(canDelete.reason);
      }

      // For admins, actually delete. For users, mark as deleted
      if (userRole === 'admin') {
        this.coursesStore.removeCourse(courseId);
      } else {
        this.coursesStore.updateCourse(courseId, {
          status: COURSE_STATUS.DELETED,
          metadata: {
            ...course.metadata,
            updatedAt: new Date()
          }
        });
      }

      return {
        success: true,
        message: 'Course deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting course:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get a course by ID
   * @param {string} courseId - Course ID
   * @returns {Promise<Object>} Course data or error
   */
  async getCourse(courseId) {
    try {
      // This would typically query a database, but we'll use the store for now
      const courses = await this.listCourses();
      const course = courses.courses.find((s) => s.id === courseId);

      if (!course) {
        return {
          success: false,
          error: 'Course not found',
          course: null
        };
      }

      return {
        success: true,
        course
      };
    } catch (error) {
      console.error('Error getting course:', error);
      return {
        success: false,
        error: error.message,
        course: null
      };
    }
  }

  /**
   * List courses with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} List of courses
   */
  async listCourses(filters = {}) {
    try {
      // Get courses from store (this would be a database query in a real app)
      let courses = [];

      // Since we can't directly access the store's current value, we'll simulate it
      // In a real implementation, this would query the database
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('learnModeCourses');
        if (stored) {
          courses = JSON.parse(stored);
        }
      }

      // Apply filters
      if (filters.status) {
        courses = courses.filter((course) => course.status === filters.status);
      }

      if (filters.creatorRole) {
        courses = courses.filter((course) => course.creatorRole === filters.creatorRole);
      }

      if (filters.creatorId) {
        courses = courses.filter((course) => course.creatorId === filters.creatorId);
      }

      if (filters.language) {
        courses = courses.filter((course) => course.language === filters.language);
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        courses = courses.filter(
          (course) =>
            course.name.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm)
        );
      }

      return {
        success: true,
        courses,
        total: courses.length
      };
    } catch (error) {
      console.error('Error listing courses:', error);
      return {
        success: false,
        error: error.message,
        courses: [],
        total: 0
      };
    }
  }

  /**
   * Validate course configuration
   * @param {Object} courseData - Course data to validate
   * @returns {Object} Validation result
   */
  validateCourseConfiguration(courseData) {
    const courseValidation = validateCourse(courseData);

    if (!courseValidation.isValid) {
      return courseValidation;
    }

    // Additional validation for agent configuration
    const agentValidation = validateAgentConfiguration(
      courseData.agents,
      courseData.orchestrationAgent
    );

    if (!agentValidation.isValid) {
      return {
        isValid: false,
        errors: [...courseValidation.errors, ...agentValidation.errors]
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }

  /**
   * Check if user can modify a course
   * @param {Object} course - Course to check
   * @param {string} userId - User ID
   * @param {string} userRole - User role
   * @returns {Object} Permission result
   */
  canUserModifyCourse(course, userId, userRole) {
    // Admins can modify any course
    if (userRole === 'admin') {
      return { allowed: true };
    }

    // Users can only modify their own courses
    if (course.creatorId === userId) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'You can only modify courses you created'
    };
  }

  /**
   * Block a course (admin only)
   * @param {string} courseId - Course ID
   * @param {string} reason - Reason for blocking
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Block result
   */
  async blockCourse(courseId, reason, adminId) {
    try {
      const result = await this.updateCourse(
        courseId,
        {
          status: COURSE_STATUS.BLOCKED,
          blockReason: reason,
          blockedBy: adminId,
          blockedAt: new Date()
        },
        adminId,
        'admin'
      );

      return result;
    } catch (error) {
      console.error('Error blocking course:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Unblock a course (admin only)
   * @param {string} courseId - Course ID
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Unblock result
   */
  async unblockCourse(courseId, adminId) {
    try {
      const result = await this.updateCourse(
        courseId,
        {
          status: COURSE_STATUS.ACTIVE,
          blockReason: null,
          blockedBy: null,
          blockedAt: null
        },
        adminId,
        'admin'
      );

      return result;
    } catch (error) {
      console.error('Error unblocking course:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
