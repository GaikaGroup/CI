import { redirect } from '@sveltejs/kit';

export const load = async () => {
  // Redirect old catalogue route to Student dashboard
  throw redirect(302, '/student?tab=browse');
};