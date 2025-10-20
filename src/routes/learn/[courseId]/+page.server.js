import { error } from '@sveltejs/kit';
import CourseService from '$lib/services/CourseService.js';
import { getPrismaClient } from '$lib/database/connection.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, locals }) {
  const { courseId } = params; // Can be either ID or slug

  // Validate courseId/slug format
  if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
    throw error(400, {
      message: 'Invalid course identifier',
      details: 'The course identifier is missing or invalid. Please check the URL and try again.'
    });
  }

  // Check authentication
  if (!locals.user) {
    throw error(401, {
      message: 'Authentication required',
      details: 'Please log in to access this course.'
    });
  }

  try {
    // Load course from database via API service (supports both ID and slug)
    const result = await CourseService.getCourseById(courseId, false);

    if (!result.success) {
      throw error(404, {
        message: 'Course not found',
        details: result.error || 'The requested course does not exist or has been removed.'
      });
    }

    const course = result.course;

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

    // Get student count for the course
    let studentCount = 0;
    try {
      const prisma = getPrismaClient();
      studentCount = await prisma.enrollment.count({
        where: {
          courseId: courseId,
          status: 'active'
        }
      });
    } catch (countError) {
      console.error('Error counting enrollments:', countError);
      // Continue without student count if query fails
    }

    return {
      course: {
        id: course.id,
        slug: course.slug,
        name: course.name,
        description: course.description,
        language: course.language,
        level: course.level,
        skills: course.skills,
        practice: course.practice,
        exam: course.exam,
        agents: course.agents,
        orchestrationAgent: course.orchestrationAgent,
        materials: course.materials,
        llmSettings: course.llmSettings,
        status: course.status
      },
      studentCount
    };
  } catch (err) {
    // If it's already a SvelteKit error, re-throw it
    if (err.status) {
      throw err;
    }

    // Handle unexpected errors
    console.error('Error loading course:', err);
    throw error(500, {
      message: 'Failed to load course',
      details:
        'An unexpected error occurred while loading the course. Please try again or contact support if the problem persists.'
    });
  }
}
