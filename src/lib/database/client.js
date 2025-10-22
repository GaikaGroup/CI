/**
 * Database Client Wrapper
 *
 * This module provides a properly configured Prisma client instance
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import Prisma client using require for CommonJS compatibility
const { PrismaClient } = require('../../generated/prisma/index.js');

// Create and configure Prisma client instance
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty'
});

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });

  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

export { prisma };
export default prisma;
