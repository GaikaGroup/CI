/**
 * User Enrollment Service
 *
 * This service handles user enrollment in courses, tracking enrollment status,
 * and managing the "My Courses" functionality.
 */

import { browser } from '$app/environment';

const ENROLLMENT_STORAGE_KEY = 'userEnrollments';

/**
 * Enrollment status enumeration
 */
export const ENROLLMENT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DROPPED: 'dropped'
};

/**
 * User Enrollment Service class
 */
export class UserEnrollmentService {
  constructor() {
    this.enrollments = new Map();
    this.loadFromStorage();
    this.initializeTestData();
  }

  /**
   * Initialize test data for demonstration
   */
  initializeTestData() {
    if (!browser) return;

    // Check if we already have test data
    if (this.enrollments.size > 0) return;

    // Add test enrollments for AdminLogin (user ID '1')
    const testEnrollments = [
      {
        userId: '1',
        courseId: 'course-1',
        subjectId: 'course-1',
        enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        status: ENROLLMENT_STATUS.ACTIVE,
        progress: {
          lessonsCompleted: 5,
          assessmentsTaken: 2,
          lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        }
      },
      {
        userId: '1',
        courseId: 'course-2',
        subjectId: 'course-2',
        enrolledAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        status: ENROLLMENT_STATUS.ACTIVE,
        progress: {
          lessonsCompleted: 8,
          assessmentsTaken: 3,
          lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      }
    ];

    // Add test enrollments
    testEnrollments.forEach((enrollment) => {
      const key = `${enrollment.userId}-${enrollment.courseId}`;
      this.enrollments.set(key, enrollment);
    });

    this.saveToStorage();
  }

  /**
   * Load enrollments from localStorage
   */
  loadFromStorage() {
    if (!browser) return;

    try {
      const stored = localStorage.getItem(ENROLLMENT_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.enrollments = new Map(data);
      }
    } catch (error) {
      console.error('Error loading enrollments:', error);
    }
  }

  /**
   * Save enrollments to localStorage
   */
  saveToStorage() {
    if (!browser) return;

    try {
      const data = Array.from(this.enrollments.entries());
      localStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving enrollments:', error);
    }
  }

  /**
   * Enroll user in a course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Object} Enrollment result
   */
  enrollUser(userId, courseId) {
    try {
      const enrollmentKey = `${userId}-${courseId}`;

      // Check if already enrolled
      if (this.enrollments.has(enrollmentKey)) {
        const existing = this.enrollments.get(enrollmentKey);
        if (existing.status === ENROLLMENT_STATUS.ACTIVE) {
          return {
            success: false,
            error: 'User is already enrolled in this course',
            enrollment: existing
          };
        }
      }

      const enrollment = {
        userId,
        courseId,
        subjectId: courseId, // Backward compatibility
        enrolledAt: new Date().toISOString(),
        status: ENROLLMENT_STATUS.ACTIVE,
        progress: {
          lessonsCompleted: 0,
          assessmentsTaken: 0,
          lastActivity: new Date().toISOString()
        }
      };

      this.enrollments.set(enrollmentKey, enrollment);
      this.saveToStorage();

      return {
        success: true,
        enrollment,
        message: 'Successfully enrolled in course'
      };
    } catch (error) {
      console.error('Error enrolling user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's enrollments
   * @param {string} userId - User ID
   * @param {string} status - Optional status filter
   * @returns {Array} User's enrollments
   */
  getUserEnrollments(userId, status = null) {
    const userEnrollments = [];

    for (const [, enrollment] of this.enrollments) {
      if (enrollment.userId === userId) {
        if (!status || enrollment.status === status) {
          userEnrollments.push(enrollment);
        }
      }
    }

    return userEnrollments.sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt));
  }

  /**
   * Check if user is enrolled in a course
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {boolean} Whether user is enrolled
   */
  isUserEnrolled(userId, courseId) {
    const enrollmentKey = `${userId}-${courseId}`;
    const enrollment = this.enrollments.get(enrollmentKey);
    return enrollment && enrollment.status === ENROLLMENT_STATUS.ACTIVE;
  }

  /**
   * Update enrollment status
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @param {string} status - New status
   * @returns {Object} Update result
   */
  updateEnrollmentStatus(userId, courseId, status) {
    try {
      const enrollmentKey = `${userId}-${courseId}`;
      const enrollment = this.enrollments.get(enrollmentKey);

      if (!enrollment) {
        return {
          success: false,
          error: 'Enrollment not found'
        };
      }

      enrollment.status = status;
      enrollment.progress.lastActivity = new Date().toISOString();

      this.enrollments.set(enrollmentKey, enrollment);
      this.saveToStorage();

      return {
        success: true,
        enrollment,
        message: 'Enrollment status updated'
      };
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user progress
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @param {Object} progressUpdate - Progress updates
   * @returns {Object} Update result
   */
  updateProgress(userId, courseId, progressUpdate) {
    try {
      const enrollmentKey = `${userId}-${courseId}`;
      const enrollment = this.enrollments.get(enrollmentKey);

      if (!enrollment) {
        return {
          success: false,
          error: 'Enrollment not found'
        };
      }

      enrollment.progress = {
        ...enrollment.progress,
        ...progressUpdate,
        lastActivity: new Date().toISOString()
      };

      this.enrollments.set(enrollmentKey, enrollment);
      this.saveToStorage();

      return {
        success: true,
        enrollment,
        message: 'Progress updated'
      };
    } catch (error) {
      console.error('Error updating progress:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Drop enrollment (soft delete)
   * @param {string} userId - User ID
   * @param {string} courseId - Course ID
   * @returns {Object} Drop result
   */
  dropEnrollment(userId, courseId) {
    return this.updateEnrollmentStatus(userId, courseId, ENROLLMENT_STATUS.DROPPED);
  }

  /**
   * Get enrollment statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Enrollment statistics
   */
  getUserStats(userId) {
    const enrollments = this.getUserEnrollments(userId);

    return {
      total: enrollments.length,
      active: enrollments.filter((e) => e.status === ENROLLMENT_STATUS.ACTIVE).length,
      completed: enrollments.filter((e) => e.status === ENROLLMENT_STATUS.COMPLETED).length,
      dropped: enrollments.filter((e) => e.status === ENROLLMENT_STATUS.DROPPED).length,
      totalLessons: enrollments.reduce((sum, e) => sum + e.progress.lessonsCompleted, 0),
      totalAssessments: enrollments.reduce((sum, e) => sum + e.progress.assessmentsTaken, 0)
    };
  }

  /**
   * Clear all enrollments (for testing/reset)
   */
  clearAllEnrollments() {
    this.enrollments.clear();
    this.saveToStorage();
  }
}

// Create singleton instance
export const userEnrollmentService = new UserEnrollmentService();
