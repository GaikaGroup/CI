/**
 * Course Navigation Utilities Tests
 * 
 * Basic tests to verify course navigation validation works correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateCourseAccess, validateCourseById, getSafeCourseUrl } from '$lib/utils/courseNavigation.js';

describe('Course Navigation Utilities', () => {
  describe('validateCourseAccess', () => {
    it('should validate active course with required data', () => {
      const course = {
        id: 'course-1',
        name: 'Test Course',
        status: 'active'
      };

      const result = validateCourseAccess(course);
      expect(result.valid).toBe(true);
    });

    it('should reject course without ID', () => {
      const course = {
        name: 'Test Course',
        status: 'active'
      };

      const result = validateCourseAccess(course);
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('invalid_data');
    });

    it('should reject course without name', () => {
      const course = {
        id: 'course-1',
        status: 'active'
      };

      const result = validateCourseAccess(course);
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('incomplete_data');
    });

    it('should reject inactive course', () => {
      const course = {
        id: 'course-1',
        name: 'Test Course',
        status: 'blocked'
      };

      const result = validateCourseAccess(course);
      expect(result.valid).toBe(false);
      expect(result.errorType).toBe('course_unavailable');
    });

    it('should reject null or undefined course', () => {
      expect(validateCourseAccess(null).valid).toBe(false);
      expect(validateCourseAccess(undefined).valid).toBe(false);
    });
  });

  describe('getSafeCourseUrl', () => {
    it('should return null for invalid course ID', () => {
      const result = getSafeCourseUrl('');
      expect(result).toBe(null);
    });

    it('should return null for non-existent course', () => {
      // Note: This test assumes the coursesStore is not initialized with test data
      const courseId = 'non-existent-course';
      const result = getSafeCourseUrl(courseId);
      expect(result).toBe(null);
    });
  });
});