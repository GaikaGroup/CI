/**
 * Enrollment by ID API Endpoints
 *
 * GET /api/enrollments/[id] - Get enrollment by ID
 * PUT /api/enrollments/[id] - Update enrollment
 * DELETE /api/enrollments/[id] - Drop enrollment
 */

import { json } from '@sveltejs/kit';
import EnrollmentService from '$lib/services/EnrollmentService.js';

/**
 * GET /api/enrollments/[id]
 */
export async function GET({ params, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;

    const result = await EnrollmentService.getEnrollmentById(id);

    if (!result.success) {
      return json({ message: result.error }, { status: 404 });
    }

    // Check if user has permission to view this enrollment
    if (result.enrollment.userId !== locals.user.id && locals.user.type !== 'admin') {
      return json({ message: 'Permission denied' }, { status: 403 });
    }

    return json({ enrollment: result.enrollment });
  } catch (error) {
    console.error('Error in GET /api/enrollments/[id]:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/enrollments/[id]
 *
 * Body: { status?, progress? }
 */
export async function PUT({ params, request, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const updates = await request.json();

    // Get enrollment to check permissions
    const enrollmentResult = await EnrollmentService.getEnrollmentById(id);

    if (!enrollmentResult.success) {
      return json({ message: 'Enrollment not found' }, { status: 404 });
    }

    // Check permissions
    if (enrollmentResult.enrollment.userId !== locals.user.id && locals.user.type !== 'admin') {
      return json({ message: 'Permission denied' }, { status: 403 });
    }

    let result;

    if (updates.status) {
      // Update status
      result = await EnrollmentService.updateEnrollmentStatus(
        enrollmentResult.enrollment.userId,
        enrollmentResult.enrollment.courseId,
        updates.status
      );
    } else if (updates.progress) {
      // Update progress
      result = await EnrollmentService.updateProgress(
        enrollmentResult.enrollment.userId,
        enrollmentResult.enrollment.courseId,
        updates.progress
      );
    } else {
      return json({ message: 'No valid updates provided' }, { status: 400 });
    }

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({
      message: 'Enrollment updated successfully',
      enrollment: result.enrollment
    });
  } catch (error) {
    console.error('Error in PUT /api/enrollments/[id]:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/enrollments/[id] - Drop enrollment
 */
export async function DELETE({ params, locals }) {
  try {
    // Check authentication
    if (!locals.user) {
      return json({ message: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;

    // Get enrollment to check permissions
    const enrollmentResult = await EnrollmentService.getEnrollmentById(id);

    if (!enrollmentResult.success) {
      return json({ message: 'Enrollment not found' }, { status: 404 });
    }

    // Check permissions
    if (enrollmentResult.enrollment.userId !== locals.user.id && locals.user.type !== 'admin') {
      return json({ message: 'Permission denied' }, { status: 403 });
    }

    // Drop enrollment
    const result = await EnrollmentService.dropEnrollment(
      enrollmentResult.enrollment.userId,
      enrollmentResult.enrollment.courseId
    );

    if (!result.success) {
      return json({ message: result.error }, { status: 400 });
    }

    return json({ message: 'Enrollment dropped successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/enrollments/[id]:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
}
