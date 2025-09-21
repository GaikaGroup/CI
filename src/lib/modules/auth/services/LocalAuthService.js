import { STORAGE_KEYS } from '$shared/utils/constants';
import { user, isAuthenticated } from '../stores';
import { setLoading, setError, setNotification } from '$lib/stores/app';
import { IAuthService } from '../interfaces/IAuthService';

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

      // In a real implementation, this would be an API call
      // const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ email, password })
      // });

      // if (!response.ok) {
      //   throw new Error('Invalid credentials');
      // }

      // const data = await response.json();
      // user.set(data.user);
      // isAuthenticated.set(true);
      // localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
      // localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      // Simulate API call for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate login for demo users
      if (email === 'admin@example.com' && password === 'password') {
        const userData = {
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin'
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
      } else if (email === 'student@example.com' && password === 'password') {
        const userData = {
          id: 2,
          name: 'Student User',
          email: 'student@example.com',
          role: 'student'
        };

        user.set(userData);
        isAuthenticated.set(true);

        // Store in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-jwt-token-for-student');

        if (typeof document !== 'undefined') {
          const cookieValue = encodeURIComponent(JSON.stringify(userData));
          document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        }

        setNotification('Logged in successfully', 'success');
        return userData;
      } else if (email === 'student1@example.com' && password === 'Demo123') {
        const userData = {
          id: 3,
          name: 'Student One',
          email: 'student1@example.com',
          role: 'student'
        };

        user.set(userData);
        isAuthenticated.set(true);

        // Store in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-jwt-token-for-student1');

        if (typeof document !== 'undefined') {
          const cookieValue = encodeURIComponent(JSON.stringify(userData));
          document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        }

        setNotification('Logged in successfully', 'success');
        return userData;
      } else if (email === 'student2@example.com' && password === 'Demo321') {
        const userData = {
          id: 4,
          name: 'Student Two',
          email: 'student2@example.com',
          role: 'student'
        };

        user.set(userData);
        isAuthenticated.set(true);

        // Store in localStorage for persistence
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'mock-jwt-token-for-student2');

        if (typeof document !== 'undefined') {
          const cookieValue = encodeURIComponent(JSON.stringify(userData));
          document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        }

        setNotification('Logged in successfully', 'success');
        return userData;
      } else {
        throw new Error('Invalid credentials');
      }
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

      // In a real implementation, this would be an API call
      // const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(userData)
      // });

      // if (!response.ok) {
      //   throw new Error('Registration failed');
      // }

      // const data = await response.json();
      // setNotification('Registration successful. Please log in.', 'success');
      // return data.user;

      // Simulate API call for demonstration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate successful registration
      setNotification('Registration successful. Please log in.', 'success');
      return {
        id: 3,
        name: userData.name,
        email: userData.email,
        role: 'student'
      };
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

      // In a real implementation, this would be an API call
      // const response = await fetch(API_ENDPOINTS.AUTH.LOGOUT, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`
      //   }
      // });

      // Clear user data regardless of API response
      user.set(null);
      isAuthenticated.set(false);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);

      if (typeof document !== 'undefined') {
        document.cookie = `${STORAGE_KEYS.USER}=; path=/; max-age=0; SameSite=Lax`;
      }

      // Simulate API call for demonstration
      await new Promise((resolve) => setTimeout(resolve, 500));

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
