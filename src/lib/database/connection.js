/**
 * Database connection utilities for AI Tutor Sessions
 * Provides centralized database connection management with Prisma
 */

import { createRequire } from 'module';
import { join } from 'path';

const require = createRequire(import.meta.url);

/**
 * Custom error for signaling that the database client cannot be used yet
 */
export class DatabaseNotReadyError extends Error {
  constructor(message, cause = undefined) {
    super(message);
    this.name = 'DatabaseNotReadyError';
    this.code = 'DATABASE_NOT_READY';
    this.cause = cause;
  }
}

let prismaModule;

function loadPrismaModule() {
  if (prismaModule) {
    return prismaModule;
  }

  try {
    prismaModule = require(join(process.cwd(), 'src/generated/prisma/index.js'));
    return prismaModule;
  } catch (error) {
    if (
      error?.code === 'MODULE_NOT_FOUND' ||
      error?.message?.includes('src/generated/prisma/index.js')
    ) {
      throw new DatabaseNotReadyError(
        'Prisma client has not been generated. Run "prisma generate" before starting the server.',
        error
      );
    }
    throw error;
  }
}

// Check if we're in development mode (works both in SvelteKit and Node.js)
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

// Global Prisma client instance
let prisma;

/**
 * Initialize and return the Prisma client instance
 * Uses singleton pattern to ensure single connection pool
 */
function createPrismaClient() {
  try {
    const { PrismaClient } = loadPrismaModule();
    const client = new PrismaClient({
      log: isDev ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
      errorFormat: 'pretty'
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
  } catch (error) {
    if (error instanceof DatabaseNotReadyError) {
      throw error;
    }

    if (error?.name === 'PrismaClientInitializationError') {
      throw new DatabaseNotReadyError(
        'Failed to initialize Prisma client. Ensure Postgres is running and Prisma has been generated.',
        error
      );
    }

    throw error;
  }
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
export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getPrismaClient();
      const value = client[prop];
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    }
  }
);

export function getPrismaConstructor() {
  const { PrismaClient } = loadPrismaModule();
  return PrismaClient;
}
