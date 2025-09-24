/**
 * Enrollment Store
 *
 * This store manages user enrollment state and provides reactive access
 * to enrollment data throughout the application.
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { userEnrollmentService } from '../services/UserEnrollmentService.js';
import { user } from '$modules/auth/stores';

/**
 * Create enrollment store
 */
function createEnrollmentStore() {
  const { subscribe, set, update } = writable({
    enrollments: [],
    loading: false,
    error: null,
    initialized: false
  });

  return {
    subscribe,

    /**
     * Initialize the store for a user
     */
    initialize: (userId) => {
      if (!userId) {
        set({
          enrollments: [],
          loading: false,
          error: null,
          initialized: true
        });
        return;
      }

      update((state) => ({ ...state, loading: true }));

      try {
        const enrollments = userEnrollmentService.getUserEnrollments(userId);
        set({
          enrollments,
          loading: false,
          error: null,
          initialized: true
        });
      } catch (error) {
        console.error('Error initializing enrollment store:', error);
        set({
          enrollments: [],
          loading: false,
          error: error.message,
          initialized: true
        });
      }
    },

    /**
     * Enroll user in a course
     */
    enrollInCourse: async (userId, courseId) => {
      update((state) => ({ ...state, loading: true }));

      try {
        const result = userEnrollmentService.enrollUser(userId, courseId);

        if (result.success) {
          const enrollments = userEnrollmentService.getUserEnrollments(userId);
          update((state) => ({
            ...state,
            enrollments,
            loading: false,
            error: null
          }));
        } else {
          update((state) => ({
            ...state,
            loading: false,
            error: result.error
          }));
        }

        return result;
      } catch (error) {
        console.error('Error enrolling in course:', error);
        update((state) => ({
          ...state,
          loading: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Update enrollment status
     */
    updateEnrollmentStatus: async (userId, courseId, status) => {
      try {
        const result = userEnrollmentService.updateEnrollmentStatus(userId, courseId, status);

        if (result.success) {
          const enrollments = userEnrollmentService.getUserEnrollments(userId);
          update((state) => ({
            ...state,
            enrollments,
            error: null
          }));
        }

        return result;
      } catch (error) {
        console.error('Error updating enrollment status:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Update user progress
     */
    updateProgress: async (userId, courseId, progressUpdate) => {
      try {
        const result = userEnrollmentService.updateProgress(userId, courseId, progressUpdate);

        if (result.success) {
          const enrollments = userEnrollmentService.getUserEnrollments(userId);
          update((state) => ({
            ...state,
            enrollments,
            error: null
          }));
        }

        return result;
      } catch (error) {
        console.error('Error updating progress:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Drop enrollment
     */
    dropEnrollment: async (userId, courseId) => {
      return await this.updateEnrollmentStatus(userId, courseId, 'dropped');
    },

    /**
     * Check if user is enrolled in a course
     */
    isEnrolled: (userId, courseId) => {
      return userEnrollmentService.isUserEnrolled(userId, courseId);
    },

    /**
     * Get user statistics
     */
    getUserStats: (userId) => {
      return userEnrollmentService.getUserStats(userId);
    },

    /**
     * Clear error state
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Refresh enrollments
     */
    refresh: (userId) => {
      if (userId) {
        const enrollments = userEnrollmentService.getUserEnrollments(userId);
        update((state) => ({
          ...state,
          enrollments,
          error: null
        }));
      }
    }
  };
}

// Create the store instance
export const enrollmentStore = createEnrollmentStore();

// Derived stores for common queries
export const activeEnrollments = derived([enrollmentStore, user], ([$enrollment, $user]) => {
  if (!$user) return [];
  return $enrollment.enrollments.filter((e) => e.userId === $user.id && e.status === 'active');
});

export const enrollmentStats = derived([enrollmentStore, user], ([$enrollment, $user]) => {
  if (!$user) return null;

  // Calculate stats from the store data to ensure reactivity
  const userEnrollments = $enrollment.enrollments.filter((e) => e.userId === $user.id);

  return {
    total: userEnrollments.length,
    active: userEnrollments.filter((e) => e.status === 'active').length,
    completed: userEnrollments.filter((e) => e.status === 'completed').length,
    dropped: userEnrollments.filter((e) => e.status === 'dropped').length,
    totalLessons: userEnrollments.reduce((sum, e) => sum + (e.progress?.lessonsCompleted || 0), 0),
    totalAssessments: userEnrollments.reduce(
      (sum, e) => sum + (e.progress?.assessmentsTaken || 0),
      0
    )
  };
});

export const isEnrollmentLoading = derived(enrollmentStore, ($enrollment) => $enrollment.loading);

export const enrollmentError = derived(enrollmentStore, ($enrollment) => $enrollment.error);

// Auto-initialize when user changes
if (browser) {
  user.subscribe(($user) => {
    if ($user) {
      enrollmentStore.initialize($user.id);
    } else {
      enrollmentStore.initialize(null);
    }
  });
}

// Legacy exports for backward compatibility during transition
export const enrollInSubject = enrollmentStore.enrollInCourse;
