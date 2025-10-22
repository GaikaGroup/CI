import { json } from '@sveltejs/kit';
import { StatsService } from '$lib/modules/stats/index.js';
import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
  console.log('='.repeat(80));
  console.log('📊 USER STATS REQUEST RECEIVED');
  console.log('='.repeat(80));

  try {
    // Check admin access
    if (!locals.user || !isAdmin(locals.user)) {
      console.log('[API /stats/users] ❌ Unauthorized access attempt');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timeRange = url.searchParams.get('range') || '30d';
    console.log('[API /stats/users] ✓ Authorized user:', locals.user.id);
    console.log('[API /stats/users] 📅 Time range:', timeRange);

    const statsService = new StatsService();
    const [userStats, dailyActivity, registrationTrends] = await Promise.all([
      statsService.getUserStats(timeRange),
      statsService.getDailyUserActivity(timeRange),
      statsService.getUserRegistrationTrends('1y')
    ]);

    console.log('[API /stats/users] ✅ Returning data:', {
      userStats,
      dailyActivityDays: dailyActivity.length,
      registrationTrendsMonths: registrationTrends.length
    });
    console.log('='.repeat(80));

    return json({
      userStats,
      dailyActivity,
      registrationTrends
    });
  } catch (error) {
    console.error('[API /stats/users] ❌ Error fetching user stats:', error);
    return json({ error: 'Failed to fetch user statistics' }, { status: 500 });
  }
}
