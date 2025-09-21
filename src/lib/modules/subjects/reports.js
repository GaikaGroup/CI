/**
 * Report Management Module
 *
 * This module provides utilities for managing content moderation reports
 * for subjects, including validation and status management.
 */

// Report validation is handled by types.js when needed

/**
 * Report status enumeration
 */
export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  RESOLVED: 'resolved'
};

/**
 * Moderation action enumeration
 */
export const MODERATION_ACTION = {
  NONE: 'none',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
};

/**
 * Report reason enumeration
 */
export const REPORT_REASONS = {
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  COPYRIGHT: 'copyright',
  MISINFORMATION: 'misinformation',
  OTHER: 'other'
};

/**
 * Create a new report with default values
 * @param {Object} reportData - Report data
 * @returns {Object} Complete report object
 */
export function createReport(reportData) {
  return {
    id: reportData.id || generateReportId(),
    subjectId: reportData.subjectId || '',
    reporterId: reportData.reporterId || '',
    reason: reportData.reason || '',
    details: reportData.details || '',
    status: reportData.status || REPORT_STATUS.PENDING,
    reviewedBy: reportData.reviewedBy || null,
    reviewedAt: reportData.reviewedAt || null,
    action: reportData.action || null,
    metadata: {
      reportedAt: reportData.metadata?.reportedAt || new Date(),
      reporterIP: reportData.metadata?.reporterIP || 'unknown'
    }
  };
}

/**
 * Update report status and review information
 * @param {Object} report - Report to update
 * @param {string} status - New status
 * @param {string} reviewerId - ID of reviewing admin
 * @param {string} action - Moderation action taken
 * @returns {Object} Updated report
 */
export function updateReportStatus(report, status, reviewerId = null, action = null) {
  const updates = {
    ...report,
    status
  };

  if (status === REPORT_STATUS.REVIEWED || status === REPORT_STATUS.RESOLVED) {
    updates.reviewedBy = reviewerId;
    updates.reviewedAt = new Date();

    if (action) {
      updates.action = action;
    }
  }

  return updates;
}

/**
 * Get reports by status
 * @param {Object[]} reports - Array of reports
 * @param {string} status - Status to filter by
 * @returns {Object[]} Filtered reports
 */
export function getReportsByStatus(reports, status) {
  if (!Array.isArray(reports)) {
    return [];
  }

  return reports.filter((report) => report.status === status);
}

/**
 * Get reports for a specific subject
 * @param {Object[]} reports - Array of reports
 * @param {string} subjectId - Subject ID to filter by
 * @returns {Object[]} Filtered reports
 */
export function getReportsForSubject(reports, subjectId) {
  if (!Array.isArray(reports)) {
    return [];
  }

  return reports.filter((report) => report.subjectId === subjectId);
}

/**
 * Get pending reports (for admin queue)
 * @param {Object[]} reports - Array of reports
 * @returns {Object[]} Pending reports sorted by date
 */
export function getPendingReports(reports) {
  const pending = getReportsByStatus(reports, REPORT_STATUS.PENDING);

  return pending.sort((a, b) => new Date(a.metadata.reportedAt) - new Date(b.metadata.reportedAt));
}

/**
 * Check if user has already reported a subject
 * @param {Object[]} reports - Array of reports
 * @param {string} subjectId - Subject ID
 * @param {string} reporterId - Reporter ID
 * @returns {boolean} True if user has already reported this subject
 */
export function hasUserReportedSubject(reports, subjectId, reporterId) {
  if (!Array.isArray(reports)) {
    return false;
  }

  return reports.some(
    (report) => report.subjectId === subjectId && report.reporterId === reporterId
  );
}

/**
 * Get report count for a subject
 * @param {Object[]} reports - Array of reports
 * @param {string} subjectId - Subject ID
 * @returns {number} Number of reports for the subject
 */
export function getReportCountForSubject(reports, subjectId) {
  if (!Array.isArray(reports)) {
    return 0;
  }

  return reports.filter((report) => report.subjectId === subjectId).length;
}

/**
 * Validate report reason
 * @param {string} reason - Report reason
 * @returns {boolean} True if reason is valid
 */
export function isValidReportReason(reason) {
  return Object.values(REPORT_REASONS).includes(reason);
}

/**
 * Get human-readable report reason
 * @param {string} reason - Report reason code
 * @returns {string} Human-readable reason
 */
export function getReportReasonLabel(reason) {
  const labels = {
    [REPORT_REASONS.INAPPROPRIATE_CONTENT]: 'Inappropriate Content',
    [REPORT_REASONS.SPAM]: 'Spam',
    [REPORT_REASONS.HARASSMENT]: 'Harassment',
    [REPORT_REASONS.COPYRIGHT]: 'Copyright Violation',
    [REPORT_REASONS.MISINFORMATION]: 'Misinformation',
    [REPORT_REASONS.OTHER]: 'Other'
  };

  return labels[reason] || 'Unknown';
}

/**
 * Get human-readable moderation action
 * @param {string} action - Moderation action code
 * @returns {string} Human-readable action
 */
export function getModerationActionLabel(action) {
  const labels = {
    [MODERATION_ACTION.NONE]: 'No Action',
    [MODERATION_ACTION.BLOCKED]: 'Blocked',
    [MODERATION_ACTION.DELETED]: 'Deleted'
  };

  return labels[action] || 'Unknown';
}

/**
 * Generate unique report ID
 * @returns {string} Unique report identifier
 */
function generateReportId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
