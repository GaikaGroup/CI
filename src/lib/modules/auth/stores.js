import { writable } from 'svelte/store';
import { STORAGE_KEYS } from '$shared/utils/constants';

// User store
export const user = writable(null);

// Authentication status
export const isAuthenticated = writable(false);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function normalizeUserData(userData) {
  if (!userData || typeof userData !== 'object') {
    return userData;
  }

  if (userData.id != null && typeof userData.id !== 'string') {
    return {
      ...userData,
      id: String(userData.id)
    };
  }

  return userData;
}

function persistUserSession(userData) {
  const normalizedUser = normalizeUserData(userData);

  user.set(normalizedUser);
  isAuthenticated.set(true);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalizedUser));
  }

  if (typeof document !== 'undefined') {
    const cookieValue = encodeURIComponent(JSON.stringify(normalizedUser));
    document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }
}

// Mock login function (for demonstration)
export function login(email, password) {
  return new Promise((resolve, reject) => {
    // Simulate API call
    setTimeout(() => {
      if (email === 'AdminLogin' && password === 'AdminPswd') {
        const userData = {
          id: '1',
          name: 'Admin User',
          email: 'AdminLogin',
          role: 'admin'
        };

        persistUserSession(userData);
        resolve(userData);
      } else if (email === 'User1Login' && password === 'User1Pswd') {
        const userData = {
          id: '2',
          name: 'Demo User',
          email: 'User1Login',
          role: 'student'
        };

        persistUserSession(userData);
        resolve(userData);
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 500);
  });
}

// Logout function
export function logout() {
  user.set(null);
  isAuthenticated.set(false);

  // Remove from localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${STORAGE_KEYS.USER}=; path=/; max-age=0; SameSite=Lax`;
  }
}

// Check if user is already logged in from localStorage
export function checkAuth() {
  return new Promise((resolve) => {
    if (typeof localStorage !== 'undefined') {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          persistUserSession(userData);
          resolve(userData);
        } catch (e) {
          console.error('Failed to parse stored user data', e);
          logout();
          resolve(null);
        }
      } else {
        resolve(null);
      }
    } else {
      resolve(null);
    }
  });
}
