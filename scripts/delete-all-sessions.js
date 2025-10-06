#!/usr/bin/env node

/**
 * Script to delete all sessions and messages from the database
 * WARNING: This will permanently delete all data!
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function deleteAllSessions() {
  try {
    console.log('🗑️  Starting deletion of all sessions...');

    // Delete all messages first (due to foreign key constraints)
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`✅ Deleted ${deletedMessages.count} messages`);

    // Delete all sessions
    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`✅ Deleted ${deletedSessions.count} sessions`);

    console.log('✨ All sessions and messages have been deleted successfully!');
  } catch (error) {
    console.error('❌ Error deleting sessions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllSessions();
