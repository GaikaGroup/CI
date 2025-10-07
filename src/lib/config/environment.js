/**
 * Environment configuration utility
 * Loads environment variables with proper defaults and validation
 */

import { dev } from '$app/environment';

/**
 * Get environment variable with optional default value
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Environment variable value
 */
function getEnvVar(key, defaultValue = '') {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
}

/**
 * Get boolean environment variable
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default boolean value
 * @returns {boolean} Boolean value
 */
function getBooleanEnvVar(key, defaultValue = false) {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
}

/**
 * Get numeric environment variable
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default numeric value
 * @returns {number} Numeric value
 */
function getNumericEnvVar(key, defaultValue = 0) {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Database configuration
 */
export const databaseConfig = {
  url: getEnvVar('DATABASE_URL', 'postgresql://localhost:5432/ai_tutor_sessions'),
  host: getEnvVar('DATABASE_HOST', 'localhost'),
  port: getNumericEnvVar('DATABASE_PORT', 5432),
  name: getEnvVar('DATABASE_NAME', 'ai_tutor_sessions'),
  user: getEnvVar('DATABASE_USER', 'postgres'),
  password: getEnvVar('DATABASE_PASSWORD', ''),
  ssl: getBooleanEnvVar('DATABASE_SSL', false),
  pool: {
    min: getNumericEnvVar('DATABASE_POOL_MIN', 2),
    max: getNumericEnvVar('DATABASE_POOL_MAX', 10)
  },
  timeout: getNumericEnvVar('DATABASE_TIMEOUT', 30000)
};

/**
 * Session configuration
 */
export const sessionConfig = {
  secret: getEnvVar('SESSION_SECRET', 'default-session-secret-change-in-production'),
  timeout: getNumericEnvVar('SESSION_TIMEOUT', 86400000), // 24 hours
  maxMessages: getNumericEnvVar('SESSION_MAX_MESSAGES', 1000),
  cleanupInterval: getNumericEnvVar('SESSION_CLEANUP_INTERVAL', 3600000), // 1 hour
  archiveAfterDays: getNumericEnvVar('SESSION_ARCHIVE_AFTER_DAYS', 90)
};

/**
 * Security configuration
 */
export const securityConfig = {
  jwtSecret: getEnvVar('JWT_SECRET', 'default-jwt-secret-change-in-production'),
  jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '24h'),
  bcryptRounds: getNumericEnvVar('BCRYPT_ROUNDS', 12),
  rateLimit: {
    window: getNumericEnvVar('RATE_LIMIT_WINDOW', 900000), // 15 minutes
    maxRequests: getNumericEnvVar('RATE_LIMIT_MAX_REQUESTS', 100),
    sessionCreate: getNumericEnvVar('RATE_LIMIT_SESSION_CREATE', 10),
    messageSend: getNumericEnvVar('RATE_LIMIT_MESSAGE_SEND', 60)
  }
};

/**
 * CORS and API configuration
 */
export const apiConfig = {
  corsOrigin: getEnvVar('CORS_ORIGIN', dev ? 'http://localhost:5173' : 'https://ai-tutor.com'),
  corsCredentials: getBooleanEnvVar('CORS_CREDENTIALS', true),
  baseUrl: getEnvVar(
    'API_BASE_URL',
    dev ? 'http://localhost:5173/api' : 'https://ai-tutor.com/api'
  ),
  timeout: getNumericEnvVar('API_TIMEOUT', 30000),
  maxPayloadSize: getEnvVar('API_MAX_PAYLOAD_SIZE', '10mb'),
  enableCompression: getBooleanEnvVar('API_ENABLE_COMPRESSION', !dev)
};

/**
 * Application configuration
 */
export const appConfig = {
  nodeEnv: getEnvVar('NODE_ENV', dev ? 'development' : 'production'),
  port: getNumericEnvVar('PORT', 3000),
  host: getEnvVar('HOST', '0.0.0.0'),
  logLevel: getEnvVar('LOG_LEVEL', dev ? 'debug' : 'info'),
  enableRequestLogging: getBooleanEnvVar('ENABLE_REQUEST_LOGGING', dev),
  isDevelopment: dev,
  isProduction: !dev
};

/**
 * Feature flags
 */
export const featureFlags = {
  enableDebugMode: getBooleanEnvVar('ENABLE_DEBUG_MODE', dev),
  enablePerformanceMonitoring: getBooleanEnvVar('ENABLE_PERFORMANCE_MONITORING', !dev),
  enableErrorTracking: getBooleanEnvVar('ENABLE_ERROR_TRACKING', !dev),
  enableHealthChecks: getBooleanEnvVar('ENABLE_HEALTH_CHECKS', !dev),
  enableMetricsCollection: getBooleanEnvVar('ENABLE_METRICS_COLLECTION', !dev),
  enableHelmet: getBooleanEnvVar('ENABLE_HELMET', !dev),
  enableCsrfProtection: getBooleanEnvVar('ENABLE_CSRF_PROTECTION', !dev),
  enableXssProtection: getBooleanEnvVar('ENABLE_XSS_PROTECTION', !dev)
};

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing
 */
export function validateEnvironment() {
  const requiredVars = [];

  if (!dev) {
    // Production-only required variables
    if (!getEnvVar('DATABASE_URL')) requiredVars.push('DATABASE_URL');
    if (sessionConfig.secret === 'default-session-secret-change-in-production') {
      requiredVars.push('SESSION_SECRET');
    }
    if (securityConfig.jwtSecret === 'default-jwt-secret-change-in-production') {
      requiredVars.push('JWT_SECRET');
    }
  }

  if (requiredVars.length > 0) {
    throw new Error(`Missing required environment variables: ${requiredVars.join(', ')}`);
  }
}

/**
 * Get all configuration as a single object
 */
export const config = {
  database: databaseConfig,
  session: sessionConfig,
  security: securityConfig,
  api: apiConfig,
  app: appConfig,
  features: featureFlags
};

export default config;
