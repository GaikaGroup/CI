/**
 * Database configuration for AI Tutor Sessions
 * Centralizes database-related environment variables and settings
 */

// Use process.env directly for compatibility with both SvelteKit and Node.js
const env = process.env;

/**
 * Database configuration object
 * Loads settings from environment variables with sensible defaults
 */
export const dbConfig = {
  // Connection settings
  url: env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_tutor_sessions',
  host: env.DATABASE_HOST || 'localhost',
  port: parseInt(env.DATABASE_PORT || '5432'),
  name: env.DATABASE_NAME || 'ai_tutor_sessions',
  user: env.DATABASE_USER || 'postgres',
  password: env.DATABASE_PASSWORD || 'postgres',
  ssl: env.DATABASE_SSL === 'true',

  // Connection pool settings
  pool: {
    min: parseInt(env.DATABASE_POOL_MIN || '2'),
    max: parseInt(env.DATABASE_POOL_MAX || '10'),
    timeout: parseInt(env.DATABASE_TIMEOUT || '30000'),
  },

  // Session-specific settings
  session: {
    secret: env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production',
    timeout: parseInt(env.SESSION_TIMEOUT || '86400000'), // 24 hours
    maxMessages: parseInt(env.SESSION_MAX_MESSAGES || '1000'),
    cleanupInterval: parseInt(env.SESSION_CLEANUP_INTERVAL || '3600000'), // 1 hour
    archiveAfterDays: parseInt(env.SESSION_ARCHIVE_AFTER_DAYS || '90'),
  },

  // Security settings
  security: {
    jwtSecret: env.JWT_SECRET || 'your-jwt-secret-key-change-this-in-production',
    jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS || '12'),
  },

  // Rate limiting
  rateLimit: {
    window: parseInt(env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100'),
    sessionCreate: parseInt(env.RATE_LIMIT_SESSION_CREATE || '10'),
    messageSend: parseInt(env.RATE_LIMIT_MESSAGE_SEND || '60'),
  },
};

/**
 * Validate database configuration
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateConfig() {
  const errors = [];

  // Check required environment variables
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  if (!env.SESSION_SECRET || env.SESSION_SECRET === 'your-super-secret-session-key-change-this-in-production') {
    errors.push('SESSION_SECRET must be set to a secure value');
  }

  if (!env.JWT_SECRET || env.JWT_SECRET === 'your-jwt-secret-key-change-this-in-production') {
    errors.push('JWT_SECRET must be set to a secure value');
  }

  // Validate numeric values
  if (dbConfig.pool.min < 1) {
    errors.push('DATABASE_POOL_MIN must be at least 1');
  }

  if (dbConfig.pool.max < dbConfig.pool.min) {
    errors.push('DATABASE_POOL_MAX must be greater than DATABASE_POOL_MIN');
  }

  if (dbConfig.session.timeout < 60000) {
    errors.push('SESSION_TIMEOUT must be at least 60000ms (1 minute)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get database connection string for different environments
 * @param {string} env - Environment name (development, test, production)
 * @returns {string} Database connection string
 */
export function getConnectionString(environment = 'development') {
  if (environment === 'test') {
    return env.TEST_DATABASE_URL || dbConfig.url.replace(dbConfig.name, `${dbConfig.name}_test`);
  }
  
  return dbConfig.url;
}