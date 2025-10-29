/**
 * Database Client Wrapper
 *
 * This module provides a properly configured Prisma client instance
 * with singleton pattern to prevent connection pool exhaustion
 */

import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple instances in dev mode
const globalForPrisma = globalThis;

// Lazy initialization - only create client when actually used
export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'minimal'
  });

// Store in global for dev hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  const cleanup = async () => {
    if (globalForPrisma.__prisma) {
      await globalForPrisma.__prisma.$disconnect();
      globalForPrisma.__prisma = null;
    }
  };

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

export default prisma;
