import { json } from '@sveltejs/kit';
import { SessionService, SessionError, SessionNotFoundError, SessionValidationError } from '$lib/modules/session/services/SessionService.js';
import { isAdmin, requireAdmin } from '$lib/modules/auth/utils/adminUtils.js';

/**
 * Get all sessions for admin view (including hidden sessions)
 * GET /api/admin/sessions
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Sort field (default: 'updatedAt')
 * - sortOrder: Sort order (default: 'desc')
 * - mode: Filter by mode ('fun' or 'learn')
 * - language: Filter by language
 * - search: Search query for title and preview
 * - userId: Filter by specific user ID
 * - includeHidden: Include hidden sessions (default: true for admin)
 * - hiddenOnly: Show only hidden sessions (default: false)
 */
export async function GET({ url, locals }) {
  try {
    // Check admin authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(locals.user)) {
      return json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = url.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const mode = searchParams.get('mode') || null;
    const language = searchParams.get('language') || null;
    const search = searchParams.get('search') || null;
    const userId = searchParams.get('userId') || null;
    const includeHidden = searchParams.get('includeHidden') !== 'false'; // Default true for admin
    const hiddenOnly = searchParams.get('hiddenOnly') === 'true';
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

    // Validate sort parameters
    const validSortFields = ['updatedAt', 'createdAt', 'title', 'messageCount', 'userId'];
    const validSortOrders = ['asc', 'desc'];

    if (!validSortFields.includes(sortBy)) {
      return json({ error: 'Invalid sortBy parameter' }, { status: 400 });
    }

    if (!validSortOrders.includes(sortOrder)) {
      return json({ error: 'Invalid sortOrder parameter' }, { status: 400 });
    }

    // Validate mode parameter
    if (mode && !['fun', 'learn'].includes(mode)) {
      return json({ error: 'Invalid mode parameter' }, { status: 400 });
    }

    // Validate date parameters
    if (dateFrom && isNaN(Date.parse(dateFrom))) {
      return json({ error: 'Invalid dateFrom parameter' }, { status: 400 });
    }
    if (dateTo && isNaN(Date.parse(dateTo))) {
      return json({ error: 'Invalid dateTo parameter' }, { status: 400 });
    }

    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      mode,
      language,
      dateFrom,
      dateTo,
      includeHidden,
      hiddenOnly
    };

    let result;

    if (userId) {
      // Get sessions for specific user
      if (search && search.trim().length > 0) {
        result = await SessionService.searchSessions(userId, search.trim(), options);
      } else {
        result = await SessionService.getUserSessions(userId, options);
      }
    } else {
      // Get all sessions across all users (admin only)
      result = await SessionService.getAllSessions(options);
    }

    return json(result);
  } catch (error) {
    console.error('Error in GET /api/admin/sessions:', error);

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message = 'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to retrieve sessions' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}