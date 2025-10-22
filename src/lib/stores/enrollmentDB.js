/**
 * Database-backed Enrollment Store
 *
 * This store replaces the localStorage-based enrollment store with database operations
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { user } from '$modules/auth/stores';

// Store state
const initialState = {
  enrollments: [],
  loading: false,
  error: null,
  initialized: false,
  stats: {
    total: 0,
    active: 0,
    completed: 0,
    dropped: 0
  }
};

function createEnrollmentStore() {
  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    /**
     * Initialize the store by loading enrollments from API
     */
    async initialize(userId) {
      if (!browser || !userId) return;

      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const result = await this.loadEnrollments(userId);

        if (result.success) {
          const stats = this.calculateStats(result.enrollments);

          update((state) => ({
            ...state,
            enrollments: result.enrollments,
            stats,
            loading: false,
            initialized: true
          }));
        } else {
          update((state) => ({
            ...state,
            error: result.error,
            loading: false,
            initialized: true
          }));
        }
      } catch (error) {
        console.error('Error initializing enrollment store:', error);
        update((state) => ({
          ...state,
          error: error.message,
          loading: false,
          initialized: true
        }));
      }
    },

    /**
     * Load enrollments from API
     */
    async loadEnrollments(userId, options = {}) {
      try {
        const params = new URLSearchParams();

        if (userId && userId !== 'current') {
          params.append('userId', userId);
        }

        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/enrollments?${params}`);
        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.message || 'Failed to load enrollments' };
        }

        return {
          success: true,
          enrollments: data.enrollments,
          pagination: data.pagination
        };
      } catch (error) {
        console.error('Error loading enrollments:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Enroll in a course
     */
    async enrollInCourse(courseId) {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ courseId })
        });

        const data = await response.json();

        if (!response.ok) {
          update((state) => ({
            ...state,
            error: data.message || 'Failed to enroll in course',
            loading: false
          }));
          return { success: false, error: data.message };
        }

        // Add enrollment to local state
        update((state) => {
          const newEnrollments = [data.enrollment, ...state.enrollments];
          const stats = this.calculateStats(newEnrollments);

          return {
            ...state,
            enrollments: newEnrollments,
            stats,
            loading: false
          };
        });

        return { success: true, enrollment: data.enrollment };
      } catch (error) {
        console.error('Error enrolling in course:', error);
        update((state) => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Update enrollment status
     */
    async updateEnrollmentStatus(enrollmentId, status) {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch(`/api/enrollments/${enrollmentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (!response.ok) {
          update((state) => ({
            ...state,
            error: data.message || 'Failed to update enrollment',
            loading: false
          }));
          return { success: false, error: data.message };
        }

        // Update enrollment in local state
        update((state) => {
          const newEnrollments = state.enrollments.map((enrollment) =>
            enrollment.id === enrollmentId ? data.enrollment : enrollment
          );
          const stats = this.calculateStats(newEnrollments);

          return {
            ...state,
            enrollments: newEnrollments,
            stats,
            loading: false
          };
        });

        return { success: true, enrollment: data.enrollment };
      } catch (error) {
        console.error('Error updating enrollment:', error);
        update((state) => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Update enrollment progress
     */
    async updateProgress(enrollmentId, progress) {
      try {
        const response = await fetch(`/api/enrollments/${enrollmentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ progress })
        });

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.message || 'Failed to update progress' };
        }

        // Update enrollment in local state
        update((state) => ({
          ...state,
          enrollments: state.enrollments.map((enrollment) =>
            enrollment.id === enrollmentId ? data.enrollment : enrollment
          )
        }));

        return { success: true, enrollment: data.enrollment };
      } catch (error) {
        console.error('Error updating progress:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Drop enrollment
     */
    async dropEnrollment(enrollmentId) {
      return this.updateEnrollmentStatus(enrollmentId, 'dropped');
    },

    /**
     * Complete enrollment
     */
    async completeEnrollment(enrollmentId) {
      return this.updateEnrollmentStatus(enrollmentId, 'completed');
    },

    /**
     * Check if user is enrolled in course
     */
    isEnrolled(courseId) {
      let enrolled = false;
      const unsubscribe = subscribe((state) => {
        enrolled = state.enrollments.some(
          (enrollment) => enrollment.courseId === courseId && enrollment.status === 'active'
        );
      });
      unsubscribe();
      return enrolled;
    },

    /**
     * Get enrollment for course
     */
    getEnrollmentForCourse(courseId) {
      let enrollment = null;
      const unsubscribe = subscribe((state) => {
        enrollment = state.enrollments.find((enrollment) => enrollment.courseId === courseId);
      });
      unsubscribe();
      return enrollment;
    },

    /**
     * Calculate enrollment statistics
     */
    calculateStats(enrollments) {
      return enrollments.reduce(
        (stats, enrollment) => {
          stats.total++;
          stats[enrollment.status] = (stats[enrollment.status] || 0) + 1;
          return stats;
        },
        {
          total: 0,
          active: 0,
          completed: 0,
          dropped: 0
        }
      );
    },

    /**
     * Refresh enrollments
     */
    async refresh(userId) {
      return this.initialize(userId);
    },

    /**
     * Clear error state
     */
    clearError() {
      update((state) => ({ ...state, error: null }));
    },

    /**
     * Reset store to initial state
     */
    reset() {
      set(initialState);
    }
  };
}

// Create the store instance
export const enrollmentStore = createEnrollmentStore();

// Derived stores
export const isEnrollmentLoading = derived(enrollmentStore, ($enrollment) => $enrollment.loading);
export const enrollmentError = derived(enrollmentStore, ($enrollment) => $enrollment.error);
export const enrollmentStats = derived(enrollmentStore, ($enrollment) => $enrollment.stats);

export const activeEnrollments = derived(enrollmentStore, ($enrollment) =>
  $enrollment.enrollments.filter((e) => e.status === 'active')
);

export const completedEnrollments = derived(enrollmentStore, ($enrollment) =>
  $enrollment.enrollments.filter((e) => e.status === 'completed')
);

// Auto-initialize when user changes
if (browser) {
  user.subscribe(($user) => {
    if ($user) {
      enrollmentStore.initialize($user.id);
    } else {
      enrollmentStore.reset();
    }
  });
}

// Legacy exports for backward compatibility
export const enrollInSubject = enrollmentStore.enrollInCourse;
