/**
 * Database-backed Courses Store
 * 
 * This store replaces the localStorage-based courses store with database operations
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Store state
const initialState = {
  courses: [],
  loading: false,
  error: null,
  initialized: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  }
};

function createCoursesStore() {
  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    /**
     * Initialize the store by loading courses from API
     */
    async initialize(options = {}) {
      if (!browser) return;

      update(state => ({ ...state, loading: true, error: null }));

      try {
        const result = await this.loadCourses(options);
        
        if (result.success) {
          update(state => ({
            ...state,
            courses: result.courses,
            pagination: result.pagination,
            loading: false,
            initialized: true
          }));
        } else {
          update(state => ({
            ...state,
            error: result.error,
            loading: false,
            initialized: true
          }));
        }
      } catch (error) {
        console.error('Error initializing courses store:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false,
          initialized: true
        }));
      }
    },

    /**
     * Load courses from API
     */
    async loadCourses(options = {}) {
      try {
        const params = new URLSearchParams();
        
        Object.entries(options).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/courses?${params}`);
        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.message || 'Failed to load courses' };
        }

        return {
          success: true,
          courses: data.courses,
          pagination: data.pagination
        };
      } catch (error) {
        console.error('Error loading courses:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Create a new course
     */
    async addCourse(courseData) {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch('/api/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(courseData)
        });

        const data = await response.json();

        if (!response.ok) {
          update(state => ({
            ...state,
            error: data.message || 'Failed to create course',
            loading: false
          }));
          return { success: false, error: data.message };
        }

        // Add course to local state
        update(state => ({
          ...state,
          courses: [data.course, ...state.courses],
          loading: false
        }));

        return { success: true, course: data.course };
      } catch (error) {
        console.error('Error creating course:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Update a course
     */
    async updateCourse(courseId, updates) {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const response = await fetch(`/api/courses/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });

        const data = await response.json();

        if (!response.ok) {
          update(state => ({
            ...state,
            error: data.message || 'Failed to update course',
            loading: false
          }));
          return { success: false, error: data.message };
        }

        // Update course in local state
        update(state => ({
          ...state,
          courses: state.courses.map(course =>
            course.id === courseId ? data.course : course
          ),
          loading: false
        }));

        return { success: true, course: data.course };
      } catch (error) {
        console.error('Error updating course:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Delete a course
     */
    async removeCourse(courseId, hardDelete = false) {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const params = hardDelete ? '?hard=true' : '';
        const response = await fetch(`/api/courses/${courseId}${params}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (!response.ok) {
          update(state => ({
            ...state,
            error: data.message || 'Failed to delete course',
            loading: false
          }));
          return { success: false, error: data.message };
        }

        // Remove course from local state
        update(state => ({
          ...state,
          courses: state.courses.filter(course => course.id !== courseId),
          loading: false
        }));

        return { success: true };
      } catch (error) {
        console.error('Error deleting course:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Search courses
     */
    async searchCourses(query, options = {}) {
      update(state => ({ ...state, loading: true, error: null }));

      try {
        const searchOptions = {
          search: query,
          ...options
        };

        const result = await this.loadCourses(searchOptions);

        if (result.success) {
          update(state => ({
            ...state,
            courses: result.courses,
            pagination: result.pagination,
            loading: false
          }));
        } else {
          update(state => ({
            ...state,
            error: result.error,
            loading: false
          }));
        }

        return result;
      } catch (error) {
        console.error('Error searching courses:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return { success: false, error: error.message };
      }
    },

    /**
     * Get course by ID
     */
    async getCourseById(courseId) {
      try {
        const response = await fetch(`/api/courses/${courseId}`);
        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.message || 'Course not found' };
        }

        return { success: true, course: data.course };
      } catch (error) {
        console.error('Error getting course:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Refresh courses (reload from API)
     */
    async refresh(options = {}) {
      return this.initialize(options);
    },

    /**
     * Clear error state
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    },

    /**
     * Reset store to initial state
     */
    reset() {
      set(initialState);
    },

    /**
     * Load more courses (pagination)
     */
    async loadMore() {
      let currentState;
      const unsubscribe = subscribe(state => {
        currentState = state;
      });
      unsubscribe();

      if (currentState.pagination.page >= currentState.pagination.pages) {
        return { success: false, error: 'No more courses to load' };
      }

      const nextPage = currentState.pagination.page + 1;
      const result = await this.loadCourses({ page: nextPage });

      if (result.success) {
        update(state => ({
          ...state,
          courses: [...state.courses, ...result.courses],
          pagination: result.pagination
        }));
      }

      return result;
    }
  };
}

// Create the store instance
export const coursesStore = createCoursesStore();

// Derived stores
export const isCoursesLoading = derived(coursesStore, $courses => $courses.loading);
export const coursesError = derived(coursesStore, $courses => $courses.error);
export const coursesInitialized = derived(coursesStore, $courses => $courses.initialized);

// Filtered courses
export const activeCourses = derived(coursesStore, $courses => 
  $courses.courses.filter(course => course.status === 'active')
);

export const userCreatedCourses = derived(coursesStore, $courses => 
  $courses.courses.filter(course => course.creatorRole === 'user')
);

export const adminCreatedCourses = derived(coursesStore, $courses => 
  $courses.courses.filter(course => course.creatorRole === 'admin')
);

// Backward compatibility
export const subjectsStore = coursesStore;

// Auto-initialize when imported in browser
if (browser) {
  // Initialize with a small delay to ensure auth is ready
  setTimeout(() => {
    coursesStore.initialize();
  }, 100);
}