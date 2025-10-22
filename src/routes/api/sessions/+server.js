import { json } from '@sveltejs/kit';
import {
  SessionService,
  SessionError,
  SessionNotFoundError,
  SessionValidationError
} from '$lib/modules/session/services/SessionService.js';
import { SessionFilterService } from '$lib/modules/session/services/SessionFilterService.js';
import { SessionEnhancementService } from '$lib/modules/session/services/SessionEnhancementService.js';
import { db } from '$lib/database/index.js';

/**
 * Get user sessions with pagination and filtering
 * GET /api/sessions
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search query for title, preview, and messages
 * - dateRange: Date range filter (hour, day, week, month, year, all)
 * - commands: Comma-separated list of command types
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

    // Parse query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const search = searchParams.get('search') || '';
    const dateRange = searchParams.get('dateRange') || 'all';
    const commandsParam = searchParams.get('commands') || '';
    const mode = searchParams.get('mode') || null;
    const language = searchParams.get('language') || null;

    // Parse command types from comma-separated string
    const commandTypes = commandsParam
      ? commandsParam
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      : [];

    // Build filters object
    const filters = {
      search,
      dateRange,
      commandTypes,
      mode,
      language
    };

    // Validate and sanitize filters
    const validation = SessionFilterService.validateFilters(filters);
    if (!validation.valid) {
      return json(
        {
          error: 'Invalid filter parameters',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const sanitizedFilters = SessionFilterService.sanitizeFilters(filters);

    // Build Prisma query
    const where = SessionFilterService.buildQuery(sanitizedFilters, userId);
    const include = SessionFilterService.buildIncludeClause(true);
    const orderBy = SessionFilterService.buildOrderByClause('updatedAt', 'desc');
    const pagination = SessionFilterService.calculatePagination(page, limit);

    // Execute query
    const [sessions, total] = await Promise.all([
      db.session.findMany({
        where,
        include,
        orderBy,
        skip: pagination.skip,
        take: pagination.take
      }),
      db.session.count({ where })
    ]);

    // Enhance sessions with computed fields
    const enhancedSessions = SessionEnhancementService.enhanceSessions(sessions);

    // Calculate pagination metadata
    const pages = Math.ceil(total / limit);
    const hasMore = page < pages;

    return json({
      success: true,
      sessions: enhancedSessions,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasMore
      }
    });
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
      return json(
        {
          error:
            'Course ID is required for LEARN mode sessions. Please enroll in a course first or switch to FUN mode.'
        },
        { status: 400 }
      );
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
      // NOTE: createWelcomeMessage set to false as per session-input-enhancement spec
      // The chat interface now starts with an empty message history
      const session = await SessionService.createSession(
        userId,
        title.trim(),
        mode,
        language,
        preview?.trim() || null,
        courseId?.trim() || null,
        false // createWelcomeMessage = false
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
