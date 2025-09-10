import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const USER = env.ADMIN_USER ?? 'ADMIN';
const PASS = env.ADMIN_PASS ?? 'DEMO543';

export async function POST({ request, cookies }) {
  const { username, password } = await request.json();

  if (username === USER && password === PASS) {
    cookies.set('admin_session', 'active', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    return json({ success: true });
  }

  return json({ error: 'Invalid credentials' }, { status: 401 });
}
