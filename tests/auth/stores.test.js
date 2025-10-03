/* eslint-env node, jest */
import { get } from 'svelte/store';
import { login, logout, user, isAuthenticated } from '../../src/lib/modules/auth/stores.js';

describe('auth stores', () => {
  beforeEach(() => {
    logout();
  });

  test('logs in admin demo user', async () => {
    await login('Admin', 'Demo543');
    expect(get(isAuthenticated)).toBe(true);
    expect(get(user)).toEqual({
      id: '0',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin'
    });
  });
});
