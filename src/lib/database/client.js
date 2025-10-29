/**
 * Database Client Wrapper
 *
 * This module provides a properly configured Prisma client instance
 * with singleton pattern to prevent connection pool exhaustion
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple instances in dev mode
const globalForPrisma = globalThis;

// Create or reuse existing Prisma client
if (!globalForPrisma.__prisma) {
  globalForPrisma.__prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal',
    // Connection pool settings to prevent "too many clients"
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Handle graceful shutdown
  const cleanup = async () => {
    if (globalForPrisma.__prisma) {
      await globalForPrisma.__prisma.$disconnect();
      globalForPrisma.__prisma = null;
    }
  };

  if (typeof process !== 'undefined') {
    process.on('beforeExit', cleanup);
    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });
  }
}

const prisma = globalForPrisma.__prisma;

export { prisma };
export default prisma;
