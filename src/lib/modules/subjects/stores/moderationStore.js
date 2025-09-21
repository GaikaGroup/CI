/**
 * Moderation Store
 *
 * This store manages moderation data including reports, admin actions,
 * and audit logs. It provides persistence and state management for
 * the moderation system.
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { REPORT_STATUS, MODERATION_ACTION } from '../reports.js';

const STORAGE_KEY = 'moderationData';

/**
 * Create moderation store
 */
function createModerationStore() {
  const { subscribe, set, update } = writable({
    reports: new Map(),
    auditLog: [],
    stats: {
      totalReports: 0,
      pendingReports: 0,
      reviewedReports: 0,
      resolvedReports: 0
    },
    initialized: false
  });

  /**
   * Load data from localStorage
   */
  const loadFromStorage = () => {
    if (!browser) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Convert reports array back to Map
        const reportsMap = new Map();
        if (data.reports && Array.isArray(data.reports)) {
          data.reports.forEach((report) => {
            reportsMap.set(report.id, report);
          });
        }

        set({
          reports: reportsMap,
          auditLog: data.auditLog || [],
          stats: data.stats || {
            totalReports: 0,
            pendingReports: 0,
            reviewedReports: 0,
            resolvedReports: 0
          },
          initialized: true
        });
      } else {
        set({
          reports: new Map(),
          auditLog: [],
          stats: {
            totalReports: 0,
            pendingReports: 0,
            reviewedReports: 0,
            resolvedReports: 0
          },
          initialized: true
        });
      }
    } catch (error) {
      console.error('Error loading moderation data:', error);
      set({
        reports: new Map(),
        auditLog: [],
        stats: {
          totalReports: 0,
          pendingReports: 0,
          reviewedReports: 0,
          resolvedReports: 0
        },
        initialized: true
      });
    }
  };

  /**
   * Save data to localStorage
   */
  const saveToStorage = (data) => {
    if (!browser) return;

    try {
      // Convert Map to array for serialization
      const serializable = {
        reports: Array.from(data.reports.values()),
        auditLog: data.auditLog,
        stats: data.stats
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Error saving moderation data:', error);
    }
  };

  /**
   * Calculate statistics from reports
   */
  const calculateStats = (reports) => {
    const reportsArray = Array.from(reports.values());

    return {
      totalReports: reportsArray.length,
      pendingReports: reportsArray.filter((r) => r.status === REPORT_STATUS.PENDING).length,
      reviewedReports: reportsArray.filter((r) => r.status === REPORT_STATUS.REVIEWED).length,
      resolvedReports: reportsArray.filter((r) => r.status === REPORT_STATUS.RESOLVED).length,
      blockedSubjects: reportsArray.filter((r) => r.action === MODERATION_ACTION.BLOCKED).length,
      deletedSubjects: reportsArray.filter((r) => r.action === MODERATION_ACTION.DELETED).length
    };
  };

  /**
   * Add audit log entry
   */
  const addAuditEntry = (action, details, adminId) => {
    return {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      details,
      adminId,
      timestamp: new Date().toISOString()
    };
  };

  return {
    subscribe,

    /**
     * Initialize the store
     */
    initialize: () => {
      loadFromStorage();
    },

    /**
     * Add a new report
     */
    addReport: (report) => {
      update((data) => {
        const newReports = new Map(data.reports);
        newReports.set(report.id, report);

        const newStats = calculateStats(newReports);

        const newAuditLog = [
          ...data.auditLog,
          addAuditEntry(
            'report_submitted',
            {
              reportId: report.id,
              subjectId: report.subjectId,
              reason: report.reason
            },
            report.reporterId
          )
        ];

        const newData = {
          ...data,
          reports: newReports,
          stats: newStats,
          auditLog: newAuditLog
        };

        saveToStorage(newData);
        return newData;
      });
    },

    /**
     * Update a report
     */
    updateReport: (reportId, updates, adminId = null) => {
      update((data) => {
        const newReports = new Map(data.reports);
        const existingReport = newReports.get(reportId);

        if (!existingReport) {
          console.error(`Report ${reportId} not found`);
          return data;
        }

        const updatedReport = { ...existingReport, ...updates };
        newReports.set(reportId, updatedReport);

        const newStats = calculateStats(newReports);

        const newAuditLog = [...data.auditLog];
        if (adminId) {
          newAuditLog.push(
            addAuditEntry(
              'report_updated',
              {
                reportId,
                updates: Object.keys(updates),
                status: updatedReport.status,
                action: updatedReport.action
              },
              adminId
            )
          );
        }

        const newData = {
          ...data,
          reports: newReports,
          stats: newStats,
          auditLog: newAuditLog
        };

        saveToStorage(newData);
        return newData;
      });
    },

    /**
     * Delete a report
     */
    deleteReport: (reportId, adminId) => {
      update((data) => {
        const newReports = new Map(data.reports);
        const deletedReport = newReports.get(reportId);

        if (!deletedReport) {
          console.error(`Report ${reportId} not found`);
          return data;
        }

        newReports.delete(reportId);

        const newStats = calculateStats(newReports);

        const newAuditLog = [
          ...data.auditLog,
          addAuditEntry(
            'report_deleted',
            {
              reportId,
              subjectId: deletedReport.subjectId
            },
            adminId
          )
        ];

        const newData = {
          ...data,
          reports: newReports,
          stats: newStats,
          auditLog: newAuditLog
        };

        saveToStorage(newData);
        return newData;
      });
    },

    /**
     * Get report by ID
     */
    getReport: (reportId) => {
      let report = null;
      subscribe((data) => {
        report = data.reports.get(reportId) || null;
      })();
      return report;
    },

    /**
     * Get reports by subject ID
     */
    getReportsBySubject: (subjectId) => {
      let reports = [];
      subscribe((data) => {
        reports = Array.from(data.reports.values()).filter(
          (report) => report.subjectId === subjectId
        );
      })();
      return reports;
    },

    /**
     * Get reports by status
     */
    getReportsByStatus: (status) => {
      let reports = [];
      subscribe((data) => {
        reports = Array.from(data.reports.values()).filter((report) => report.status === status);
      })();
      return reports;
    },

    /**
     * Get pending reports
     */
    getPendingReports: () => {
      let reports = [];
      subscribe((data) => {
        reports = Array.from(data.reports.values())
          .filter((report) => report.status === REPORT_STATUS.PENDING)
          .sort((a, b) => new Date(a.metadata.reportedAt) - new Date(b.metadata.reportedAt));
      })();
      return reports;
    },

    /**
     * Add audit log entry
     */
    addAuditEntry: (action, details, adminId) => {
      update((data) => {
        const newAuditLog = [...data.auditLog, addAuditEntry(action, details, adminId)];

        // Keep only last 1000 entries to prevent memory issues
        if (newAuditLog.length > 1000) {
          newAuditLog.splice(0, newAuditLog.length - 1000);
        }

        const newData = {
          ...data,
          auditLog: newAuditLog
        };

        saveToStorage(newData);
        return newData;
      });
    },

    /**
     * Get audit log entries
     */
    getAuditLog: (limit = 100) => {
      let entries = [];
      subscribe((data) => {
        entries = data.auditLog.slice(-limit).reverse();
      })();
      return entries;
    },

    /**
     * Clear all data (admin only)
     */
    clearAll: (adminId) => {
      update(() => {
        const newData = {
          reports: new Map(),
          auditLog: [addAuditEntry('data_cleared', { clearedBy: adminId }, adminId)],
          stats: {
            totalReports: 0,
            pendingReports: 0,
            reviewedReports: 0,
            resolvedReports: 0
          },
          initialized: true
        };

        saveToStorage(newData);
        return newData;
      });
    },

    /**
     * Export data for backup
     */
    exportData: () => {
      let exportData = null;
      subscribe((data) => {
        exportData = {
          reports: Array.from(data.reports.values()),
          auditLog: data.auditLog,
          stats: data.stats,
          exportedAt: new Date().toISOString()
        };
      })();
      return exportData;
    },

    /**
     * Import data from backup
     */
    importData: (importData, adminId) => {
      try {
        const reportsMap = new Map();
        if (importData.reports && Array.isArray(importData.reports)) {
          importData.reports.forEach((report) => {
            reportsMap.set(report.id, report);
          });
        }

        const newStats = calculateStats(reportsMap);

        const newData = {
          reports: reportsMap,
          auditLog: [
            ...(importData.auditLog || []),
            addAuditEntry('data_imported', { importedAt: new Date().toISOString() }, adminId)
          ],
          stats: newStats,
          initialized: true
        };

        set(newData);
        saveToStorage(newData);

        return { success: true, message: 'Data imported successfully' };
      } catch (error) {
        console.error('Error importing data:', error);
        return { success: false, error: error.message };
      }
    }
  };
}

// Create the store instance
export const moderationStore = createModerationStore();

// Derived stores for common queries
export const pendingReports = derived(moderationStore, ($moderation) =>
  Array.from($moderation.reports.values())
    .filter((report) => report.status === REPORT_STATUS.PENDING)
    .sort((a, b) => new Date(a.metadata.reportedAt) - new Date(b.metadata.reportedAt))
);

export const moderationStats = derived(moderationStore, ($moderation) => $moderation.stats);

export const recentAuditEntries = derived(moderationStore, ($moderation) =>
  $moderation.auditLog.slice(-20).reverse()
);

// Initialize the store when imported
if (browser) {
  moderationStore.initialize();
}
