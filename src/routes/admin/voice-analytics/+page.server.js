import { redirect } from '@sveltejs/kit';
import { STORAGE_KEYS } from '$shared/utils/constants';

/**
 * Server-side load for the admin voice analytics page.
 * Ensures only admins can access the analytics dashboard.
 */
export const load = async ({ locals, cookies, url }) => {
  let user = locals.user;

  if (!user) {
    const cookieUser = cookies.get(STORAGE_KEYS.USER);
    if (cookieUser) {
      try {
        user = JSON.parse(cookieUser);
      } catch (error) {
        console.error('Failed to parse user cookie during voice analytics load', error);
      }
    }
  }

  if (!user || user.role !== 'admin') {
    throw redirect(303, `/login?redirect=${url.pathname}`);
  }

  return { user };
};
