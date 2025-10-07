import { json } from '@sveltejs/kit';
import {
  MessageService,
  MessageError,
  MessageValidationError
} from '$lib/modules/session/services/MessageService.js';

/**
 * Search messages by content
 * GET /api/messages/search
 * Query parameters:
 * - q: Search query (required)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sessionId: Filter by specific session
 * - type: Filter by message type ('user' or 'assistant')
 */
export async function GET({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const searchParams = url.searchParams;

    // Get search query
    const query = searchParams.get('q');
    if (!query || query.trim().length === 0) {
      return json({ error: 'Search query (q) is required' }, { status: 400 });
    }

    // Parse other parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const sessionId = searchParams.get('sessionId') || null;
    const type = searchParams.get('type') || null;

    // Validate type parameter
    if (type && !['user', 'assistant'].includes(type)) {
      return json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const options = {
      page,
      limit,
      sessionId,
      type
    };

    const result = await MessageService.searchMessages(userId, query.trim(), options);
    return json(result);
  } catch (error) {
    console.error('Error in GET /api/messages/search:', error);

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to search messages' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
