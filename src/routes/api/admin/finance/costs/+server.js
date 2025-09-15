import { json, error } from '@sveltejs/kit';
import { usageTracker } from '$modules/analytics/UsageTracker';

export async function GET({ locals }) {
  const user = locals.user;

  if (!user || user.role !== 'admin') {
    throw error(403, 'Forbidden');
  }

  return json(usageTracker.summary());
}
