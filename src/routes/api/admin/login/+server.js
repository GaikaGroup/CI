import { json } from '@sveltejs/kit';

const USER = process.env.ADMIN_USER || 'ADMIN';
const PASS = process.env.ADMIN_PASS || 'DEMO543';

export async function POST({ request, cookies }) {
  const { username, password } = await request.json();
  if (username === USER && password === PASS) {
    cookies.set('admin_session', '1', { path: '/', httpOnly: true, sameSite: 'lax' });
    return json({ success: true });
  }
  return json({ error: 'Invalid credentials' }, { status: 401 });
}
