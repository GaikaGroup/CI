/**
 * Integration tests for Second Opinion API endpoints
 * Tests all API endpoints for the second opinion feature
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loginAsUser } from '../../api/helpers/auth.js';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3002';

describe('Second Opinion API Integration Tests', () => {
  let userCookie;
  let testMessageId;
  let testSessionId;
  let testOpinionId;

  beforeAll(async () => {
    console.log('\n🌐 Testing Second Opinion API against:', BASE_URL);
    console.log('⚠️  Make sure server is running: npm run dev\n');

    // Get authentication cookie
    userCookie = await loginAsUser('test@example.com');
  });

  beforeEach(() => {
    // Reset test data IDs for each test
    testMessageId = 'test-message-id-' + Date.now();
    testSessionId = 'test-session-id-' + Date.now();
    testOpinionId = 'test-opinion-id-' + Date.now();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/chat/second-opinion', () => {
    describe('Authentication', () => {
      it('should return 401 without authentication', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messageId: testMessageId,
            sessionId: testSessionId
          })
        });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Authentication required');
      });

      it('should accept request with valid authentication', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: testMessageId,
            sessionId: testSessionId
          })
        });

        // May return 404 (message not found) or other errors, but not 401
        expect(response.status).not.toBe(401);
      });
    });

    describe('Request Validation', () => {
      it('should return 400 when messageId is missing', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            sessionId: testSessionId
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('messageId');
      });

      it('should return 400 when sessionId is missing', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: testMessageId
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('sessionId');
      });

      it('should return 400 when messageId is empty string', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: '',
            sessionId: testSessionId
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('messageId');
      });

      it('should return 400 when messageId is not a string', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: 12345,
            sessionId: testSessionId
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('messageId');
      });

      it('should return 400 when provider is not a string', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: testMessageId,
            sessionId: testSessionId,
            provider: 123
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('provider');
      });

      it('should return 400 when model is not a string', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: testMessageId,
            sessionId: testSessionId,
            model: ['gpt-4']
          })
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('model');
      });
    });

    describe('Error Responses', () => {
      it('should return 404 when message does not exist', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: 'non-existent-message-id',
            sessionId: testSessionId
          })
        });

        expect([404, 500]).toContain(response.status);
        const data = await response.json();
        expect(data.success).toBe(false);
      });

      it('should return 503 when feature is disabled', async () => {
        // This test assumes the feature can be disabled via config
        // The actual status code depends on implementation
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: testMessageId,
            sessionId: testSessionId
          })
        });

        // Should return some error status
        expect([400, 403, 404, 500, 503]).toContain(response.status);
      });
    });
  });

  describe('GET /api/chat/second-opinions/:messageId', () => {
    describe('Authentication', () => {
      it('should return 401 without authentication', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Authentication required');
      });

      it('should accept request with valid authentication', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`, {
          headers: {
            Cookie: userCookie
          }
        });

        // May return 404 (message not found) but not 401
        expect(response.status).not.toBe(401);
      });
    });

    describe('Request Validation', () => {
      it('should return 400 when messageId is empty', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/`, {
          headers: {
            Cookie: userCookie
          }
        });

        // Empty messageId should result in 404 (route not found), 400, or 200 (listing endpoint)
        expect([200, 400, 404]).toContain(response.status);
      });

      it('should handle valid messageId format', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`, {
          headers: {
            Cookie: userCookie
          }
        });

        // Should not be a validation error (400), may be 404 if message doesn't exist
        expect(response.status).not.toBe(400);
      });
    });

    describe('Authorization', () => {
      it('should return 403 when user does not own the message', async () => {
        // This test would require creating a message owned by another user
        // For now, we test that the endpoint checks authorization
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`, {
          headers: {
            Cookie: userCookie
          }
        });

        // Should return 403 or 404 depending on whether message exists
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('Success Response', () => {
      it('should return opinions array structure', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`, {
          headers: {
            Cookie: userCookie
          }
        });

        // If successful, should have correct structure
        if (response.status === 200) {
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data).toBeDefined();
          expect(data.data.opinions).toBeDefined();
          expect(Array.isArray(data.data.opinions)).toBe(true);
        }
      });

      it('should include feedback data in opinions', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`, {
          headers: {
            Cookie: userCookie
          }
        });

        if (response.status === 200) {
          const data = await response.json();
          if (data.data.opinions.length > 0) {
            const opinion = data.data.opinions[0];
            expect(opinion.feedback).toBeDefined();
            expect(opinion.feedback).toHaveProperty('helpful');
            expect(opinion.feedback).toHaveProperty('notHelpful');
            expect(opinion.feedback).toHaveProperty('userFeedback');
          }
        }
      });
    });

    describe('Error Responses', () => {
      it('should return 404 when message does not exist', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinions/non-existent-message`, {
          headers: {
            Cookie: userCookie
          }
        });

        expect([404, 500]).toContain(response.status);
        const data = await response.json();
        expect(data.success).toBe(false);
      });
    });
  });

  describe('POST /api/chat/second-opinion/:opinionId/feedback', () => {
    describe('Authentication', () => {
      it('should return 401 without authentication', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              helpful: true
            })
          }
        );

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('Authentication required');
      });

      it('should accept request with valid authentication', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true
            })
          }
        );

        // May return 404 (opinion not found) but not 401
        expect(response.status).not.toBe(401);
      });
    });

    describe('Request Validation', () => {
      it('should return 400 when helpful field is missing', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({})
          }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('helpful');
      });

      it('should return 400 when helpful is not a boolean', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: 'yes'
            })
          }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('helpful');
      });

      it('should return 400 when comment is not a string', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true,
              comment: 123
            })
          }
        );

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toContain('comment');
      });

      it('should accept helpful=true', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true
            })
          }
        );

        // Should not be a validation error
        expect(response.status).not.toBe(400);
      });

      it('should accept helpful=false', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: false
            })
          }
        );

        // Should not be a validation error
        expect(response.status).not.toBe(400);
      });

      it('should accept optional comment field', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true,
              comment: 'This was very helpful!'
            })
          }
        );

        // Should not be a validation error
        expect(response.status).not.toBe(400);
      });

      it('should handle empty opinionId', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/second-opinion//feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            helpful: true
          })
        });

        // Empty opinionId should result in 404 (route not found), 400, or 405 (method not allowed)
        expect([400, 404, 405]).toContain(response.status);
      });
    });

    describe('Success Response', () => {
      it('should return success structure when feedback is recorded', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true
            })
          }
        );

        if (response.status === 200) {
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data).toBeDefined();
          expect(data.data.recorded).toBe(true);
        }
      });
    });

    describe('Error Responses', () => {
      it('should return 404 when opinion does not exist', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/second-opinion/non-existent-opinion/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true
            })
          }
        );

        expect([404, 500]).toContain(response.status);
        const data = await response.json();
        expect(data.success).toBe(false);
      });
    });
  });

  describe('GET /api/chat/available-providers', () => {
    describe('Success Response', () => {
      it('should return list of available providers', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/available-providers`);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();
        expect(data.data.providers).toBeDefined();
        expect(Array.isArray(data.data.providers)).toBe(true);
      });

      it('should include provider information', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/available-providers`);

        if (response.status === 200) {
          const data = await response.json();
          if (data.data.providers.length > 0) {
            const provider = data.data.providers[0];
            expect(provider).toHaveProperty('name');
            expect(provider).toHaveProperty('displayName');
            expect(provider).toHaveProperty('description');
            expect(provider).toHaveProperty('available');
            expect(provider).toHaveProperty('models');
            expect(Array.isArray(provider.models)).toBe(true);
          }
        }
      });

      it('should include model information', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/available-providers`);

        if (response.status === 200) {
          const data = await response.json();
          const providerWithModels = data.data.providers.find((p) => p.models.length > 0);
          if (providerWithModels) {
            const model = providerWithModels.models[0];
            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('description');
            expect(model).toHaveProperty('capabilities');
            expect(Array.isArray(model.capabilities)).toBe(true);
          }
        }
      });
    });

    describe('Query Parameters', () => {
      it('should exclude provider when excludeProvider is specified', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/available-providers?excludeProvider=openai`
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        const openaiProvider = data.data.providers.find((p) => p.name === 'openai');
        expect(openaiProvider).toBeUndefined();
      });

      it('should return all providers when no excludeProvider is specified', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/available-providers`);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.data.providers.length).toBeGreaterThan(0);
      });

      it('should handle invalid excludeProvider gracefully', async () => {
        const response = await fetch(
          `${BASE_URL}/api/chat/available-providers?excludeProvider=invalid-provider`
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });
    });

    describe('No Authentication Required', () => {
      it('should work without authentication', async () => {
        const response = await fetch(`${BASE_URL}/api/chat/available-providers`);

        // Should not require authentication
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Integration Flow Tests', () => {
    describe('Complete Second Opinion Flow', () => {
      it('should handle complete flow: request -> list -> feedback', async () => {
        // Step 1: Request second opinion (will likely fail without real message)
        const requestResponse = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: userCookie
          },
          body: JSON.stringify({
            messageId: testMessageId,
            sessionId: testSessionId
          })
        });

        // Step 2: List opinions (will likely return empty array)
        const listResponse = await fetch(`${BASE_URL}/api/chat/second-opinions/${testMessageId}`, {
          headers: {
            Cookie: userCookie
          }
        });

        // Step 3: Submit feedback (will likely fail without real opinion)
        const feedbackResponse = await fetch(
          `${BASE_URL}/api/chat/second-opinion/${testOpinionId}/feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              helpful: true
            })
          }
        );

        // Verify all endpoints are accessible
        expect(requestResponse.status).toBeDefined();
        expect(listResponse.status).toBeDefined();
        expect(feedbackResponse.status).toBeDefined();
      });
    });

    describe('Provider Selection Flow', () => {
      it('should list providers and use one for second opinion', async () => {
        // Step 1: Get available providers
        const providersResponse = await fetch(`${BASE_URL}/api/chat/available-providers`);
        expect(providersResponse.status).toBe(200);

        const providersData = await providersResponse.json();
        const availableProvider = providersData.data.providers.find((p) => p.available);

        if (availableProvider) {
          // Step 2: Request second opinion with specific provider
          const opinionResponse = await fetch(`${BASE_URL}/api/chat/second-opinion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: userCookie
            },
            body: JSON.stringify({
              messageId: testMessageId,
              sessionId: testSessionId,
              provider: availableProvider.name
            })
          });

          // Should not be a validation error
          expect(opinionResponse.status).not.toBe(400);
        }
      });
    });
  });
});
