import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TranslationBridge } from '../../../src/lib/modules/chat/translationBridge.js';

describe('TranslationBridge', () => {
  let bridge;
  let mockConsole;

  beforeEach(() => {
    bridge = new TranslationBridge();

    mockConsole = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    vi.stubGlobal('console', mockConsole);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Translation Functionality', () => {
    it('should return original phrase for English target', async () => {
      const phrase = 'Hello world';
      const result = await bridge.translatePhrase(phrase, 'en');

      expect(result).toBe(phrase);
    });

    it('should translate using predefined mappings', async () => {
      const phrase = 'Let me think about this...';
      const result = await bridge.translatePhrase(phrase, 'ru');

      expect(result).toBe('Позвольте мне подумать об этом...');
    });

    it('should translate using predefined mappings for Spanish', async () => {
      const phrase = 'Give me a moment to process this...';
      const result = await bridge.translatePhrase(phrase, 'es');

      expect(result).toBe('Dame un momento para procesar esto...');
    });

    it('should handle case-insensitive matching', async () => {
      const phrase = 'LET ME THINK ABOUT THIS...';
      const result = await bridge.translatePhrase(phrase, 'ru');

      expect(result).toBe('Позвольте мне подумать об этом...');
    });

    it('should return null for unsupported language', async () => {
      const phrase = 'Hello world';
      const result = await bridge.translatePhrase(phrase, 'fr');

      expect(result).toBeNull();
    });

    it('should return null for unmapped phrase', async () => {
      const phrase = 'This phrase is not in the mappings';
      const result = await bridge.translatePhrase(phrase, 'ru');

      expect(result).toBeNull();
    });
  });

  describe('Pattern-Based Translation', () => {
    it('should translate using patterns for Russian', async () => {
      const phrase = 'Let me think carefully...';
      const result = await bridge.translatePhrase(phrase, 'ru');

      expect(result).toBe('Позвольте мне подумать...');
    });

    it('should translate using patterns for Spanish', async () => {
      const phrase = 'Give me a moment please...';
      const result = await bridge.translatePhrase(phrase, 'es');

      expect(result).toBe('Dame un momento...');
    });

    it('should preserve ellipsis in pattern translations', async () => {
      const phrase = 'Processing something...';
      const result = await bridge.translatePhrase(phrase, 'ru');

      expect(result).toBe('Обрабатываю...');
    });

    it('should handle phrases without ellipsis', async () => {
      const phrase = 'Processing your request';
      const result = await bridge.translatePhrase(phrase, 'ru');

      expect(result).toBe('Обрабатываю');
    });
  });

  describe('Caching Functionality', () => {
    it('should cache translation results', async () => {
      const phrase = 'Let me think about this...';
      const language = 'ru';

      // First call
      const result1 = await bridge.translatePhrase(phrase, language);

      // Second call should use cache
      const result2 = await bridge.translatePhrase(phrase, language);

      expect(result1).toBe(result2);
      expect(bridge.cacheStats.hits).toBe(1);
      expect(bridge.cacheStats.misses).toBe(1);
    });

    it('should cache null results to avoid repeated attempts', async () => {
      const phrase = 'Unmapped phrase';
      const language = 'ru';

      // First call
      const result1 = await bridge.translatePhrase(phrase, language);

      // Second call should use cached null
      const result2 = await bridge.translatePhrase(phrase, language);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(bridge.cacheStats.hits).toBe(1);
    });

    it('should limit cache size', async () => {
      // Fill cache beyond limit
      for (let i = 0; i < 250; i++) {
        await bridge.translatePhrase(`phrase ${i}`, 'ru');
      }

      expect(bridge.translationCache.size).toBeLessThanOrEqual(200);
    });

    it('should clear cache correctly', () => {
      bridge.translationCache.set('test:key', 'test value');
      bridge.cacheStats.hits = 5;

      bridge.clearCache();

      expect(bridge.translationCache.size).toBe(0);
      expect(bridge.cacheStats.hits).toBe(0);
    });
  });

  describe('Language Support', () => {
    it('should return supported languages', () => {
      const languages = bridge.getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('ru');
      expect(languages).toContain('es');
    });

    it('should check language support correctly', () => {
      expect(bridge.isLanguageSupported('en')).toBe(true);
      expect(bridge.isLanguageSupported('ru')).toBe(true);
      expect(bridge.isLanguageSupported('es')).toBe(true);
      expect(bridge.isLanguageSupported('fr')).toBe(false);
    });
  });

  describe('Custom Translations', () => {
    it('should add custom phrase translations', () => {
      const englishPhrase = 'Custom phrase';
      const translations = {
        ru: 'Пользовательская фраза',
        es: 'Frase personalizada'
      };

      bridge.addPhraseTranslation(englishPhrase, 'custom', translations);

      expect(bridge.waitingPhraseTranslations.en[englishPhrase]).toBe('custom');
      expect(bridge.extendedTranslations.ru.custom).toBe(translations.ru);
      expect(bridge.extendedTranslations.es.custom).toBe(translations.es);
    });

    it('should use custom translations', async () => {
      const englishPhrase = 'Custom test phrase';
      const translations = {
        ru: 'Пользовательская тестовая фраза'
      };

      bridge.addPhraseTranslation(englishPhrase, 'customTest', translations);

      const result = await bridge.translatePhrase(englishPhrase, 'ru');
      expect(result).toBe(translations.ru);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track translation statistics', async () => {
      // Successful translation
      await bridge.translatePhrase('Let me think about this...', 'ru');

      // Failed translation
      await bridge.translatePhrase('Unknown phrase', 'ru');

      // Cache hit
      await bridge.translatePhrase('Let me think about this...', 'ru');

      const stats = bridge.getTranslationStats();

      expect(stats.stats.translations).toBe(1);
      expect(stats.stats.failures).toBe(1);
      expect(stats.stats.hits).toBe(1);
      expect(stats.stats.misses).toBe(2);
      expect(stats.stats.hitRate).toBe(1 / 3);
      expect(stats.stats.successRate).toBe(0.5);
    });

    it('should return comprehensive statistics', () => {
      const stats = bridge.getTranslationStats();

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('supportedLanguages');
      expect(stats).toHaveProperty('predefinedPhrases');
      expect(stats).toHaveProperty('stats');

      expect(Array.isArray(stats.supportedLanguages)).toBe(true);
      expect(typeof stats.predefinedPhrases).toBe('number');
    });
  });

  describe('Cache Warmup', () => {
    it('should warm up cache for specified languages', async () => {
      const languages = ['ru', 'es'];
      const phrases = ['Let me think about this...', 'Give me a moment...'];

      await bridge.warmUpCache(languages, phrases);

      // Check that translations were cached
      for (const lang of languages) {
        for (const phrase of phrases) {
          const cacheKey = `${phrase}:${lang}`;
          expect(bridge.translationCache.has(cacheKey)).toBe(true);
        }
      }
    });

    it('should handle warmup errors gracefully', async () => {
      // Mock translation to throw error
      const originalTranslate = bridge.translatePhrase;
      bridge.translatePhrase = vi.fn().mockRejectedValue(new Error('Translation error'));

      await bridge.warmUpCache(['ru'], ['test phrase']);

      expect(mockConsole.warn).toHaveBeenCalled();

      // Restore original method
      bridge.translatePhrase = originalTranslate;
    });
  });

  describe('Import/Export Functionality', () => {
    it('should export translations correctly', () => {
      bridge.addPhraseTranslation('Test phrase', 'test', { ru: 'Тест' });

      const exported = bridge.exportTranslations();

      expect(exported).toHaveProperty('mappings');
      expect(exported).toHaveProperty('translations');
      expect(exported).toHaveProperty('cache');
      expect(exported).toHaveProperty('stats');

      expect(exported.mappings.en['Test phrase']).toBe('test');
      expect(exported.translations.ru.test).toBe('Тест');
    });

    it('should import translations correctly', () => {
      const translationData = {
        mappings: {
          en: {
            'Imported phrase': 'imported'
          }
        },
        translations: {
          ru: {
            imported: 'Импортированная фраза'
          }
        }
      };

      bridge.importTranslations(translationData);

      expect(bridge.waitingPhraseTranslations.en['Imported phrase']).toBe('imported');
      expect(bridge.extendedTranslations.ru.imported).toBe('Импортированная фраза');
    });
  });

  describe('Error Handling', () => {
    it('should handle translation errors gracefully', async () => {
      // Mock internal method to throw error
      const originalMethod = bridge._translateUsingPredefinedMappings;
      bridge._translateUsingPredefinedMappings = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await bridge.translatePhrase('Test phrase', 'ru');

      expect(result).toBeNull();
      expect(mockConsole.error).toHaveBeenCalled();

      // Restore original method
      bridge._translateUsingPredefinedMappings = originalMethod;
    });

    it('should handle invalid inputs', async () => {
      const result1 = await bridge.translatePhrase('', 'ru');
      const result2 = await bridge.translatePhrase(null, 'ru');
      const result3 = await bridge.translatePhrase('test', '');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });
});
