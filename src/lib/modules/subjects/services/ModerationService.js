/**
 * Moderation Service
 *
 * This service handles content moderation for subjects, including
 * report submission, admin review workflows, and user notifications.
 */

import {
  createReport,
  updateReportStatus,
  getPendingReports,
  hasUserReportedSubject,
  getReportCountForSubject,
  REPORT_STATUS,
  MODERATION_ACTION
} from '../reports.js';
import { validateReport } from '../types.js';

/**
 * Moderation Service class
 */
export class ModerationService {
  constructor(subjectService, notificationService = null) {
    this.subjectService = subjectService;
    this.notificationService = notificationService;
    this.reports = new Map(); // In a real app, this would be a database
    this.reportIdCounter = 1;
  }

  /**
   * Submit a report for a subject
   * @param {string} subjectId - Subject ID to report
   * @param {Object} reportData - Report data
   * @param {string} reporterId - ID of user making the report
   * @returns {Promise<Object>} Report submission result
   */
  async reportSubject(subjectId, reportData, reporterId) {
    try {
      // Check if subject exists
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      // Check if user has already reported this subject
      const existingReports = Array.from(this.reports.values());
      if (hasUserReportedSubject(existingReports, subjectId, reporterId)) {
        throw new Error('You have already reported this subject');
      }

      // Create report
      const report = createReport({
        id: `report_${this.reportIdCounter++}`,
        subjectId,
        reporterId,
        reason: reportData.reason,
        details: reportData.details || '',
        metadata: {
          reportedAt: new Date(),
          reporterIP: reportData.reporterIP || 'unknown'
        }
      });

      // Validate report
      const validation = validateReport(report);
      if (!validation.isValid) {
        throw new Error(`Report validation failed: ${validation.errors.join(', ')}`);
      }

      // Store report
      this.reports.set(report.id, report);

      // Update subject report count
      const subject = subjectResult.subject;
      const currentReportCount = getReportCountForSubject(existingReports, subjectId);
      await this.subjectService.updateSubject(
        subjectId,
        {
          metadata: {
            ...subject.metadata,
            reportCount: currentReportCount + 1
          }
        },
        subject.creatorId,
        subject.creatorRole
      );

      // Notify admins (if notification service is available)
      if (this.notificationService) {
        await this.notificationService.notifyAdmins('new_report', {
          reportId: report.id,
          subjectId,
          subjectName: subject.name,
          reason: report.reason
        });
      }

      return {
        success: true,
        report,
        message: 'Report submitted successfully'
      };
    } catch (error) {
      console.error('Error reporting subject:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get moderation queue for admin review
   * @param {string} adminId - Admin ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Moderation queue
   */
  async getReportQueue(adminId, filters = {}) {
    try {
      // Verify admin permissions (in a real app, this would check admin role)
      // For now, we'll assume the caller has verified admin status

      let reports = Array.from(this.reports.values());

      // Apply filters
      if (filters.status) {
        reports = reports.filter((report) => report.status === filters.status);
      }

      if (filters.reason) {
        reports = reports.filter((report) => report.reason === filters.reason);
      }

      if (filters.subjectId) {
        reports = reports.filter((report) => report.subjectId === filters.subjectId);
      }

      // Get pending reports by default, sorted by date
      if (!filters.status) {
        reports = getPendingReports(reports);
      }

      // Enrich reports with subject information
      const enrichedReports = await Promise.all(
        reports.map(async (report) => {
          const subjectResult = await this.subjectService.getSubject(report.subjectId);
          return {
            ...report,
            subject: subjectResult.success ? subjectResult.subject : null
          };
        })
      );

      return {
        success: true,
        reports: enrichedReports,
        total: enrichedReports.length,
        pending: reports.filter((r) => r.status === REPORT_STATUS.PENDING).length
      };
    } catch (error) {
      console.error('Error getting report queue:', error);
      return {
        success: false,
        error: error.message,
        reports: [],
        total: 0
      };
    }
  }

  /**
   * Review a report and take action
   * @param {string} reportId - Report ID
   * @param {string} decision - Admin decision ('approve', 'reject', 'block', 'delete')
   * @param {string} adminId - Admin ID
   * @param {string} notes - Optional admin notes
   * @returns {Promise<Object>} Review result
   */
  async reviewReport(reportId, decision, adminId, notes = '') {
    try {
      const report = this.reports.get(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Get the subject
      const subjectResult = await this.subjectService.getSubject(report.subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;
      let action = MODERATION_ACTION.NONE;
      let subjectUpdates = {};

      // Process decision
      switch (decision) {
        case 'reject':
          action = MODERATION_ACTION.NONE;
          break;

        case 'block':
          action = MODERATION_ACTION.BLOCKED;
          subjectUpdates = {
            status: 'blocked',
            blockReason: `Blocked due to report: ${report.reason}`,
            blockedBy: adminId,
            blockedAt: new Date()
          };
          break;

        case 'delete':
          action = MODERATION_ACTION.DELETED;
          subjectUpdates = {
            status: 'deleted',
            deleteReason: `Deleted due to report: ${report.reason}`,
            deletedBy: adminId,
            deletedAt: new Date()
          };
          break;

        default:
          throw new Error(`Invalid decision: ${decision}`);
      }

      // Update report status
      const updatedReport = updateReportStatus(report, REPORT_STATUS.REVIEWED, adminId, action);
      updatedReport.adminNotes = notes;
      this.reports.set(reportId, updatedReport);

      // Update subject if action was taken
      if (action !== MODERATION_ACTION.NONE) {
        await this.subjectService.updateSubject(report.subjectId, subjectUpdates, adminId, 'admin');
      }

      // Notify relevant users
      await this.notifyUsers(action, report.subjectId, [report.reporterId, subject.creatorId], {
        action,
        reason: report.reason,
        adminNotes: notes
      });

      return {
        success: true,
        report: updatedReport,
        action,
        message: `Report ${decision}ed successfully`
      };
    } catch (error) {
      console.error('Error reviewing report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Block a subject (admin action)
   * @param {string} subjectId - Subject ID
   * @param {string} reason - Reason for blocking
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Block result
   */
  async blockSubject(subjectId, reason, adminId) {
    try {
      const result = await this.subjectService.blockSubject(subjectId, reason, adminId);

      if (result.success) {
        // Notify subject creator
        const subjectResult = await this.subjectService.getSubject(subjectId);
        if (subjectResult.success) {
          await this.notifyUsers(
            MODERATION_ACTION.BLOCKED,
            subjectId,
            [subjectResult.subject.creatorId],
            {
              action: MODERATION_ACTION.BLOCKED,
              reason
            }
          );
        }
      }

      return result;
    } catch (error) {
      console.error('Error blocking subject:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a subject (admin action)
   * @param {string} subjectId - Subject ID
   * @param {string} reason - Reason for deletion
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteSubject(subjectId, reason, adminId) {
    try {
      // Get subject info before deletion
      const subjectResult = await this.subjectService.getSubject(subjectId);
      if (!subjectResult.success) {
        throw new Error('Subject not found');
      }

      const subject = subjectResult.subject;

      // Delete the subject
      const result = await this.subjectService.deleteSubject(subjectId, adminId, 'admin');

      if (result.success) {
        // Notify subject creator
        await this.notifyUsers(MODERATION_ACTION.DELETED, subjectId, [subject.creatorId], {
          action: MODERATION_ACTION.DELETED,
          reason,
          subjectName: subject.name
        });

        // Mark all related reports as resolved
        const reports = Array.from(this.reports.values()).filter(
          (report) => report.subjectId === subjectId
        );

        reports.forEach((report) => {
          const resolvedReport = updateReportStatus(
            report,
            REPORT_STATUS.RESOLVED,
            adminId,
            MODERATION_ACTION.DELETED
          );
          this.reports.set(report.id, resolvedReport);
        });
      }

      return result;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notify users about moderation actions
   * @param {string} action - Moderation action taken
   * @param {string} subjectId - Subject ID
   * @param {string[]} userIds - Array of user IDs to notify
   * @param {Object} context - Additional context for notification
   * @returns {Promise<void>}
   */
  async notifyUsers(action, subjectId, userIds, context = {}) {
    if (!this.notificationService) {
      console.log('No notification service available');
      return;
    }

    try {
      const notifications = userIds.map((userId) => ({
        userId,
        type: 'moderation_action',
        title: this.getModerationNotificationTitle(action),
        message: this.getModerationNotificationMessage(action, context),
        data: {
          action,
          subjectId,
          ...context
        }
      }));

      await this.notificationService.sendBulkNotifications(notifications);
    } catch (error) {
      console.error('Error sending moderation notifications:', error);
    }
  }

  /**
   * Get reports for a specific subject
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Object>} Reports for the subject
   */
  async getReportsForSubject(subjectId) {
    try {
      const allReports = Array.from(this.reports.values());
      const subjectReports = allReports.filter((report) => report.subjectId === subjectId);

      return {
        success: true,
        reports: subjectReports,
        total: subjectReports.length
      };
    } catch (error) {
      console.error('Error getting reports for subject:', error);
      return {
        success: false,
        error: error.message,
        reports: [],
        total: 0
      };
    }
  }

  /**
   * Get moderation statistics
   * @returns {Promise<Object>} Moderation statistics
   */
  async getModerationStats() {
    try {
      const allReports = Array.from(this.reports.values());

      const stats = {
        totalReports: allReports.length,
        pendingReports: allReports.filter((r) => r.status === REPORT_STATUS.PENDING).length,
        reviewedReports: allReports.filter((r) => r.status === REPORT_STATUS.REVIEWED).length,
        resolvedReports: allReports.filter((r) => r.status === REPORT_STATUS.RESOLVED).length,
        blockedSubjects: 0,
        deletedSubjects: 0
      };

      // Count actions taken
      allReports.forEach((report) => {
        if (report.action === MODERATION_ACTION.BLOCKED) {
          stats.blockedSubjects++;
        } else if (report.action === MODERATION_ACTION.DELETED) {
          stats.deletedSubjects++;
        }
      });

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      return {
        success: false,
        error: error.message,
        stats: {}
      };
    }
  }

  /**
   * Get moderation notification title
   * @param {string} action - Moderation action
   * @returns {string} Notification title
   */
  getModerationNotificationTitle(action) {
    switch (action) {
      case MODERATION_ACTION.BLOCKED:
        return 'Subject Blocked';
      case MODERATION_ACTION.DELETED:
        return 'Subject Deleted';
      default:
        return 'Moderation Action';
    }
  }

  /**
   * Get moderation notification message
   * @param {string} action - Moderation action
   * @param {Object} context - Notification context
   * @returns {string} Notification message
   */
  getModerationNotificationMessage(action, context) {
    switch (action) {
      case MODERATION_ACTION.BLOCKED:
        return `Your subject has been blocked due to: ${context.reason}`;
      case MODERATION_ACTION.DELETED:
        return `Your subject "${context.subjectName}" has been deleted due to: ${context.reason}`;
      default:
        return 'A moderation action has been taken on your content';
    }
  }

  /**
   * Bulk review reports
   * @param {string[]} reportIds - Array of report IDs
   * @param {string} decision - Decision to apply to all reports
   * @param {string} adminId - Admin ID
   * @returns {Promise<Object>} Bulk review result
   */
  async bulkReviewReports(reportIds, decision, adminId) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const reportId of reportIds) {
      try {
        const result = await this.reviewReport(reportId, decision, adminId);
        results.push({ reportId, ...result });
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        results.push({
          reportId,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      results,
      summary: {
        total: reportIds.length,
        successful: successCount,
        failed: errorCount
      }
    };
  }
}
