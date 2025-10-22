#!/usr/bin/env node

/**
 * Migrate demo users to database
 * Usage: node scripts/migrate-demo-users-to-db.js
 */

import { db } from '../src/lib/database/connection.js';
import bcrypt from 'bcryptjs';

const demoUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'AdminLogin',
    password: 'AdminPswd',
    type: 'admin'
  },
  {
    firstName: 'Demo',
    lastName: 'User',
    email: 'User1Login',
    password: 'User1Pswd',
    type: 'regular'
  }
];

async function migrateDemoUsers() {
  try {
    console.log('🔄 Migrating demo users to database...');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists in database, skipping...`);
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

      console.log(`✅ Migrated demo user: ${user.firstName} ${user.lastName} (${user.email})`);
    }

    console.log('\n🎉 Demo users migration completed!');
    console.log('\n📋 All demo users are now in database:');
    demoUsers.forEach((user) => {
      console.log(`📧 ${user.email} | 🔑 ${user.password} | 👤 ${user.type}`);
    });
  } catch (error) {
    console.error('❌ Error migrating demo users:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

migrateDemoUsers();
