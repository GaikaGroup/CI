/**
 * Session Cache Store
 *
 * Manages cached session data for the sessions page.
 * Supports infinite scroll by appending new sessions.
 */

import { writable } from 'svelte/store';

/**
 * Initial cache state
 */
const initialState = {
  sessions: [],
  pagination: null,
  loading: false,
  error: null
};

/**
 * Create session cache store
 */
function createSessionCacheStore() {
  const { subscribe, set, update } = writable({ ...initialState });

  return {
    subscribe,

    /**
     * Set sessions (replaces existing sessions)
     * Used for initial load or filter changes
     */
    setSessions: (sessions, pagination = null) => {
      update((state) => ({
        ...state,
        sessions: sessions || [],
        pagination,
        loading: false,
        error: null
      }));
    },

    /**
     * Append sessions (for infinite scroll)
     * Adds new sessions to the end of the list
     */
    appendSessions: (sessions, pagination = null) => {
      update((state) => ({
        ...state,
        sessions: [...state.sessions, ...(sessions || [])],
        pagination,
        loading: false,
        error: null
      }));
    },

    /**
     * Set loading state
     */
    setLoading: (loading) => {
      update((state) => ({
        ...state,
        loading
      }));
    },

    /**
     * Set error state
     */
    setError: (error) => {
      update((state) => ({
        ...state,
        error,
        loading: false
      }));
    },

    /**
     * Clear error
     */
    clearError: () => {
      update((state) => ({
        ...state,
        error: null
      }));
    },

    /**
     * Clear all cached data
     * Resets to initial state
     */
    clear: () => {
      set({ ...initialState });
    },

    /**
     * Update a single session in the cache
     * Used when a session is modified
     */
    updateSession: (sessionId, updates) => {
      update((state) => ({
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === sessionId ? { ...session, ...updates } : session
        )
      }));
    },

    /**
     * Remove a session from the cache
     * Used when a session is deleted
     */
    removeSession: (sessionId) => {
      update((state) => ({
        ...state,
        sessions: state.sessions.filter((session) => session.id !== sessionId)
      }));
    },

    /**
     * Update pagination metadata
     */
    updatePagination: (pagination) => {
      update((state) => ({
        ...state,
        pagination
      }));
    },

    /**
     * Check if more sessions can be loaded
     */
    hasMore: () => {
      let hasMore = false;
      update((state) => {
        hasMore = state.pagination?.hasMore || false;
        return state;
      });
      return hasMore;
    },

    /**
     * Get current page number
     */
    getCurrentPage: () => {
      let page = 1;
      update((state) => {
        page = state.pagination?.page || 1;
        return state;
      });
      return page;
    }
  };
}

/**
 * Session cache store instance
 */
export const sessionCacheStore = createSessionCacheStore();
