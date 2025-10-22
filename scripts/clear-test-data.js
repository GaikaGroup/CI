#!/usr/bin/env node

/**
 * Script to clear test data for course creation testing
 * - Removes all sessions in 'fun' and 'learn' modes
 * - Clears course catalog (localStorage data)
 * - Preserves user data and admin settings
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('🧹 Starting test data cleanup...');

  try {
    // 1. Delete all sessions in 'fun' and 'learn' modes
    console.log('📝 Deleting sessions in fun and learn modes...');

    const deletedSessions = await prisma.session.deleteMany({
      where: {
        mode: {
          in: ['fun', 'learn']
        }
      }
    });

    console.log(`✅ Deleted ${deletedSessions.count} sessions`);

    // 2. Show remaining sessions (if any)
    const remainingSessions = await prisma.session.count();
    console.log(`📊 Remaining sessions: ${remainingSessions}`);

    // 3. Instructions for clearing course catalog
    console.log('\n📚 Course catalog cleanup:');
    console.log('The course catalog is stored in localStorage.');
    console.log('To clear it completely:');
    console.log('1. Open your browser developer tools (F12)');
    console.log('2. Go to Application/Storage tab');
    console.log('3. Find localStorage for your domain');
    console.log('4. Delete the "learnModeCourses" key');
    console.log('5. Refresh the page');
    console.log('\nAlternatively, you can use the reset function in the app UI.');

    console.log('\n✨ Test data cleanup completed!');
    console.log('Your database is now ready for testing course creation and learning.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearTestData();
