import { redirect } from '@sveltejs/kit';
import { STORAGE_KEYS } from '$shared/utils/constants';

/**
 * Server-side load for the admin users page.
 * Ensures only admins can access the page and fetches user data.
 */
export const load = async ({ locals, cookies, fetch, url }) => {
  let user = locals.user;

  const emptyData = {
    users: [],
    statistics: {
      totalUsers: 0,
      totalSessions: 0
    }
  };

  if (!user) {
    const cookieUser = cookies.get(STORAGE_KEYS.USER);
    if (cookieUser) {
      try {
        user = JSON.parse(cookieUser);
      } catch (error) {
        console.error('Failed to parse user cookie during users page load', error);
      }
    }
  }

  if (!user || user.type !== 'admin') {
    throw redirect(303, `/login?redirect=${url.pathname}`);
  }

  try {
    const response = await fetch('/api/admin/users');

    if (!response.ok) {
      console.error('Failed to load users data', response.status, response.statusText);
      return {
        user,
        ...emptyData,
        error: 'Unable to load user data. Please try again later.'
      };
    }

    const data = await response.json();
    return { user, ...data };
  } catch (error) {
    console.error('Error fetching users data', error);
    return {
      user,
      ...emptyData,
      error: 'Unable to load user data. Please try again later.'
    };
  }
};
