#!/usr/bin/env node

/**
 * Create demo courses and enrollments to demonstrate user roles
 * Usage: node scripts/create-demo-courses-and-enrollments.js
 */

import { db } from '../src/lib/database/connection.js';

async function createDemoCourses() {
  try {
    console.log('🎓 Creating demo courses and enrollments...');

    // Get demo users
    const adminUser = await db.user.findUnique({
      where: { email: 'AdminLogin' }
    });

    const demoUser = await db.user.findUnique({
      where: { email: 'User1Login' }
    });

    if (!adminUser || !demoUser) {
      console.error('❌ Demo users not found. Please run migrate-demo-users-to-db.js first');
      return;
    }

    // Create a course by demo user (making them a Tutor)
    const course1 = await db.course.create({
      data: {
        name: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript programming',
        language: 'en',
        level: 'beginner',
        skills: ['javascript', 'programming', 'web-development'],
        creatorId: demoUser.id,
        creatorRole: 'regular',
        status: 'active'
      }
    });

    console.log(`✅ Created course: ${course1.name} by ${demoUser.firstName} ${demoUser.lastName}`);

    // Create a course by admin user
    const course2 = await db.course.create({
      data: {
        name: 'Advanced React Patterns',
        description: 'Master advanced React development patterns',
        language: 'en',
        level: 'advanced',
        skills: ['react', 'javascript', 'frontend'],
        creatorId: adminUser.id,
        creatorRole: 'admin',
        status: 'active'
      }
    });

    console.log(
      `✅ Created course: ${course2.name} by ${adminUser.firstName} ${adminUser.lastName}`
    );

    // Enroll demo user in admin's course (making them a Student)
    const enrollment1 = await db.enrollment.create({
      data: {
        userId: demoUser.id,
        courseId: course2.id,
        status: 'active'
      }
    });

    console.log(`✅ Enrolled ${demoUser.firstName} ${demoUser.lastName} in "${course2.name}"`);

    // Enroll demo user in their own course (making them both Student and Tutor)
    const enrollment2 = await db.enrollment.create({
      data: {
        userId: demoUser.id,
        courseId: course1.id,
        status: 'active'
      }
    });

    console.log(
      `✅ Enrolled ${demoUser.firstName} ${demoUser.lastName} in their own course "${course1.name}"`
    );

    // Create some additional regular users
    const regularUsers = [
      {
        firstName: 'Анна',
        lastName: 'Иванова',
        email: 'anna.ivanova@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', // student123
        type: 'regular'
      },
      {
        firstName: 'Михаил',
        lastName: 'Петров',
        email: 'mikhail.petrov@example.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', // student123
        type: 'regular'
      }
    ];

    for (const userData of regularUsers) {
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const user = await db.user.create({
          data: userData
        });

        // Enroll in one of the courses
        await db.enrollment.create({
          data: {
            userId: user.id,
            courseId: Math.random() > 0.5 ? course1.id : course2.id,
            status: 'active'
          }
        });

        console.log(`✅ Created user and enrolled: ${user.firstName} ${user.lastName}`);
      }
    }

    console.log('\n🎉 Demo courses and enrollments created successfully!');
    console.log('\n📊 Current user roles:');
    console.log(`👤 ${adminUser.firstName} ${adminUser.lastName}: Admin + Tutor`);
    console.log(`👤 ${demoUser.firstName} ${demoUser.lastName}: Regular + Student + Tutor`);
    console.log(`👤 Анна Иванова: Regular + Student`);
    console.log(`👤 Михаил Петров: Regular + Student`);
  } catch (error) {
    console.error('❌ Error creating demo courses:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

createDemoCourses();
