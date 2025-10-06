#!/usr/bin/env node

/**
 * Script to check current sessions in the database
 * Usage: npm run check-sessions
 * or: node scripts/check-sessions.js
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkSessions() {
  try {
    console.log('📊 Checking sessions in database...\n');

    const sessions = await prisma.session.findMany({
      include: {
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (sessions.length === 0) {
      console.log('✅ No sessions found in database');
    } else {
      console.log(`Found ${sessions.length} session(s):\n`);
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.title}`);
        console.log(`   ID: ${session.id}`);
        console.log(`   User: ${session.userId}`);
        console.log(`   Messages: ${session._count.messages}`);
        console.log(`   Updated: ${session.updatedAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error checking sessions:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();
