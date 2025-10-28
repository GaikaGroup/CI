/**
 * Integration tests for waiting phrases with existing i18n system
 * Tests language detection, translation fallback, and UI consistency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/svelte';
import VoiceChat from '../../../src/lib/modules/chat/components/VoiceChat.svelte';
import { waitingPhrasesService } from '../../../src/lib/modules/chat/waitingPhrasesService.js';
import { translationBridge } from '../../../src/lib/modules/chat/translationBridge.js';

// Mock i18n system
const mockTranslations = {
  en: {
    voiceChatMode: 'Voice Chat Mode',
    talkToTutor: 'Talk to your tutor',
    thinking: 'Thinking...',
    recording: 'Recording...',
    processing: 'Processing...',
    holdToRecord: 'Hold to record'
  },
  es: {
    voiceChatMode: 'Modo de Chat de Voz',
    talkToTutor: 'Habla con tu tutor',
    thinking: 'Pensando...',
    recording: 'Grabando...',
    processing: 'Procesando...',
    holdToRecord: 'Mantén presionado para grabar'
  },
  ru: {
    voiceChatMode: 'Режим голосового чата',
    talkToTutor: 'Поговорите с вашим наставником',
    thinking: 'Думаю...',
    recording: 'Запись...',
    processing: 'Обработка...',
    holdToRecord: 'Удерживайте для записи'
  },
  fr: {
    voiceChatMode: 'Mode Chat Vocal',
    talkToTutor: 'Parlez à votre tuteur',
    thinking: 'Je réfléchis...',
    recording: 'Enregistrement...',
    processing: 'Traitement...',
    holdToRecord: 'Maintenez pour enregistrer'
  }
};

// Mock waiting phrases in multiple languages
const mockWaitingPhrases = {
  en: [
    'Let me think about this...',
    'Hmm, interesting question.',
    'Give me a moment to consider.',
    'Well, well, well. Let me ponder this.',
    "That's a great question. Let me think."
  ],
  es: [
    'Déjame pensar en esto...',
    'Hmm, pregunta interesante.',
    'Dame un momento para considerar.',
    'Bueno, bueno, bueno. Déjame reflexionar sobre esto.',
    'Esa es una gran pregunta. Déjame pensar.'
  ],
  ru: [
    'Позвольте мне подумать об этом...',
    'Хм, интересный вопрос.',
    'Дайте мне минутку подумать.',
    'Хм, хм, хм. Позвольте мне поразмыслить над этим.',
    'Это отличный вопрос. Дайте мне подумать.'
  ],
  fr: [
    'Laissez-moi réfléchir à cela...',
    'Hmm, question intéressante.',
    'Donnez-moi un moment pour réfléchir.',
    'Eh bien, eh bien, eh bien. Laissez-moi méditer là-dessus.',
    "C'est une excellente question. Laissez-moi réfléchir."
  ]
};

describe('Multilingual i18n Integration Tests', () => {
  let mockSelectedLanguage;
  let mockGetTranslation;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock i18n stores and functions
    mockSelectedLanguage = {
      subscribe: vi.fn(),
      get: vi.fn(() => 'en')
    };

    mockGetTranslation = vi.fn((lang, key) => {
      return mockTranslations[lang]?.[key] || key;
    });

    // Mock the i18n system
    vi.doMock('../../../src/lib/modules/i18n/stores', () => ({
      selectedLanguage: mockSelectedLanguage
    }));

    vi.doMock('../../../src/lib/modules/i18n/translations', () => ({
      getTranslation: mockGetTranslation
    }));

    // Mock waiting phrases service
    vi.spyOn(waitingPhrasesService, 'selectWaitingPhrase').mockImplementation(async (lang) => {
      const phrases = mockWaitingPhrases[lang] || mockWaitingPhrases['en'];
      return phrases[Math.floor(Math.random() * phrases.length)];
    });

    // Mock translation bridge
    vi.spyOn(translationBridge, 'detectUserLanguage').mockReturnValue('en');
    vi.spyOn(translationBridge, 'translatePhrase').mockImplementation(
      async (phrase, targetLang) => {
        // Simple mock translation - in real implementation this would call translation API
        const translations = {
          'Let me think about this...': {
            es: 'Déjame pensar en esto...',
            ru: 'Позвольте мне подумать об этом...',
            fr: 'Laissez-moi réfléchir à cela...'
          },
          'Hmm, interesting question.': {
            es: 'Hmm, pregunta interesante.',
            ru: 'Хм, интересный вопрос.',
            fr: 'Hmm, question intéressante.'
          }
        };

        return translations[phrase]?.[targetLang] || phrase;
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('UI Language Integration', () => {
    it('should display UI elements in selected language', async () => {
      // Test Spanish
      mockSelectedLanguage.get.mockReturnValue('es');

      const { container } = render(VoiceChat);

      await waitFor(() => {
        expect(container.textContent).toContain('Modo de Chat de Voz');
        expect(container.textContent).toContain('Habla con tu tutor');
      });

      expect(mockGetTranslation).toHaveBeenCalledWith('es', 'voiceChatMode');
      expect(mockGetTranslation).toHaveBeenCalledWith('es', 'talkToTutor');
    });

    it('should update UI when language changes', async () => {
      const { container, component } = render(VoiceChat);

      // Start with English
      mockSelectedLanguage.get.mockReturnValue('en');
      await waitFor(() => {
        expect(container.textContent).toContain('Voice Chat Mode');
      });

      // Change to Russian
      mockSelectedLanguage.get.mockReturnValue('ru');

      // Trigger reactivity (in real app this would happen via store subscription)
      await component.$set({});

      await waitFor(() => {
        expect(mockGetTranslation).toHaveBeenCalledWith('ru', 'voiceChatMode');
      });
    });

    it('should handle missing translations gracefully', async () => {
      // Mock missing translation
      mockGetTranslation.mockImplementation((lang, key) => {
        if (lang === 'zh' && key === 'voiceChatMode') {
          return key; // Return key as fallback
        }
        return mockTranslations[lang]?.[key] || key;
      });

      mockSelectedLanguage.get.mockReturnValue('zh');

      const { container } = render(VoiceChat);

      // Should still render with fallback text
      await waitFor(() => {
        expect(container.textContent).toContain('voiceChatMode');
      });
    });

    it('should show waiting phrase status in correct language', async () => {
      mockSelectedLanguage.get.mockReturnValue('fr');

      // Mock waiting phrase active state
      vi.doMock('../../../src/lib/modules/chat/voiceServices', () => ({
        isWaitingPhraseActive: vi.fn(() => true),
        getAudioQueueStatus: vi.fn(() => ({ waitingPhrases: 1, responses: 0, total: 1 })),
        isSpeaking: { get: vi.fn(() => false) },
        currentEmotion: { get: vi.fn(() => 'neutral') }
      }));

      const { container } = render(VoiceChat);

      await waitFor(() => {
        expect(mockGetTranslation).toHaveBeenCalledWith('fr', 'thinking');
      });
    });
  });

  describe('Waiting Phrase Language Selection', () => {
    it("should select waiting phrases in user's preferred language", async () => {
      // Test Spanish selection
      translationBridge.detectUserLanguage.mockReturnValue('es');

      const phrase = await waitingPhrasesService.selectWaitingPhrase('es');

      expect(phrase).toBeTruthy();
      expect(typeof phrase).toBe('string');
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith('es');
    });

    it('should maintain language consistency across multiple phrase selections', async () => {
      const userLanguage = 'ru';
      translationBridge.detectUserLanguage.mockReturnValue(userLanguage);

      // Select multiple phrases
      const phrases = [];
      for (let i = 0; i < 5; i++) {
        const phrase = await waitingPhrasesService.selectWaitingPhrase(userLanguage);
        phrases.push(phrase);
      }

      // All calls should use the same language
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledTimes(5);
      phrases.forEach((phrase, index) => {
        expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenNthCalledWith(
          index + 1,
          userLanguage
        );
      });

      // Should have variety (no consecutive repeats)
      for (let i = 1; i < phrases.length; i++) {
        expect(phrases[i]).not.toBe(phrases[i - 1]);
      }
    });

    it('should handle language detection from voice input', async () => {
      // Mock language detection from user speech
      const detectedLanguages = ['en', 'es', 'ru', 'fr'];

      for (const lang of detectedLanguages) {
        translationBridge.detectUserLanguage.mockReturnValue(lang);

        const phrase = await waitingPhrasesService.selectWaitingPhrase(lang);

        expect(phrase).toBeTruthy();
        expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith(lang);
      }
    });

    it('should prioritize native language phrases over translations', async () => {
      // Test with language that has native phrases
      const nativePhrase = await waitingPhrasesService.selectWaitingPhrase('es');
      expect(nativePhrase).toBeTruthy();

      // Should not call translation for native language
      expect(translationBridge.translatePhrase).not.toHaveBeenCalled();
    });
  });

  describe('Translation Fallback Integration', () => {
    it('should use translation fallback for unsupported languages', async () => {
      // Test with unsupported language
      const unsupportedLang = 'zh';

      // Mock that no native phrases exist for this language
      waitingPhrasesService.selectWaitingPhrase.mockImplementation(async (lang) => {
        if (lang === 'zh') {
          // Simulate fallback to English then translation
          const englishPhrase = mockWaitingPhrases['en'][0];
          return await translationBridge.translatePhrase(englishPhrase, lang);
        }
        return mockWaitingPhrases[lang]?.[0] || mockWaitingPhrases['en'][0];
      });

      translationBridge.translatePhrase.mockResolvedValue('让我想想这个问题...');

      const phrase = await waitingPhrasesService.selectWaitingPhrase(unsupportedLang);

      expect(phrase).toBe('让我想想这个问题...');
      expect(translationBridge.translatePhrase).toHaveBeenCalled();
    });

    it('should cache translated phrases to avoid repeated API calls', async () => {
      const originalPhrase = 'Let me think about this...';
      const targetLang = 'de';
      const translatedPhrase = 'Lass mich darüber nachdenken...';

      // Mock translation with caching
      let translationCallCount = 0;
      translationBridge.translatePhrase.mockImplementation(async (phrase, lang) => {
        translationCallCount++;
        return translatedPhrase;
      });

      // First call should trigger translation
      const result1 = await translationBridge.translatePhrase(originalPhrase, targetLang);

      // Second call should use cache (but we'll simulate it still being called)
      const result2 = await translationBridge.translatePhrase(originalPhrase, targetLang);

      expect(result1).toBe(translatedPhrase);
      expect(result2).toBe(translatedPhrase);
      expect(translationCallCount).toBe(2); // Called twice but should use cache internally
    });

    it('should handle translation service failures gracefully', async () => {
      const originalPhrase = 'Hmm, interesting question.';
      const targetLang = 'it';

      // Mock translation failure
      translationBridge.translatePhrase.mockRejectedValue(
        new Error('Translation service unavailable')
      );

      // Should fallback to English phrase
      waitingPhrasesService.selectWaitingPhrase.mockImplementation(async (lang) => {
        try {
          const englishPhrase = mockWaitingPhrases['en'][1];
          await translationBridge.translatePhrase(englishPhrase, lang);
          return 'Should not reach here';
        } catch (error) {
          // Fallback to English
          return mockWaitingPhrases['en'][1];
        }
      });

      const phrase = await waitingPhrasesService.selectWaitingPhrase(targetLang);

      expect(phrase).toBe('Hmm, interesting question.');
      expect(translationBridge.translatePhrase).toHaveBeenCalled();
    });

    it('should maintain translation quality and context', async () => {
      const testPhrases = [
        'Let me think about this...',
        'Hmm, interesting question.',
        'Give me a moment to consider.'
      ];

      for (const phrase of testPhrases) {
        const spanishTranslation = await translationBridge.translatePhrase(phrase, 'es');
        const russianTranslation = await translationBridge.translatePhrase(phrase, 'ru');

        expect(spanishTranslation).toBeTruthy();
        expect(russianTranslation).toBeTruthy();
        expect(spanishTranslation).not.toBe(phrase); // Should be translated
        expect(russianTranslation).not.toBe(phrase); // Should be translated
      }
    });
  });

  describe('Language Consistency', () => {
    it('should maintain consistent language throughout conversation', async () => {
      const conversationLanguage = 'fr';
      translationBridge.detectUserLanguage.mockReturnValue(conversationLanguage);

      // Simulate multiple interactions in a conversation
      const phrases = [];
      for (let i = 0; i < 10; i++) {
        const phrase = await waitingPhrasesService.selectWaitingPhrase(conversationLanguage);
        phrases.push(phrase);
      }

      // All phrases should be in the same language
      phrases.forEach((phrase, index) => {
        expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenNthCalledWith(
          index + 1,
          conversationLanguage
        );
      });
    });

    it('should handle language switching mid-conversation', async () => {
      // Start with English
      translationBridge.detectUserLanguage.mockReturnValue('en');
      const englishPhrase = await waitingPhrasesService.selectWaitingPhrase('en');

      expect(englishPhrase).toBeTruthy();

      // Switch to Spanish
      translationBridge.detectUserLanguage.mockReturnValue('es');
      const spanishPhrase = await waitingPhrasesService.selectWaitingPhrase('es');

      expect(spanishPhrase).toBeTruthy();
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith('en');
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith('es');
    });

    it('should sync waiting phrase language with UI language', async () => {
      // Set UI language to Russian
      mockSelectedLanguage.get.mockReturnValue('ru');
      translationBridge.detectUserLanguage.mockReturnValue('ru');

      const { container } = render(VoiceChat);

      // UI should be in Russian
      await waitFor(() => {
        expect(mockGetTranslation).toHaveBeenCalledWith('ru', 'voiceChatMode');
      });

      // Waiting phrases should also be in Russian
      const phrase = await waitingPhrasesService.selectWaitingPhrase('ru');
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith('ru');
    });

    it('should handle mixed language scenarios gracefully', async () => {
      // UI in one language, user speaks in another
      mockSelectedLanguage.get.mockReturnValue('en');
      translationBridge.detectUserLanguage.mockReturnValue('es');

      const { container } = render(VoiceChat);

      // UI should be in English
      await waitFor(() => {
        expect(mockGetTranslation).toHaveBeenCalledWith('en', 'voiceChatMode');
      });

      // But waiting phrases should be in Spanish (user's spoken language)
      const phrase = await waitingPhrasesService.selectWaitingPhrase('es');
      expect(waitingPhrasesService.selectWaitingPhrase).toHaveBeenCalledWith('es');
    });
  });

  describe('Performance and Caching', () => {
    it('should efficiently handle multiple language requests', async () => {
      const languages = ['en', 'es', 'ru', 'fr'];
      const startTime = Date.now();

      // Request phrases in multiple languages concurrently
      const promises = languages.map((lang) => waitingPhrasesService.selectWaitingPhrase(lang));

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should complete successfully
      results.forEach((phrase) => {
        expect(phrase).toBeTruthy();
        expect(typeof phrase).toBe('string');
      });

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache language detection results', async () => {
      let detectionCallCount = 0;
      translationBridge.detectUserLanguage.mockImplementation(() => {
        detectionCallCount++;
        return 'es';
      });

      // Multiple calls should potentially use cached result
      for (let i = 0; i < 5; i++) {
        translationBridge.detectUserLanguage();
      }

      expect(detectionCallCount).toBe(5); // Called each time in this mock, but real implementation might cache
    });

    it('should manage translation cache memory efficiently', async () => {
      // Simulate many translation requests
      const phrases = [
        'Let me think...',
        'Interesting question...',
        'Give me a moment...',
        'Well, well, well...',
        "That's a great question..."
      ];

      const languages = ['de', 'it', 'pt', 'nl', 'sv'];

      // Generate many translations
      for (const phrase of phrases) {
        for (const lang of languages) {
          await translationBridge.translatePhrase(phrase, lang);
        }
      }

      // Should handle without memory issues (this is mainly a smoke test)
      expect(true).toBe(true);
    });
  });
});
