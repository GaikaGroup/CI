import { error } from '@sveltejs/kit';
import { coursesStore } from '$lib/stores/coursesDB.js';
import { get } from 'svelte/store';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, url }) {
  const { courseId } = params;

  // Validate courseId format
  if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
    throw error(400, {
      message: 'Invalid course ID',
      details: 'The course ID is missing or invalid. Please check the URL and try again.'
    });
  }

  try {
    // Initialize courses store to ensure data is loaded
    coursesStore.initialize();

    // Get current courses from store
    const courses = get(coursesStore);

    // Validate that courses were loaded
    if (!Array.isArray(courses)) {
      throw error(500, {
        message: 'Course data unavailable',
        details: 'Unable to load course information. Please try again later.'
      });
    }

    // Find the requested course
    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      // Provide helpful error message with suggestions
      const availableCourses = courses.filter((c) => c.status === 'active').length;
      throw error(404, {
        message: 'Course not found',
        details: `The course "${courseId}" does not exist or has been removed. ${availableCourses > 0 ? `There are ${availableCourses} active courses available in the catalogue.` : 'Please check the course catalogue for available courses.'}`
      });
    }

    // Check if course is active and accessible
    if (course.status !== 'active') {
      const statusMessages = {
        blocked: 'This course has been temporarily blocked and is not accessible.',
        deleted: 'This course has been removed and is no longer available.',
        draft: 'This course is still in development and not yet available.',
        archived: 'This course has been archived and is no longer active.'
      };

      throw error(403, {
        message: 'Course not available',
        details:
          statusMessages[course.status] ||
          `This course is currently ${course.status} and not accessible.`
      });
    }

    // Validate course has required data
    if (!course.name || !course.description) {
      throw error(500, {
        message: 'Course data incomplete',
        details: 'This course is missing required information. Please contact support.'
      });
    }

    return {
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        language: course.language,
        level: course.level,
        skills: course.skills,
        status: course.status
      }
    };
  } catch (err) {
    // If it's already a SvelteKit error, re-throw it
    if (err.status) {
      throw err;
    }

    // Handle unexpected errors
    console.error('Error loading course progress:', err);
    throw error(500, {
      message: 'Failed to load course progress',
      details:
        'An unexpected error occurred while loading the course progress. Please try again or contact support if the problem persists.'
    });
  }
}
