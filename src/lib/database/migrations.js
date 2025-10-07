/**
 * Database migration utilities for AI Tutor Sessions
 * Provides helpers for managing database schema changes
 */

import { getPrismaClient } from './connection.js';

/**
 * Check if database is up to date with migrations
 * @returns {Promise<boolean>} True if database is current
 */
export async function isDatabaseCurrent() {
  try {
    const prisma = getPrismaClient();

    // Try to query the sessions table to verify schema exists
    await prisma.session.findFirst({
      take: 1
    });

    return true;
  } catch (error) {
    console.warn('Database schema check failed:', error.message);
    return false;
  }
}

/**
 * Get migration status information
 * @returns {Promise<Object>} Migration status details
 */
export async function getMigrationStatus() {
  try {
    const prisma = getPrismaClient();

    // Check if _prisma_migrations table exists
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `;

    const migrationsTableExists = result[0]?.exists || false;

    if (!migrationsTableExists) {
      return {
        hasTable: false,
        appliedMigrations: [],
        pendingMigrations: true
      };
    }

    // Get applied migrations
    const appliedMigrations = await prisma.$queryRaw`
      SELECT migration_name, applied_steps_count, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC;
    `;

    return {
      hasTable: true,
      appliedMigrations,
      pendingMigrations: false
    };
  } catch (error) {
    console.error('Failed to get migration status:', error);
    return {
      hasTable: false,
      appliedMigrations: [],
      pendingMigrations: true,
      error: error.message
    };
  }
}

/**
 * Verify database schema integrity
 * @returns {Promise<Object>} Schema validation results
 */
export async function verifySchema() {
  try {
    const prisma = getPrismaClient();
    const issues = [];

    // Check if required tables exist
    const tables = ['sessions', 'messages'];

    for (const tableName of tables) {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${tableName}
        );
      `;

      if (!result[0]?.exists) {
        issues.push(`Missing table: ${tableName}`);
      }
    }

    // Check if required indexes exist
    const requiredIndexes = ['idx_user_sessions', 'idx_session_search', 'idx_session_messages'];

    for (const indexName of requiredIndexes) {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = ${indexName}
        );
      `;

      if (!result[0]?.exists) {
        issues.push(`Missing index: ${indexName}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('Schema verification failed:', error);
    return {
      isValid: false,
      issues: [`Schema verification error: ${error.message}`]
    };
  }
}

/**
 * Reset database to clean state (development only)
 * WARNING: This will delete all data
 * @returns {Promise<boolean>} True if reset was successful
 */
export async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }

  try {
    const prisma = getPrismaClient();

    // Delete all data in reverse dependency order
    await prisma.message.deleteMany();
    await prisma.session.deleteMany();

    console.log('Database reset completed successfully');
    return true;
  } catch (error) {
    console.error('Database reset failed:', error);
    return false;
  }
}
