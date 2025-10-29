/**
 * Database Client Wrapper
 *
 * This module provides a properly configured Prisma client instance
 * with singleton pattern to prevent connection pool exhaustion
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Create client lazily - only when first accessed
function createPrismaClient() {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'minimal'
    });

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
  }

  return globalForPrisma.__prisma;
}

// Export as getter to delay initialization
export const prisma = new Proxy(
  {},
  {
    get(target, prop) {
      const client = createPrismaClient();
      return client[prop];
    }
  }
);

export default prisma;
