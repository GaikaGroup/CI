import { STORAGE_KEYS } from '$shared/utils/constants';

/**
 * Populate event.locals.user from the authentication cookie when available.
 * This keeps server-side routes aware of the authenticated user role.
 */
export const handle = async ({ event, resolve }) => {
  const userCookie = event.cookies.get(STORAGE_KEYS.USER);

  if (userCookie) {
    try {
      // Decode the cookie value since it was encoded with encodeURIComponent
      const decodedCookie = decodeURIComponent(userCookie);
      event.locals.user = JSON.parse(decodedCookie);
    } catch (error) {
      console.error('Failed to parse user cookie', error);
      event.locals.user = undefined;
    }
  } else {
    event.locals.user = undefined;
  }

  return resolve(event);
};
