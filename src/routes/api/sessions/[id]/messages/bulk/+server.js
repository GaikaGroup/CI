import { json } from '@sveltejs/kit';
import { MessageService, MessageError, MessageValidationError } from '$lib/modules/session/services/MessageService.js';
import { SessionNotFoundError } from '$lib/modules/session/services/SessionService.js';

/**
 * Bulk delete messages from a session
 * DELETE /api/sessions/[id]/messages/bulk
 * Body: { messageIds: string[] }
 */
export async function DELETE({ params, request, locals }) {
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

    // Validate message IDs
    if (!body.messageIds || !Array.isArray(body.messageIds)) {
      return json({ error: 'Message IDs array is required' }, { status: 400 });
    }

    if (body.messageIds.length === 0) {
      return json({ error: 'At least one message ID is required' }, { status: 400 });
    }

    if (body.messageIds.length > 100) {
      return json({ error: 'Cannot delete more than 100 messages at once' }, { status: 400 });
    }

    // Validate that all message IDs are strings
    const invalidIds = body.messageIds.filter(id => typeof id !== 'string' || id.trim().length === 0);
    if (invalidIds.length > 0) {
      return json({ error: 'All message IDs must be non-empty strings' }, { status: 400 });
    }

    const deletedCount = await MessageService.bulkDeleteMessages(sessionId, body.messageIds, userId);

    return json({ 
      success: true, 
      message: `Successfully deleted ${deletedCount} messages`,
      deletedCount 
    });
  } catch (error) {
    console.error(`Error in DELETE /api/sessions/${params.id}/messages/bulk:`, error);

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to delete messages' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}