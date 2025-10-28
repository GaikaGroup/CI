import { describe, it, expect } from 'vitest';

describe('API Availability Smoke Test', () => {
  const criticalEndpoints = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/sessions', method: 'GET' },
    { path: '/api/courses', method: 'GET' },
    { path: '/api/chat', method: 'POST' }
  ];

  it('should verify critical API route handlers exist', async () => {
    // Test that API route files can be imported
    const apiRoutes = [
      '../../src/routes/api/auth/login/+server.js',
      '../../src/routes/api/sessions/+server.js',
      '../../src/routes/api/courses/+server.js',
      '../../src/routes/api/chat/+server.js'
    ];

    for (const route of apiRoutes) {
      try {
        const module = await import(route);
        expect(module).toBeDefined();

        // Verify at least one HTTP method handler exists
        const hasHandler = module.GET || module.POST || module.PUT || module.DELETE;
        expect(
          hasHandler,
          `Route ${route} should export at least one HTTP method handler`
        ).toBeDefined();
      } catch (error) {
        throw new Error(`Failed to load API route ${route}: ${error.message}`);
      }
    }
  });

  it('should verify API handlers have correct structure', async () => {
    // Import a sample API handler and verify its structure
    const { GET } = await import('../../src/routes/api/sessions/+server.js');

    expect(GET).toBeDefined();
    expect(typeof GET).toBe('function');

    // Verify function signature (should accept request context)
    expect(GET.length).toBeGreaterThan(0);
  });

  it('should verify authentication endpoints exist', async () => {
    const authEndpoints = [
      '../../src/routes/api/auth/login/+server.js',
      '../../src/routes/api/auth/logout/+server.js',
      '../../src/routes/api/auth/register/+server.js'
    ];

    for (const endpoint of authEndpoints) {
      try {
        const module = await import(endpoint);
        expect(module).toBeDefined();
      } catch (error) {
        throw new Error(`Authentication endpoint ${endpoint} not available: ${error.message}`);
      }
    }
  });

  it('should verify core service endpoints exist', async () => {
    const serviceEndpoints = [
      '../../src/routes/api/sessions/+server.js',
      '../../src/routes/api/courses/+server.js',
      '../../src/routes/api/enrollments/+server.js'
    ];

    for (const endpoint of serviceEndpoints) {
      try {
        const module = await import(endpoint);
        expect(module).toBeDefined();
      } catch (error) {
        throw new Error(`Service endpoint ${endpoint} not available: ${error.message}`);
      }
    }
  });

  it('should verify API endpoints load within acceptable time', async () => {
    const startTime = Date.now();

    // Load multiple endpoints
    await Promise.all([
      import('../../src/routes/api/sessions/+server.js'),
      import('../../src/routes/api/courses/+server.js'),
      import('../../src/routes/api/chat/+server.js')
    ]);

    const duration = Date.now() - startTime;

    // All endpoints should load quickly
    expect(duration).toBeLessThan(2000); // < 2 seconds
  });
});
