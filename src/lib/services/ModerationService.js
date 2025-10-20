/**
 * Moderation Service
 * 
 * Handles course reports and moderation functionality
 */

import { prisma } from '../database/client.js';

export class ModerationService {
  /**
   * Create a course report
   */
  static async createReport(reportData) {
    try {
      const {
        courseId,
        reporterId,
        reason,
        description = null,
        priority = 'medium'
      } = reportData;

      // Validate required fields
      if (!courseId || !reporterId || !reason) {
        return { success: false, error: 'Missing required fields' };
      }

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check if reporter exists
      const reporter = await prisma.user.findUnique({
        where: { id: reporterId }
      });

      if (!reporter) {
        return { success: false, error: 'Reporter not found' };
      }

      // Create report
      const report = await prisma.courseReport.create({
        data: {
          courseId,
          reporterId,
          reason,
          description,
          priority,
          status: 'pending'
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      return { success: true, report };
    } catch (error) {
      console.error('Error creating report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reports with filtering and pagination
   */
  static async getReports(options = {}) {
    try {
      const {
        status = 'all',
        priority = 'all',
        courseId = '',
        reporterId = '',
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      const where = {
        ...(status !== 'all' && { status }),
        ...(priority !== 'all' && { priority }),
        ...(courseId && { courseId }),
        ...(reporterId && { reporterId })
      };

      const [reports, total] = await Promise.all([
        prisma.courseReport.findMany({
          where,
          include: {
            course: {
              select: {
                id: true,
                name: true,
                creator: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.courseReport.count({ where })
      ]);

      return {
        success: true,
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting reports:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update report status
   */
  static async updateReportStatus(reportId, status, reviewerId, reviewNotes = null) {
    try {
      const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' };
      }

      const report = await prisma.courseReport.findUnique({
        where: { id: reportId }
      });

      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      const updateData = {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      };

      if (reviewNotes) {
        updateData.metadata = {
          ...report.metadata,
          reviewNotes
        };
      }

      const updatedReport = await prisma.courseReport.update({
        where: { id: reportId },
        data: updateData,
        include: {
          course: {
            select: {
              id: true,
              name: true
            }
          },
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return { success: true, report: updatedReport };
    } catch (error) {
      console.error('Error updating report status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get report by ID
   */
  static async getReportById(reportId) {
    try {
      const report = await prisma.courseReport.findUnique({
        where: { id: reportId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!report) {
        return { success: false, error: 'Report not found' };
      }

      return { success: true, report };
    } catch (error) {
      console.error('Error getting report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get moderation statistics
   */
  static async getModerationStats(options = {}) {
    try {
      const {
        startDate = '',
        endDate = ''
      } = options;

      const where = {
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { 
          createdAt: { 
            ...(startDate ? { gte: new Date(startDate) } : {}),
            lte: new Date(endDate) 
          } 
        })
      };

      const [
        totalReports,
        reportsByStatus,
        reportsByPriority,
        reportsByCourse,
        recentReports
      ] = await Promise.all([
        // Total reports
        prisma.courseReport.count({ where }),

        // Reports by status
        prisma.courseReport.groupBy({
          by: ['status'],
          where,
          _count: true
        }),

        // Reports by priority
        prisma.courseReport.groupBy({
          by: ['priority'],
          where,
          _count: true
        }),

        // Top reported courses
        prisma.courseReport.groupBy({
          by: ['courseId'],
          where,
          _count: true,
          orderBy: {
            _count: {
              courseId: 'desc'
            }
          },
          take: 10
        }),

        // Recent reports
        prisma.courseReport.findMany({
          where,
          include: {
            course: {
              select: {
                id: true,
                name: true
              }
            },
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      return {
        success: true,
        stats: {
          totalReports,
          reportsByStatus,
          reportsByPriority,
          reportsByCourse,
          recentReports
        }
      };
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Bulk update reports
   */
  static async bulkUpdateReports(reportIds, updates, reviewerId) {
    try {
      const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
      
      if (updates.status && !validStatuses.includes(updates.status)) {
        return { success: false, error: 'Invalid status' };
      }

      const updateData = {
        ...updates,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      };

      const result = await prisma.courseReport.updateMany({
        where: {
          id: {
            in: reportIds
          }
        },
        data: updateData
      });

      return { success: true, updatedCount: result.count };
    } catch (error) {
      console.error('Error bulk updating reports:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete report
   */
  static async deleteReport(reportId, userId) {
    try {
      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { type: true }
      });

      if (!user || user.type !== 'admin') {
        return { success: false, error: 'Permission denied' };
      }

      await prisma.courseReport.delete({
        where: { id: reportId }
      });

      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        return { success: false, error: 'Report not found' };
      }
      console.error('Error deleting report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reports for a specific course
   */
  static async getCourseReports(courseId, options = {}) {
    try {
      const {
        status = 'all',
        page = 1,
        limit = 20
      } = options;

      const skip = (page - 1) * limit;

      const where = {
        courseId,
        ...(status !== 'all' && { status })
      };

      const [reports, total] = await Promise.all([
        prisma.courseReport.findMany({
          where,
          include: {
            reporter: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.courseReport.count({ where })
      ]);

      return {
        success: true,
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting course reports:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ModerationService;