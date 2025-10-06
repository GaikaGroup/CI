import { json } from '@sveltejs/kit';
import { SessionService, SessionError, SessionValidationError } from '$lib/modules/session/services/SessionService.js';

/**
 * Search sessions by title and preview content
 * GET /api/sessions/search
 * Query parameters:
 * - q: Search query (required)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - mode: Filter by mode ('fun' or 'learn')
 * - language: Filter by language
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
    const mode = searchParams.get('mode') || null;
    const language = searchParams.get('language') || null;
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

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
      mode,
      language,
      dateFrom,
      dateTo,
    };

    const result = await SessionService.searchSessions(userId, query.trim(), options);
    return json(result);
  } catch (error) {
    console.error('Error in GET /api/sessions/search:', error);

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to search sessions' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}