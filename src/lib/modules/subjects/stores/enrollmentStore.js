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
     * Enroll user in a subject
     */
    enrollInSubject: async (userId, subjectId) => {
      update((state) => ({ ...state, loading: true }));

      try {
        const result = userEnrollmentService.enrollUser(userId, subjectId);

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
        console.error('Error enrolling in subject:', error);
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
    updateEnrollmentStatus: async (userId, subjectId, status) => {
      try {
        const result = userEnrollmentService.updateEnrollmentStatus(userId, subjectId, status);

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
    updateProgress: async (userId, subjectId, progressUpdate) => {
      try {
        const result = userEnrollmentService.updateProgress(userId, subjectId, progressUpdate);

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
    dropEnrollment: async (userId, subjectId) => {
      return await this.updateEnrollmentStatus(userId, subjectId, 'dropped');
    },

    /**
     * Check if user is enrolled in a subject
     */
    isEnrolled: (userId, subjectId) => {
      return userEnrollmentService.isUserEnrolled(userId, subjectId);
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
export const activeEnrollments = derived(enrollmentStore, ($enrollment) =>
  $enrollment.enrollments.filter((e) => e.status === 'active')
);

export const enrollmentStats = derived([enrollmentStore, user], ([, $user]) => {
  if (!$user) return null;
  return userEnrollmentService.getUserStats($user.id);
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
