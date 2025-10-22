import { redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/modules/auth/utils/adminUtils.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
  // Check admin access only - data will be loaded client-side
  if (!locals.user || !isAdmin(locals.user)) {
    throw redirect(302, '/login');
  }

  return {
    user: locals.user
  };
}
