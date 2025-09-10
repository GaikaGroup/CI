import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  setItem: vi.fn(),
  getItem: vi.fn(),
  removeItem: vi.fn()
});

vi.mock('$lib/stores/app', () => ({
  setLoading: vi.fn(),
  setError: vi.fn(),
  setNotification: vi.fn()
}));

vi.mock('$lib/modules/auth/stores', () => {
  const { writable } = require('svelte/store');
  return { user: writable(null), isAuthenticated: writable(false) };
});

import { LocalAuthService } from '$lib/modules/auth/services/LocalAuthService';

describe('LocalAuthService login', () => {
  it('logs in with valid credentials', async () => {
    const svc = new LocalAuthService();
    const res = await svc.login('admin@example.com', 'password');
    expect(res.email).toBe('admin@example.com');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('logs in with ADMIN predefined credentials', async () => {
    const svc = new LocalAuthService();
    const res = await svc.login('ADMIN', 'Demo543');
    expect(res.role).toBe('admin');
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('fails with invalid credentials', async () => {
    const svc = new LocalAuthService();
    const res = await svc.login('bad', 'creds');
    expect(res).toBeNull();
  });
});
