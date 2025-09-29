import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WaitingPhrasesService } from '../../../src/lib/modules/chat/waitingPhrasesService.js';
import { translationBridge } from '../../../src/lib/modules/chat/translationBridge.js';
import { emitWaitingPhraseIncrementally } from '../../../src/lib/modules/chat/services.js';
import { synthesizeWaitingPhrase } from '../../../src/lib/modules/chat/voiceServices.js';
import { addMessage } from '../../../src/lib/modules/chat/stores';

const mockVoiceModeStore = vi.hoisted(() => {
  const store = {
    __value: false,
    subscribe: vi.fn(),
    set: vi.fn((value) => {
      store.__value = value;
    }),
    get: () => store.__value
  };

  return store;
});

// Mock svelte/store
vi.mock('svelte/store', async () => {
  const actual = await vi.importActual('svelte/store');
  return {
    ...actual,
    get: vi.fn((store) => {
      if (store && typeof store.get === 'function') {
        return store.get();
      }
      return 'en';
    })
  };
});

// Mock the dependencies
vi.mock('../../../src/lib/modules/chat/waitingPhrasesConfig.js', () => ({
  loadWaitingPhrasesConfig: vi.fn(),
  getPhrasesForLanguage: vi.fn((config, language, category) => {
    // Mock implementation that returns phrases for language/category
    if (
      !config ||
      !config.phrases ||
      !config.phrases[category] ||
      !config.phrases[category][language]
    ) {
      return [];
    }
    return config.phrases[category][language];
  }),
  isLanguageSupported: vi.fn((config, language, category) => {
    // Mock implementation that checks if language exists in config
    if (!config || !config.phrases || !config.phrases[category]) {
      return language === 'en';
    }
    return Object.prototype.hasOwnProperty.call(config.phrases[category], language);
  })
}));

// Mock chat stores for incremental waiting phrase tests
const mockMessages: any[] = [];
vi.mock('../../../src/lib/modules/chat/stores', () => ({
  addMessage: vi.fn((type, content, _images, id, meta) => {
    mockMessages.push({ id, type, content, ...meta });
  }),
  updateMessage: vi.fn((id, updates) => {
    const msg = mockMessages.find((m) => m.id === id);
    if (msg) Object.assign(msg, updates);
  }),
  messages: {
    get: () => mockMessages
  }
}));

vi.mock('../../../src/lib/modules/chat/voiceServices.js', () => ({
  synthesizeWaitingPhrase: vi.fn(() => Promise.resolve()),
  isVoiceModeActive: mockVoiceModeStore
}));

vi.mock('../../../src/lib/modules/i18n/stores', () => ({
  selectedLanguage: {
    subscribe: vi.fn(),
    get: vi.fn(() => 'en')
  },
  languages: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'ru', name: 'Russian' }
  ]
}));

vi.mock('../../../src/lib/modules/chat/translationBridge.js', () => ({
  translationBridge: {
    translatePhrase: vi.fn(),
    clearCache: vi.fn(),
    getTranslationStats: vi.fn(),
    warmUpCache: vi.fn(),
    addPhraseTranslation: vi.fn()
  }
}));

describe('WaitingPhrasesService', () => {
  let service: WaitingPhrasesService;
  let mockConfig: any;
  let mockConsole: any;

  beforeEach(() => {
    // Create fresh service instance for each test
    service = new WaitingPhrasesService();

    // Mock console methods
    mockConsole = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    vi.stubGlobal('console', mockConsole);

    // Mock configuration
    mockConfig = {
      phrases: {
        general: {
          en: [
            'Let me think about this...',
            'Give me a moment to process this...',
            'Hmm, interesting question...'
          ],
          es: ['Déjame pensar en esto...', 'Dame un momento para procesar esto...'],
          ru: ['Позвольте мне подумать об этом...']
        },
        math: {
          en: ['Calculating this problem...', 'Working on the math...']
        }
      },
      settings: {
        avoidConsecutiveRepeats: true,
        maxPhraseLength: 8,
        fallbackToTranslation: true,
        defaultLanguage: 'en',
        maxHistorySize: 5,
        enableContextualPhrases: false
      }
    };

    // Set up the service with mock config
    service.config = mockConfig;
    service.isInitialized = true;
    service.supportedLanguages = new Set(['en', 'es', 'ru']);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockMessages.length = 0;
    mockVoiceModeStore.__value = false;
  });

  describe('Phrase Selection Logic', () => {
    it('should select random phrase without consecutive repeats', () => {
      const phrases = ['phrase1', 'phrase2', 'phrase3'];

      // First selection
      const first = service._selectRandomPhrase(phrases, 'general');
      expect(phrases).toContain(first);

      // Update history to simulate previous selection
      service.lastSelectedPhrase = first;
      service.lastSelectedCategory = 'general';

      // Second selection should avoid the first phrase
      const second = service._selectRandomPhrase(phrases, 'general');
      expect(phrases).toContain(second);

      // With 3 phrases and avoiding 1, we should get a different phrase most of the time
      // Run multiple times to increase confidence
      let differentCount = 0;
      for (let i = 0; i < 10; i++) {
        const selection = service._selectRandomPhrase(phrases, 'general');
        if (selection !== first) {
          differentCount++;
        }
      }
      expect(differentCount).toBeGreaterThan(5); // Should avoid repeat more than half the time
    });

    it('should handle single phrase gracefully', () => {
      const phrases = ['only phrase'];
      const selected = service._selectRandomPhrase(phrases, 'general');
      expect(selected).toBe('only phrase');
    });

    it('should throw error for empty phrase array', () => {
      expect(() => {
        service._selectRandomPhrase([], 'general');
      }).toThrow('No phrases available for selection');
    });

    it('should handle null or undefined phrases', () => {
      expect(() => {
        service._selectRandomPhrase(null as any, 'general');
      }).toThrow('No phrases available for selection');

      expect(() => {
        service._selectRandomPhrase(undefined as any, 'general');
      }).toThrow('No phrases available for selection');
    });
  });

  describe('Language Detection and Fallback', () => {
    it('should detect target language correctly', () => {
      // Test explicit language
      const result1 = service._detectTargetLanguage('es');
      expect(result1).toBe('es');

      // Test fallback to English for invalid language
      const result2 = service._detectTargetLanguage('invalid' as any);
      expect(result2).toBe('en');

      // Test null language
      const result3 = service._detectTargetLanguage(null as any);
      expect(result3).toBe('en');
    });

    it('should validate language codes correctly', () => {
      expect(service._isValidLanguageCode('en')).toBe(true);
      expect(service._isValidLanguageCode('es')).toBe(true);
      expect(service._isValidLanguageCode('ru')).toBe(true);
      expect(service._isValidLanguageCode('invalid')).toBe(false);
      expect(service._isValidLanguageCode(null as any)).toBe(false);
      expect(service._isValidLanguageCode('')).toBe(false);
    });
  });

  describe('Phrase History Management', () => {
    it('should update phrase history correctly', () => {
      const phrase = 'Test phrase';
      const category = 'general';

      service._updatePhraseHistory(phrase, category);

      expect(service.phraseHistory).toHaveLength(1);
      expect(service.phraseHistory[0].phrase).toBe(phrase);
      expect(service.phraseHistory[0].category).toBe(category);
      expect(service.phraseHistory[0].timestamp).toBeDefined();
      expect(service.lastSelectedPhrase).toBe(phrase);
      expect(service.lastSelectedCategory).toBe(category);
    });

    it('should maintain history size limit', () => {
      const maxSize = service.config.settings.maxHistorySize;

      // Add more phrases than the limit
      for (let i = 0; i < maxSize + 3; i++) {
        service._updatePhraseHistory(`phrase ${i}`, 'general');
      }

      expect(service.phraseHistory).toHaveLength(maxSize);

      // Check that the oldest entries were removed
      const firstEntry = service.phraseHistory[0];
      expect(firstEntry.phrase).toBe(`phrase ${3}`); // Should start from phrase 3
    });

    it('should clear history correctly', () => {
      service._updatePhraseHistory('test phrase', 'general');
      expect(service.phraseHistory).toHaveLength(1);

      service.clearPhraseHistory();

      expect(service.phraseHistory).toHaveLength(0);
      expect(service.lastSelectedPhrase).toBeNull();
      expect(service.lastSelectedCategory).toBeNull();
    });

    it('should return copy of history', () => {
      service._updatePhraseHistory('test phrase', 'general');
      const history = service.getPhraseHistory();

      expect(history).toHaveLength(1);
      expect(history).not.toBe(service.phraseHistory); // Should be a copy

      // Modifying returned history should not affect internal history
      history.push({ phrase: 'new phrase' } as any);
      expect(service.phraseHistory).toHaveLength(1);
    });
  });

  describe('Translation Integration', () => {
    it('should use translation bridge for phrase translation', async () => {
      const phrase = 'Test phrase';
      const targetLanguage = 'es';
      const translatedPhrase = 'Frase de prueba';

      translationBridge.translatePhrase.mockResolvedValue(translatedPhrase);

      const result = await service._translatePhrase(phrase, targetLanguage);

      expect(translationBridge.translatePhrase).toHaveBeenCalledWith(phrase, targetLanguage);
      expect(result).toBe(translatedPhrase);
    });

    it('should handle translation errors gracefully', async () => {
      const phrase = 'Test phrase';
      const targetLanguage = 'es';

      translationBridge.translatePhrase.mockRejectedValue(new Error('Translation failed'));

      const result = await service._translatePhrase(phrase, targetLanguage);

      expect(result).toBeNull();
      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error translating phrase:',
        expect.any(Error)
      );
    });

    it('should warm up translation cache', async () => {
      await service.warmUpTranslationCache('es');

      expect(translationBridge.warmUpCache).toHaveBeenCalledWith(['es'], expect.any(Array));
    });

    it('should skip warmup for English', async () => {
      await service.warmUpTranslationCache('en');

      expect(translationBridge.warmUpCache).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle translation service errors', () => {
      const error = new Error('Translation service down');
      const phrase = 'Test phrase';
      const targetLanguage = 'es';

      const result = service._handleTranslationError(error, phrase, targetLanguage);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should return original phrase for English target', () => {
      const error = new Error('Some error');
      const phrase = 'Test phrase';
      const targetLanguage = 'en';

      const result = service._handleTranslationError(error, phrase, targetLanguage);

      expect(result).toBe(phrase);
    });

    it('should provide fallback phrases for different languages', () => {
      const fallbackEn = service._getFallbackPhrase('en', 'general');
      const fallbackEs = service._getFallbackPhrase('es', 'general');
      const fallbackRu = service._getFallbackPhrase('ru', 'general');

      expect(fallbackEn).toBeDefined();
      expect(fallbackEs).toBeDefined();
      expect(fallbackRu).toBeDefined();

      expect(typeof fallbackEn).toBe('string');
      expect(typeof fallbackEs).toBe('string');
      expect(typeof fallbackRu).toBe('string');
    });

    it('should check translation service availability', async () => {
      translationBridge.translatePhrase.mockResolvedValue('Translated');

      const isAvailable = await service.isTranslationServiceAvailable('es');

      expect(isAvailable).toBe(true);
      expect(translationBridge.translatePhrase).toHaveBeenCalledWith('Hello', 'es');
    });

    it('should detect translation service unavailability', async () => {
      translationBridge.translatePhrase.mockRejectedValue(new Error('Service down'));

      const isAvailable = await service.isTranslationServiceAvailable('es');

      expect(isAvailable).toBe(false);
    });
  });

  describe('Caching and Performance', () => {
    it('should cache phrases correctly', () => {
      const cacheKey = 'en:general';
      const phrases = ['phrase1', 'phrase2'];

      service._cachePhrases(cacheKey, phrases);

      const cached = service._getCachedPhrases(cacheKey);
      expect(cached).toEqual(phrases);
    });

    it('should return null for non-existent cache key', () => {
      const cached = service._getCachedPhrases('nonexistent:key');
      expect(cached).toBeNull();
    });

    it('should manage cache size', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 60; i++) {
        service._cachePhrases(`key${i}:category`, [`phrase${i}`]);
      }

      // Cache should be limited
      expect(service.phraseCache.size).toBeLessThanOrEqual(50);
    });

    it('should update access statistics', () => {
      const cacheKey = 'en:general';
      const phrases = ['phrase1', 'phrase2'];

      service._cachePhrases(cacheKey, phrases);

      // Access the cache multiple times
      service._getCachedPhrases(cacheKey);
      service._getCachedPhrases(cacheKey);

      const cacheEntry = service.phraseCache.get(cacheKey);
      expect(cacheEntry.accessCount).toBe(2);
    });

    it('should optimize cache by removing old entries', () => {
      // Add some entries with old timestamps
      const oldEntry = {
        phrases: ['old phrase'],
        timestamp: Date.now() - 40 * 60 * 1000, // 40 minutes ago
        accessCount: 0,
        lastAccessed: Date.now() - 40 * 60 * 1000
      };

      service.phraseCache.set('old:key', oldEntry as any);

      const initialSize = service.phraseCache.size;
      service.optimizeCache();

      expect(service.phraseCache.size).toBeLessThan(initialSize);
      expect(service.phraseCache.has('old:key')).toBe(false);
    });
  });

  describe('Configuration and Settings', () => {
    it('should return available categories', () => {
      const categories = service.getAvailableCategories();
      expect(categories).toEqual(['general', 'math']);
    });

    it('should return available languages for category', () => {
      const languages = service.getAvailableLanguages('general');
      expect(languages).toEqual(['en', 'es', 'ru']);
    });

    it('should check language support correctly', () => {
      expect(service.isLanguageSupported('en', 'general')).toBe(true);
      expect(service.isLanguageSupported('es', 'general')).toBe(true);
      expect(service.isLanguageSupported('fr', 'general')).toBe(false);
    });

    it('should return settings', () => {
      const settings = service.getSettings();
      expect(settings).toEqual(mockConfig.settings);
      expect(settings).not.toBe(mockConfig.settings); // Should be a copy
    });

    it('should return cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('historySize');
      expect(stats).toHaveProperty('currentLanguage');
      expect(stats).toHaveProperty('supportedLanguages');
    });
  });

  describe('Initialization and State', () => {
    it('should report initialization status correctly', () => {
      expect(service.isServiceInitialized()).toBe(true);

      service.isInitialized = false;
      expect(service.isServiceInitialized()).toBe(false);
    });

    it('should handle uninitialized state gracefully', () => {
      service.isInitialized = false;
      service.config = null as any;

      const categories = service.getAvailableCategories();
      expect(categories).toEqual(['DefaultWaitingAnswer']);
    });
  });

  describe('emitWaitingPhraseIncrementally', () => {
    it('should emit sentences sequentially with delays', async () => {
      vi.useFakeTimers();

      const phrase = 'First sentence. Second sentence? Third sentence!';
      const ids = emitWaitingPhraseIncrementally(phrase, 100);

      expect(ids).toHaveLength(3);
      expect(addMessage).toHaveBeenNthCalledWith(1, 'tutor', 'First sentence.', null, ids[0], {
        waiting: true
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(addMessage).toHaveBeenNthCalledWith(2, 'tutor', 'Second sentence?', null, ids[1], {
        waiting: true
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(addMessage).toHaveBeenNthCalledWith(3, 'tutor', 'Third sentence!', null, ids[2], {
        waiting: true
      });

      vi.useRealTimers();
    });

    it('should default to 2-second intervals in text mode', async () => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const phrase = 'Intro sentence. Follow-up sentence.';
      const ids = emitWaitingPhraseIncrementally(phrase);

      expect(ids).toHaveLength(2);
      expect(addMessage).toHaveBeenCalledTimes(1);
      expect(addMessage).toHaveBeenNthCalledWith(1, 'tutor', 'Intro sentence.', null, ids[0], {
        waiting: true
      });

      await vi.advanceTimersByTimeAsync(1999);
      expect(addMessage).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(addMessage).toHaveBeenNthCalledWith(2, 'tutor', 'Follow-up sentence.', null, ids[1], {
        waiting: true
      });

      randomSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should use 4-second intervals when voice mode is active', async () => {
      vi.useFakeTimers();
      mockVoiceModeStore.__value = true;
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const phrase = 'Voice first. Voice second.';
      const ids = emitWaitingPhraseIncrementally(phrase);

      expect(ids).toHaveLength(2);
      expect(addMessage).toHaveBeenCalledTimes(1);
      expect(addMessage).toHaveBeenNthCalledWith(1, 'tutor', 'Voice first.', null, ids[0], {
        waiting: true
      });

      await vi.advanceTimersByTimeAsync(3999);
      expect(addMessage).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(addMessage).toHaveBeenNthCalledWith(2, 'tutor', 'Voice second.', null, ids[1], {
        waiting: true
      });

      mockVoiceModeStore.__value = false;
      randomSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should extend delays for longer sentences in text mode', () => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const timeoutSpy = vi.spyOn(global, 'setTimeout');

      const longSentence =
        'This sentence intentionally includes far more descriptive words to guarantee additional thoughtful breathing space for testing purposes today.';
      const phrase = `Short one. ${longSentence}`;
      emitWaitingPhraseIncrementally(phrase);

      const wordCount = longSentence.trim().split(/\s+/).filter(Boolean).length;
      const expectedDelay = 2000 + Math.max(0, wordCount - 12) * 80;

      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedDelay);

      timeoutSpy.mockRestore();
      randomSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should synthesize each sentence separately in voice mode', async () => {
      vi.useFakeTimers();
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      mockVoiceModeStore.__value = true;
      synthesizeWaitingPhrase.mockClear();

      const phrase = 'Audio first sentence. Audio follow up sentence.';
      emitWaitingPhraseIncrementally(phrase);

      expect(synthesizeWaitingPhrase).toHaveBeenNthCalledWith(1, 'Audio first sentence.');
      expect(synthesizeWaitingPhrase).not.toHaveBeenCalledWith(phrase);

      await vi.advanceTimersByTimeAsync(3999);
      expect(synthesizeWaitingPhrase).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(synthesizeWaitingPhrase).toHaveBeenNthCalledWith(2, 'Audio follow up sentence.');

      mockVoiceModeStore.__value = false;
      randomSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should keep single synthesis call when override delay is provided', () => {
      vi.useFakeTimers();
      mockVoiceModeStore.__value = true;
      synthesizeWaitingPhrase.mockClear();

      const phrase = 'Override first. Override second.';
      emitWaitingPhraseIncrementally(phrase, 1500);

      expect(synthesizeWaitingPhrase).toHaveBeenCalledTimes(1);
      expect(synthesizeWaitingPhrase).toHaveBeenCalledWith(phrase);

      mockVoiceModeStore.__value = false;
      vi.useRealTimers();
    });
  });
});
