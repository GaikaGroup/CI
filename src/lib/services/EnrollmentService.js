/**
 * Enrollment Service
 *
 * Handles all enrollment-related database operations
 */

import { prisma } from '../database/client.js';

export class EnrollmentService {
  /**
   * Enroll user in a course
   */
  static async enrollUser(userId, courseId) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Check if course exists and is active
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      if (course.status !== 'active') {
        return { success: false, error: 'Course is not available for enrollment' };
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      if (existingEnrollment) {
        if (existingEnrollment.status === 'active') {
          return { success: false, error: 'Already enrolled in this course' };
        } else {
          // Reactivate enrollment
          const enrollment = await prisma.enrollment.update({
            where: {
              userId_courseId: {
                userId,
                courseId
              }
            },
            data: {
              status: 'active',
              enrolledAt: new Date()
            },
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  language: true,
                  level: true
                }
              }
            }
          });

          return { success: true, enrollment };
        }
      }

      // Create new enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: 'active',
          progress: {
            lessonsCompleted: 0,
            assessmentsTaken: 0,
            totalTimeSpent: 0,
            lastAccessedAt: new Date().toISOString()
          }
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              language: true,
              level: true
            }
          }
        }
      });

      return { success: true, enrollment };
    } catch (error) {
      console.error('Error enrolling user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update enrollment status
   */
  static async updateEnrollmentStatus(userId, courseId, status) {
    try {
      const validStatuses = ['active', 'completed', 'dropped'];
      if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status' };
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      if (!enrollment) {
        return { success: false, error: 'Enrollment not found' };
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      const updatedEnrollment = await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        },
        data: updateData,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      return { success: true, enrollment: updatedEnrollment };
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user progress in a course
   */
  static async updateProgress(userId, courseId, progressUpdate) {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      if (!enrollment) {
        return { success: false, error: 'Enrollment not found' };
      }

      // Merge progress data
      const currentProgress = enrollment.progress || {};
      const newProgress = {
        ...currentProgress,
        ...progressUpdate,
        lastAccessedAt: new Date().toISOString()
      };

      const updatedEnrollment = await prisma.enrollment.update({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        },
        data: {
          progress: newProgress,
          updatedAt: new Date()
        },
        include: {
          course: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return { success: true, enrollment: updatedEnrollment };
    } catch (error) {
      console.error('Error updating progress:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user enrollments
   */
  static async getUserEnrollments(userId, options = {}) {
    try {
      const { status = 'all', page = 1, limit = 20, includeProgress = true } = options;

      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(status !== 'all' && { status })
      };

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where,
          include: {
            course: {
              select: {
                id: true,
                name: true,
                description: true,
                language: true,
                level: true,
                status: true,
                creator: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          },
          orderBy: { enrolledAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.enrollment.count({ where })
      ]);

      return {
        success: true,
        enrollments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user enrollments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get course enrollments
   */
  static async getCourseEnrollments(courseId, options = {}) {
    try {
      const { status = 'all', page = 1, limit = 20 } = options;

      const skip = (page - 1) * limit;

      const where = {
        courseId,
        ...(status !== 'all' && { status })
      };

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                type: true
              }
            }
          },
          orderBy: { enrolledAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.enrollment.count({ where })
      ]);

      return {
        success: true,
        enrollments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting course enrollments:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is enrolled in course
   */
  static async isUserEnrolled(userId, courseId) {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        },
        select: {
          status: true
        }
      });

      return {
        success: true,
        isEnrolled: !!enrollment,
        status: enrollment?.status || null
      };
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user enrollment statistics
   */
  static async getUserStats(userId) {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        select: {
          status: true,
          progress: true,
          enrolledAt: true,
          completedAt: true
        }
      });

      const stats = {
        total: enrollments.length,
        active: 0,
        completed: 0,
        dropped: 0,
        totalLessons: 0,
        totalAssessments: 0,
        totalTimeSpent: 0,
        averageProgress: 0
      };

      let totalProgress = 0;

      enrollments.forEach((enrollment) => {
        stats[enrollment.status]++;

        if (enrollment.progress) {
          stats.totalLessons += enrollment.progress.lessonsCompleted || 0;
          stats.totalAssessments += enrollment.progress.assessmentsTaken || 0;
          stats.totalTimeSpent += enrollment.progress.totalTimeSpent || 0;

          // Calculate progress percentage (assuming 100% is completion)
          const progress = enrollment.progress.progressPercentage || 0;
          totalProgress += progress;
        }
      });

      if (enrollments.length > 0) {
        stats.averageProgress = totalProgress / enrollments.length;
      }

      return { success: true, stats };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get enrollment by ID
   */
  static async getEnrollmentById(enrollmentId) {
    try {
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          course: {
            select: {
              id: true,
              name: true,
              description: true,
              language: true,
              level: true,
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!enrollment) {
        return { success: false, error: 'Enrollment not found' };
      }

      return { success: true, enrollment };
    } catch (error) {
      console.error('Error getting enrollment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Drop enrollment (set status to dropped)
   */
  static async dropEnrollment(userId, courseId) {
    return this.updateEnrollmentStatus(userId, courseId, 'dropped');
  }

  /**
   * Complete enrollment (set status to completed)
   */
  static async completeEnrollment(userId, courseId) {
    return this.updateEnrollmentStatus(userId, courseId, 'completed');
  }

  /**
   * Get enrollment analytics for admin
   */
  static async getEnrollmentAnalytics(options = {}) {
    try {
      const { startDate, endDate, courseId } = options;

      const where = {
        ...(startDate && { enrolledAt: { gte: new Date(startDate) } }),
        ...(endDate && { enrolledAt: { lte: new Date(endDate) } }),
        ...(courseId && { courseId })
      };

      const [totalEnrollments, enrollmentsByStatus, enrollmentsByMonth, topCourses] =
        await Promise.all([
          // Total enrollments
          prisma.enrollment.count({ where }),

          // Enrollments by status
          prisma.enrollment.groupBy({
            by: ['status'],
            where,
            _count: true
          }),

          // Enrollments by month
          prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', enrolled_at) as month,
            COUNT(*) as count
          FROM enrollments
          ${where.enrolledAt ? 'WHERE enrolled_at >= $1 AND enrolled_at <= $2' : ''}
          GROUP BY month
          ORDER BY month DESC
          LIMIT 12
        `,

          // Top courses by enrollment count
          prisma.enrollment.groupBy({
            by: ['courseId'],
            where,
            _count: true,
            orderBy: {
              _count: {
                courseId: 'desc'
              }
            },
            take: 10
          })
        ]);

      return {
        success: true,
        analytics: {
          totalEnrollments,
          enrollmentsByStatus,
          enrollmentsByMonth,
          topCourses
        }
      };
    } catch (error) {
      console.error('Error getting enrollment analytics:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EnrollmentService;
