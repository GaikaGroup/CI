/**
 * Session Management Store
 * Provides Svelte stores for session state management with CRUD operations
 * Integrates with existing auth system for user session isolation
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { user, isAuthenticated } from '$lib/modules/auth/stores.js';

/**
 * Session state interface
 */
const initialSessionState = {
  sessions: [],
  currentSession: null,
  loading: false,
  error: null,
  searchQuery: '',
  selectedSessionId: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    limit: 20,
    hasNextPage: false,
    hasPreviousPage: false
  },
  filters: {
    mode: null, // 'fun' | 'learn' | null
    language: null,
    dateFrom: null, // ISO date string
    dateTo: null, // ISO date string
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  }
};

/**
 * Create the main session store
 */
function createSessionStore() {
  const { subscribe, set, update } = writable(initialSessionState);

  return {
    subscribe,
    
    /**
     * Initialize the session store
     */
    async initialize() {
      const currentUser = get(user);
      const authenticated = get(isAuthenticated);
      
      if (!authenticated || !currentUser) {
        this.reset();
        return;
      }

      try {
        await this.loadSessions();
      } catch (error) {
        console.error('[SessionStore] Failed to initialize:', error);
        this.setError('Failed to load sessions');
      }
    },

    /**
     * Load sessions for the current user
     */
    async loadSessions(options = {}) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      this.setLoading(true);
      this.setError(null);

      try {
        const currentState = get({ subscribe });
        const loadOptions = {
          page: options.page || currentState.pagination.currentPage,
          limit: options.limit || currentState.pagination.limit,
          sortBy: options.sortBy || currentState.filters.sortBy,
          sortOrder: options.sortOrder || currentState.filters.sortOrder,
          mode: options.mode !== undefined ? options.mode : currentState.filters.mode,
          language: options.language !== undefined ? options.language : currentState.filters.language,
          dateFrom: options.dateFrom !== undefined ? options.dateFrom : currentState.filters.dateFrom,
          dateTo: options.dateTo !== undefined ? options.dateTo : currentState.filters.dateTo
        };

        // Build query string
        const params = new URLSearchParams();
        Object.entries(loadOptions).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, value);
          }
        });

        const response = await fetch(`/api/sessions?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load sessions');
        }

        const result = await response.json();
        
        update(state => ({
          ...state,
          sessions: result.sessions,
          pagination: result.pagination,
          loading: false,
          error: null
        }));

      } catch (error) {
        console.error('[SessionStore] Failed to load sessions:', error);
        this.setError(error.message || 'Failed to load sessions');
        this.setLoading(false);
      }
    },

    /**
     * Create a new session
     */
    async createSession(title, mode = 'fun', language = 'en', preview = null) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      this.setLoading(true);
      this.setError(null);

      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title, mode, language, preview })
        });

        if (!response.ok) {
          throw new Error('Failed to create session');
        }

        const newSession = await response.json();

        // Add the new session to the beginning of the list
        update(state => ({
          ...state,
          sessions: [newSession, ...state.sessions],
          currentSession: newSession,
          selectedSessionId: newSession.id,
          loading: false,
          error: null
        }));

        return newSession;
      } catch (error) {
        console.error('[SessionStore] Failed to create session:', error);
        this.setError(error.message || 'Failed to create session');
        this.setLoading(false);
        throw error;
      }
    },

    /**
     * Update an existing session
     */
    async updateSession(sessionId, updates) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });

        if (!response.ok) {
          throw new Error('Failed to update session');
        }

        const updatedSession = await response.json();

        update(state => ({
          ...state,
          sessions: state.sessions.map(session =>
            session.id === sessionId ? updatedSession : session
          ),
          currentSession: state.currentSession?.id === sessionId 
            ? updatedSession 
            : state.currentSession,
          error: null
        }));

        return updatedSession;
      } catch (error) {
        console.error('[SessionStore] Failed to update session:', error);
        this.setError(error.message || 'Failed to update session');
        throw error;
      }
    },

    /**
     * Delete a session
     */
    async deleteSession(sessionId) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Failed to delete session');
        }

        update(state => ({
          ...state,
          sessions: state.sessions.filter(session => session.id !== sessionId),
          currentSession: state.currentSession?.id === sessionId 
            ? null 
            : state.currentSession,
          selectedSessionId: state.selectedSessionId === sessionId 
            ? null 
            : state.selectedSessionId,
          error: null
        }));

        return true;
      } catch (error) {
        console.error('[SessionStore] Failed to delete session:', error);
        this.setError(error.message || 'Failed to delete session');
        throw error;
      }
    },

    /**
     * Search sessions
     */
    async searchSessions(query, options = {}) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!query || query.trim().length === 0) {
        // If empty query, load regular sessions
        await this.loadSessions(options);
        this.setSearchQuery('');
        return;
      }

      this.setLoading(true);
      this.setError(null);
      this.setSearchQuery(query);

      try {
        const currentState = get({ subscribe });
        const searchOptions = {
          search: query,
          page: options.page || 1,
          limit: options.limit || currentState.pagination.limit,
          mode: options.mode !== undefined ? options.mode : currentState.filters.mode,
          language: options.language !== undefined ? options.language : currentState.filters.language,
          dateFrom: options.dateFrom !== undefined ? options.dateFrom : currentState.filters.dateFrom,
          dateTo: options.dateTo !== undefined ? options.dateTo : currentState.filters.dateTo
        };

        // Build query string
        const params = new URLSearchParams();
        Object.entries(searchOptions).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, value);
          }
        });

        const response = await fetch(`/api/sessions?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to search sessions');
        }

        const result = await response.json();
        
        update(state => ({
          ...state,
          sessions: result.sessions,
          pagination: result.pagination,
          loading: false,
          error: null
        }));

      } catch (error) {
        console.error('[SessionStore] Failed to search sessions:', error);
        this.setError(error.message || 'Failed to search sessions');
        this.setLoading(false);
      }
    },

    /**
     * Select a session
     */
    async selectSession(sessionId) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      this.setLoading(true);
      this.setError(null);

      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Failed to load session');
        }

        const session = await response.json();
        
        update(state => ({
          ...state,
          currentSession: session,
          selectedSessionId: sessionId,
          loading: false,
          error: null
        }));

        return session;
      } catch (error) {
        console.error('[SessionStore] Failed to select session:', error);
        this.setError(error.message || 'Failed to load session');
        this.setLoading(false);
        throw error;
      }
    },

    /**
     * Clear current session selection
     */
    clearSelection() {
      update(state => ({
        ...state,
        currentSession: null,
        selectedSessionId: null
      }));
    },

    /**
     * Set search query
     */
    setSearchQuery(query) {
      update(state => ({
        ...state,
        searchQuery: query
      }));
    },

    /**
     * Set filters
     */
    setFilters(filters) {
      update(state => ({
        ...state,
        filters: { ...state.filters, ...filters }
      }));
    },

    /**
     * Apply filters and reload sessions
     */
    async applyFilters(filters) {
      this.setFilters(filters);
      const currentState = get({ subscribe });
      
      if (currentState.searchQuery) {
        await this.searchSessions(currentState.searchQuery, { page: 1 });
      } else {
        await this.loadSessions({ page: 1 });
      }
    },

    /**
     * Clear all filters
     */
    async clearFilters() {
      this.setFilters({
        mode: null,
        language: null,
        dateFrom: null,
        dateTo: null
      });
      
      const currentState = get({ subscribe });
      if (currentState.searchQuery) {
        await this.searchSessions(currentState.searchQuery, { page: 1 });
      } else {
        await this.loadSessions({ page: 1 });
      }
    },

    /**
     * Set loading state
     */
    setLoading(loading) {
      update(state => ({
        ...state,
        loading
      }));
    },

    /**
     * Set error state
     */
    setError(error) {
      update(state => ({
        ...state,
        error
      }));
    },

    /**
     * Reset store to initial state
     */
    reset() {
      set(initialSessionState);
    },

    /**
     * Load next page of sessions
     */
    async loadNextPage() {
      const currentState = get({ subscribe });
      if (!currentState.pagination.hasNextPage) {
        return;
      }

      const nextPage = currentState.pagination.currentPage + 1;
      
      if (currentState.searchQuery) {
        await this.searchSessions(currentState.searchQuery, { page: nextPage });
      } else {
        await this.loadSessions({ page: nextPage });
      }
    },

    /**
     * Load previous page of sessions
     */
    async loadPreviousPage() {
      const currentState = get({ subscribe });
      if (!currentState.pagination.hasPreviousPage) {
        return;
      }

      const prevPage = currentState.pagination.currentPage - 1;
      
      if (currentState.searchQuery) {
        await this.searchSessions(currentState.searchQuery, { page: prevPage });
      } else {
        await this.loadSessions({ page: prevPage });
      }
    }
  };
}

/**
 * Create the main session store instance
 */
export const sessionStore = createSessionStore();

/**
 * Derived store for filtered sessions based on current filters and search
 */
export const filteredSessions = derived(
  [sessionStore],
  ([$sessionStore]) => {
    let sessions = $sessionStore.sessions;
    
    // Additional client-side filtering can be added here if needed
    // The main filtering is done server-side in the search/load operations
    
    return sessions;
  }
);

/**
 * Derived store for current session with messages
 */
export const currentSessionWithMessages = derived(
  [sessionStore],
  ([$sessionStore]) => {
    return $sessionStore.currentSession;
  }
);

/**
 * Derived store for session statistics
 */
export const sessionStats = derived(
  [sessionStore],
  ([$sessionStore]) => {
    const sessions = $sessionStore.sessions;
    
    return {
      total: sessions.length,
      funSessions: sessions.filter(s => s.mode === 'fun').length,
      learnSessions: sessions.filter(s => s.mode === 'learn').length,
      totalMessages: sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
      languages: [...new Set(sessions.map(s => s.language))],
      recentSession: sessions.length > 0 ? sessions[0] : null
    };
  }
);

/**
 * Derived store for loading state
 */
export const isSessionLoading = derived(
  [sessionStore],
  ([$sessionStore]) => $sessionStore.loading
);

/**
 * Derived store for error state
 */
export const sessionError = derived(
  [sessionStore],
  ([$sessionStore]) => $sessionStore.error
);

/**
 * Derived store for search state
 */
export const isSearching = derived(
  [sessionStore],
  ([$sessionStore]) => $sessionStore.searchQuery.length > 0
);

/**
 * Derived store for active filters count
 */
export const activeFiltersCount = derived(
  [sessionStore],
  ([$sessionStore]) => {
    let count = 0;
    const filters = $sessionStore.filters;
    if (filters.mode) count++;
    if (filters.language) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }
);

/**
 * Derived store for checking if any filters are active
 */
export const hasActiveFilters = derived(
  [activeFiltersCount],
  ([$count]) => $count > 0
);

/**
 * Initialize session store when auth state changes
 */
if (browser) {
  // Subscribe to auth changes and initialize/reset accordingly
  isAuthenticated.subscribe(async (authenticated) => {
    if (authenticated) {
      await sessionStore.initialize();
    } else {
      sessionStore.reset();
    }
  });
}

/**
 * Export sessionStore as default
 */
export default sessionStore;