import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
  // Get user from server-side authentication
  const user = locals.user;

  // Handle root path redirect
  if (url.pathname === '/') {
    if (user) {
      // Authenticated - redirect to sessions
      throw redirect(302, '/sessions');
    } else {
      // Not authenticated - redirect to login
      throw redirect(302, '/login');
    }
  }

  // Pass user data to all pages
  return {
    user: user || null
  };
}
