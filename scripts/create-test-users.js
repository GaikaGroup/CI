/**
 * Script to create test users in the database
 * Creates an admin user and a regular user for testing
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users...');

    // Hash passwords
    const adminPassword = await bcrypt.hash('AdminPswd', 10);
    const userPassword = await bcrypt.hash('UserPswd', 10);

    // Create admin user
    const admin = await prisma.user.upsert({
      where: { email: 'AdminLogin' },
      update: {
        password: adminPassword,
        type: 'admin',
        isActive: true
      },
      create: {
        email: 'AdminLogin',
        firstName: 'Admin',
        lastName: 'User',
        password: adminPassword,
        type: 'admin',
        isActive: true
      }
    });

    console.log('✓ Admin user created/updated:', {
      id: admin.id,
      email: admin.email,
      type: admin.type
    });

    // Create regular user
    const user = await prisma.user.upsert({
      where: { email: 'UserLogin' },
      update: {
        password: userPassword,
        type: 'regular',
        isActive: true
      },
      create: {
        email: 'UserLogin',
        firstName: 'Regular',
        lastName: 'User',
        password: userPassword,
        type: 'regular',
        isActive: true
      }
    });

    console.log('✓ Regular user created/updated:', {
      id: user.id,
      email: user.email,
      type: user.type
    });

    console.log('\n✓ Test users created successfully!');
    console.log('\nYou can now login with:');
    console.log('  Admin: AdminLogin / AdminPswd');
    console.log('  User:  UserLogin / UserPswd');

  } catch (error) {
    console.error('Error creating test users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
