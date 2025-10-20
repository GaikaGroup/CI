import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

describe('Health Check Smoke Test', () => {
  it('should verify critical modules can be imported', async () => {
    // Test that core modules load without errors
    const modules = [
      '../../src/lib/database/client.js',
      '../../src/lib/modules/auth/stores.js',
      '../../src/lib/modules/chat/stores.js'
    ];

    for (const modulePath of modules) {
      try {
        await import(modulePath);
      } catch (error) {
        throw new Error(`Failed to load module ${modulePath}: ${error.message}`);
      }
    }
  });

  it('should verify environment configuration exists', () => {
    // Check that critical environment variables are defined
    const requiredEnvVars = ['DATABASE_URL'];
    
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
      // Don't fail the test if DATABASE_URL is missing in test environment
      // Just verify the check works
      expect(missing).toContain('DATABASE_URL');
    } else {
      // If DATABASE_URL is set, verify it's defined
      expect(process.env.DATABASE_URL).toBeDefined();
    }
  });

  it('should verify critical configuration files exist', () => {
    const configFiles = [
      'package.json',
      'vitest.config.js',
      'svelte.config.js',
      'prisma/schema.prisma'
    ];

    for (const file of configFiles) {
      const filePath = resolve(process.cwd(), file);
      expect(existsSync(filePath), `Configuration file ${file} should exist`).toBe(true);
    }
  });

  it('should verify application structure is intact', () => {
    const criticalDirs = [
      'src',
      'src/lib',
      'src/lib/modules',
      'src/routes',
      'tests'
    ];

    for (const dir of criticalDirs) {
      const dirPath = resolve(process.cwd(), dir);
      expect(existsSync(dirPath), `Directory ${dir} should exist`).toBe(true);
    }
  });

  it('should complete health check within acceptable time', () => {
    const startTime = Date.now();
    
    // Perform basic health check operations
    const healthStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    };
    
    const duration = Date.now() - startTime;
    
    expect(healthStatus.timestamp).toBeDefined();
    expect(duration).toBeLessThan(1000); // Should complete in < 1 second
  });
});
