#!/usr/bin/env node

/**
 * Seed script to create demo users
 * Usage: node scripts/seed-demo-users.js
 */

import { db } from '../src/lib/database/connection.js';
import bcrypt from 'bcryptjs';

const demoUsers = [
  {
    firstName: 'Анна',
    lastName: 'Иванова',
    email: 'anna.ivanova@example.com',
    password: 'student123',
    type: 'regular'
  },
  {
    firstName: 'Михаил',
    lastName: 'Петров',
    email: 'mikhail.petrov@example.com',
    password: 'student123',
    type: 'regular'
  },
  {
    firstName: 'Елена',
    lastName: 'Сидорова',
    email: 'elena.sidorova@example.com',
    password: 'student123',
    type: 'regular'
  },
  {
    firstName: 'Дмитрий',
    lastName: 'Козлов',
    email: 'dmitry.kozlov@example.com',
    password: 'student123',
    type: 'regular'
  },
  {
    firstName: 'Ольга',
    lastName: 'Морозова',
    email: 'olga.morozova@example.com',
    password: 'student123',
    type: 'regular'
  }
];

async function seedDemoUsers() {
  try {
    console.log('🌱 Seeding demo users...');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await db.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          type: userData.type
        }
      });

      console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    console.log('\n🎉 Demo users seeding completed!');
    console.log('\n📋 Demo user credentials:');
    demoUsers.forEach(user => {
      console.log(`📧 ${user.email} | 🔑 ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedDemoUsers();