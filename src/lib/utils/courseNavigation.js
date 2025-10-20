/**
 * Course Navigation Utilities
 *
 * Provides utilities for validating course access and handling navigation
 * with proper error handling and fallback redirects.
 */

import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { coursesStore } from '$lib/stores/coursesDB.js';

/**
 * Validate if a course is accessible
 * @param {Object} course - Course object to validate
 * @returns {Object} Validation result with valid flag and error message
 */
export function validateCourseAccess(course) {
  // Check if course exists and is valid
  if (!course || !course.id) {
    return {
      valid: false,
      error: 'Invalid course data',
      errorType: 'invalid_data'
    };
  }

  // Check if course is active
  if (course.status !== 'active') {
    const statusMessages = {
      blocked: 'This course has been temporarily blocked',
      deleted: 'This course has been removed',
      draft: 'This course is still in development',
      archived: 'This course has been archived'
    };

    return {
      valid: false,
      error: statusMessages[course.status] || `This course is currently ${course.status}`,
      errorType: 'course_unavailable'
    };
  }

  // Check if course has required data
  if (!course.name) {
    return {
      valid: false,
      error: 'Course is missing required information',
      errorType: 'incomplete_data'
    };
  }

  return { valid: true };
}

/**
 * Validate course by ID from the store
 * @param {string} courseId - Course ID to validate
 * @returns {Object} Validation result with course data if valid
 */
export function validateCourseById(courseId) {
  if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
    return {
      valid: false,
      error: 'Invalid course ID',
      errorType: 'invalid_id'
    };
  }

  const courses = get(coursesStore);

  if (!Array.isArray(courses)) {
    return {
      valid: false,
      error: 'Course data unavailable',
      errorType: 'data_unavailable'
    };
  }

  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    const availableCourses = courses.filter((c) => c.status === 'active').length;
    return {
      valid: false,
      error: `Course not found. ${availableCourses > 0 ? `${availableCourses} courses available in catalogue.` : 'Check the course catalogue.'}`,
      errorType: 'not_found'
    };
  }

  const courseValidation = validateCourseAccess(course);

  return {
    ...courseValidation,
    course: courseValidation.valid ? course : null
  };
}

/**
 * Navigate to course learning page with validation
 * @param {Object|string} courseOrId - Course object or course ID
 * @param {Object} options - Navigation options
 * @returns {Promise<boolean>} Success status
 */
export async function navigateToCourse(courseOrId, options = {}) {
  const { fallbackPath = '/my-courses', showError = true, errorHandler = null } = options;

  let validation;

  if (typeof courseOrId === 'string') {
    validation = validateCourseById(courseOrId);
  } else {
    validation = validateCourseAccess(courseOrId);
    validation.course = courseOrId;
  }

  if (!validation.valid) {
    if (showError && errorHandler) {
      errorHandler(validation.error, validation.errorType);
    } else if (showError) {
      console.error('Course navigation error:', validation.error);
      // In a real app, you might show a toast notification here
      alert(`Cannot access course: ${validation.error}`);
    }

    if (fallbackPath) {
      await goto(fallbackPath);
    }

    return false;
  }

  try {
    const identifier = validation.course.slug || validation.course.id;
    await goto(`/learn/${identifier}`);
    return true;
  } catch (error) {
    console.error('Navigation error:', error);

    if (showError && errorHandler) {
      errorHandler('Navigation failed', 'navigation_error');
    } else if (showError) {
      alert('Navigation failed. Please try again.');
    }

    if (fallbackPath) {
      await goto(fallbackPath);
    }

    return false;
  }
}

/**
 * Navigate to course progress page with validation
 * @param {Object|string} courseOrId - Course object or course ID
 * @param {Object} options - Navigation options
 * @returns {Promise<boolean>} Success status
 */
export async function navigateToCourseProgress(courseOrId, options = {}) {
  const { fallbackPath = '/my-courses', showError = true, errorHandler = null } = options;

  let validation;

  if (typeof courseOrId === 'string') {
    validation = validateCourseById(courseOrId);
  } else {
    validation = validateCourseAccess(courseOrId);
    validation.course = courseOrId;
  }

  if (!validation.valid) {
    if (showError && errorHandler) {
      errorHandler(validation.error, validation.errorType);
    } else if (showError) {
      console.error('Course navigation error:', validation.error);
      alert(`Cannot access course: ${validation.error}`);
    }

    if (fallbackPath) {
      await goto(fallbackPath);
    }

    return false;
  }

  try {
    const identifier = validation.course.slug || validation.course.id;
    await goto(`/learn/${identifier}/progress`);
    return true;
  } catch (error) {
    console.error('Navigation error:', error);

    if (showError && errorHandler) {
      errorHandler('Navigation failed', 'navigation_error');
    } else if (showError) {
      alert('Navigation failed. Please try again.');
    }

    if (fallbackPath) {
      await goto(fallbackPath);
    }

    return false;
  }
}

/**
 * Get course navigation suggestions based on error type
 * @param {string} errorType - Type of error encountered
 * @returns {Array} Array of suggestion objects
 */
export function getNavigationSuggestions(errorType) {
  const suggestions = {
    invalid_data: [
      { text: 'Go to My Courses', action: () => goto('/my-courses') },
      { text: 'Browse Catalogue', action: () => goto('/catalogue') }
    ],
    invalid_id: [
      { text: 'Go to My Courses', action: () => goto('/my-courses') },
      { text: 'Browse Catalogue', action: () => goto('/catalogue') }
    ],
    course_unavailable: [
      { text: 'Browse Available Courses', action: () => goto('/catalogue') },
      { text: 'Go to My Courses', action: () => goto('/my-courses') }
    ],
    incomplete_data: [
      { text: 'Contact Support', action: () => window.open('mailto:support@example.com') },
      { text: 'Go to My Courses', action: () => goto('/my-courses') }
    ],
    not_found: [
      { text: 'Browse Catalogue', action: () => goto('/catalogue') },
      { text: 'Go to My Courses', action: () => goto('/my-courses') }
    ],
    data_unavailable: [
      { text: 'Refresh Page', action: () => window.location.reload() },
      { text: 'Go to Home', action: () => goto('/') }
    ],
    navigation_error: [
      { text: 'Try Again', action: () => window.location.reload() },
      { text: 'Go to My Courses', action: () => goto('/my-courses') }
    ]
  };

  return suggestions[errorType] || suggestions['navigation_error'];
}

/**
 * Check if user has access to a specific course
 * @param {string} courseId - Course ID to check
 * @param {Object} user - User object (optional, for future enrollment checks)
 * @returns {Object} Access check result
 */
export function checkCourseAccess(courseId, user = null) {
  const validation = validateCourseById(courseId);

  if (!validation.valid) {
    return validation;
  }

  // Future: Add enrollment checks here
  // if (user && !isUserEnrolled(user.id, courseId)) {
  //   return {
  //     valid: false,
  //     error: 'You are not enrolled in this course',
  //     errorType: 'not_enrolled'
  //   };
  // }

  return { valid: true, course: validation.course };
}

/**
 * Get safe course URL with validation
 * @param {string} courseId - Course ID
 * @param {string} path - Additional path (e.g., 'progress')
 * @returns {string|null} Safe URL or null if invalid
 */
export function getSafeCourseUrl(courseId, path = '') {
  const validation = validateCourseById(courseId);

  if (!validation.valid) {
    return null;
  }

  // courseId can be either ID or slug
  const basePath = `/learn/${courseId}`;
  return path ? `${basePath}/${path}` : basePath;
}
