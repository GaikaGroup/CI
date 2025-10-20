/**
 * Admin utility functions for role checking and authorization
 */

/**
 * Check if a user has admin role
 * @param {Object} user - User object from authentication
 * @returns {boolean} True if user is admin
 */
export function isAdmin(user) {
  return Boolean(user && user.type === 'admin');
}

/**
 * Check if a user has admin role and throw error if not
 * @param {Object} user - User object from authentication
 * @throws {Error} If user is not admin
 */
export function requireAdmin(user) {
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
}

/**
 * Check if a user can access hidden sessions
 * @param {Object} user - User object from authentication
 * @returns {boolean} True if user can access hidden sessions
 */
export function canAccessHiddenSessions(user) {
  return isAdmin(user);
}

/**
 * Check if a user can restore sessions
 * @param {Object} user - User object from authentication
 * @returns {boolean} True if user can restore sessions
 */
export function canRestoreSessions(user) {
  return isAdmin(user);
}

/**
 * Get admin permissions for a user
 * @param {Object} user - User object from authentication
 * @returns {Object} Admin permissions object
 */
export function getAdminPermissions(user) {
  const admin = isAdmin(user);

  return {
    isAdmin: admin,
    canViewHiddenSessions: admin,
    canRestoreSessions: admin,
    canHardDeleteSessions: admin,
    canViewAllUsers: admin,
    canManageUsers: admin
  };
}
