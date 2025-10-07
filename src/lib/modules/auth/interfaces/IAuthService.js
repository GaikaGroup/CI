export class IAuthService {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object|null>} - Promise that resolves with user data or null on failure
   */
  async login(email, password) {
    throw new Error('Not implemented');
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<object|null>} - Promise that resolves with user data or null on failure
   */
  async register(userData) {
    throw new Error('Not implemented');
  }

  /**
   * Logout user
   * @returns {Promise<boolean>} - Promise that resolves when logout is complete
   */
  async logout() {
    throw new Error('Not implemented');
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if user is authenticated
   */
  checkAuth() {
    throw new Error('Not implemented');
  }
}
