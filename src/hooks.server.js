import { STORAGE_KEYS } from '$lib/shared/utils/constants.js';
import { redirect } from '@sveltejs/kit';
import { authenticateUser } from '$lib/modules/auth/middleware.js';

/**
 * Populate event.locals.user from the authentication cookie when available.
 * This keeps server-side routes aware of the authenticated user role.
 */
export const handle = async ({ event, resolve }) => {
  // Try JWT authentication first
  const authenticatedUser = await authenticateUser(event);
  
  if (authenticatedUser) {
    console.log('[Auth] JWT authentication successful:', authenticatedUser.email);
    event.locals.user = authenticatedUser;
  } else {
    // Fallback to cookie-based authentication for demo users
    const userCookie = event.cookies.get(STORAGE_KEYS.USER);
    
    if (userCookie) {
      try {
        const decodedCookie = decodeURIComponent(userCookie);
        const userData = JSON.parse(decodedCookie);
        
        // Validate user data structure
        if (!userData || !userData.id || !userData.email) {
          throw new Error('Invalid user data structure');
        }
        
        // Clear old data with 'role' field - force re-login
        if (userData.role) {
          console.log('[Auth] Found old data with role field, clearing and forcing re-login');
          event.cookies.delete(STORAGE_KEYS.USER, { path: '/' });
          event.locals.user = undefined;
          return resolve(event);
        }
        
        console.log('[Auth] Cookie authentication successful:', userData.email);
        event.locals.user = userData;
      } catch (error) {
        console.error('Failed to parse user cookie, clearing invalid data:', error);
        // Clear invalid cookie
        event.cookies.delete(STORAGE_KEYS.USER, { path: '/' });
        event.locals.user = undefined;
      }
    } else {
      console.log('[Auth] No authentication found');
      event.locals.user = undefined;
    }
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    '/sessions',
    '/admin',
    '/stats',
    '/my-subjects',
    '/my-courses',
    '/learn',
    '/student',
    '/tutor'
  ];

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/signup',
    '/catalogue',
    '/'
  ];

  const pathname = event.url.pathname;

  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || (route !== '/' && pathname.startsWith(route))
  );

  // If it's a protected route and user is not authenticated, redirect to login
  if (isProtectedRoute && !event.locals.user) {
    const redirectUrl = encodeURIComponent(pathname + event.url.search);
    throw redirect(302, `/login?redirect=${redirectUrl}`);
  }

  // TEMPORARILY DISABLED: If user is authenticated and trying to access login/signup, redirect to sessions
  if (false && event.locals.user && (pathname === '/login' || pathname === '/signup')) {
    console.log('[Auth] User is authenticated, redirecting from login to sessions:', event.locals.user.email);
    throw redirect(302, '/sessions');
  }

  console.log('[Auth] Final state - pathname:', pathname, 'user:', event.locals.user ? event.locals.user.email : 'none');

  return resolve(event);
};
