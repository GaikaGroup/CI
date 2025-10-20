/**
 * Course Service
 * 
 * Handles all course-related database operations
 */

import { prisma } from '../database/client.js';
import { generateUniqueSlug } from '../utils/slugify.js';

export class CourseService {
  /**
   * Create a new course
   */
  static async createCourse(courseData, creatorId) {
    try {
      // Generate slug from course name
      const tempId = Date.now().toString(36);
      const slug = courseData.slug || generateUniqueSlug(courseData.name, tempId);

      const course = await prisma.course.create({
        data: {
          name: courseData.name,
          slug,
          description: courseData.description || null,
          language: courseData.language || 'en',
          level: courseData.level || 'beginner',
          skills: courseData.skills || [],
          settings: courseData.settings || {},
          practice: courseData.practice || null,
          exam: courseData.exam || null,
          agents: courseData.agents || [],
          orchestrationAgent: courseData.orchestrationAgent || null,
          materials: courseData.materials || [],
          llmSettings: courseData.llmSettings || {},
          creatorId,
          creatorRole: courseData.creatorRole || 'user',
          status: courseData.status || 'active',
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              type: true
            }
          },
          _count: {
            select: {
              enrollments: true,
              sessions: true,
              reports: true
            }
          }
        }
      });

      return { success: true, course };
    } catch (error) {
      console.error('Error creating course:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get course by ID or slug
   */
  static async getCourseById(courseIdOrSlug, includeDetails = false) {
    try {
      // Try to find by slug first, then by ID
      let course = await prisma.course.findUnique({
        where: { slug: courseIdOrSlug },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              type: true
            }
          },
          ...(includeDetails && {
            enrollments: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            sessions: {
              select: {
                id: true,
                title: true,
                createdAt: true,
                messageCount: true
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            },
            reports: {
              include: {
                reporter: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }),
          _count: {
            select: {
              enrollments: true,
              sessions: true,
              reports: true
            }
          }
        }
      });

      // If not found by slug, try by ID
      if (!course) {
        course = await prisma.course.findUnique({
          where: { id: courseIdOrSlug },
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                type: true
              }
            },
            ...(includeDetails && {
              enrollments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true
                    }
                  }
                }
              },
              sessions: {
                select: {
                  id: true,
                  title: true,
                  createdAt: true,
                  messageCount: true
                },
                orderBy: { createdAt: 'desc' },
                take: 10
              },
              reports: {
                include: {
                  reporter: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true
                    }
                  }
                },
                orderBy: { createdAt: 'desc' }
              }
            }),
            _count: {
              select: {
                enrollments: true,
                sessions: true,
                reports: true
              }
            }
          }
        });
      }

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      return { success: true, course };
    } catch (error) {
      console.error('Error getting course:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all courses with filtering and pagination
   */
  static async getCourses(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        language = '',
        level = '',
        status = 'active',
        creatorId = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build where clause
      const where = {
        ...(status !== 'all' && { status }),
        ...(language && { language }),
        ...(level && { level }),
        ...(creatorId && { creatorId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      };

      // Get courses with pagination
      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                type: true
              }
            },
            _count: {
              select: {
                enrollments: true,
                sessions: true,
                reports: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        prisma.course.count({ where })
      ]);

      return {
        success: true,
        courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting courses:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update course
   */
  static async updateCourse(courseId, updates, userId) {
    try {
      // Check if user has permission to update
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { creatorId: true }
      });

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check if user is creator or admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { type: true }
      });

      if (course.creatorId !== userId && user?.type !== 'admin') {
        return { success: false, error: 'Permission denied' };
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              type: true
            }
          },
          _count: {
            select: {
              enrollments: true,
              sessions: true,
              reports: true
            }
          }
        }
      });

      return { success: true, course: updatedCourse };
    } catch (error) {
      console.error('Error updating course:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete course (soft delete by setting status to 'deleted')
   */
  static async deleteCourse(courseId, userId, hardDelete = false) {
    try {
      // Check permissions
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { creatorId: true }
      });

      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { type: true }
      });

      if (course.creatorId !== userId && user?.type !== 'admin') {
        return { success: false, error: 'Permission denied' };
      }

      if (hardDelete && user?.type === 'admin') {
        // Hard delete (admin only)
        await prisma.course.delete({
          where: { id: courseId }
        });
      } else {
        // Soft delete
        await prisma.course.update({
          where: { id: courseId },
          data: {
            status: 'deleted',
            isActive: false
          }
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting course:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get course statistics
   */
  static async getCourseStats(courseId) {
    try {
      const stats = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          _count: {
            select: {
              enrollments: true,
              sessions: true,
              reports: true
            }
          },
          enrollments: {
            select: {
              status: true,
              enrolledAt: true
            }
          },
          sessions: {
            select: {
              createdAt: true,
              messageCount: true
            }
          }
        }
      });

      if (!stats) {
        return { success: false, error: 'Course not found' };
      }

      // Calculate additional stats
      const enrollmentsByStatus = stats.enrollments.reduce((acc, enrollment) => {
        acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
        return acc;
      }, {});

      const totalMessages = stats.sessions.reduce((sum, session) => sum + session.messageCount, 0);

      return {
        success: true,
        stats: {
          totalEnrollments: stats._count.enrollments,
          totalSessions: stats._count.sessions,
          totalReports: stats._count.reports,
          totalMessages,
          enrollmentsByStatus,
          averageMessagesPerSession: stats._count.sessions > 0 ? totalMessages / stats._count.sessions : 0
        }
      };
    } catch (error) {
      console.error('Error getting course stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search courses
   */
  static async searchCourses(query, options = {}) {
    try {
      const {
        limit = 10,
        language = '',
        level = '',
        status = 'active'
      } = options;

      const courses = await prisma.course.findMany({
        where: {
          status,
          ...(language && { language }),
          ...(level && { level }),
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              enrollments: true,
              sessions: true
            }
          }
        },
        orderBy: [
          { name: 'asc' }
        ],
        take: limit
      });

      return { success: true, courses };
    } catch (error) {
      console.error('Error searching courses:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get courses by creator
   */
  static async getCoursesByCreator(creatorId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'all'
      } = options;

      const skip = (page - 1) * limit;

      const where = {
        creatorId,
        ...(status !== 'all' && { status })
      };

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: {
            _count: {
              select: {
                enrollments: true,
                sessions: true,
                reports: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.course.count({ where })
      ]);

      return {
        success: true,
        courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting courses by creator:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CourseService;