import { STORAGE_KEYS } from '$shared/utils/constants';

/**
 * Populate event.locals.user from the authentication cookie when available.
 * This keeps server-side routes aware of the authenticated user role.
 */
export const handle = async ({ event, resolve }) => {
  const userCookie = event.cookies.get(STORAGE_KEYS.USER);

  if (userCookie) {
    try {
      event.locals.user = JSON.parse(userCookie);
    } catch (error) {
      console.error('Failed to parse user cookie', error);
      event.locals.user = undefined;
    }
  } else {
    // Auto-login demo user for development when no user is authenticated
    // This allows the chat functionality to work without manual login
    if (process.env.NODE_ENV === 'development') {
      const demoUser = {
        id: '2',
        name: 'Demo User',
        email: 'User1Login',
        role: 'student'
      };

      event.locals.user = demoUser;

      // Set the cookie so the client knows about the user
      const cookieValue = encodeURIComponent(JSON.stringify(demoUser));
      event.cookies.set(STORAGE_KEYS.USER, cookieValue, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax'
      });
    } else {
      event.locals.user = undefined;
    }
  }

  return resolve(event);
};
