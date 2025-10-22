/**
 * Migration Script: localStorage to Database
 *
 * This script migrates all data from localStorage to the PostgreSQL database.
 * Run this script to move user data, courses, enrollments, and preferences to the database.
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

/**
 * Migrate courses from localStorage to database
 */
async function migrateCourses() {
  console.log('🔄 Migrating courses from localStorage...');

  // This would typically be run in the browser context
  // For server-side migration, you'd need to collect this data first

  const localStorageCourses = JSON.parse(localStorage.getItem('learnModeCourses') || '[]');
  const localStorageSubjects = JSON.parse(localStorage.getItem('learnModeSubjects') || '[]');

  // Combine courses and subjects (subjects are now courses)
  const allCourses = [...localStorageCourses, ...localStorageSubjects];

  let migratedCount = 0;

  for (const course of allCourses) {
    try {
      // Check if course already exists
      const existingCourse = await prisma.course.findFirst({
        where: {
          OR: [
            { id: course.id },
            {
              AND: [{ name: course.name }, { creatorId: course.creatorId || 'admin-user-id' }]
            }
          ]
        }
      });

      if (existingCourse) {
        console.log(`⚠️  Course "${course.name}" already exists, skipping...`);
        continue;
      }

      // Create course in database
      await prisma.course.create({
        data: {
          id: course.id || undefined, // Let Prisma generate if not provided
          name: course.name || 'Untitled Course',
          description: course.description || null,
          language: course.language || 'en',
          level: course.level || 'beginner',
          skills: course.skills || [],
          settings: course.settings || {},
          practice: course.practice || null,
          exam: course.exam || null,
          agents: course.agents || [],
          orchestrationAgent: course.orchestrationAgent || null,
          materials: course.materials || [],
          llmSettings: course.llmSettings || {},
          creatorId: course.creatorId || 'admin-user-id', // Default admin user
          creatorRole: course.creatorRole || 'admin',
          status: course.status || 'active',
          isActive: course.isActive !== false
        }
      });

      migratedCount++;
      console.log(`✅ Migrated course: "${course.name}"`);
    } catch (error) {
      console.error(`❌ Failed to migrate course "${course.name}":`, error.message);
    }
  }

  console.log(`🎉 Migrated ${migratedCount} courses successfully`);
}

/**
 * Migrate enrollments from localStorage to database
 */
async function migrateEnrollments() {
  console.log('🔄 Migrating enrollments from localStorage...');

  const userEnrollments = JSON.parse(localStorage.getItem('userEnrollments') || '[]');
  const courseEnrollments = JSON.parse(localStorage.getItem('courseEnrollments') || '[]');
  const subjectEnrollments = JSON.parse(localStorage.getItem('subjectEnrollments') || '[]');

  // Combine all enrollment data
  const allEnrollments = [...userEnrollments, ...courseEnrollments, ...subjectEnrollments];

  let migratedCount = 0;

  for (const enrollment of allEnrollments) {
    try {
      // Check if enrollment already exists
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: enrollment.userId,
            courseId: enrollment.courseId || enrollment.subjectId
          }
        }
      });

      if (existingEnrollment) {
        console.log(
          `⚠️  Enrollment for user ${enrollment.userId} in course ${enrollment.courseId || enrollment.subjectId} already exists, skipping...`
        );
        continue;
      }

      // Verify user and course exist
      const user = await prisma.user.findUnique({ where: { id: enrollment.userId } });
      const course = await prisma.course.findUnique({
        where: { id: enrollment.courseId || enrollment.subjectId }
      });

      if (!user) {
        console.log(`⚠️  User ${enrollment.userId} not found, skipping enrollment...`);
        continue;
      }

      if (!course) {
        console.log(
          `⚠️  Course ${enrollment.courseId || enrollment.subjectId} not found, skipping enrollment...`
        );
        continue;
      }

      // Create enrollment in database
      await prisma.enrollment.create({
        data: {
          userId: enrollment.userId,
          courseId: enrollment.courseId || enrollment.subjectId,
          status: enrollment.status || 'active',
          progress: enrollment.progress || {},
          enrolledAt: enrollment.enrolledAt ? new Date(enrollment.enrolledAt) : new Date(),
          completedAt: enrollment.completedAt ? new Date(enrollment.completedAt) : null
        }
      });

      migratedCount++;
      console.log(`✅ Migrated enrollment for user ${enrollment.userId}`);
    } catch (error) {
      console.error(`❌ Failed to migrate enrollment:`, error.message);
    }
  }

  console.log(`🎉 Migrated ${migratedCount} enrollments successfully`);
}

/**
 * Migrate user preferences from localStorage to database
 */
async function migrateUserPreferences() {
  console.log('🔄 Migrating user preferences from localStorage...');

  // Get current user (this would need to be adapted for your auth system)
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  if (!currentUser) {
    console.log('⚠️  No current user found, skipping preferences migration...');
    return;
  }

  const preferences = [
    { key: 'theme', value: localStorage.getItem('theme') },
    { key: 'language', value: localStorage.getItem('language') }
  ];

  let migratedCount = 0;

  for (const pref of preferences) {
    if (!pref.value) continue;

    try {
      // Check if preference already exists
      const existingPref = await prisma.userPreference.findUnique({
        where: {
          userId_key: {
            userId: currentUser.id,
            key: pref.key
          }
        }
      });

      if (existingPref) {
        // Update existing preference
        await prisma.userPreference.update({
          where: {
            userId_key: {
              userId: currentUser.id,
              key: pref.key
            }
          },
          data: {
            value: pref.value
          }
        });
        console.log(`✅ Updated preference: ${pref.key}`);
      } else {
        // Create new preference
        await prisma.userPreference.create({
          data: {
            userId: currentUser.id,
            key: pref.key,
            value: pref.value
          }
        });
        console.log(`✅ Created preference: ${pref.key}`);
      }

      migratedCount++;
    } catch (error) {
      console.error(`❌ Failed to migrate preference ${pref.key}:`, error.message);
    }
  }

  console.log(`🎉 Migrated ${migratedCount} preferences successfully`);
}

/**
 * Migrate admin data and moderation queue
 */
async function migrateAdminData() {
  console.log('🔄 Migrating admin data from localStorage...');

  const adminSubjects = JSON.parse(localStorage.getItem('adminSubjects') || '[]');
  const adminCourses = JSON.parse(localStorage.getItem('adminCourses') || '[]');
  const moderationQueue = JSON.parse(localStorage.getItem('moderationQueue') || '[]');
  const moderationData = JSON.parse(localStorage.getItem('moderationData') || '{}');

  // Migrate moderation reports
  let migratedReports = 0;

  for (const report of moderationQueue) {
    try {
      // Verify course and reporter exist
      const course = await prisma.course.findUnique({
        where: { id: report.courseId || report.subjectId }
      });
      const reporter = await prisma.user.findUnique({ where: { id: report.reporterId } });

      if (!course || !reporter) {
        console.log(`⚠️  Course or reporter not found for report, skipping...`);
        continue;
      }

      await prisma.courseReport.create({
        data: {
          courseId: report.courseId || report.subjectId,
          reporterId: report.reporterId,
          reason: report.reason || 'No reason provided',
          description: report.description || null,
          status: report.status || 'pending',
          priority: report.priority || 'medium',
          metadata: report.metadata || {},
          reviewedBy: report.reviewedBy || null,
          reviewedAt: report.reviewedAt ? new Date(report.reviewedAt) : null
        }
      });

      migratedReports++;
      console.log(`✅ Migrated report for course ${report.courseId || report.subjectId}`);
    } catch (error) {
      console.error(`❌ Failed to migrate report:`, error.message);
    }
  }

  console.log(`🎉 Migrated ${migratedReports} reports successfully`);
}

/**
 * Migrate error logs to system logs
 */
async function migrateErrorLogs() {
  console.log('🔄 Migrating error logs from localStorage...');

  const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');

  let migratedLogs = 0;

  for (const logEntry of errorLog) {
    try {
      await prisma.systemLog.create({
        data: {
          userId: logEntry.userId || null,
          level: 'error',
          category: logEntry.category || 'general',
          message: logEntry.message || 'No message',
          metadata: logEntry.metadata || {},
          createdAt: logEntry.timestamp ? new Date(logEntry.timestamp) : new Date()
        }
      });

      migratedLogs++;
    } catch (error) {
      console.error(`❌ Failed to migrate log entry:`, error.message);
    }
  }

  console.log(`🎉 Migrated ${migratedLogs} log entries successfully`);
}

/**
 * Clean up localStorage after successful migration
 */
function cleanupLocalStorage() {
  console.log('🧹 Cleaning up localStorage...');

  const keysToRemove = [
    'learnModeCourses',
    'learnModeSubjects',
    'userEnrollments',
    'courseEnrollments',
    'subjectEnrollments',
    'adminSubjects',
    'adminCourses',
    'moderationQueue',
    'moderationData',
    'errorLog',
    'adminDashboardData'
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    console.log(`✅ Removed ${key} from localStorage`);
  });

  console.log('🎉 localStorage cleanup completed');
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting localStorage to database migration...');

  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connection established');

    // Run migrations in order
    await migrateCourses();
    await migrateEnrollments();
    await migrateUserPreferences();
    await migrateAdminData();
    await migrateErrorLogs();

    // Clean up localStorage (optional - uncomment if you want to clean up)
    // cleanupLocalStorage();

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  window.runMigration = runMigration;
  console.log('Migration script loaded. Run window.runMigration() to start migration.');
} else {
  // Node.js environment
  runMigration();
}

export {
  runMigration,
  migrateCourses,
  migrateEnrollments,
  migrateUserPreferences,
  migrateAdminData,
  migrateErrorLogs
};
