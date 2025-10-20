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
    const stats = await statsService.getOverviewStats(timeRange);
    
    return json(stats);
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}