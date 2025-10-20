import { json } from '@sveltejs/kit';
import {
  SessionService,
  SessionError,
  SessionNotFoundError,
  SessionValidationError
} from '$lib/modules/session/services/SessionService.js';

/**
 * Get user sessions with pagination and filtering
 * GET /api/sessions
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sortBy: Sort field (default: 'updatedAt')
 * - sortOrder: Sort order (default: 'desc')
 * - mode: Filter by mode ('fun' or 'learn')
 * - language: Filter by language
 * - search: Search query for title and preview
 */
export async function GET({ url, locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    const searchParams = url.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const mode = searchParams.get('mode') || null;
    const language = searchParams.get('language') || null;
    const search = searchParams.get('search') || null;
    const dateFrom = searchParams.get('dateFrom') || null;
    const dateTo = searchParams.get('dateTo') || null;

    // Validate sort parameters
    const validSortFields = ['updatedAt', 'createdAt', 'title', 'messageCount'];
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
      dateTo
    };

    let result;

    // Use search if query provided, otherwise get regular sessions
    if (search && search.trim().length > 0) {
      result = await SessionService.searchSessions(userId, search.trim(), options);
    } else {
      result = await SessionService.getUserSessions(userId, options);
    }

    return json(result);
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
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

/**
 * Create a new session
 * POST /api/sessions
 * Body: { title, mode?, language?, preview?, courseId? }
 */
export async function POST({ request, locals }) {
  try {
    console.log('[POST /api/sessions] Request received');
    console.log('[POST /api/sessions] locals.user:', locals.user);
    
    // Check authentication
    if (!locals.user || !locals.user.id) {
      console.log('[POST /api/sessions] Authentication failed - no user in locals');
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;
    console.log('[POST /api/sessions] User ID:', userId);
    console.log('[POST /api/sessions] User type:', locals.user.type);
    
    const body = await request.json();
    console.log('[POST /api/sessions] Request body:', body);

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return json({ error: 'Session title is required' }, { status: 400 });
    }

    const { title, mode = 'fun', language = 'en', preview = null, courseId = null } = body;

    // Validate mode
    if (mode && !['fun', 'learn'].includes(mode)) {
      return json({ error: 'Mode must be either "fun" or "learn"' }, { status: 400 });
    }

    // Validate language
    if (language && (typeof language !== 'string' || language.length > 10)) {
      return json({ error: 'Invalid language parameter' }, { status: 400 });
    }

    // Validate preview
    if (preview && (typeof preview !== 'string' || preview.length > 1000)) {
      return json({ error: 'Preview must be a string with max 1000 characters' }, { status: 400 });
    }

    // Validate courseId for LEARN mode
    if (
      mode === 'learn' &&
      (!courseId || typeof courseId !== 'string' || courseId.trim().length === 0)
    ) {
      console.log('[POST /api/sessions] Validation failed: Course ID required for LEARN mode');
      return json({ 
        error: 'Course ID is required for LEARN mode sessions. Please enroll in a course first or switch to FUN mode.' 
      }, { status: 400 });
    }

    // Validate courseId format if provided
    if (courseId && (typeof courseId !== 'string' || courseId.trim().length === 0)) {
      return json({ error: 'Course ID must be a valid string' }, { status: 400 });
    }

    console.log('[POST /api/sessions] Creating session with params:', {
      userId,
      title: title.trim(),
      mode,
      language,
      preview: preview?.trim() || null,
      courseId: courseId?.trim() || null
    });
    
    try {
      const session = await SessionService.createSession(
        userId,
        title.trim(),
        mode,
        language,
        preview?.trim() || null,
        courseId?.trim() || null
      );
      
      console.log('[POST /api/sessions] Session created successfully:', session.id);
      return json(session, { status: 201 });
    } catch (createError) {
      console.error('[POST /api/sessions] SessionService.createSession failed:', createError);
      console.error('[POST /api/sessions] Error details:', {
        name: createError.name,
        message: createError.message,
        code: createError.code,
        stack: createError.stack
      });
      throw createError;
    }

  } catch (error) {
    console.error('[POST /api/sessions] Error:', error);
    console.error('[POST /api/sessions] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta
    });

    if (error instanceof SessionError && error.code === 'DATABASE_NOT_READY') {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionValidationError) {
      return json({ error: error.message }, { status: 400 });
    }

    if (error instanceof SessionError) {
      return json({ error: 'Failed to create session' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
