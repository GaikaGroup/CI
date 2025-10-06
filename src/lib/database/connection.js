/**
 * Database connection utilities for AI Tutor Sessions
 * Provides centralized database connection management with Prisma
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const { PrismaClient } = require(join(process.cwd(), 'src/generated/prisma/index.js'));

// Check if we're in development mode (works both in SvelteKit and Node.js)
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

// Global Prisma client instance
let prisma;

/**
 * Initialize and return the Prisma client instance
 * Uses singleton pattern to ensure single connection pool
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    errorFormat: 'pretty',
  });

  // Handle graceful shutdown
  if (typeof window === 'undefined') {
    process.on('beforeExit', async () => {
      await client.$disconnect();
    });

    process.on('SIGINT', async () => {
      await client.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await client.$disconnect();
      process.exit(0);
    });
  }

  return client;
}

/**
 * Get the global Prisma client instance
 * Creates a new instance if one doesn't exist
 */
export function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
export async function testConnection() {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Disconnect from database
 * Should be called during application shutdown
 */
export async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Export the client instance for direct use
export const db = getPrismaClient();