/**
 * Filter Store
 *
 * Manages filter state for session filtering.
 * Provides actions for updating filters and derived stores for UI state.
 */

import { writable, derived } from 'svelte/store';

/**
 * Initial filter state
 */
const initialState = {
  search: '',
  dateRange: 'all',
  commandTypes: [],
  page: 1,
  limit: 20
};

/**
 * Create filter store
 */
function createFilterStore() {
  const { subscribe, set, update } = writable({ ...initialState });

  return {
    subscribe,

    /**
     * Set search query
     * Resets page to 1
     */
    setSearch: (search) => {
      update((state) => ({
        ...state,
        search: search || '',
        page: 1
      }));
    },

    /**
     * Set date range filter
     * Resets page to 1
     */
    setDateRange: (dateRange) => {
      update((state) => ({
        ...state,
        dateRange: dateRange || 'all',
        page: 1
      }));
    },

    /**
     * Set command types filter
     * Resets page to 1
     */
    setCommandTypes: (commandTypes) => {
      update((state) => ({
        ...state,
        commandTypes: Array.isArray(commandTypes) ? commandTypes : [],
        page: 1
      }));
    },

    /**
     * Add a command type to filter
     * Resets page to 1
     */
    addCommandType: (commandType) => {
      update((state) => {
        if (state.commandTypes.includes(commandType)) {
          return state;
        }
        return {
          ...state,
          commandTypes: [...state.commandTypes, commandType],
          page: 1
        };
      });
    },

    /**
     * Remove a command type from filter
     * Resets page to 1
     */
    removeCommandType: (commandType) => {
      update((state) => ({
        ...state,
        commandTypes: state.commandTypes.filter((t) => t !== commandType),
        page: 1
      }));
    },

    /**
     * Clear all filters
     * Resets to initial state
     */
    clearFilters: () => {
      set({ ...initialState });
    },

    /**
     * Go to next page
     */
    nextPage: () => {
      update((state) => ({
        ...state,
        page: state.page + 1
      }));
    },

    /**
     * Set page number
     */
    setPage: (page) => {
      update((state) => ({
        ...state,
        page: Math.max(1, page)
      }));
    },

    /**
     * Set limit (items per page)
     */
    setLimit: (limit) => {
      update((state) => ({
        ...state,
        limit: Math.max(1, Math.min(100, limit)),
        page: 1
      }));
    },

    /**
     * Reset to initial state
     */
    reset: () => {
      set({ ...initialState });
    },

    /**
     * Update multiple filter values at once
     */
    updateFilters: (updates) => {
      update((state) => ({
        ...state,
        ...updates,
        page: 1
      }));
    }
  };
}

/**
 * Filter store instance
 */
export const filterStore = createFilterStore();

/**
 * Derived store: Count of active filters
 */
export const activeFilterCount = derived(filterStore, ($filterStore) => {
  let count = 0;

  if ($filterStore.search && $filterStore.search.trim().length > 0) {
    count++;
  }

  if ($filterStore.dateRange && $filterStore.dateRange !== 'all') {
    count++;
  }

  if ($filterStore.commandTypes && $filterStore.commandTypes.length > 0) {
    count += $filterStore.commandTypes.length;
  }

  return count;
});

/**
 * Derived store: Check if any filters are active
 */
export const hasActiveFilters = derived(activeFilterCount, ($count) => $count > 0);

/**
 * Derived store: Get filter summary for display
 */
export const filterSummary = derived(filterStore, ($filterStore) => {
  const parts = [];

  if ($filterStore.search && $filterStore.search.trim().length > 0) {
    parts.push(`Search: "${$filterStore.search}"`);
  }

  if ($filterStore.dateRange && $filterStore.dateRange !== 'all') {
    parts.push(`Date: ${$filterStore.dateRange}`);
  }

  if ($filterStore.commandTypes && $filterStore.commandTypes.length > 0) {
    parts.push(`Commands: ${$filterStore.commandTypes.length}`);
  }

  return parts.join(' • ');
});

/**
 * Derived store: Get active filter tags for display
 */
export const activeFilterTags = derived(filterStore, ($filterStore) => {
  const tags = [];

  if ($filterStore.search && $filterStore.search.trim().length > 0) {
    tags.push({
      type: 'search',
      label: `Search: "${$filterStore.search}"`,
      value: $filterStore.search
    });
  }

  if ($filterStore.dateRange && $filterStore.dateRange !== 'all') {
    tags.push({
      type: 'dateRange',
      label: `Date: ${$filterStore.dateRange}`,
      value: $filterStore.dateRange
    });
  }

  if ($filterStore.commandTypes && $filterStore.commandTypes.length > 0) {
    $filterStore.commandTypes.forEach((commandType) => {
      tags.push({
        type: 'command',
        label: commandType,
        value: commandType
      });
    });
  }

  return tags;
});
