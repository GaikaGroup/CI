/**
 * Database module exports for AI Tutor Sessions
 * Provides centralized access to all database utilities
 */

// Core database connection
export {
  getPrismaClient,
  testConnection,
  disconnect,
  db,
  DatabaseNotReadyError,
  getPrismaConstructor,
} from './connection.js';

// Configuration management
export { dbConfig, validateConfig, getConnectionString } from './config.js';

// Migration utilities
export { 
  isDatabaseCurrent, 
  getMigrationStatus, 
  verifySchema, 
  resetDatabase 
} from './migrations.js';

// Re-export Prisma client types for convenience
import { getPrismaConstructor } from './connection.js';

let PrismaClientExport;

try {
  PrismaClientExport = getPrismaConstructor();
} catch (error) {
  if (error?.code === 'DATABASE_NOT_READY') {
    PrismaClientExport = class PrismaClientUnavailable {
      constructor() {
        throw error;
      }
    };
  } else {
    throw error;
  }
}

export { PrismaClientExport as PrismaClient };
