import { json } from '@sveltejs/kit';
import { StatsService } from '$lib/modules/stats/index.js';
import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ locals }) {
  console.log('='.repeat(80));
  console.log('🔥 CLEAR CACHE REQUEST RECEIVED');
  console.log('='.repeat(80));

  // Check admin access
  if (!locals.user || !isAdmin(locals.user)) {
    console.log('[API /admin/stats/clear-cache] ❌ Unauthorized access attempt');
    console.log('User:', locals.user);
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[API /admin/stats/clear-cache] ✓ Authorized user:', locals.user.id);
    console.log('[API /admin/stats/clear-cache] 🧹 Clearing cache...');
    const statsService = new StatsService();
    statsService.clearCache();
    console.log('[API /admin/stats/clear-cache] ✅ Cache cleared successfully');
    console.log('='.repeat(80));

    return json({ success: true, message: 'Stats cache cleared' });
  } catch (error) {
    console.error('[API /admin/stats/clear-cache] ❌ Error clearing stats cache:', error);
    return json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}
