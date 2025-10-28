import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageManagementService } from '../../../../src/lib/modules/chat/services/LanguageManagementService.js';

describe('LanguageManagementService', () => {
  let service;
  let mockLanguageDetector;
  let mockSessionLanguageManager;
  let mockLanguageConsistencyLogger;

  beforeEach(() => {
    // Mock language detector
    mockLanguageDetector = {
      detectWithConfidence: vi.fn(),
      detectLanguageFromText: vi.fn(),
      validateLanguageConsistency: vi.fn()
    };

    // Mock session language manager
    mockSessionLanguageManager = {
      setSessionLanguage: vi.fn(),
      getSessionLanguage: vi.fn(),
      addValidationResult: vi.fn()
    };

    // Mock language consistency logger
    mockLanguageConsistencyLogger = {
      logConsistencyIssue: vi.fn()
    };

    service = new LanguageManagementService(
      mockLanguageDetector,
      mockSessionLanguageManager,
      mockLanguageConsistencyLogger
    );
  });

  describe('detectLanguage', () => {
    it('should detect language from content', () => {
      mockLanguageDetector.detectWithConfidence.mockReturnValue({
        language: 'es',
        confidence: 0.9,
        method: 'pattern'
      });

      const result = service.detectLanguage({
        content: 'Hola, ¿cómo estás?',
        sessionId: 'session123',
        fallbackLanguage: 'en',
        images: [],
        provider: 'openai'
      });

      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.9);
      expect(result.method).toBe('pattern');
      expect(mockLanguageDetector.detectWithConfidence).toHaveBeenCalled();
      expect(mockSessionLanguageManager.setSessionLanguage).toHaveBeenCalled();
    });

    it('should use fallback language on detection failure', () => {
      mockLanguageDetector.detectWithConfidence.mockImplementation(() => {
        throw new Error('Detection failed');
      });

      const result = service.detectLanguage({
        content: 'Hello',
        sessionId: 'session123',
        fallbackLanguage: 'en',
        images: [],
        provider: 'openai'
      });

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.3);
      expect(result.method).toBe('error_fallback');
      expect(mockLanguageConsistencyLogger.logConsistencyIssue).toHaveBeenCalled();
    });

    it('should use session language when no content provided', () => {
      mockSessionLanguageManager.getSessionLanguage.mockReturnValue({
        detectedLanguage: 'ru',
        confidence: 0.85
      });

      const result = service.detectLanguage({
        content: '',
        sessionId: 'session123',
        fallbackLanguage: 'en',
        images: [],
        provider: 'openai'
      });

      expect(result.language).toBe('ru');
      expect(result.confidence).toBe(0.85);
      expect(result.method).toBe('session_history');
    });

    it('should use fallback when no content and no session language', () => {
      mockSessionLanguageManager.getSessionLanguage.mockReturnValue(null);

      const result = service.detectLanguage({
        content: '',
        sessionId: 'session123',
        fallbackLanguage: 'fr',
        images: [],
        provider: 'openai'
      });

      expect(result.language).toBe('fr');
      expect(result.confidence).toBe(0.5);
      expect(result.method).toBe('fallback');
    });
  });

  describe('handleShortMessage', () => {
    it('should use history language for short messages with low confidence', () => {
      mockLanguageDetector.detectLanguageFromText.mockReturnValue({
        language: 'es',
        confidence: 0.85
      });

      const sessionContext = {
        history: [
          { role: 'user', content: 'Hola, ¿cómo estás?' },
          { role: 'assistant', content: 'Estoy bien, gracias' }
        ]
      };

      const result = service.handleShortMessage({
        content: 'sí',
        detectedLanguage: 'en',
        languageConfidence: 0.6,
        sessionContext
      });

      expect(result.language).toBe('es');
      expect(result.confidence).toBe(0.85);
      expect(result.adjusted).toBe(true);
    });

    it('should not adjust for long messages', () => {
      const result = service.handleShortMessage({
        content: 'This is a longer message with multiple words',
        detectedLanguage: 'en',
        languageConfidence: 0.7,
        sessionContext: { history: [] }
      });

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.7);
      expect(result.adjusted).toBe(false);
    });

    it('should not adjust when confidence is high', () => {
      const result = service.handleShortMessage({
        content: 'yes',
        detectedLanguage: 'en',
        languageConfidence: 0.95,
        sessionContext: { history: [] }
      });

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.95);
      expect(result.adjusted).toBe(false);
    });

    it('should not adjust when no history available', () => {
      const result = service.handleShortMessage({
        content: 'ok',
        detectedLanguage: 'en',
        languageConfidence: 0.6,
        sessionContext: null
      });

      expect(result.language).toBe('en');
      expect(result.confidence).toBe(0.6);
      expect(result.adjusted).toBe(false);
    });
  });

  describe('validateResponseLanguage', () => {
    it('should validate consistent language response', () => {
      mockLanguageDetector.validateLanguageConsistency.mockReturnValue({
        isConsistent: true,
        detectedLanguage: 'es',
        confidence: 0.9,
        severity: 'low',
        recommendation: 'continue'
      });

      const result = service.validateResponseLanguage({
        aiResponse: 'Hola, ¿cómo puedo ayudarte?',
        expectedLanguage: 'es',
        sessionId: 'session123',
        metadata: { provider: 'openai', model: 'gpt-4' }
      });

      expect(result.isConsistent).toBe(true);
      expect(mockSessionLanguageManager.addValidationResult).toHaveBeenCalled();
    });

    it('should handle high severity inconsistency', () => {
      mockLanguageDetector.validateLanguageConsistency.mockReturnValue({
        isConsistent: false,
        detectedLanguage: 'en',
        confidence: 0.95,
        severity: 'high',
        recommendation: 'regenerate'
      });

      const result = service.validateResponseLanguage({
        aiResponse: 'Hello, how can I help you?',
        expectedLanguage: 'es',
        sessionId: 'session123',
        metadata: { provider: 'openai' }
      });

      expect(result.isConsistent).toBe(false);
      expect(result.severity).toBe('high');
      expect(mockLanguageConsistencyLogger.logConsistencyIssue).toHaveBeenCalledWith(
        'session123',
        'regeneration_recommended',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle validation errors gracefully', () => {
      mockLanguageDetector.validateLanguageConsistency.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result = service.validateResponseLanguage({
        aiResponse: 'Response',
        expectedLanguage: 'en',
        sessionId: 'session123',
        metadata: {}
      });

      // Should return safe default
      expect(result.isConsistent).toBe(true);
      expect(result.detectedLanguage).toBe('en');
      expect(mockLanguageConsistencyLogger.logConsistencyIssue).toHaveBeenCalledWith(
        'session123',
        'validation_error',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('getLanguageInstructions', () => {
    it('should return instructions for English', () => {
      const result = service.getLanguageInstructions('en');
      expect(result.targetLanguage).toBe('English');
      expect(result.instruction).toContain('ONLY in English');
      expect(result.languageCode).toBe('en');
    });

    it('should return instructions for Spanish', () => {
      const result = service.getLanguageInstructions('es');
      expect(result.targetLanguage).toBe('Spanish');
      expect(result.instruction).toContain('SOLO en español');
      expect(result.languageCode).toBe('es');
    });

    it('should return instructions for Russian', () => {
      const result = service.getLanguageInstructions('ru');
      expect(result.targetLanguage).toBe('Russian');
      expect(result.instruction).toContain('ТОЛЬКО на русском');
      expect(result.languageCode).toBe('ru');
    });

    it('should return default instructions for unknown language', () => {
      const result = service.getLanguageInstructions('unknown');
      expect(result.targetLanguage).toBe('English');
      expect(result.instruction).toContain('ONLY in English');
      expect(result.languageCode).toBe('unknown');
    });

    it('should return instructions for all supported languages', () => {
      const languages = ['en', 'es', 'ru', 'fr', 'de', 'it', 'pt'];
      languages.forEach((lang) => {
        const result = service.getLanguageInstructions(lang);
        expect(result.targetLanguage).toBeDefined();
        expect(result.instruction).toBeDefined();
        expect(result.languageCode).toBe(lang);
      });
    });
  });
});
