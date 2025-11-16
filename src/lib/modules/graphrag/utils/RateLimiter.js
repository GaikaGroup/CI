/**
 * Rate Limiter
 *
 * Implements rate limiting for GraphRAG operations to prevent abuse.
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> { operation -> [timestamps] }
    this.limits = {
      search: { max: 100, window: 60000 }, // 100 per minute
      embedding: { max: 1000, window: 3600000 } // 1000 per hour
    };

    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Check if request is within rate limit
   * @param {string} userId - User ID
   * @param {string} operation - Operation type ('search' or 'embedding')
   * @throws {Error} If rate limit exceeded
   */
  async checkLimit(userId, operation) {
    const limit = this.limits[operation];
    if (!limit) {
      throw new Error(`Unknown operation: ${operation}`);
    }

    const now = Date.now();

    // Initialize user tracking
    if (!this.requests.has(userId)) {
      this.requests.set(userId, {});
    }

    const userRequests = this.requests.get(userId);

    // Initialize operation tracking
    if (!userRequests[operation]) {
      userRequests[operation] = [];
    }

    const operationRequests = userRequests[operation];

    // Remove old requests outside window
    const validRequests = operationRequests.filter((t) => now - t < limit.window);

    // Check if limit exceeded
    if (validRequests.length >= limit.max) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + limit.window;
      const waitTime = Math.ceil((resetTime - now) / 1000);

      throw new Error(
        `Rate limit exceeded for ${operation}. ` +
          `Maximum ${limit.max} requests per ${limit.window / 1000} seconds. ` +
          `Try again in ${waitTime} seconds.`
      );
    }

    // Add current request
    validRequests.push(now);
    userRequests[operation] = validRequests;
  }

  /**
   * Get current usage for a user
   * @param {string} userId - User ID
   * @param {string} operation - Operation type
   * @returns {Object} Usage statistics
   */
  getUsage(userId, operation) {
    const limit = this.limits[operation];
    if (!limit) {
      return { count: 0, max: 0, remaining: 0 };
    }

    const now = Date.now();
    const userRequests = this.requests.get(userId)?.[operation] || [];
    const validRequests = userRequests.filter((t) => now - t < limit.window);

    return {
      count: validRequests.length,
      max: limit.max,
      remaining: limit.max - validRequests.length,
      window: limit.window / 1000 // in seconds
    };
  }

  /**
   * Reset limits for a user
   * @param {string} userId - User ID
   * @param {string} operation - Operation type (optional, resets all if not provided)
   */
  reset(userId, operation = null) {
    if (!this.requests.has(userId)) {
      return;
    }

    if (operation) {
      const userRequests = this.requests.get(userId);
      delete userRequests[operation];
    } else {
      this.requests.delete(userId);
    }
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();

    for (const [userId, userRequests] of this.requests.entries()) {
      for (const [operation, timestamps] of Object.entries(userRequests)) {
        const limit = this.limits[operation];
        if (limit) {
          const validRequests = timestamps.filter((t) => now - t < limit.window);
          if (validRequests.length === 0) {
            delete userRequests[operation];
          } else {
            userRequests[operation] = validRequests;
          }
        }
      }

      // Remove user if no operations tracked
      if (Object.keys(userRequests).length === 0) {
        this.requests.delete(userId);
      }
    }
  }

  /**
   * Get all limits configuration
   * @returns {Object} Limits configuration
   */
  getLimits() {
    return { ...this.limits };
  }

  /**
   * Update limit for an operation
   * @param {string} operation - Operation type
   * @param {number} max - Maximum requests
   * @param {number} window - Time window in ms
   */
  setLimit(operation, max, window) {
    this.limits[operation] = { max, window };
  }

  /**
   * Destroy rate limiter and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Singleton instance
let rateLimiterInstance = null;

/**
 * Get singleton rate limiter instance
 * @returns {RateLimiter} Rate limiter instance
 */
export function getRateLimiter() {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}
