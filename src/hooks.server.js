import { redirect } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  const isAdminRoute = path.startsWith('/admin') || path.startsWith('/api/admin');
  const isLogin = path === '/admin/login' || path === '/api/admin/login';
  if (isAdminRoute && !isLogin) {
    const session = event.cookies.get('admin_session');
    if (!session) {
      if (path.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw redirect(303, '/admin/login');
    }
  }
  return resolve(event);
};
