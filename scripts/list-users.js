#!/usr/bin/env node

import { prisma } from '../src/lib/database/client.js';

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        type: true,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n📋 Users in database:\n');
    users.forEach((user) => {
      console.log(`  ${user.type === 'admin' ? '👑' : '👤'} ${user.firstName} ${user.lastName}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Type: ${user.type}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Active: ${user.isActive}`);
      console.log('');
    });

    console.log(`Total users: ${users.length}\n`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
