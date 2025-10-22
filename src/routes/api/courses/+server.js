/**
 * Courses API Endpoints
 *
 * GET /api/courses - Get all courses with filtering and pagination
 * POST /api/courses - Create a new course
 */

import { json } from '@sveltejs/kit';
import CourseService from '$lib/services/CourseService.js';

/**
 * GET /api/courses
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search query for name and description
 * - language: Filter by language
 * - level: Filter by level
 * - status: Filter by status (default: active)
 * - creatorId: Filter by creator
 * - sortBy: Sort field (default: createdAt)
 * - sortOrder: Sort order (default: desc)
 */
export async function GET({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const searchParams = url.searchParams;
    const options = {
      page: parseInt(searchParams.get('page')) || 1,
      limit: Math.min(parseInt(searchParams.get('limit')) || 20, 100), // Max 100 items
      search: searchParams.get('search') || '',
      language: searchParams.get('language') || '',
      level: searchParams.get('level') || '',
      status: searchParams.get('status') || 'active',
      creatorId: searchParams.get('creatorId') || '',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    };

    const result = await CourseService.getCourses(options);

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({
      courses: result.courses,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error in GET /api/courses:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/courses
 *
 * Body: {
 *   name: string,
 *   description?: string,
 *   language?: string,
 *   level?: string,
 *   skills?: string[],
 *   settings?: object,
 *   practice?: object,
 *   exam?: object,
 *   agents?: object[],
 *   orchestrationAgent?: object,
 *   materials?: object[],
 *   llmSettings?: object
 * }
 */
export async function POST({ request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const courseData = await request.json();

    // Validate required fields
    if (!courseData.name || courseData.name.trim().length === 0) {
      return json({ message: 'Course name is required' }, { status: 400 });
    }

    if (courseData.name.length > 255) {
      return json({ message: 'Course name is too long (max 255 characters)' }, { status: 400 });
    }

    // Create course
    const result = await CourseService.createCourse(courseData, locals.user.id);

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json(
      {
        message: 'Course created successfully',
        course: result.course
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/courses:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}
