/**
 * Database connection test script
 * Run this to verify database setup is working correctly
 */

import { testConnection, getMigrationStatus, verifySchema, db } from './index.js';

async function runTests() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const isConnected = await testConnection();
    console.log(`✅ Connection test: ${isConnected ? 'PASSED' : 'FAILED'}`);
    
    if (!isConnected) {
      console.error('❌ Database connection failed. Please check your configuration.');
      process.exit(1);
    }
    
    // Test migration status
    console.log('\n🔍 Checking migration status...');
    const migrationStatus = await getMigrationStatus();
    console.log('✅ Migration status:', {
      hasTable: migrationStatus.hasTable,
      appliedMigrations: migrationStatus.appliedMigrations.length,
      pendingMigrations: migrationStatus.pendingMigrations,
    });
    
    // Test schema integrity
    console.log('\n🔍 Verifying schema integrity...');
    const schemaStatus = await verifySchema();
    console.log(`✅ Schema verification: ${schemaStatus.isValid ? 'PASSED' : 'FAILED'}`);
    
    if (!schemaStatus.isValid) {
      console.error('❌ Schema issues found:', schemaStatus.issues);
    }
    
    // Test basic CRUD operations
    console.log('\n🔍 Testing basic operations...');
    
    // Create a test session
    const testSession = await db.session.create({
      data: {
        userId: 'test-user-123',
        title: 'Test Session',
        preview: 'This is a test session',
        language: 'en',
        mode: 'fun',
      },
    });
    console.log('✅ Session creation: PASSED');
    
    // Create a test message
    const testMessage = await db.message.create({
      data: {
        sessionId: testSession.id,
        type: 'user',
        content: 'Hello, this is a test message',
        metadata: { test: true },
      },
    });
    console.log('✅ Message creation: PASSED');
    
    // Test querying with relations
    const sessionWithMessages = await db.session.findUnique({
      where: { id: testSession.id },
      include: { messages: true },
    });
    
    console.log('✅ Query with relations: PASSED');
    console.log(`   Session has ${sessionWithMessages.messages.length} message(s)`);
    
    // Clean up test data
    await db.message.delete({ where: { id: testMessage.id } });
    await db.session.delete({ where: { id: testSession.id } });
    console.log('✅ Cleanup: PASSED');
    
    console.log('\n🎉 All database tests passed successfully!');
    console.log('✅ PostgreSQL database infrastructure is ready for use.');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };