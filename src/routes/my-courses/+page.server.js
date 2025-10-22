import { redirect } from '@sveltejs/kit';

export const load = async () => {
  // Redirect old my-courses route to Tutor dashboard
  throw redirect(302, '/tutor?tab=courses');
};
