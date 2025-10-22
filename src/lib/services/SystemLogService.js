/**
 * System Log Service
 *
 * Handles system logging and error tracking in database
 */

import { prisma } from '../database/client.js';

export class SystemLogService {
  /**
   * Log an error
   */
  static async logError(error, userId = null, category = 'general', metadata = {}) {
    try {
      const logEntry = await prisma.systemLog.create({
        data: {
          userId,
          level: 'error',
          category,
          message: error.message || error.toString(),
          metadata: {
            stack: error.stack,
            ...metadata,
            timestamp: new Date().toISOString()
          }
        }
      });

      return { success: true, logEntry };
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
      return { success: false, error: logError.message };
    }
  }

  /**
   * Log a warning
   */
  static async logWarning(message, userId = null, category = 'general', metadata = {}) {
    try {
      const logEntry = await prisma.systemLog.create({
        data: {
          userId,
          level: 'warn',
          category,
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        }
      });

      return { success: true, logEntry };
    } catch (error) {
      console.error('Failed to log warning to database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log an info message
   */
  static async logInfo(message, userId = null, category = 'general', metadata = {}) {
    try {
      const logEntry = await prisma.systemLog.create({
        data: {
          userId,
          level: 'info',
          category,
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        }
      });

      return { success: true, logEntry };
    } catch (error) {
      console.error('Failed to log info to database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log a debug message
   */
  static async logDebug(message, userId = null, category = 'general', metadata = {}) {
    try {
      const logEntry = await prisma.systemLog.create({
        data: {
          userId,
          level: 'debug',
          category,
          message,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        }
      });

      return { success: true, logEntry };
    } catch (error) {
      console.error('Failed to log debug to database:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get system logs with filtering
   */
  static async getLogs(options = {}) {
    try {
      const {
        level = '',
        category = '',
        userId = '',
        startDate = '',
        endDate = '',
        page = 1,
        limit = 50
      } = options;

      const skip = (page - 1) * limit;

      const where = {
        ...(level && { level }),
        ...(category && { category }),
        ...(userId && { userId }),
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            lte: new Date(endDate)
          }
        })
      };

      const [logs, total] = await Promise.all([
        prisma.systemLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.systemLog.count({ where })
      ]);

      return {
        success: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting system logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get log statistics
   */
  static async getLogStats(options = {}) {
    try {
      const { startDate = '', endDate = '', category = '' } = options;

      const where = {
        ...(category && { category }),
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            lte: new Date(endDate)
          }
        })
      };

      const [totalLogs, logsByLevel, logsByCategory, recentErrors] = await Promise.all([
        // Total logs
        prisma.systemLog.count({ where }),

        // Logs by level
        prisma.systemLog.groupBy({
          by: ['level'],
          where,
          _count: true
        }),

        // Logs by category
        prisma.systemLog.groupBy({
          by: ['category'],
          where,
          _count: true,
          orderBy: {
            _count: {
              category: 'desc'
            }
          },
          take: 10
        }),

        // Recent errors
        prisma.systemLog.findMany({
          where: {
            ...where,
            level: 'error'
          },
          include: {
            user: {
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
          totalLogs,
          logsByLevel,
          logsByCategory,
          recentErrors
        }
      };
    } catch (error) {
      console.error('Error getting log stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean old logs (keep only last N days)
   */
  static async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.systemLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      return { success: true, deletedCount: result.count };
    } catch (error) {
      console.error('Error cleaning old logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Log user action
   */
  static async logUserAction(userId, action, metadata = {}) {
    return this.logInfo(`User action: ${action}`, userId, 'user_action', {
      action,
      ...metadata
    });
  }

  /**
   * Log API call
   */
  static async logAPICall(endpoint, method, userId = null, duration = null, success = true) {
    const level = success ? 'info' : 'error';
    const message = `API ${method} ${endpoint} - ${success ? 'Success' : 'Failed'}`;

    return this.logInfo(message, userId, 'api', {
      endpoint,
      method,
      duration,
      success
    });
  }

  /**
   * Log authentication event
   */
  static async logAuth(userId, event, metadata = {}) {
    return this.logInfo(`Auth event: ${event}`, userId, 'auth', {
      event,
      ...metadata
    });
  }

  /**
   * Log course event
   */
  static async logCourseEvent(userId, courseId, event, metadata = {}) {
    return this.logInfo(`Course event: ${event}`, userId, 'course', {
      courseId,
      event,
      ...metadata
    });
  }

  /**
   * Log enrollment event
   */
  static async logEnrollmentEvent(userId, courseId, event, metadata = {}) {
    return this.logInfo(`Enrollment event: ${event}`, userId, 'enrollment', {
      courseId,
      event,
      ...metadata
    });
  }
}

export default SystemLogService;
