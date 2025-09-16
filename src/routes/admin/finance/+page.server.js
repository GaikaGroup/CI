import { redirect } from '@sveltejs/kit';
import { STORAGE_KEYS } from '$shared/utils/constants';

/**
 * Server-side load for the admin finance page.
 * Ensures only admins can access the page and fetches cost metrics.
 */
export const load = async ({ locals, cookies, fetch, url }) => {
  let user = locals.user;

  const emptyCosts = {
    models: [],
    totals: {
      totalRequests: 0,
      paidRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: 0
    }
  };

  if (!user) {
    const cookieUser = cookies.get(STORAGE_KEYS.USER);
    if (cookieUser) {
      try {
        user = JSON.parse(cookieUser);
      } catch (error) {
        console.error('Failed to parse user cookie during page load', error);
      }
    }
  }

  if (!user || user.role !== 'admin') {
    throw redirect(303, `/login?redirect=${url.pathname}`);
  }

  try {
    const response = await fetch('/api/admin/finance/costs');

    if (!response.ok) {
      console.error('Failed to load finance costs', response.status, response.statusText);
      return {
        user,
        costs: emptyCosts,
        costsError: 'Unable to load usage metrics. Please try again later.'
      };
    }

    const costs = await response.json();
    return { user, costs };
  } catch (error) {
    console.error('Error fetching finance costs', error);
    return {
      user,
      costs: emptyCosts,
      costsError: 'Unable to load usage metrics. Please try again later.'
    };
  }
};
