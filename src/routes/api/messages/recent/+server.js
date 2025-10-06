import { json } from '@sveltejs/kit';
import { MessageService, MessageError, MessageValidationError } from '$lib/modules/session/services/MessageService.js';

/**
 * Get recent messages across all user sessions
 * GET /api/messages/recent
 * Query parameters:
 * - limit: Number of recent messages to retrieve (default: 10, max: 100)
 */
export async function GET({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const searchParams = url.searchParams;

    // Parse limit parameter
    const limit = Math.min(parseInt(searchParams.get('limit')) || 10, 100);

    if (limit < 1) {
      return json({ error: 'Limit must be at least 1' }, { status: 400 });
    }

    const messages = await MessageService.getRecentMessages(userId, limit);
    return json({ messages });
  } catch (error) {
    console.error('Error in GET /api/messages/recent:', error);

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to retrieve recent messages' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}