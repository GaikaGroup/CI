import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandlerService } from '../../../../src/lib/modules/chat/services/ErrorHandlerService.js';

describe('ErrorHandlerService', () => {
  let service;

  beforeEach(() => {
    service = new ErrorHandlerService();
    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleError', () => {
    it('should handle error and return categorized result', () => {
      const error = new Error('Validation failed');
      const context = { endpoint: '/api/chat', user: 'user123' };

      const result = service.handleError(error, context);

      expect(result.category).toBe(ErrorHandlerService.ERROR_CATEGORIES.VALIDATION);
      expect(result.message).toBe('Validation failed');
      expect(result.retryable).toBe(false);
      expect(result.originalError).toBe(error);
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = { endpoint: '/api/chat' };

      service.handleError(error, context);

      // Internal errors are logged as error, not info
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('categorizeError', () => {
    it('should categorize validation errors', () => {
      const errors = [
        new Error('Validation failed'),
        new Error('Invalid input'),
        new Error('Field is required'),
        new Error('Value must be a string')
      ];

      errors.forEach((error) => {
        expect(service.categorizeError(error)).toBe(
          ErrorHandlerService.ERROR_CATEGORIES.VALIDATION
        );
      });
    });

    it('should categorize authentication errors', () => {
      const errors = [new Error('Authentication required'), new Error('Unauthorized access')];

      errors.forEach((error) => {
        expect(service.categorizeError(error)).toBe(
          ErrorHandlerService.ERROR_CATEGORIES.AUTHENTICATION
        );
      });
    });

    it('should categorize authorization errors', () => {
      const errors = [
        new Error('Authorization failed'),
        new Error('Forbidden resource'),
        new Error('No permission to access'),
        new Error('Access denied')
      ];

      errors.forEach((error) => {
        expect(service.categorizeError(error)).toBe(
          ErrorHandlerService.ERROR_CATEGORIES.AUTHORIZATION
        );
      });
    });

    it('should categorize timeout errors', () => {
      const errors = [new Error('Request timeout'), new Error('Operation timed out')];

      errors.forEach((error) => {
        expect(service.categorizeError(error)).toBe(ErrorHandlerService.ERROR_CATEGORIES.TIMEOUT);
      });
    });

    it('should categorize provider errors', () => {
      const errors = [
        new Error('API key missing'),
        new Error('LLM service not running'),
        new Error('Provider not accessible'),
        new Error('Provider error occurred')
      ];

      errors.forEach((error) => {
        expect(service.categorizeError(error)).toBe(ErrorHandlerService.ERROR_CATEGORIES.PROVIDER);
      });
    });

    it('should categorize network errors', () => {
      const errors = [
        new Error('Network connection failed'),
        new Error('Fetch error'),
        { name: 'NetworkError', message: 'Network issue' }
      ];

      errors.forEach((error) => {
        expect(service.categorizeError(error)).toBe(ErrorHandlerService.ERROR_CATEGORIES.NETWORK);
      });
    });

    it('should categorize unknown errors as internal', () => {
      const error = new Error('Something unexpected happened');
      expect(service.categorizeError(error)).toBe(ErrorHandlerService.ERROR_CATEGORIES.INTERNAL);
    });
  });

  describe('logError', () => {
    it('should log validation errors as info', () => {
      const error = new Error('Validation failed');
      const category = ErrorHandlerService.ERROR_CATEGORIES.VALIDATION;

      service.logError(error, category, {});

      expect(console.info).toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should log internal errors as error', () => {
      const error = new Error('Internal error');
      const category = ErrorHandlerService.ERROR_CATEGORIES.INTERNAL;

      service.logError(error, category, {});

      expect(console.error).toHaveBeenCalled();
    });

    it('should log provider errors with details', () => {
      const error = new Error('Provider error');
      const category = ErrorHandlerService.ERROR_CATEGORIES.PROVIDER;
      const context = { provider: 'openai', model: 'gpt-4' };

      service.logError(error, category, context);

      expect(console.error).toHaveBeenCalledWith(
        '[Provider Error] Details:',
        expect.objectContaining({
          message: 'Provider error',
          provider: 'openai',
          model: 'gpt-4'
        })
      );
    });

    it('should log timeout errors with warning', () => {
      const error = new Error('Timeout');
      const category = ErrorHandlerService.ERROR_CATEGORIES.TIMEOUT;
      const context = { endpoint: '/api/chat', duration: 5000 };

      service.logError(error, category, context);

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('isRetryable', () => {
    it('should mark validation errors as not retryable', () => {
      const error = new Error('Validation failed');
      const category = ErrorHandlerService.ERROR_CATEGORIES.VALIDATION;

      expect(service.isRetryable(error, category)).toBe(false);
    });

    it('should mark authentication errors as not retryable', () => {
      const error = new Error('Authentication required');
      const category = ErrorHandlerService.ERROR_CATEGORIES.AUTHENTICATION;

      expect(service.isRetryable(error, category)).toBe(false);
    });

    it('should mark authorization errors as not retryable', () => {
      const error = new Error('Authorization failed');
      const category = ErrorHandlerService.ERROR_CATEGORIES.AUTHORIZATION;

      expect(service.isRetryable(error, category)).toBe(false);
    });

    it('should mark timeout errors as retryable', () => {
      const error = new Error('Timeout');
      const category = ErrorHandlerService.ERROR_CATEGORIES.TIMEOUT;

      expect(service.isRetryable(error, category)).toBe(true);
    });

    it('should mark network errors as retryable', () => {
      const error = new Error('Network error');
      const category = ErrorHandlerService.ERROR_CATEGORIES.NETWORK;

      expect(service.isRetryable(error, category)).toBe(true);
    });

    it('should mark API key errors as not retryable', () => {
      const error = new Error('API key missing');
      const category = ErrorHandlerService.ERROR_CATEGORIES.PROVIDER;

      expect(service.isRetryable(error, category)).toBe(false);
    });

    it('should mark service unavailable errors as retryable', () => {
      const error = new Error('Service not running');
      const category = ErrorHandlerService.ERROR_CATEGORIES.PROVIDER;

      expect(service.isRetryable(error, category)).toBe(true);
    });

    it('should mark internal errors as not retryable', () => {
      const error = new Error('Internal error');
      const category = ErrorHandlerService.ERROR_CATEGORIES.INTERNAL;

      expect(service.isRetryable(error, category)).toBe(false);
    });
  });

  describe('_sanitizeContext', () => {
    it('should redact sensitive fields', () => {
      const context = {
        password: 'secret123',
        token: 'abc123',
        apiKey: 'key123',
        api_key: 'key456',
        sessionToken: 'session123',
        normalField: 'value'
      };

      const sanitized = service._sanitizeContext(context);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.sessionToken).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('value');
    });

    it('should truncate long content', () => {
      const longContent = 'a'.repeat(300);
      const context = { content: longContent };

      const sanitized = service._sanitizeContext(context);

      expect(sanitized.content.length).toBeLessThan(longContent.length);
      expect(sanitized.content).toContain('[truncated]');
    });

    it('should summarize message arrays', () => {
      const context = {
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' }
        ]
      };

      const sanitized = service._sanitizeContext(context);

      expect(sanitized.messages).toBe('[2 messages]');
    });

    it('should remove stack traces in production', () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = false;

      const context = { stack: 'Error stack trace...' };
      const sanitized = service._sanitizeContext(context);

      expect(sanitized.stack).toBeUndefined();

      import.meta.env.DEV = originalEnv;
    });

    it('should keep stack traces in development', () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      const context = { stack: 'Error stack trace...' };
      const sanitized = service._sanitizeContext(context);

      expect(sanitized.stack).toBe('Error stack trace...');

      import.meta.env.DEV = originalEnv;
    });
  });
});
