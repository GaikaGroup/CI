/**
 * Enrollments API Endpoints
 *
 * GET /api/enrollments - Get user enrollments
 * POST /api/enrollments - Enroll in a course
 */

import { json } from '@sveltejs/kit';
import EnrollmentService from '$lib/services/EnrollmentService.js';

/**
 * GET /api/enrollments
 *
 * Query parameters:
 * - status: Filter by status (default: all)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - userId: Get enrollments for specific user (admin only)
 * - courseId: Get enrollments for specific course (course creator or admin only)
 */
export async function GET({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const searchParams = url.searchParams;
    const userId = searchParams.get('userId');
    const courseId = searchParams.get('courseId');

    // Determine which enrollments to fetch
    let targetUserId = locals.user.id;

    if (userId && userId !== locals.user.id) {
      // Admin can view any user's enrollments
      if (locals.user.type !== 'admin') {
        return json({ message: 'Permission denied' }, { status: 403 });
      }
      targetUserId = userId;
    }

    if (courseId) {
      // Get course enrollments (for course creators and admins)
      const options = {
        status: searchParams.get('status') || 'all',
        page: parseInt(searchParams.get('page')) || 1,
        limit: Math.min(parseInt(searchParams.get('limit')) || 20, 100)
      };

      const result = await EnrollmentService.getCourseEnrollments(courseId, options);

      if (!result.success) {
        return json({ message: result.error }, { status: 400 });
      }

      return json({
        enrollments: result.enrollments,
        pagination: result.pagination
      });
    } else {
      // Get user enrollments
      const options = {
        status: searchParams.get('status') || 'all',
        page: parseInt(searchParams.get('page')) || 1,
        limit: Math.min(parseInt(searchParams.get('limit')) || 20, 100)
      };

      const result = await EnrollmentService.getUserEnrollments(targetUserId, options);

      if (!result.success) {
        return json({ message: result.error }, { status: 400 });
      }

      return json({
        enrollments: result.enrollments,
        pagination: result.pagination
      });
    }
  } catch (error) {
    console.error('Error in GET /api/enrollments:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/enrollments
 *
 * Body: {
 *   courseId: string
 * }
 */
export async function POST({ request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { courseId } = await request.json();

    // Validate required fields
    if (!courseId) {
      return json({ message: 'Course ID is required' }, { status: 400 });
    }

    // Enroll user in course
    const result = await EnrollmentService.enrollUser(locals.user.id, courseId);

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json(
      {
        message: 'Successfully enrolled in course',
        enrollment: result.enrollment
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/enrollments:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}
