/**
 * API endpoint for admin to view all user feedback
 */

import { FeedbackService, FeedbackError } from '$lib/modules/feedback/services/FeedbackService.js';

/**
 * GET /api/admin/feedback
 * Get all feedback (admin only)
 */
export async function GET({ url, locals }) {
  // Check authentication
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Authentication required'
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check admin authorization
  if (locals.user.type !== 'admin') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Admin access required'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const model = url.searchParams.get('model') || null;
    const dateFrom = url.searchParams.get('dateFrom') || null;
    const dateTo = url.searchParams.get('dateTo') || null;

    // Get feedback with filters
    const result = await FeedbackService.getAllFeedback({
      page,
      limit,
      model,
      dateFrom,
      dateTo
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Error getting feedback:', error);

    if (error instanceof FeedbackError) {
      const statusCode = error.code === 'FEEDBACK_VALIDATION_ERROR' ? 400 : 500;

      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { status: statusCode, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
