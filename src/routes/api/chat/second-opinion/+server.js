/**
 * Second Opinion API Endpoint
 *
 * POST /api/chat/second-opinion
 * Request a second opinion for a message from an alternative LLM provider
 */

import { json } from '@sveltejs/kit';
import { secondOpinionService } from '$lib/modules/chat/services/SecondOpinionService.js';

/**
 * Handle POST requests to request a second opinion
 * @param {Request} request - The request object
 * @param {Object} locals - SvelteKit locals object
 * @returns {Response} - The response object
 */
export async function POST({ request, locals }) {
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

    // 2. Parse and validate request body
    const body = await request.json();
    const { messageId, sessionId, provider, model, language } = body;

    // Validate required fields
    if (!messageId || typeof messageId !== 'string' || messageId.trim() === '') {
      return json(
        {
          success: false,
          error: 'Missing or invalid required field: messageId'
        },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
      return json(
        {
          success: false,
          error: 'Missing or invalid required field: sessionId'
        },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (provider && typeof provider !== 'string') {
      return json(
        {
          success: false,
          error: 'Invalid field type: provider must be string'
        },
        { status: 400 }
      );
    }

    if (model && typeof model !== 'string') {
      return json(
        {
          success: false,
          error: 'Invalid field type: model must be string'
        },
        { status: 400 }
      );
    }

    console.log('[API /chat/second-opinion] Request received:', {
      messageId,
      sessionId,
      userId: locals.user.id,
      provider: provider || 'auto',
      model: model || 'auto',
      language: language || 'en'
    });

    // 3. Call SecondOpinionService
    const result = await secondOpinionService.requestSecondOpinion(messageId, sessionId, {
      userId: locals.user.id,
      provider,
      model,
      language: language || 'en'
    });

    console.log('[API /chat/second-opinion] Opinion generated successfully:', {
      opinionId: result.data.opinionId,
      provider: result.data.provider,
      model: result.data.model,
      hasDivergence: !!result.data.divergence
    });

    // 4. Return formatted response
    return json(result, { status: 201 });
  } catch (error) {
    console.error('[API /chat/second-opinion] Error:', error);

    // Handle specific error types
    if (error.message === 'Second opinion feature is disabled') {
      return json(
        {
          success: false,
          error: 'Second opinion feature is currently disabled'
        },
        { status: 503 }
      );
    }

    if (error.message === 'Message not found') {
      return json(
        {
          success: false,
          error: 'Message not found'
        },
        { status: 404 }
      );
    }

    if (
      error.message === 'Message does not belong to session' ||
      error.message === 'Unauthorized: Session does not belong to user'
    ) {
      return json(
        {
          success: false,
          error: 'Unauthorized access to message'
        },
        { status: 403 }
      );
    }

    if (error.message === 'Can only request second opinion for assistant messages') {
      return json(
        {
          success: false,
          error: 'Second opinions can only be requested for assistant messages'
        },
        { status: 400 }
      );
    }

    if (error.message.includes('Rate limit exceeded')) {
      return json(
        {
          success: false,
          error: error.message
        },
        { status: 429 }
      );
    }

    if (error.message.includes('No alternative')) {
      return json(
        {
          success: false,
          error: error.message
        },
        { status: 503 }
      );
    }

    if (error.message.includes('Provider unavailable')) {
      return json(
        {
          success: false,
          error: error.message
        },
        { status: 503 }
      );
    }

    // Generic error response
    return json(
      {
        success: false,
        error: 'Failed to generate second opinion. Please try again.'
      },
      { status: 500 }
    );
  }
}
