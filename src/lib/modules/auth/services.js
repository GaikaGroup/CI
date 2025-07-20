import { LocalAuthService } from './services/LocalAuthService';
import { container } from '$lib/shared/di/container';

// Create an instance of the LocalAuthService
const authService = new LocalAuthService();

// Register the auth service in the DI container
container.register('authService', authService);

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object|null>} - Promise that resolves with user data or null on failure
 */
export async function login(email, password) {
  return authService.login(email, password);
}

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Promise<object|null>} - Promise that resolves with user data or null on failure
 */
export async function register(userData) {
  return authService.register(userData);
}

/**
 * Logout user
 * @returns {Promise<boolean>} - Promise that resolves when logout is complete
 */
export async function logout() {
  return authService.logout();
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated
 */
export function checkAuth() {
  return authService.checkAuth();
}

// Export the auth service for direct use
export { authService };
