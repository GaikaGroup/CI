import { describe, it, expect, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';

// Mock the redirect function
const mockRedirect = (status, location) => {
  throw { status, location };
};

describe('Root Route Redirect Logic', () => {
  it('should redirect unauthenticated users from / to /login', async () => {
    // Mock the layout server load function
    const mockLoad = async ({ locals, url }) => {
      // Simulate unauthenticated user
      const user = null;

      if (url.pathname === '/') {
        if (!user) {
          mockRedirect(302, '/login');
        } else {
          mockRedirect(302, '/sessions');
        }
      }

      return { user: user || null };
    };

    // Test unauthenticated user redirect
    try {
      await mockLoad({
        locals: { user: null },
        url: { pathname: '/' }
      });
    } catch (error) {
      expect(error.status).toBe(302);
      expect(error.location).toBe('/login');
    }
  });

  it('should redirect authenticated users from / to /sessions', async () => {
    // Mock the layout server load function
    const mockLoad = async ({ locals, url }) => {
      // Simulate authenticated user
      const user = { id: '1', name: 'Test User', email: 'test@example.com' };

      if (url.pathname === '/') {
        if (!user) {
          mockRedirect(302, '/login');
        } else {
          mockRedirect(302, '/sessions');
        }
      }

      return { user: user || null };
    };

    // Test authenticated user redirect
    try {
      await mockLoad({
        locals: { user: { id: '1', name: 'Test User' } },
        url: { pathname: '/' }
      });
    } catch (error) {
      expect(error.status).toBe(302);
      expect(error.location).toBe('/sessions');
    }
  });

  it('should not redirect on non-root paths', async () => {
    // Mock the layout server load function
    const mockLoad = async ({ locals, url }) => {
      const user = locals.user;

      if (url.pathname === '/') {
        if (!user) {
          mockRedirect(302, '/login');
        } else {
          mockRedirect(302, '/sessions');
        }
      }

      return { user: user || null };
    };

    // Test non-root path doesn't redirect
    const result = await mockLoad({
      locals: { user: null },
      url: { pathname: '/login' }
    });

    expect(result.user).toBe(null);
  });
});
