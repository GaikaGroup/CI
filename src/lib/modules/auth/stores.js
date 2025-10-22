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

  try {
    user.set(normalizedUser);
    isAuthenticated.set(true);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalizedUser));
    }

    if (typeof document !== 'undefined') {
      const cookieValue = encodeURIComponent(JSON.stringify(normalizedUser));
      document.cookie = `${STORAGE_KEYS.USER}=${cookieValue}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  } catch (error) {
    console.error('Error persisting user session:', error);
  }
}

// Real login function using API
export async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.success && data.user) {
      persistUserSession(data.user);
      return data.user;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
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

  // Redirect to login page after logout
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
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

          // Clear old data with 'role' field - force re-login
          if (userData.role) {
            console.log('[Auth] Found old data with role field, clearing localStorage');
            localStorage.removeItem(STORAGE_KEYS.USER);
            resolve(null);
            return;
          }

          persistUserSession(userData);
          resolve(userData);
        } catch (e) {
          console.error('Failed to parse stored user data', e);
          // Clear invalid data and logout
          localStorage.removeItem(STORAGE_KEYS.USER);
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
