import { writable } from 'svelte/store';

// User store
export const user = writable(null);

// Authentication status
export const isAuthenticated = writable(false);

// Mock login function (for demonstration)
export function login(email, password) {
  return new Promise((resolve, reject) => {
    // Simulate API call
    setTimeout(() => {
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        resolve(userData);
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
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
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
    localStorage.removeItem('user');
  }
}

// Check if user is already logged in from localStorage
export function checkAuth() {
  if (typeof localStorage !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        user.set(userData);
        isAuthenticated.set(true);
      } catch (e) {
        console.error('Failed to parse stored user data', e);
        logout();
      }
    }
  }
}