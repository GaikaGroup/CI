import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseBuilderService } from '../../../../src/lib/modules/chat/services/ResponseBuilderService.js';

describe('ResponseBuilderService', () => {
  let service;

  beforeEach(() => {
    service = new ResponseBuilderService();
  });

  describe('buildSuccessResponse', () => {
    it('should build basic success response', () => {
      const response = service.buildSuccessResponse({
        aiResponse: 'Hello, how can I help you?',
        recognizedText: '',
        examProfile: null,
        providerInfo: null,
        llmMetadata: null
      });

      expect(response.response).toBe('Hello, how can I help you?');
      expect(response.ocrText).toBe('');
    });

    it('should include recognized text', () => {
      const response = service.buildSuccessResponse({
        aiResponse: 'Response',
        recognizedText: 'Text from image',
        examProfile: null,
        providerInfo: null,
        llmMetadata: null
      });

      expect(response.ocrText).toBe('Text from image');
    });

    it('should include exam profile when provided', () => {
      const examProfile = {
        subjectName: 'IELTS',
        mode: 'exam'
      };

      const response = service.buildSuccessResponse({
        aiResponse: 'Response',
        recognizedText: '',
        examProfile,
        providerInfo: null,
        llmMetadata: null
      });

      expect(response.examProfile).toEqual(examProfile);
    });

    it('should include provider info in development mode', () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      const providerInfo = {
        name: 'openai',
        model: 'gpt-4'
      };

      const response = service.buildSuccessResponse({
        aiResponse: 'Response',
        recognizedText: '',
        examProfile: null,
        providerInfo,
        llmMetadata: null
      });

      expect(response.provider).toEqual(providerInfo);

      import.meta.env.DEV = originalEnv;
    });

    it('should include llmMetadata when provided', () => {
      const llmMetadata = {
        provider: 'openai',
        model: 'gpt-4',
        tokens: 150
      };

      const response = service.buildSuccessResponse({
        aiResponse: 'Response',
        recognizedText: '',
        examProfile: null,
        providerInfo: null,
        llmMetadata
      });

      expect(response.llmMetadata).toEqual(llmMetadata);
    });

    it('should build complete response with all fields', () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      const response = service.buildSuccessResponse({
        aiResponse: 'Complete response',
        recognizedText: 'OCR text',
        examProfile: { mode: 'practice' },
        providerInfo: { name: 'ollama', model: 'qwen2.5:1.5b' },
        llmMetadata: { tokens: 200 }
      });

      expect(response.response).toBe('Complete response');
      expect(response.ocrText).toBe('OCR text');
      expect(response.examProfile).toBeDefined();
      expect(response.provider).toBeDefined();
      expect(response.llmMetadata).toBeDefined();

      import.meta.env.DEV = originalEnv;
    });
  });

  describe('buildErrorResponse', () => {
    it('should build basic error response', () => {
      const error = new Error('Something went wrong');
      const result = service.buildErrorResponse({ error, context: '' });

      expect(result.response.error).toBe('Internal server error');
      expect(result.statusCode).toBe(500);
    });

    it('should include error details in development mode', () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = true;

      const error = new Error('Test error');
      const result = service.buildErrorResponse({ error, context: 'test context' });

      expect(result.response.details).toBe('Test error');
      expect(result.response.stack).toBeDefined();
      expect(result.response.context).toBe('test context');

      import.meta.env.DEV = originalEnv;
    });

    it('should not include error details in production mode', () => {
      const originalEnv = import.meta.env.DEV;
      import.meta.env.DEV = false;

      const error = new Error('Test error');
      const result = service.buildErrorResponse({ error, context: '' });

      expect(result.response.details).toBeUndefined();
      expect(result.response.stack).toBeUndefined();

      import.meta.env.DEV = originalEnv;
    });
  });

  describe('getErrorStatusCode', () => {
    it('should return 401 for authentication errors', () => {
      const error = new Error('Authentication required');
      expect(service.getErrorStatusCode(error)).toBe(401);
    });

    it('should return 403 for authorization errors', () => {
      const error = new Error('Authorization failed');
      expect(service.getErrorStatusCode(error)).toBe(403);
    });

    it('should return 404 for not found errors', () => {
      const error = new Error('Resource not found');
      expect(service.getErrorStatusCode(error)).toBe(404);
    });

    it('should return 400 for validation errors', () => {
      const error = new Error('Validation failed: invalid input');
      expect(service.getErrorStatusCode(error)).toBe(400);
    });

    it('should return 504 for timeout errors', () => {
      const error = new Error('Request timed out');
      expect(service.getErrorStatusCode(error)).toBe(504);
    });

    it('should return 503 for service unavailable errors', () => {
      const error = new Error('Service not running');
      expect(service.getErrorStatusCode(error)).toBe(503);
    });

    it('should return 500 for API key errors', () => {
      const error = new Error('API key is missing');
      expect(service.getErrorStatusCode(error)).toBe(500);
    });

    it('should return 500 for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(service.getErrorStatusCode(error)).toBe(500);
    });
  });

  describe('getErrorMessage', () => {
    it('should return friendly message for API key errors', () => {
      const error = new Error('API key is missing');
      expect(service.getErrorMessage(error)).toBe('API configuration error');
    });

    it('should return friendly message for timeout errors', () => {
      const error = new Error('Request timed out');
      expect(service.getErrorMessage(error)).toBe('Request timed out');
    });

    it('should return friendly message for service unavailable', () => {
      const error = new Error('LLM service not running');
      expect(service.getErrorMessage(error)).toBe('Local LLM service is not available');
    });

    it('should return original message for validation errors', () => {
      const error = new Error('Validation failed: field is required');
      expect(service.getErrorMessage(error)).toBe('Validation failed: field is required');
    });

    it('should return friendly message for authentication errors', () => {
      const error = new Error('Authentication required');
      expect(service.getErrorMessage(error)).toBe('Authentication required');
    });

    it('should return friendly message for authorization errors', () => {
      const error = new Error('Authorization failed');
      expect(service.getErrorMessage(error)).toBe('Access forbidden');
    });

    it('should return friendly message for not found errors', () => {
      const error = new Error('Resource not found');
      expect(service.getErrorMessage(error)).toBe('Resource not found');
    });

    it('should include context in generic error message', () => {
      const error = new Error('Something went wrong');
      expect(service.getErrorMessage(error, 'chat processing')).toBe(
        'Error in chat processing: Internal server error'
      );
    });

    it('should return default message for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(service.getErrorMessage(error)).toBe('Internal server error');
    });
  });
});
