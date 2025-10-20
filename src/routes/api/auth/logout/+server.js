import { json } from '@sveltejs/kit';

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function POST({ cookies }) {
  try {
    // Clear authentication cookies
    cookies.delete('auth_token', { path: '/' });
    cookies.delete('user', { path: '/' });

    return json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}