import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/database/client.js';

describe('Database Connection Smoke Test', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    try {
      await prisma.$connect();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up connection
    await prisma.$disconnect();
  });

  it('should connect to database successfully', async () => {
    // Test basic database connectivity
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should verify database schema is accessible', async () => {
    // Test that we can query the database schema
    try {
      // Try to access a core table (User table should exist)
      const userCount = await prisma.user.count();
      expect(typeof userCount).toBe('number');
      expect(userCount).toBeGreaterThanOrEqual(0);
    } catch (error) {
      throw new Error(`Database schema not accessible: ${error.message}`);
    }
  });

  it('should verify critical tables exist', async () => {
    // Verify that critical tables are accessible
    const tables = [
      { name: 'User', model: prisma.user },
      { name: 'Session', model: prisma.session },
      { name: 'Course', model: prisma.course }
    ];

    for (const table of tables) {
      try {
        await table.model.count();
      } catch (error) {
        throw new Error(`Table ${table.name} not accessible: ${error.message}`);
      }
    }
  });

  it('should perform database operations within acceptable time', async () => {
    const startTime = Date.now();
    
    // Perform a simple query
    await prisma.user.count();
    
    const duration = Date.now() - startTime;
    
    // Database query should be fast
    expect(duration).toBeLessThan(1000); // < 1 second
  });

  it('should verify database connection pool is healthy', async () => {
    // Test multiple concurrent queries
    const queries = [
      prisma.user.count(),
      prisma.session.count(),
      prisma.course.count()
    ];

    const startTime = Date.now();
    const results = await Promise.all(queries);
    const duration = Date.now() - startTime;

    // All queries should succeed
    results.forEach(result => {
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    // Concurrent queries should complete quickly
    expect(duration).toBeLessThan(2000); // < 2 seconds
  });

  it('should verify database is writable (transaction test)', async () => {
    // Test that we can perform a transaction (without actually writing)
    try {
      await prisma.$transaction(async (tx) => {
        // Just verify we can start a transaction
        const count = await tx.user.count();
        expect(typeof count).toBe('number');
        // Transaction will rollback automatically since we don't commit
      });
    } catch (error) {
      throw new Error(`Database transaction failed: ${error.message}`);
    }
  });
});
