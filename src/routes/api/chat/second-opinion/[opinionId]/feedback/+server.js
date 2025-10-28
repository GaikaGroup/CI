/**
 * Second Opinion Feedback API Endpoint
 *
 * POST /api/chat/second-opinion/:opinionId/feedback
 * Submit feedback on a second opinion
 */

import { json } from '@sveltejs/kit';
import { secondOpinionService } from '$lib/modules/chat/services/SecondOpinionService.js';

/**
 * Handle POST requests to submit feedback on a second opinion
 * @param {Request} request - The request object
 * @param {Object} params - URL parameters
 * @param {Object} locals - SvelteKit locals object
 * @returns {Response} - The response object
 */
export async function POST({ request, params, locals }) {
  try {
    // 1. Check authentication
    if (!locals.user) {
      return json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }

    // 2. Validate opinion ID from params
    const { opinionId } = params;

    if (!opinionId || typeof opinionId !== 'string' || opinionId.trim() === '') {
      return json(
        {
          success: false,
          error: 'Invalid opinion ID parameter'
        },
        { status: 400 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { helpful, comment } = body;

    // Validate helpful field (required)
    if (typeof helpful !== 'boolean') {
      return json(
        {
          success: false,
          error: 'Missing or invalid required field: helpful (must be boolean)'
        },
        { status: 400 }
      );
    }

    // Validate comment field (optional)
    if (comment !== undefined && comment !== null && typeof comment !== 'string') {
      return json(
        {
          success: false,
          error: 'Invalid field type: comment must be string'
        },
        { status: 400 }
      );
    }

    console.log('[API /chat/second-opinion/:opinionId/feedback] Request received:', {
      opinionId,
      userId: locals.user.id,
      helpful,
      hasComment: !!comment
    });

    // 4. Record feedback using SecondOpinionService
    await secondOpinionService.recordFeedback(opinionId, helpful, locals.user.id, comment || null);

    console.log('[API /chat/second-opinion/:opinionId/feedback] Feedback recorded successfully:', {
      opinionId,
      helpful
    });

    // 5. Return success response
    return json({
      success: true,
      data: {
        recorded: true
      }
    });
  } catch (error) {
    console.error('[API /chat/second-opinion/:opinionId/feedback] Error:', error);

    // Handle specific error types
    if (error.message === 'Opinion not found') {
      return json(
        {
          success: false,
          error: 'Opinion not found'
        },
        { status: 404 }
      );
    }

    // Generic error response
    return json(
      {
        success: false,
        error: 'Failed to record feedback. Please try again.'
      },
      { status: 500 }
    );
  }
}
