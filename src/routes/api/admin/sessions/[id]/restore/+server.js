import { json } from '@sveltejs/kit';
import {
  SessionService,
  SessionError,
  SessionNotFoundError,
  SessionValidationError
} from '$lib/modules/session/services/SessionService.js';
import { isAdmin, requireAdmin } from '$lib/modules/auth/utils/adminUtils.js';

/**
 * Restore a soft-deleted session (admin only)
 * POST /api/admin/sessions/[id]/restore
 */
export async function POST({ params, locals }) {
  try {
    // Check admin authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    requireAdmin(locals.user);

    const sessionId = params.id;
    if (!sessionId) {
      return json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get the session first to find the owner
    const session = await SessionService.getSessionById(sessionId, true); // Admin can access any session

    if (!session) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.isHidden) {
      return json({ error: 'Session is not hidden' }, { status: 400 });
    }

    // Restore the session using the original owner's ID
    await SessionService.restoreSession(sessionId, session.userId);

    return json({
      success: true,
      message: 'Session restored successfully',
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error in POST /api/admin/sessions/[id]/restore:', error);

    if (error.message === 'Admin access required') {
      return json({ error: 'Admin access required' }, { status: 403 });
    }

    if (error instanceof SessionNotFoundError) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to restore session' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
