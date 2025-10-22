/**
 * API endpoint for submitting user feedback on messages
 */

import { FeedbackService, FeedbackError } from '$lib/modules/feedback/services/FeedbackService.js';

/**
 * POST /api/messages/feedback
 * Submit feedback for a message
 */
export async function POST({ request, locals }) {
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

  try {
    const body = await request.json();
    const { messageId, feedback } = body;

    // Validate request body
    if (!messageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!feedback) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Feedback text is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Submit feedback
    const updatedMessage = await FeedbackService.submitFeedback(
      messageId,
      feedback,
      locals.user.id
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: updatedMessage
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[API] Error submitting feedback:', error);

    // Handle specific error types
    if (error instanceof FeedbackError) {
      const statusCode =
        error.code === 'FEEDBACK_ALREADY_EXISTS'
          ? 409
          : error.code === 'FEEDBACK_VALIDATION_ERROR'
            ? 400
            : error.code === 'INVALID_MESSAGE_TYPE'
              ? 400
              : error.code === 'MESSAGE_ACCESS_DENIED'
                ? 403
                : error.code === 'MESSAGE_NOT_FOUND'
                  ? 404
                  : 500;

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
