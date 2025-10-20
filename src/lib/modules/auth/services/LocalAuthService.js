import { STORAGE_KEYS } from '$lib/shared/utils/constants.js';
import { user, isAuthenticated } from '../stores.js';
import { setLoading, setError, setNotification } from '$lib/stores/app.js';
import { IAuthService } from '../interfaces/IAuthService.js';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Local Authentication Service
 *
 * This class implements the IAuthService interface for local authentication.
 * It simulates authentication with hardcoded users for demonstration purposes.
 */
export class LocalAuthService extends IAuthService {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object|null>} - Promise that resolves with user data or null on failure
   */
  async login(email, password) {
    try {
      setLoading(true);

      // Check for demo users first
      if (email === 'AdminLogin' && password === 'AdminPswd') {
        const userData = {
          id: '1',
          name: 'Admin User',
          email: 'AdminLogin',
          type: 'admin'
        };

        user.set(userData);
        isAuthenticated.set(true);

        // Store in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-jwt-token-for-admin');

        if (typeof document !== 'undefined') {
          const cookieValue = encodeURIComponent(JSON.stringify(userData));
          document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        }

        setNotification('Logged in successfully', 'success');
        return userData;
      } else if (email === 'User1Login' && password === 'User1Pswd') {
        const userData = {
          id: '2',
          name: 'Demo User',
          email: 'User1Login',
          type: 'regular'
        };

        user.set(userData);
        isAuthenticated.set(true);

        // Store in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-jwt-token-for-demo1');

        if (typeof document !== 'undefined') {
          const cookieValue = encodeURIComponent(JSON.stringify(userData));
          document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        }

        setNotification('Logged in successfully', 'success');
        return userData;
      }

      // Try real user authentication
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Set user data in stores
      user.set(data.user);
      isAuthenticated.set(true);

      // Store in localStorage for persistence
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);

      setNotification('Logged in successfully', 'success');
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<object|null>} - Promise that resolves with user data or null on failure
   */
  async register(userData) {
    try {
      setLoading(true);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setNotification('Registration successful. Please log in.', 'success');
      return data.user;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to register. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Logout user
   * @returns {Promise<boolean>} - Promise that resolves when logout is complete
   */
  async logout() {
    try {
      setLoading(true);

      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Clear user data
      user.set(null);
      isAuthenticated.set(false);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);

      if (typeof document !== 'undefined') {
        document.cookie = `${STORAGE_KEYS.USER}=; path=/; max-age=0; SameSite=Lax`;
      }

      setNotification('Logged out successfully', 'info');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user data even if API call fails
      user.set(null);
      isAuthenticated.set(false);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      if (typeof document !== 'undefined') {
        document.cookie = `${STORAGE_KEYS.USER}=; path=/; max-age=0; SameSite=Lax`;
      }
      return true;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if user is authenticated
   */
  checkAuth() {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (storedUser && token) {
        try {
          const userData = JSON.parse(storedUser);
          user.set(userData);
          isAuthenticated.set(true);
          return true;
        } catch (e) {
          console.error('Failed to parse stored user data', e);
          this.logout();
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }
}
