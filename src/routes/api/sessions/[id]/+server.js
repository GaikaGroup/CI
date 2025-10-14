import { json } from '@sveltejs/kit';
import {
  SessionService,
  SessionError,
  SessionNotFoundError,
  SessionValidationError
} from '$lib/modules/session/services/SessionService.js';

/**
 * Get a specific session by ID
 * GET /api/sessions/[id]
 * Query parameters:
 * - includeMessages: Include messages in response (default: false)
 */
export async function GET({ params, url, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const sessionId = params.id;
    const includeMessages = url.searchParams.get('includeMessages') === 'true';

    if (!sessionId) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    const session = await SessionService.getSession(sessionId, userId, includeMessages);
    return json(session);
  } catch (error) {
    console.error(`Error in GET /api/sessions/${params.id}:`, error);

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to retrieve session' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update a session
 * PUT /api/sessions/[id]
 * Body: { title?, preview?, mode?, language? }
 */
export async function PUT({ params, request, locals }) {
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

    // Validate update fields
    const allowedFields = ['title', 'preview', 'mode', 'language'];
    const updates = {};

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate specific fields
    if (updates.title !== undefined) {
      if (
        !updates.title ||
        typeof updates.title !== 'string' ||
        updates.title.trim().length === 0
      ) {
        return json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      if (updates.title.length > 500) {
        return json({ error: 'Title must be 500 characters or less' }, { status: 400 });
      }
      updates.title = updates.title.trim();
    }

    if (updates.mode !== undefined && !['fun', 'learn'].includes(updates.mode)) {
      return json({ error: 'Mode must be either "fun" or "learn"' }, { status: 400 });
    }

    if (
      updates.language !== undefined &&
      (typeof updates.language !== 'string' || updates.language.length > 10)
    ) {
      return json({ error: 'Invalid language parameter' }, { status: 400 });
    }

    if (updates.preview !== undefined) {
      if (
        updates.preview !== null &&
        (typeof updates.preview !== 'string' || updates.preview.length > 1000)
      ) {
        return json(
          { error: 'Preview must be a string with max 1000 characters' },
          { status: 400 }
        );
      }
      if (updates.preview) {
        updates.preview = updates.preview.trim();
      }
    }

    const updatedSession = await SessionService.updateSession(sessionId, userId, updates);
    return json(updatedSession);
  } catch (error) {
    console.error(`Error in PUT /api/sessions/${params.id}:`, error);

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to update session' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Delete a session (soft delete for regular users)
 * DELETE /api/sessions/[id]
 * Query parameters:
 * - hard: Set to 'true' for hard delete (admin only)
 */
export async function DELETE({ params, url, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const sessionId = params.id;
    const hardDelete = url.searchParams.get('hard') === 'true';

    if (!sessionId) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (hardDelete) {
      // Hard delete - for admin use only (future implementation)
      await SessionService.deleteSession(sessionId, userId);
      return json({ success: true, message: 'Session permanently deleted' });
    } else {
      // Soft delete - default behavior for regular users
      await SessionService.softDeleteSession(sessionId, userId);
      return json({ success: true, message: 'Session deleted successfully' });
    }
  } catch (error) {
    console.error(`Error in DELETE /api/sessions/${params.id}:`, error);

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
