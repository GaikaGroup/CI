/**
 * Course by ID API Endpoints
 *
 * GET /api/courses/[id] - Get course by ID
 * PUT /api/courses/[id] - Update course
 * DELETE /api/courses/[id] - Delete course
 */

import { json } from '@sveltejs/kit';
import CourseService from '$lib/services/CourseService.js';

/**
 * GET /api/courses/[id]
 *
 * Query parameters:
 * - includeDetails: Include enrollments, sessions, reports (default: false)
 */
export async function GET({ params, url, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const includeDetails = url.searchParams.get('includeDetails') === 'true';

    const result = await CourseService.getCourseById(id, includeDetails);

    if (!result.success) {
      return json({ message: result.error }, { status: 404 });
    }

    return json({ course: result.course });
  } catch (error) {
    console.error('Error in GET /api/courses/[id]:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/courses/[id]
 *
 * Body: Course update data
 */
export async function PUT({ params, request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const updates = await request.json();

    // Validate updates
    if (updates.name && updates.name.length > 255) {
      return json({ message: 'Course name is too long (max 255 characters)' }, { status: 400 });
    }

    const result = await CourseService.updateCourse(id, updates, locals.user.id);

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({
      message: 'Course updated successfully',
      course: result.course
    });
  } catch (error) {
    console.error('Error in PUT /api/courses/[id]:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id]
 *
 * Query parameters:
 * - hard: Set to 'true' for hard delete (admin only)
 */
export async function DELETE({ params, url, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const hardDelete = url.searchParams.get('hard') === 'true';

    const result = await CourseService.deleteCourse(id, locals.user.id, hardDelete);

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/courses/[id]:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}
