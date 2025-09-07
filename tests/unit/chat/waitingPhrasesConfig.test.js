import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadWaitingPhrasesConfig,
  validateConfiguration,
  getPhrasesForLanguage,
  getAvailableLanguages,
  getAvailableCategories,
  isLanguageSupported,
  DEFAULT_PHRASES
} from '../../../src/lib/modules/chat/waitingPhrasesConfig.js';

describe('Waiting Phrases Configuration', () => {
  let mockConsole;

  beforeEach(() => {
    mockConsole = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    vi.stubGlobal('console', mockConsole);
  });

  describe('validateConfiguration', () => {
    it('should validate a correct configuration', () => {
      const validConfig = {
        phrases: {
          general: {
            en: ['Hello', 'Hi there'],
            es: ['Hola', 'Buenas']
          }
        },
        settings: {
          avoidConsecutiveRepeats: true,
          maxPhraseLength: 8,
          fallbackToTranslation: true,
          defaultLanguage: 'en',
          maxHistorySize: 5
        }
      };

      const result = validateConfiguration(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid configuration structure', () => {
      const invalidConfig = null;
      const result = validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must be a valid object');
    });

    it('should reject configuration without phrases', () => {
      const invalidConfig = {
        settings: {
          avoidConsecutiveRepeats: true,
          maxPhraseLength: 8,
          fallbackToTranslation: true,
          defaultLanguage: 'en',
          maxHistorySize: 5
        }
      };

      const result = validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration must contain a "phrases" object');
    });

    it('should reject empty phrase arrays', () => {
      const invalidConfig = {
        phrases: {
          general: {
            en: []
          }
        },
        settings: {
          avoidConsecutiveRepeats: true,
          maxPhraseLength: 8,
          fallbackToTranslation: true,
          defaultLanguage: 'en',
          maxHistorySize: 5
        }
      };

      const result = validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Language "en" in category "general" must contain at least one phrase');
    });

    it('should reject invalid settings', () => {
      const invalidConfig = {
        phrases: {
          general: {
            en: ['Hello']
          }
        },
        settings: {
          avoidConsecutiveRepeats: 'not a boolean',
          maxPhraseLength: -1,
          fallbackToTranslation: true,
          defaultLanguage: '',
          maxHistorySize: 0
        }
      };

      const result = validateConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Setting "avoidConsecutiveRepeats" must be a boolean');
      expect(result.errors).toContain('Setting "maxPhraseLength" must be a positive number');
      expect(result.errors).toContain('Setting "defaultLanguage" must be a non-empty string');
      expect(result.errors).toContain('Setting "maxHistorySize" must be a positive number');
    });
  });

  describe('loadWaitingPhrasesConfig', () => {
    it('should load configuration successfully', async () => {
      const config = await loadWaitingPhrasesConfig();
      
      expect(config).toBeDefined();
      expect(config.phrases).toBeDefined();
      expect(config.settings).toBeDefined();
      expect(mockConsole.log).toHaveBeenCalledWith('Loading waiting phrases configuration...');
    });
  });

  describe('getPhrasesForLanguage', () => {
    const testConfig = {
      phrases: {
        general: {
          en: ['Hello', 'Hi'],
          es: ['Hola', 'Buenas']
        },
        math: {
          en: ['Calculating...', 'Computing...']
        }
      },
      settings: {
        defaultLanguage: 'en'
      }
    };

    it('should return phrases for existing language and category', () => {
      const phrases = getPhrasesForLanguage(testConfig, 'en', 'general');
      expect(phrases).toEqual(['Hello', 'Hi']);
    });

    it('should fallback to default language when requested language not found', () => {
      const phrases = getPhrasesForLanguage(testConfig, 'fr', 'general');
      expect(phrases).toEqual(['Hello', 'Hi']);
      expect(mockConsole.warn).toHaveBeenCalledWith('Language "fr" not found in category "general", falling back to "en"');
    });

    it('should fallback to general category when category not found', () => {
      const phrases = getPhrasesForLanguage(testConfig, 'en', 'nonexistent');
      expect(phrases).toEqual(['Hello', 'Hi']);
      expect(mockConsole.warn).toHaveBeenCalledWith('Category "nonexistent" not found, falling back to "general"');
    });

    it('should return default phrases when all fallbacks fail', () => {
      const emptyConfig = { phrases: {}, settings: { defaultLanguage: 'en' } };
      const phrases = getPhrasesForLanguage(emptyConfig, 'en', 'general');
      expect(phrases).toEqual(DEFAULT_PHRASES.phrases.general.en);
    });
  });

  describe('getAvailableLanguages', () => {
    const testConfig = {
      phrases: {
        general: {
          en: ['Hello'],
          es: ['Hola'],
          fr: ['Bonjour']
        }
      }
    };

    it('should return available languages for a category', () => {
      const languages = getAvailableLanguages(testConfig, 'general');
      expect(languages).toEqual(['en', 'es', 'fr']);
    });

    it('should return empty array for non-existent category', () => {
      const languages = getAvailableLanguages(testConfig, 'nonexistent');
      expect(languages).toEqual([]);
    });
  });

  describe('getAvailableCategories', () => {
    const testConfig = {
      phrases: {
        general: { en: ['Hello'] },
        math: { en: ['Calculating'] },
        creative: { en: ['Thinking'] }
      }
    };

    it('should return all available categories', () => {
      const categories = getAvailableCategories(testConfig);
      expect(categories).toEqual(['general', 'math', 'creative']);
    });
  });

  describe('isLanguageSupported', () => {
    const testConfig = {
      phrases: {
        general: {
          en: ['Hello'],
          es: ['Hola'],
          fr: []
        }
      }
    };

    it('should return true for supported language', () => {
      expect(isLanguageSupported(testConfig, 'en', 'general')).toBe(true);
      expect(isLanguageSupported(testConfig, 'es', 'general')).toBe(true);
    });

    it('should return false for unsupported language', () => {
      expect(isLanguageSupported(testConfig, 'de', 'general')).toBe(false);
    });

    it('should return false for language with empty phrases', () => {
      expect(isLanguageSupported(testConfig, 'fr', 'general')).toBe(false);
    });

    it('should return false for non-existent category', () => {
      expect(isLanguageSupported(testConfig, 'en', 'nonexistent')).toBe(false);
    });
  });
});