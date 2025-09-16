import { json, error } from '@sveltejs/kit';
import { usageTracker } from '$modules/analytics/UsageTracker';

/**
 * Returns aggregate usage metrics for admin finance reporting.
 *
 * Tokens are reported as raw counts. Monetary values are expressed in USD and
 * rounded to eight decimal places to capture micro-dollar usage.
 */
export async function GET({ locals }) {
  const user = locals.user;

  if (!user || user.role !== 'admin') {
    throw error(403, 'Forbidden');
  }

  return json(usageTracker.summary());
}
