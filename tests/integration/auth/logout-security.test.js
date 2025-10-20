/**
 * Integration tests for logout security mechanism
 * Tests that logout properly clears session and redirects to login
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock browser environment
const mockLocalStorage = {
  data: {},
  getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
  setItem: vi.fn((key, value) => { mockLocalStorage.data[key] = value; }),
  removeItem: vi.fn((key) => { delete mockLocalStorage.data[key]; }),
  clear: vi.fn(() => { mockLocalStorage.data = {}; })
};

const mockDocument = {
  cookie: '',
  get cookie() { return this._cookie || ''; },
  set cookie(value) { this._cookie = value; }
};

const mockWindow = {
  location: {
    href: ''
  }
};

// Mock globals
global.localStorage = mockLocalStorage;
global.document = mockDocument;
global.window = mockWindow;

describe('Logout Security Tests', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockDocument.cookie = '';
    mockWindow.location.href = '';
  });

  it('should clear localStorage on logout', async () => {
    // Setup: simulate logged in user
    const { logout } = await import('../../../src/lib/modules/auth/stores.js');
    
    mockLocalStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test User' }));
    
    // Execute logout
    logout();
    
    // Verify localStorage is cleared
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });

  it('should clear cookies on logout', async () => {
    const { logout } = await import('../../../src/lib/modules/auth/stores.js');
    
    // Execute logout
    logout();
    
    // Verify cookie is cleared (max-age=0)
    expect(mockDocument.cookie).toContain('max-age=0');
  });

  it('should redirect to login page on logout', async () => {
    const { logout } = await import('../../../src/lib/modules/auth/stores.js');
    
    // Execute logout
    logout();
    
    // Verify redirect to login
    expect(mockWindow.location.href).toBe('/login');
  });

  it('should reset user stores on logout', async () => {
    const { logout, user, isAuthenticated } = await import('../../../src/lib/modules/auth/stores.js');
    const { get } = await import('svelte/store');
    
    // Execute logout
    logout();
    
    // Verify stores are reset
    expect(get(user)).toBeNull();
    expect(get(isAuthenticated)).toBe(false);
  });
});