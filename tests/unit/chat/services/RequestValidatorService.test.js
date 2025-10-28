import { describe, it, expect, beforeEach } from 'vitest';
import { RequestValidatorService } from '../../../../src/lib/modules/chat/services/RequestValidatorService.js';

describe('RequestValidatorService', () => {
  let service;

  beforeEach(() => {
    service = new RequestValidatorService();
  });

  describe('validateRequest', () => {
    it('should validate a complete valid request', () => {
      const request = {
        content: 'Hello, can you help me?',
        language: 'en',
        sessionContext: { sessionId: '123' }
      };
      const result = service.validateRequest(request);
      expect(result.valid).toBe(true);
      expect(result.normalized).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject null request body', () => {
      const result = service.validateRequest(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Request body must be a valid object');
    });

    it('should reject undefined request body', () => {
      const result = service.validateRequest(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Request body must be a valid object');
    });

    it('should reject non-object request body', () => {
      const result = service.validateRequest('string');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Request body must be a valid object');
    });

    it('should accept request with images but no content', () => {
      const request = {
        content: '',
        images: ['data:image/png;base64,abc123']
      };
      const result = service.validateRequest(request);
      expect(result.valid).toBe(true);
    });

    it('should reject request with no content and no images', () => {
      const request = {
        content: ''
      };
      const result = service.validateRequest(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Either content or images must be provided');
    });
  });

  describe('validateRequiredFields', () => {
    it('should accept valid content', () => {
      const request = { content: 'Hello' };
      const result = service.validateRequiredFields(request);
      expect(result.valid).toBe(true);
    });

    it('should accept empty content if images provided', () => {
      const request = {
        content: '',
        images: ['image1']
      };
      const result = service.validateRequiredFields(request);
      expect(result.valid).toBe(true);
    });

    it('should reject empty content without images', () => {
      const request = { content: '' };
      const result = service.validateRequiredFields(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Either content or images must be provided');
    });

    it('should reject whitespace-only content without images', () => {
      const request = { content: '   ' };
      const result = service.validateRequiredFields(request);
      expect(result.valid).toBe(false);
    });

    it('should reject undefined content', () => {
      const request = {};
      const result = service.validateRequiredFields(request);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing required field: content');
    });

    it('should reject null content', () => {
      const request = { content: null };
      const result = service.validateRequiredFields(request);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing required field: content');
    });
  });

  describe('validateFieldTypes', () => {
    it('should accept all valid field types', () => {
      const request = {
        content: 'Hello',
        images: ['image1'],
        recognizedText: 'Text from image',
        language: 'en',
        sessionContext: { sessionId: '123' },
        maxTokens: 500,
        minWords: 100,
        detailLevel: 'detailed',
        provider: 'openai',
        model: 'gpt-4',
        examProfile: { mode: 'exam' }
      };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(true);
    });

    it('should reject non-string content', () => {
      const request = { content: 123 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('content');
    });

    it('should reject non-array images', () => {
      const request = { content: 'Hello', images: 'not-array' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('images');
    });

    it('should reject non-string recognizedText', () => {
      const request = { content: 'Hello', recognizedText: 123 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('recognizedText');
    });

    it('should reject non-string language', () => {
      const request = { content: 'Hello', language: 123 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('language');
    });

    it('should reject non-object sessionContext', () => {
      const request = { content: 'Hello', sessionContext: 'not-object' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sessionContext');
    });

    it('should reject null sessionContext', () => {
      const request = { content: 'Hello', sessionContext: null };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sessionContext');
    });

    it('should reject invalid maxTokens', () => {
      const request = { content: 'Hello', maxTokens: 'not-number' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maxTokens');
    });

    it('should reject negative maxTokens', () => {
      const request = { content: 'Hello', maxTokens: -100 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maxTokens');
    });

    it('should reject zero maxTokens', () => {
      const request = { content: 'Hello', maxTokens: 0 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maxTokens');
    });

    it('should accept string maxTokens that can be converted to number', () => {
      const request = { content: 'Hello', maxTokens: '500' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid minWords', () => {
      const request = { content: 'Hello', minWords: 'not-number' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minWords');
    });

    it('should reject negative minWords', () => {
      const request = { content: 'Hello', minWords: -10 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minWords');
    });

    it('should accept zero minWords', () => {
      const request = { content: 'Hello', minWords: 0 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid detailLevel', () => {
      const request = { content: 'Hello', detailLevel: 'invalid' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('detailLevel');
    });

    it('should accept valid detailLevel values', () => {
      const levels = ['brief', 'normal', 'detailed'];
      levels.forEach((level) => {
        const request = { content: 'Hello', detailLevel: level };
        const result = service.validateFieldTypes(request);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject non-string provider', () => {
      const request = { content: 'Hello', provider: 123 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('provider');
    });

    it('should accept null provider', () => {
      const request = { content: 'Hello', provider: null };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(true);
    });

    it('should reject non-string model', () => {
      const request = { content: 'Hello', model: 123 };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('model');
    });

    it('should accept null model', () => {
      const request = { content: 'Hello', model: null };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(true);
    });

    it('should reject non-object examProfile', () => {
      const request = { content: 'Hello', examProfile: 'not-object' };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('examProfile');
    });

    it('should reject null examProfile', () => {
      const request = { content: 'Hello', examProfile: null };
      const result = service.validateFieldTypes(request);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('examProfile');
    });
  });

  describe('normalizeRequest', () => {
    it('should normalize all fields with defaults', () => {
      const request = {
        content: '  Hello  ',
        language: 'EN'
      };
      const normalized = service.normalizeRequest(request);
      expect(normalized.content).toBe('Hello');
      expect(normalized.language).toBe('en');
      expect(normalized.images).toEqual([]);
      expect(normalized.recognizedText).toBe('');
      expect(normalized.sessionContext).toBeNull();
      expect(normalized.detailLevel).toBe('normal');
    });

    it('should preserve provided values', () => {
      const request = {
        content: 'Hello',
        images: ['image1', 'image2'],
        recognizedText: 'OCR text',
        language: 'es',
        sessionContext: { sessionId: '123' },
        maxTokens: 500,
        minWords: 100,
        detailLevel: 'detailed',
        provider: 'openai',
        model: 'gpt-4',
        examProfile: { mode: 'exam' }
      };
      const normalized = service.normalizeRequest(request);
      expect(normalized.content).toBe('Hello');
      expect(normalized.images).toEqual(['image1', 'image2']);
      expect(normalized.recognizedText).toBe('OCR text');
      expect(normalized.language).toBe('es');
      expect(normalized.sessionContext).toEqual({ sessionId: '123' });
      expect(normalized.maxTokens).toBe(500);
      expect(normalized.minWords).toBe(100);
      expect(normalized.detailLevel).toBe('detailed');
      expect(normalized.provider).toBe('openai');
      expect(normalized.model).toBe('gpt-4');
      expect(normalized.examProfile).toEqual({ mode: 'exam' });
    });

    it('should convert string numbers to numbers', () => {
      const request = {
        content: 'Hello',
        maxTokens: '500',
        minWords: '100'
      };
      const normalized = service.normalizeRequest(request);
      expect(normalized.maxTokens).toBe(500);
      expect(normalized.minWords).toBe(100);
    });

    it('should trim whitespace from content', () => {
      const request = {
        content: '  \n  Hello World  \n  '
      };
      const normalized = service.normalizeRequest(request);
      expect(normalized.content).toBe('Hello World');
    });

    it('should lowercase language code', () => {
      const request = {
        content: 'Hello',
        language: 'EN-US'
      };
      const normalized = service.normalizeRequest(request);
      expect(normalized.language).toBe('en-us');
    });

    it('should handle empty request with defaults', () => {
      const request = {};
      const normalized = service.normalizeRequest(request);
      expect(normalized.content).toBe('');
      expect(normalized.images).toEqual([]);
      expect(normalized.recognizedText).toBe('');
      expect(normalized.language).toBe('en');
      expect(normalized.sessionContext).toBeNull();
      expect(normalized.detailLevel).toBe('normal');
      expect(normalized.maxTokens).toBeUndefined();
      expect(normalized.minWords).toBeUndefined();
      expect(normalized.provider).toBeUndefined();
      expect(normalized.model).toBeUndefined();
      expect(normalized.examProfile).toBeUndefined();
    });
  });
});
