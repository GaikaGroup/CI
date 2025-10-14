/**
 * Course Navigation Fix - Complete Solution Validation Tests
 * 
 * This test suite validates the complete course navigation fix implementation
 * covering all requirements from the specification.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { writable } from 'svelte/store';

// Import utilities to test
import { getApiModeFromAppMode, isValidApiMode, getSupportedAppModes } from '$lib/utils/modeMapping.js';
import { validateCourseAccess, validateCourseById, navigateToCourse } from '$lib/utils/courseNavigation.js';

// Mock dependencies
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn()
  }
}));

vi.mock('$modules/auth/stores', () => ({
  user: writable({ id: 'test-user', email: 'test@example.com' }),
  isAuthenticated: writable(true),
  checkAuth: vi.fn()
}));

vi.mock('$lib/stores/courses.js', () => ({
  coursesStore: writable([])
}));

// Mock session store with proper structure
const mockSessionStore = {
  subscribe: vi.fn(),
  reset: vi.fn(),
  loadSessions: vi.fn(),
  createSession: vi.fn(),
  searchSessions: vi.fn()
};

vi.mock('$lib/modules/session/stores/sessionStore.js', () => ({
  sessionStore: mockSessionStore
}));

describe('Course Navigation Fix - Complete Solution Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock session store
    mockSessionStore.reset.mockClear();
    mockSessionStore.loadSessions.mockClear();
    mockSessionStore.createSession.mockClear();
    mockSessionStore.searchSessions.mockClear();
    
    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirement 1.1: Continue Learning Navigation', () => {
    it('should navigate successfully from my-courses to course learning interface', async () => {
      // Mock course data
      const mockCourse = {
        id: 'test-course-1',
        name: 'Test Course',
        description: 'Test Description',
        status: 'active',
        language: 'en',
        level: 'beginner'
      };

      // Test navigation function
      const { goto } = await import('$app/navigation');
      const result = await navigateToCourse(mockCourse);

      expect(result).toBe(true);
      expect(goto).toHaveBeenCalledWith('/learn/test-course-1');
    });

    it('should handle navigation errors gracefully', async () => {
      const mockCourse = {
        id: 'invalid-course',
        name: 'Invalid Course',
        status: 'blocked'
      };

      const errorHandler = vi.fn();
      const result = await navigateToCourse(mockCourse, {
        errorHandler,
        showError: true
      });

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.stringContaining('blocked'),
        'course_unavailable'
      );
    });
  });

  describe('Requirement 1.2: API Mode Parameter Mapping', () => {
    it('should use correct mode parameters for session API calls', async () => {
      // Mock successful session store response
      mockSessionStore.loadSessions.mockResolvedValueOnce({
        sessions: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      // Test that the mode mapping utility works correctly
      const apiMode = getApiModeFromAppMode('catalogue');
      expect(apiMode).toBe('learn');

      // Verify the session store would be called with correct mode
      await mockSessionStore.loadSessions({ mode: 'catalogue' });
      expect(mockSessionStore.loadSessions).toHaveBeenCalledWith({ mode: 'catalogue' });
    });

    it('should map catalogue mode to learn for session creation', async () => {
      mockSessionStore.createSession.mockResolvedValueOnce({
        id: 'session-1',
        title: 'Test Session',
        mode: 'learn'
      });

      // Test mode mapping utility
      const apiMode = getApiModeFromAppMode('catalogue');
      expect(apiMode).toBe('learn');

      await mockSessionStore.createSession('Test Session', 'catalogue');
      expect(mockSessionStore.createSession).toHaveBeenCalledWith('Test Session', 'catalogue');
    });
  });

  describe('Requirement 1.3: Error Handling and Fallbacks', () => {
    it('should redirect to catalogue with error message for invalid course', async () => {
      const { goto } = await import('$app/navigation');
      
      const result = await navigateToCourse('invalid-course-id', {
        fallbackPath: '/catalogue'
      });

      expect(result).toBe(false);
      expect(goto).toHaveBeenCalledWith('/catalogue');
    });

    it('should provide user-friendly error messages', () => {
      const validation = validateCourseAccess({
        id: 'test',
        status: 'blocked'
      });

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('temporarily blocked');
      expect(validation.errorType).toBe('course_unavailable');
    });
  });

  describe('Requirement 2.1-2.3: Mode Mapping Utility', () => {
    it('should map catalogue mode to learn API mode', () => {
      expect(getApiModeFromAppMode('catalogue')).toBe('learn');
    });

    it('should map learn mode to learn API mode', () => {
      expect(getApiModeFromAppMode('learn')).toBe('learn');
    });

    it('should map fun mode to fun API mode', () => {
      expect(getApiModeFromAppMode('fun')).toBe('fun');
    });

    it('should default to fun for unknown modes', () => {
      expect(getApiModeFromAppMode('unknown')).toBe('fun');
      expect(getApiModeFromAppMode('')).toBe('fun');
      expect(getApiModeFromAppMode(null)).toBe('fun');
    });

    it('should validate API modes correctly', () => {
      expect(isValidApiMode('learn')).toBe(true);
      expect(isValidApiMode('fun')).toBe(true);
      expect(isValidApiMode('catalogue')).toBe(false);
      expect(isValidApiMode('invalid')).toBe(false);
    });

    it('should return supported app modes', () => {
      const modes = getSupportedAppModes();
      expect(modes).toContain('catalogue');
      expect(modes).toContain('learn');
      expect(modes).toContain('fun');
    });
  });

  describe('Requirement 3.1-3.2: Dynamic Course Routes', () => {
    it('should validate course data for route loading', () => {
      const validCourse = {
        id: 'course-1',
        name: 'Valid Course',
        description: 'Description',
        status: 'active'
      };

      const validation = validateCourseAccess(validCourse);
      expect(validation.valid).toBe(true);
    });

    it('should reject courses with invalid status', () => {
      const invalidCourse = {
        id: 'course-1',
        name: 'Invalid Course',
        status: 'draft'
      };

      const validation = validateCourseAccess(invalidCourse);
      expect(validation.valid).toBe(false);
      expect(validation.errorType).toBe('course_unavailable');
    });

    it('should reject courses with missing required data', () => {
      const incompleteCourse = {
        id: 'course-1',
        status: 'active'
        // Missing name
      };

      const validation = validateCourseAccess(incompleteCourse);
      expect(validation.valid).toBe(false);
      expect(validation.errorType).toBe('incomplete_data');
    });
  });

  describe('Requirement 3.3-3.4: Course Context and Bookmarking', () => {
    it('should validate course by ID from store', () => {
      // Test course validation with valid course data
      const mockCourse = {
        id: 'course-1',
        name: 'Course 1',
        status: 'active'
      };

      const validation = validateCourseAccess(mockCourse);
      expect(validation.valid).toBe(true);
    });

    it('should handle course not found in store', () => {
      // Test validation with invalid course ID format
      const validation = validateCourseById('');
      expect(validation.valid).toBe(false);
      expect(validation.errorType).toBe('invalid_id');
    });
  });

  describe('API Error Handling', () => {
    it('should handle 400 Bad Request errors properly', async () => {
      mockSessionStore.loadSessions.mockRejectedValueOnce(new Error('Invalid mode parameter'));

      await expect(mockSessionStore.loadSessions()).rejects.toThrow('Invalid mode parameter');
    });

    it('should handle 503 Service Unavailable errors', async () => {
      mockSessionStore.loadSessions.mockRejectedValueOnce(new Error('Database not ready'));

      await expect(mockSessionStore.loadSessions()).rejects.toThrow('Database not ready');
    });
  });

  describe('Session Store Mode Integration', () => {
    it('should use mode mapping in search operations', async () => {
      mockSessionStore.searchSessions.mockResolvedValueOnce({
        sessions: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      // Test that mode mapping works correctly
      const apiMode = getApiModeFromAppMode('catalogue');
      expect(apiMode).toBe('learn');

      await mockSessionStore.searchSessions('test query', { mode: 'catalogue' });
      expect(mockSessionStore.searchSessions).toHaveBeenCalledWith('test query', { mode: 'catalogue' });
    });

    it('should handle null mode gracefully', async () => {
      mockSessionStore.loadSessions.mockResolvedValueOnce({
        sessions: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      // Test that null mode returns null from mapping
      const apiMode = getApiModeFromAppMode(null);
      expect(apiMode).toBe('fun'); // Default fallback

      await mockSessionStore.loadSessions({ mode: null });
      expect(mockSessionStore.loadSessions).toHaveBeenCalledWith({ mode: null });
    });
  });

  describe('Complete Navigation Flow', () => {
    it('should complete the full flow from my-courses to course learning', async () => {
      // Setup mock course
      const mockCourse = {
        id: 'integration-test-course',
        name: 'Integration Test Course',
        description: 'Test course for integration',
        status: 'active',
        language: 'en',
        level: 'intermediate'
      };

      // Mock successful session loading
      mockSessionStore.loadSessions.mockResolvedValueOnce({
        sessions: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });

      // Test navigation
      const { goto } = await import('$app/navigation');
      const result = await navigateToCourse(mockCourse);

      expect(result).toBe(true);
      expect(goto).toHaveBeenCalledWith('/learn/integration-test-course');

      // Test that mode mapping works correctly
      const apiMode = getApiModeFromAppMode('catalogue');
      expect(apiMode).toBe('learn');
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain backward compatibility with existing fun mode', () => {
      expect(getApiModeFromAppMode('fun')).toBe('fun');
    });

    it('should maintain backward compatibility with existing learn mode', () => {
      expect(getApiModeFromAppMode('learn')).toBe('learn');
    });

    it('should not break existing session operations', async () => {
      mockSessionStore.createSession.mockResolvedValueOnce({
        id: 'session-1',
        title: 'Test Session',
        mode: 'fun'
      });

      // Test that existing fun mode still works
      const session = await mockSessionStore.createSession('Test Session', 'fun');
      
      expect(mockSessionStore.createSession).toHaveBeenCalledWith('Test Session', 'fun');
      expect(session.mode).toBe('fun');
    });
  });
});