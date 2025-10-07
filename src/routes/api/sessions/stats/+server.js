import { json } from '@sveltejs/kit';
import { SessionService, SessionError } from '$lib/modules/session/services/SessionService.js';
import { MessageService, MessageError } from '$lib/modules/session/services/MessageService.js';

/**
 * Get session and message statistics for the authenticated user
 * GET /api/sessions/stats
 */
export async function GET({ locals }) {
  try {
    // Check authentication
    if (!locals.user || !locals.user.id) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = locals.user.id;

    // Get both session and message statistics
    const [sessionStats, messageStats] = await Promise.all([
      SessionService.getSessionStats(userId),
      MessageService.getMessageStats(userId)
    ]);

    // Combine the statistics
    const combinedStats = {
      sessions: {
        total: sessionStats.totalSessions,
        fun: sessionStats.funSessions,
        learn: sessionStats.learnSessions,
        lastActivity: sessionStats.lastActivity
      },
      messages: {
        total: messageStats.totalMessages,
        user: messageStats.userMessages,
        assistant: messageStats.assistantMessages,
        lastMessage: messageStats.lastMessage
      },
      overview: {
        averageMessagesPerSession:
          sessionStats.totalSessions > 0
            ? Math.round((messageStats.totalMessages / sessionStats.totalSessions) * 100) / 100
            : 0,
        mostRecentActivity: sessionStats.lastActivity || messageStats.lastMessage
      }
    };

    return json(combinedStats);
  } catch (error) {
    console.error('Error in GET /api/sessions/stats:', error);

    if (
      (error instanceof SessionError || error instanceof MessageError) &&
      error.code === 'DATABASE_NOT_READY'
    ) {
      const message =
        'Session persistence is unavailable. Run "prisma generate" and ensure the Postgres instance is running.';
      return json({ error: message, message, code: error.code }, { status: 503 });
    }

    if (error instanceof SessionError || error instanceof MessageError) {
      return json({ error: 'Failed to retrieve statistics' }, { status: 500 });
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
