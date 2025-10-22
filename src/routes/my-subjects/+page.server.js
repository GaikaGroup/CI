import { redirect } from '@sveltejs/kit';

export const load = async () => {
  // Redirect old my-subjects route to Student dashboard learning tab
  throw redirect(302, '/student?tab=learning');
};
