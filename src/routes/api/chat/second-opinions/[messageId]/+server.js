/**
 * Second Opinions List API Endpoint
 *
 * GET /api/chat/second-opinions/:messageId
 * Get all second opinions for a specific message
 */

import { json } from '@sveltejs/kit';
import { secondOpinionService } from '$lib/modules/chat/services/SecondOpinionService.js';
import { prisma } from '$lib/database/client.js';

/**
 * Handle GET requests to retrieve second opinions for a message
 * @param {Request} request - The request object
 * @param {Object} params - URL parameters
 * @param {Object} locals - SvelteKit locals object
 * @returns {Response} - The response object
 */
export async function GET({ params, locals }) {
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

    // 2. Validate message ID from params
    const { messageId } = params;

    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
      return json(
        {
          success: false,
          error: 'Invalid message ID parameter'
        },
        { status: 400 }
      );
    }

    console.log('[API /chat/second-opinions/:messageId] Request received:', {
      messageId,
      userId: locals.user.id
    });

    // 3. Check authorization - verify user owns the message's session
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { session: true }
    });

    if (!message) {
      return json(
        {
          success: false,
          error: 'Message not found'
        },
        { status: 404 }
      );
    }

    if (message.session.userId !== locals.user.id) {
      return json(
        {
          success: false,
          error: 'Unauthorized access to message'
        },
        { status: 403 }
      );
    }

    // 4. Get second opinions
    const opinions = await secondOpinionService.getSecondOpinions(messageId);

    // 5. Add user's feedback to each opinion
    const opinionsWithUserFeedback = await Promise.all(
      opinions.map(async (opinion) => {
        // Get user's feedback for this opinion
        const userFeedback = await prisma.opinionFeedback.findUnique({
          where: {
            unique_opinion_user_feedback: {
              opinionId: opinion.id,
              userId: locals.user.id
            }
          }
        });

        return {
          ...opinion,
          feedback: {
            ...opinion.feedback,
            userFeedback: userFeedback ? userFeedback.helpful : null
          }
        };
      })
    );

    console.log('[API /chat/second-opinions/:messageId] Retrieved opinions:', {
      messageId,
      count: opinionsWithUserFeedback.length
    });

    // 6. Return formatted response
    return json({
      success: true,
      data: {
        opinions: opinionsWithUserFeedback
      }
    });
  } catch (error) {
    console.error('[API /chat/second-opinions/:messageId] Error:', error);

    // Generic error response
    return json(
      {
        success: false,
        error: 'Failed to retrieve second opinions. Please try again.'
      },
      { status: 500 }
    );
  }
}
