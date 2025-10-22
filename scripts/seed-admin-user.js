#!/usr/bin/env node

/**
 * Seed script to create an admin user
 * Usage: node scripts/seed-admin-user.js
 */

import { db } from '../src/lib/database/connection.js';
import bcrypt from 'bcryptjs';

async function seedAdminUser() {
  try {
    console.log('🌱 Seeding admin user...');

    // Check if admin user already exists
    const existingAdmin = await db.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const adminUser = await db.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('👤 User ID:', adminUser.id);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedAdminUser();
