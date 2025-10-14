import { json } from '@sveltejs/kit';
import { languageConsistencyLogger } from '$lib/modules/chat/LanguageConsistencyLogger.js';

/**
 * GET /api/language-consistency/export
 * Export language consistency logs for analysis
 */
export async function GET({ url }) {
  try {
    const searchParams = url.searchParams;

    // Parse export options
    const options = {
      format: searchParams.get('format') || 'json', // 'json' or 'csv'
      includeContext: searchParams.get('includeContext') === 'true',
      filters: {}
    };

    // Parse filters
    if (searchParams.has('sessionId')) {
      options.filters.sessionId = searchParams.get('sessionId');
    }

    if (searchParams.has('language')) {
      options.filters.language = searchParams.get('language');
    }

    if (searchParams.has('type')) {
      options.filters.type = searchParams.get('type'); // 'detection' or 'validation'
    }

    if (searchParams.has('severity')) {
      options.filters.severity = searchParams.get('severity');
    }

    if (searchParams.has('timeRange')) {
      const timeRange = searchParams.get('timeRange');
      if (timeRange === 'last24h') {
        options.filters.timeRange = {
          start: Date.now() - 24 * 60 * 60 * 1000,
          end: Date.now()
        };
      } else if (timeRange === 'last7d') {
        options.filters.timeRange = {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000,
          end: Date.now()
        };
      } else if (timeRange === 'last30d') {
        options.filters.timeRange = {
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now()
        };
      }
    }

    // Export logs
    const exportData = languageConsistencyLogger.exportLogs(options);

    if (!exportData) {
      return json({ error: 'Failed to export logs' }, { status: 500 });
    }

    // Set appropriate headers based on format
    if (options.format === 'csv') {
      return new Response(exportData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="language-consistency-logs-${Date.now()}.csv"`
        }
      });
    } else {
      return json(exportData, {
        headers: {
          'Content-Disposition': `attachment; filename="language-consistency-logs-${Date.now()}.json"`
        }
      });
    }
  } catch (error) {
    console.error('Error exporting language consistency logs:', error);
    return json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    );
  }
}
