import { json } from '@sveltejs/kit';
import {
  MessageService,
  MessageError,
  MessageNotFoundError,
  MessageValidationError
} from '$lib/modules/session/services/MessageService.js';

/**
 * Get a specific message by ID
 * GET /api/messages/[id]
 */
export async function GET({ params, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const messageId = params.id;

    if (!messageId) {
      return json({ error: 'Message ID is required' }, { status: 400 });
    }

    const message = await MessageService.getMessage(messageId, userId);
    return json(message);
  } catch (error) {
    console.error(`Error in GET /api/messages/${params.id}:`, error);

    if (error instanceof MessageNotFoundError) {
      return json({ error: 'Message not found' }, { status: 404 });
    }

    if (error.code === 'MESSAGE_ACCESS_DENIED') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to retrieve message' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update a message
 * PUT /api/messages/[id]
 * Body: { content?, metadata? }
 */
export async function PUT({ params, request, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const messageId = params.id;

    if (!messageId) {
      return json({ error: 'Message ID is required' }, { status: 400 });
    }

    const body = await request.json();

    // Validate update fields
    const allowedFields = ['content', 'metadata'];
    const updates = {};

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate content if provided
    if (updates.content !== undefined) {
      if (
        !updates.content ||
        typeof updates.content !== 'string' ||
        updates.content.trim().length === 0
      ) {
        return json({ error: 'Content cannot be empty' }, { status: 400 });
      }
      if (updates.content.length > 50000) {
        return json({ error: 'Content is too long (max 50,000 characters)' }, { status: 400 });
      }
      updates.content = updates.content.trim();
    }

    // Validate metadata if provided
    if (
      updates.metadata !== undefined &&
      updates.metadata !== null &&
      typeof updates.metadata !== 'object'
    ) {
      return json({ error: 'Metadata must be an object' }, { status: 400 });
    }

    const updatedMessage = await MessageService.updateMessage(messageId, updates, userId);
    return json(updatedMessage);
  } catch (error) {
    console.error(`Error in PUT /api/messages/${params.id}:`, error);

    if (error instanceof MessageNotFoundError) {
      return json({ error: 'Message not found' }, { status: 404 });
    }

    if (error.code === 'MESSAGE_ACCESS_DENIED') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to update message' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
} /**

 * Delete a message
 * DELETE /api/messages/[id]
 */
export async function DELETE({ params, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const messageId = params.id;

    if (!messageId) {
      return json({ error: 'Message ID is required' }, { status: 400 });
    }

    await MessageService.deleteMessage(messageId, userId);
    return json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error(`Error in DELETE /api/messages/${params.id}:`, error);

    if (error instanceof MessageNotFoundError) {
      return json({ error: 'Message not found' }, { status: 404 });
    }

    if (error.code === 'MESSAGE_ACCESS_DENIED') {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    if (error instanceof MessageValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof MessageError) {
      return json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
