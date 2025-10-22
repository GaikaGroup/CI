#!/usr/bin/env node

/**
 * Delete all demo courses and enrollments
 */

import { db } from '../src/lib/database/connection.js';

async function deleteDemoCourses() {
  try {
    console.log('🗑️  Deleting all courses and enrollments...');

    // Delete all enrollments first (foreign key constraint)
    const deletedEnrollments = await db.enrollment.deleteMany({});
    console.log(`✅ Deleted ${deletedEnrollments.count} enrollments`);

    // Delete all courses
    const deletedCourses = await db.course.deleteMany({});
    console.log(`✅ Deleted ${deletedCourses.count} courses`);

    // Delete demo users (except admin)
    const deletedUsers = await db.user.deleteMany({
      where: {
        email: {
          in: [
            'anna.ivanova@example.com',
            'mikhail.petrov@example.com',
            'elena.sidorova@example.com',
            'dmitry.kozlov@example.com',
            'olga.morozova@example.com'
          ]
        }
      }
    });
    console.log(`✅ Deleted ${deletedUsers.count} demo users`);

    console.log('\n🎉 All demo data deleted!');
  } catch (error) {
    console.error('❌ Error deleting demo data:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

deleteDemoCourses();
