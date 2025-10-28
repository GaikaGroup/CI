import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: [
      'node_modules/**',
      'build/**',
      'tests/e2e/**', // E2E tests run with Playwright
      'tests/manual/**', // Manual tests
      'tests/_disabled/**' // Disabled problematic tests
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'json-summary'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'build/**',
        '**/*.config.js',
        '**/*.config.ts',
        '.svelte-kit/**',
        'static/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    },
    testTimeout: 15000, // 15 seconds for e2e tests
    hookTimeout: 10000 // 10 seconds for setup/teardown
  },
  resolve: {
    alias: {
      $lib: new URL('./src/lib', import.meta.url).pathname,
      $modules: new URL('./src/lib/modules', import.meta.url).pathname,
      $shared: new URL('./src/lib/shared', import.meta.url).pathname,
      $routes: new URL('./src/routes', import.meta.url).pathname
    }
  }
});
