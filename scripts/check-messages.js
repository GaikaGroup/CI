#!/usr/bin/env node

/**
 * Script to check messages in a session
 * Usage: node scripts/check-messages.js <session-id>
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function checkMessages() {
  try {
    const sessionId = process.argv[2];

    if (!sessionId) {
      console.log('Usage: node scripts/check-messages.js <session-id>');
      console.log('\nAvailable sessions:');
      const sessions = await prisma.session.findMany({
        select: { id: true, title: true }
      });
      sessions.forEach((s) => console.log(`  ${s.id} - ${s.title}`));
      process.exit(0);
    }

    console.log(`📊 Checking messages for session: ${sessionId}\n`);

    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });

    if (messages.length === 0) {
      console.log('No messages found');
    } else {
      console.log(`Found ${messages.length} message(s):\n`);
      messages.forEach((msg, index) => {
        console.log(
          `${index + 1}. [${msg.type.toUpperCase()}] ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`
        );
        console.log(`   Created: ${msg.createdAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
