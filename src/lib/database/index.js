/**
 * Database module exports for AI Tutor Sessions
 * Provides centralized access to all database utilities
 */

// Core database connection
export { getPrismaClient, testConnection, disconnect, db } from './connection.js';

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
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const { PrismaClient } = require(join(process.cwd(), 'src/generated/prisma/index.js'));
export { PrismaClient };