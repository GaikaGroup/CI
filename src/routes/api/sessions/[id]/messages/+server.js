import { json } from '@sveltejs/kit';
import { MessageService, MessageError, MessageNotFoundError, MessageValidationError } from '$lib/modules/session/services/MessageService.js';
import { SessionNotFoundError } from '$lib/modules/session/services/SessionService.js';

/**
 * Get messages for a session with pagination
 * GET /api/sessions/[id]/messages
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - sortOrder: Sort order (default: 'asc')
 * - type: Filter by message type ('user' or 'assistant')
 */
export async function GET({ params, url, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const sessionId = params.id;
    
    console.log(`[API] GET /api/sessions/${sessionId}/messages - userId: ${userId}`);

    if (!sessionId) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    const searchParams = url.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 50, 200);
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const type = searchParams.get('type') || null;

    // Validate parameters
    if (!['asc', 'desc'].includes(sortOrder)) {
      return json({ error: 'Invalid sortOrder parameter' }, { status: 400 });
    }

    if (type && !['user', 'assistant'].includes(type)) {
      return json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const options = {
      page,
      limit,
      sortOrder,
      type,
    };

    const result = await MessageService.getSessionMessages(sessionId, options, userId);
    console.log(`[API] Returning ${result.messages.length} messages for session ${sessionId}`);
    return json(result);
  } catch (error) {
    console.error(`Error in GET /api/sessions/${params.id}/messages:`, error);

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to retrieve messages' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Add a new message to a session
 * POST /api/sessions/[id]/messages
 * Body: { type, content, metadata? }
 */
export async function POST({ params, request, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const sessionId = params.id;

    if (!sessionId) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type || !['user', 'assistant'].includes(body.type)) {
      return json({ error: 'Message type must be either "user" or "assistant"' }, { status: 400 });
    }

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return json({ error: 'Message content is required' }, { status: 400 });
    }

    const { type, content, metadata = null } = body;

    // Validate metadata if provided
    if (metadata && typeof metadata !== 'object') {
      return json({ error: 'Metadata must be an object' }, { status: 400 });
    }

    const message = await MessageService.addMessage(
      sessionId,
      type,
      content.trim(),
      metadata,
      userId
    );

    return json(message, { status: 201 });
  } catch (error) {
    console.error(`Error in POST /api/sessions/${params.id}/messages:`, error);

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to create message' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}