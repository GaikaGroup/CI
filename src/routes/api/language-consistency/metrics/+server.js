import { json } from '@sveltejs/kit';
import { languageConsistencyLogger } from '$lib/modules/chat/LanguageConsistencyLogger.js';

/**
 * GET /api/language-consistency/metrics
 * Returns language consistency metrics and statistics
 */
export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;

    // Parse query parameters for filtering
    const filters = {};

    if (searchParams.has('sessionId')) {
      filters.sessionId = searchParams.get('sessionId');
    }

    if (searchParams.has('language')) {
      filters.language = searchParams.get('language');
    }

    if (searchParams.has('timeRange')) {
      const timeRange = searchParams.get('timeRange');
      if (timeRange === 'last24h') {
        filters.timeRange = {
          start: Date.now() - 24 * 60 * 60 * 1000,
          end: Date.now()
        };
      } else if (timeRange === 'last7d') {
        filters.timeRange = {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000,
          end: Date.now()
        };
      } else if (timeRange === 'last30d') {
        filters.timeRange = {
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now()
        };
      }
    }

    // Get comprehensive metrics
    const metrics = languageConsistencyLogger.getLanguageConsistencyMetrics(filters);

    if (!metrics) {
      return json({ error: 'Failed to retrieve metrics' }, { status: 500 });
    }

    // Add logger statistics
    const loggerStats = languageConsistencyLogger.getLoggerStats();

    return json({
      success: true,
      metrics,
      loggerStats,
      filters,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error retrieving language consistency metrics:', error);
    return json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/language-consistency/metrics
 * Clear logs and reset metrics
 */
export async function DELETE({ url }) {
  try {
    const searchParams = url.searchParams;

    const options = {};

    if (searchParams.has('type')) {
      options.type = searchParams.get('type'); // 'detection' or 'validation'
    }

    if (searchParams.has('olderThan')) {
      const olderThanParam = searchParams.get('olderThan');
      if (olderThanParam === 'last24h') {
        options.olderThan = Date.now() - 24 * 60 * 60 * 1000;
      } else if (olderThanParam === 'last7d') {
        options.olderThan = Date.now() - 7 * 24 * 60 * 60 * 1000;
      } else if (!isNaN(parseInt(olderThanParam))) {
        options.olderThan = parseInt(olderThanParam);
      }
    }

    // Clear logs
    languageConsistencyLogger.clearLogs(options);

    return json({
      success: true,
      message: 'Logs cleared successfully',
      options,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error clearing language consistency logs:', error);
    return json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}
