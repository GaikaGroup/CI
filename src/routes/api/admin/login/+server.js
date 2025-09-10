import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  const { username, password } = await request.json();
  if (username === 'ADMIN' && password === 'DEMO543') {
    cookies.set('admin_session', 'active', {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      signed: true
    });
    return json({ success: true });
  }
  return json({ error: 'Invalid credentials' }, { status: 401 });
}
