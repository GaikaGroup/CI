import { writable } from 'svelte/store';

// Application-wide state
export const appLoading = writable(false);
export const appError = writable(null);
export const appNotification = writable(null);

// Set loading state
export function setLoading(isLoading) {
  appLoading.set(isLoading);
}

// Set error
export function setError(error) {
  appError.set(error);

  // Auto-clear error after 5 seconds
  if (error) {
    setTimeout(() => {
      appError.set(null);
    }, 5000);
  }
}

// Set notification
export function setNotification(message, type = 'info') {
  appNotification.set({ message, type });

  // Auto-clear notification after 3 seconds
  if (message) {
    setTimeout(() => {
      appNotification.set(null);
    }, 3000);
  }
}

// Clear notification
export function clearNotification() {
  appNotification.set(null);
}

// Clear error
export function clearError() {
  appError.set(null);
}
