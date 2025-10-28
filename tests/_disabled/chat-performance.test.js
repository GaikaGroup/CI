import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as chatHandler } from '../../../src/routes/api/chat/+server.js';
import { prisma } from '../../../src/lib/database/client.js';
import { initializeLLMModule } from '../../../src/lib/modules/llm/index.js';

describe('Chat API Performance Tests', () => {
  let testUserId;
  let testSessionId;

  beforeAll(async () => {
    // Initialize LLM module
    initializeLLMModule();

    await prisma.$connect();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        firstName: 'Performance',
        lastName: 'Test User',
        type: 'student'
      }
    });
    testUserId = testUser.id;

    // Create test session
    const testSession = await prisma.session.create({
      data: {
        userId: testUserId,
        title: 'Performance Test Session',
        mode: 'fun',
        language: 'en',
        preview: 'Performance test'
      }
    });
    testSessionId = testSession.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testSessionId) {
      try {
        await prisma.session.delete({ where: { id: testSessionId } });
      } catch (error) {
        console.log('Session cleanup error:', error.message);
      }
    }

    if (testUserId) {
      try {
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (error) {
        console.log('User cleanup error:', error.message);
      }
    }

    await prisma.$disconnect();
  });

  describe('Response Time Benchmarks', () => {
    it('should process simple requests within acceptable time', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: async () => ({
          message: 'Hello',
          sessionId: testSessionId,
          language: 'en'
        })
      };

      const startTime = performance.now();
      const response = await chatHandler({ request, locals: mockLocals });
      const endTime = performance.now();
      const duration = endTime - startTime;

      const data = await response.json();

      // Response should complete (including API call)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Log performance metrics
      console.log(`\n📊 Performance Metrics:`);
      console.log(`   Response Time: ${duration.toFixed(2)}ms`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${data.success}`);

      // Performance assertion: should complete within reasonable time
      // Note: This includes actual API call to OpenAI, so we allow generous time
      expect(duration).toBeLessThan(30000); // 30 seconds max
    }, 35000); // 35 second timeout

    it('should handle validation errors quickly', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const request = {
        json: async () => ({
          // Missing required fields
          sessionId: testSessionId
        })
      };

      const startTime = performance.now();
      const response = await chatHandler({ request, locals: mockLocals });
      const endTime = performance.now();
      const duration = endTime - startTime;

      const data = await response.json();

      // Validation should be fast
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);

      console.log(`\n📊 Validation Performance:`);
      console.log(`   Response Time: ${duration.toFixed(2)}ms`);
      console.log(`   Status: ${response.status}`);

      // Validation should be very fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle authentication checks quickly', async () => {
      const request = {
        json: async () => ({
          message: 'Hello',
          sessionId: testSessionId
        })
      };

      const startTime = performance.now();
      const response = await chatHandler({ request, locals: {} });
      const endTime = performance.now();
      const duration = endTime - startTime;

      const data = await response.json();

      // Auth check should be fast
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);

      console.log(`\n📊 Authentication Performance:`);
      console.log(`   Response Time: ${duration.toFixed(2)}ms`);
      console.log(`   Status: ${response.status}`);

      // Auth check should be very fast (< 50ms)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory across multiple requests', async () => {
      const mockLocals = {
        user: { id: testUserId, type: 'student' }
      };

      const initialMemory = process.memoryUsage().heapUsed;

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const request = {
          json: async () => ({
            message: `Test message ${i}`,
            sessionId: testSessionId,
            language: 'en'
          })
        };

        const response = await chatHandler({ request, locals: mockLocals });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`\n📊 Memory Usage:`);
      console.log(`   Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be reasonable (< 50MB for 5 requests)
      expect(memoryIncreaseMB).toBeLessThan(50);
    }, 180000); // 3 minute timeout for multiple API calls
  });
});
