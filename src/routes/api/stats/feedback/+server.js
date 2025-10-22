/**
 * API endpoint for feedback statistics
 */

import { FeedbackService, FeedbackError } from '$lib/modules/feedback/services/FeedbackService.js';

/**
 * GET /api/stats/feedback
 * Get feedback statistics (admin only)
 */
export async function GET({ locals }) {
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
    // Get feedback statistics
    const stats = await FeedbackService.getFeedbackStats();

    return new Response(
      JSON.stringify({
        success: true,
        stats
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Error getting feedback statistics:', error);

    if (error instanceof FeedbackError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
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
