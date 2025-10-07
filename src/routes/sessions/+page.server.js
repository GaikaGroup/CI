/**
 * Server-side page load function for sessions page
 * Handles URL-based session selection and deep linking
 */

import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ url, locals }) {
  // Check if user is authenticated
  // Note: This assumes auth is handled in hooks.server.js or similar
  // The actual auth check implementation may vary based on the existing auth system

  const sessionId = url.searchParams.get('session');
  const searchQuery = url.searchParams.get('search');
  const mode = url.searchParams.get('mode');
  const language = url.searchParams.get('language');

  // Validate URL parameters
  const validModes = ['fun', 'learn'];
  const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];

  // Clean up invalid parameters
  let needsRedirect = false;
  const cleanParams = new URLSearchParams();

  if (sessionId && typeof sessionId === 'string' && sessionId.trim()) {
    cleanParams.set('session', sessionId.trim());
  }

  if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
    cleanParams.set('search', searchQuery.trim());
  }

  if (mode && validModes.includes(mode)) {
    cleanParams.set('mode', mode);
  } else if (mode) {
    needsRedirect = true;
  }

  if (language && validLanguages.includes(language)) {
    cleanParams.set('language', language);
  } else if (language) {
    needsRedirect = true;
  }

  // Redirect if we need to clean up invalid parameters
  if (needsRedirect) {
    const cleanUrl = `/sessions${cleanParams.toString() ? `?${cleanParams.toString()}` : ''}`;
    throw redirect(302, cleanUrl);
  }

  // Return the validated parameters for client-side use
  return {
    sessionId: sessionId || null,
    searchQuery: searchQuery || null,
    mode: mode || null,
    language: language || null,
    // Pass URL search params for client-side URL management
    urlParams: {
      session: sessionId || null,
      search: searchQuery || null,
      mode: mode || null,
      language: language || null
    }
  };
}
