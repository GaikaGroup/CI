import { redirect } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
  const { url, cookies } = event;
  const path = url.pathname;
  const isProtected = path.startsWith('/admin') || path.startsWith('/api/admin');
  const publicPaths = ['/admin', '/api/admin/login'];

  if (isProtected && !publicPaths.includes(path)) {
    const session = cookies.get('admin_session', { signed: true });
    if (!session) {
      if (path.startsWith('/api/')) {
        return new Response('Unauthorized', { status: 401 });
      }
      throw redirect(303, '/admin');
    }
  }

  return resolve(event);
};
