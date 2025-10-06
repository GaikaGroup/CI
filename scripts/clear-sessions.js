#!/usr/bin/env node

/**
 * Script to remove all sessions from the database
 * Usage: npm run clear-sessions
 * or: node scripts/clear-sessions.js
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function clearAllSessions() {
  try {
    console.log('🗑️  Starting to clear all sessions...');

    // Delete all sessions (messages will be cascade deleted)
    const result = await prisma.session.deleteMany({});

    console.log(`✅ Successfully deleted ${result.count} session(s)`);
    console.log('✅ All associated messages were also deleted (cascade)');
  } catch (error) {
    console.error('❌ Error clearing sessions:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllSessions();
