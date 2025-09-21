/**
 * Admin Store
 *
 * This store manages admin-specific state for subject management,
 * including dashboard data, bulk operations, and admin preferences.
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { moderationStore } from './moderationStore.js';
import { subjectsStore } from '../../../stores/subjects.js';

const ADMIN_STORAGE_KEY = 'adminDashboardData';

/**
 * Create admin store
 */
function createAdminStore() {
  const { subscribe, set, update } = writable({
    selectedReports: new Set(),
    bulkActionInProgress: false,
    dashboardFilters: {
      reportStatus: 'all',
      subjectStatus: 'all',
      creatorRole: 'all',
      dateRange: 'all'
    },
    sortSettings: {
      reportsBy: 'date',
      reportsOrder: 'desc',
      subjectsBy: 'name',
      subjectsOrder: 'asc'
    },
    viewSettings: {
      reportsPerPage: 20,
      subjectsPerPage: 20,
      showReportDetails: true,
      showSubjectStats: true
    },
    adminPreferences: {
      autoRefresh: false,
      refreshInterval: 30000, // 30 seconds
      notifications: {
        newReports: true,
        bulkActions: true,
        systemAlerts: true
      }
    },
    initialized: false
  });

  /**
   * Load admin data from localStorage
   */
  const loadFromStorage = () => {
    if (!browser) return;

    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Convert selectedReports array back to Set
        const selectedReports = new Set(data.selectedReports || []);

        update((currentData) => ({
          ...currentData,
          ...data,
          selectedReports,
          initialized: true
        }));
      } else {
        update((currentData) => ({
          ...currentData,
          initialized: true
        }));
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      update((currentData) => ({
        ...currentData,
        initialized: true
      }));
    }
  };

  /**
   * Save admin data to localStorage
   */
  const saveToStorage = (data) => {
    if (!browser) return;

    try {
      // Convert Set to array for serialization
      const serializable = {
        ...data,
        selectedReports: Array.from(data.selectedReports),
        // Don't persist bulk action state
        bulkActionInProgress: false
      };

      localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Error saving admin data:', error);
    }
  };

  // Auto-save when data changes
  subscribe((data) => {
    if (data.initialized) {
      saveToStorage(data);
    }
  });

  return {
    subscribe,

    /**
     * Initialize the store
     */
    initialize: () => {
      loadFromStorage();
    },

    /**
     * Select/deselect a report for bulk actions
     */
    toggleReportSelection: (reportId) => {
      update((data) => {
        const newSelected = new Set(data.selectedReports);
        if (newSelected.has(reportId)) {
          newSelected.delete(reportId);
        } else {
          newSelected.add(reportId);
        }
        return {
          ...data,
          selectedReports: newSelected
        };
      });
    },

    /**
     * Select all visible reports
     */
    selectAllReports: (reportIds) => {
      update((data) => ({
        ...data,
        selectedReports: new Set(reportIds)
      }));
    },

    /**
     * Clear all selected reports
     */
    clearReportSelection: () => {
      update((data) => ({
        ...data,
        selectedReports: new Set()
      }));
    },

    /**
     * Set bulk action progress state
     */
    setBulkActionProgress: (inProgress) => {
      update((data) => ({
        ...data,
        bulkActionInProgress: inProgress
      }));
    },

    /**
     * Update dashboard filters
     */
    updateFilters: (newFilters) => {
      update((data) => ({
        ...data,
        dashboardFilters: {
          ...data.dashboardFilters,
          ...newFilters
        }
      }));
    },

    /**
     * Update sort settings
     */
    updateSortSettings: (newSettings) => {
      update((data) => ({
        ...data,
        sortSettings: {
          ...data.sortSettings,
          ...newSettings
        }
      }));
    },

    /**
     * Update view settings
     */
    updateViewSettings: (newSettings) => {
      update((data) => ({
        ...data,
        viewSettings: {
          ...data.viewSettings,
          ...newSettings
        }
      }));
    },

    /**
     * Update admin preferences
     */
    updatePreferences: (newPreferences) => {
      update((data) => ({
        ...data,
        adminPreferences: {
          ...data.adminPreferences,
          ...newPreferences
        }
      }));
    },

    /**
     * Reset filters to default
     */
    resetFilters: () => {
      update((data) => ({
        ...data,
        dashboardFilters: {
          reportStatus: 'all',
          subjectStatus: 'all',
          creatorRole: 'all',
          dateRange: 'all'
        }
      }));
    },

    /**
     * Get selected report IDs as array
     */
    getSelectedReportIds: () => {
      let selectedIds = [];
      subscribe((data) => {
        selectedIds = Array.from(data.selectedReports);
      })();
      return selectedIds;
    },

    /**
     * Check if report is selected
     */
    isReportSelected: (reportId) => {
      let isSelected = false;
      subscribe((data) => {
        isSelected = data.selectedReports.has(reportId);
      })();
      return isSelected;
    },

    /**
     * Get selection count
     */
    getSelectionCount: () => {
      let count = 0;
      subscribe((data) => {
        count = data.selectedReports.size;
      })();
      return count;
    },

    /**
     * Export admin settings
     */
    exportSettings: () => {
      let settings = {};
      subscribe((data) => {
        settings = {
          dashboardFilters: data.dashboardFilters,
          sortSettings: data.sortSettings,
          viewSettings: data.viewSettings,
          adminPreferences: data.adminPreferences,
          exportedAt: new Date().toISOString()
        };
      })();
      return settings;
    },

    /**
     * Import admin settings
     */
    importSettings: (settings) => {
      try {
        update((data) => ({
          ...data,
          dashboardFilters: settings.dashboardFilters || data.dashboardFilters,
          sortSettings: settings.sortSettings || data.sortSettings,
          viewSettings: settings.viewSettings || data.viewSettings,
          adminPreferences: settings.adminPreferences || data.adminPreferences
        }));
        return { success: true, message: 'Settings imported successfully' };
      } catch (error) {
        console.error('Error importing settings:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Clear all admin data
     */
    clearAll: () => {
      set({
        selectedReports: new Set(),
        bulkActionInProgress: false,
        dashboardFilters: {
          reportStatus: 'all',
          subjectStatus: 'all',
          creatorRole: 'all',
          dateRange: 'all'
        },
        sortSettings: {
          reportsBy: 'date',
          reportsOrder: 'desc',
          subjectsBy: 'name',
          subjectsOrder: 'asc'
        },
        viewSettings: {
          reportsPerPage: 20,
          subjectsPerPage: 20,
          showReportDetails: true,
          showSubjectStats: true
        },
        adminPreferences: {
          autoRefresh: false,
          refreshInterval: 30000,
          notifications: {
            newReports: true,
            bulkActions: true,
            systemAlerts: true
          }
        },
        initialized: true
      });
    }
  };
}

// Create the store instance
export const adminStore = createAdminStore();

// Derived stores for common admin queries
export const selectedReportsCount = derived(adminStore, ($admin) => $admin.selectedReports.size);

export const hasSelectedReports = derived(selectedReportsCount, ($count) => $count > 0);

export const isBulkActionInProgress = derived(adminStore, ($admin) => $admin.bulkActionInProgress);

export const dashboardFilters = derived(adminStore, ($admin) => $admin.dashboardFilters);

export const adminPreferences = derived(adminStore, ($admin) => $admin.adminPreferences);

// Combined dashboard data
export const dashboardData = derived(
  [moderationStore, subjectsStore, adminStore],
  ([$moderation, $subjects, $admin]) => {
    const reports = Array.from($moderation.reports.values());

    // Apply filters
    let filteredReports = reports;
    let filteredSubjects = $subjects;

    if ($admin.dashboardFilters.reportStatus !== 'all') {
      filteredReports = filteredReports.filter(
        (r) => r.status === $admin.dashboardFilters.reportStatus
      );
    }

    if ($admin.dashboardFilters.subjectStatus !== 'all') {
      filteredSubjects = filteredSubjects.filter(
        (s) => s.status === $admin.dashboardFilters.subjectStatus
      );
    }

    if ($admin.dashboardFilters.creatorRole !== 'all') {
      filteredSubjects = filteredSubjects.filter(
        (s) => s.creatorRole === $admin.dashboardFilters.creatorRole
      );
    }

    // Apply sorting
    filteredReports.sort((a, b) => {
      const field = $admin.sortSettings.reportsBy;
      const order = $admin.sortSettings.reportsOrder;

      let aVal, bVal;
      if (field === 'date') {
        aVal = new Date(a.metadata.reportedAt);
        bVal = new Date(b.metadata.reportedAt);
      } else {
        aVal = a[field] || '';
        bVal = b[field] || '';
      }

      if (order === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    filteredSubjects.sort((a, b) => {
      const field = $admin.sortSettings.subjectsBy;
      const order = $admin.sortSettings.subjectsOrder;

      let aVal = a[field] || '';
      let bVal = b[field] || '';

      if (order === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    return {
      reports: filteredReports,
      subjects: filteredSubjects,
      stats: {
        totalReports: reports.length,
        filteredReports: filteredReports.length,
        totalSubjects: $subjects.length,
        filteredSubjects: filteredSubjects.length,
        selectedReports: $admin.selectedReports.size
      }
    };
  }
);

// Initialize the store when imported
if (browser) {
  adminStore.initialize();
}
