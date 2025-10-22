import { json } from '@sveltejs/kit';
import { StatsService } from '$lib/modules/stats/index.js';
import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
  try {
    // Check admin access
    if (!locals.user || !isAdmin(locals.user)) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeRange = url.searchParams.get('range') || '30d';

    const statsService = new StatsService();
    const attentionStats = await statsService.getAttentionEconomyStats(timeRange);

    return json(attentionStats);
  } catch (error) {
    console.error('Error fetching attention economy stats:', error);
    return json({ error: 'Failed to fetch attention economy statistics' }, { status: 500 });
  }
}
