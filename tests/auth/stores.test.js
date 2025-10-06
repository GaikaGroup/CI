/* eslint-env node, jest */
import { get } from 'svelte/store';
import { login, logout, user, isAuthenticated } from '../../src/lib/modules/auth/stores.js';

describe('auth stores', () => {
  beforeEach(() => {
    logout();
  });

  test('logs in admin user', async () => {
    await login('AdminLogin', 'AdminPswd');
    expect(get(isAuthenticated)).toBe(true);
    expect(get(user)).toEqual({
      id: '1',
      name: 'Admin User',
      email: 'AdminLogin',
      role: 'admin'
    });
  });
});
