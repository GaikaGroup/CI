/**
 * Server-side load function for individual session page
 * Provides session ID from URL params
 */

export async function load({ params }) {
  return {
    sessionId: params.id
  };
}
