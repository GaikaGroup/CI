#!/usr/bin/env node

/**
 * Check what's in the database
 */

import { db } from '../src/lib/database/connection.js';

async function checkDatabase() {
  try {
    console.log('📊 Checking database contents...\n');

    // Count users
    const userCount = await db.user.count();
    const users = await db.user.findMany({
      select: {
        email: true,
        firstName: true,
        lastName: true,
        type: true
      }
    });
    console.log(`👥 Users: ${userCount}`);
    users.forEach(u => console.log(`   - ${u.firstName} ${u.lastName} (${u.email}) - type: ${u.type}`));

    // Count courses
    const courseCount = await db.course.count();
    const courses = await db.course.findMany({
      select: {
        name: true,
        status: true
      }
    });
    console.log(`\n📚 Courses: ${courseCount}`);
    courses.forEach(c => console.log(`   - ${c.name} (${c.status})`));

    // Count enrollments
    const enrollmentCount = await db.enrollment.count();
    console.log(`\n📝 Enrollments: ${enrollmentCount}`);

    // Count sessions
    const sessionCount = await db.session.count();
    console.log(`💬 Sessions: ${sessionCount}`);

    // Count messages
    const messageCount = await db.message.count();
    console.log(`📨 Messages: ${messageCount}`);

    console.log('\n✅ Database check complete!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

checkDatabase();