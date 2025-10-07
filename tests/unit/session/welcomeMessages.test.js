/**
 * Tests for Welcome Message Generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateWelcomeMessage,
  generateContinuationMessage,
  getSupportedLanguages,
  isLanguageSupported
} from '../../../src/lib/modules/session/utils/welcomeMessages.js';

describe('Welcome Messages', () => {
  describe('generateWelcomeMessage', () => {
    it('should generate fun mode welcome message in English', () => {
      const message = generateWelcomeMessage('fun', 'en');
      expect(message).toContain('🎉');
      expect(message).toContain('AI tutor');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should generate learn mode welcome message in English', () => {
      const message = generateWelcomeMessage('learn', 'en');
      expect(message).toContain('📚');
      expect(message).toContain('AI tutor');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should generate welcome message in Russian', () => {
      const message = generateWelcomeMessage('fun', 'ru');
      expect(message).toContain('🎉');
      expect(message).toContain('AI-репетитор');
    });

    it('should generate welcome message in Spanish', () => {
      const message = generateWelcomeMessage('fun', 'es');
      expect(message).toContain('🎉');
      expect(message).toContain('tutor de IA');
    });

    it('should fallback to English for unsupported language', () => {
      const message = generateWelcomeMessage('fun', 'unsupported');
      expect(message).toContain('🎉');
      expect(message).toContain('AI tutor');
    });

    it('should handle language variants (e.g., en-US)', () => {
      const message = generateWelcomeMessage('fun', 'en-US');
      expect(message).toContain('🎉');
      expect(message).toContain('AI tutor');
    });

    it('should default to fun mode for invalid mode', () => {
      const message = generateWelcomeMessage('invalid', 'en');
      expect(message).toContain('🎉');
    });

    it('should generate different messages for different modes', () => {
      const funMessage = generateWelcomeMessage('fun', 'en');
      const learnMessage = generateWelcomeMessage('learn', 'en');
      expect(funMessage).not.toBe(learnMessage);
    });
  });

  describe('generateContinuationMessage', () => {
    it('should generate continuation message without session title', () => {
      const message = generateContinuationMessage('fun', 'en');
      expect(message).toContain('Welcome back');
      expect(message).toContain('🎉');
    });

    it('should generate continuation message with session title', () => {
      const message = generateContinuationMessage('fun', 'en', 'Math Practice');
      expect(message).toContain('Welcome back');
      expect(message).toContain('Math Practice');
    });

    it('should generate learn mode continuation message', () => {
      const message = generateContinuationMessage('learn', 'en', 'Physics Study');
      expect(message).toContain('Welcome back');
      expect(message).toContain('📚');
      expect(message).toContain('Physics Study');
    });

    it('should generate continuation message in different languages', () => {
      const ruMessage = generateContinuationMessage('fun', 'ru', 'Тест');
      expect(ruMessage).toContain('возвращением');

      const esMessage = generateContinuationMessage('fun', 'es', 'Prueba');
      expect(esMessage).toContain('Bienvenido');
    });

    it('should fallback to English for unsupported language', () => {
      const message = generateContinuationMessage('fun', 'unsupported', 'Test');
      expect(message).toContain('Welcome back');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should include English', () => {
      const languages = getSupportedLanguages();
      const english = languages.find((lang) => lang.code === 'en');
      expect(english).toBeDefined();
      expect(english.name).toBe('English');
    });

    it('should include Russian', () => {
      const languages = getSupportedLanguages();
      const russian = languages.find((lang) => lang.code === 'ru');
      expect(russian).toBeDefined();
      expect(russian.name).toBe('Русский');
    });

    it('should have code and name properties', () => {
      const languages = getSupportedLanguages();
      languages.forEach((lang) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
      });
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true);
      expect(isLanguageSupported('ru')).toBe(true);
      expect(isLanguageSupported('es')).toBe(true);
      expect(isLanguageSupported('fr')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('unsupported')).toBe(false);
      expect(isLanguageSupported('xyz')).toBe(false);
    });

    it('should handle language variants', () => {
      expect(isLanguageSupported('en-US')).toBe(true);
      expect(isLanguageSupported('es-MX')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isLanguageSupported('EN')).toBe(true);
      expect(isLanguageSupported('Es')).toBe(true);
    });
  });

  describe('Message Content Quality', () => {
    it('should generate messages with appropriate length', () => {
      const message = generateWelcomeMessage('fun', 'en');
      expect(message.length).toBeGreaterThan(50);
      expect(message.length).toBeLessThan(500);
    });

    it('should generate friendly and engaging messages', () => {
      const funMessage = generateWelcomeMessage('fun', 'en');
      expect(funMessage.toLowerCase()).toMatch(/excited|fun|explore|chat/);
    });

    it('should generate professional learning messages', () => {
      const learnMessage = generateWelcomeMessage('learn', 'en');
      expect(learnMessage.toLowerCase()).toMatch(/learn|study|guide|help/);
    });

    it('should include emojis for visual appeal', () => {
      const funMessage = generateWelcomeMessage('fun', 'en');
      const learnMessage = generateWelcomeMessage('learn', 'en');
      expect(funMessage).toMatch(/[🎉]/);
      expect(learnMessage).toMatch(/[📚]/);
    });
  });

  describe('Consistency Across Languages', () => {
    it('should maintain similar tone across languages for fun mode', () => {
      const languages = ['en', 'ru', 'es', 'fr', 'de'];
      const messages = languages.map((lang) => generateWelcomeMessage('fun', lang));

      // All should contain the fun emoji
      messages.forEach((message) => {
        expect(message).toContain('🎉');
      });
    });

    it('should maintain similar tone across languages for learn mode', () => {
      const languages = ['en', 'ru', 'es', 'fr', 'de'];
      const messages = languages.map((lang) => generateWelcomeMessage('learn', lang));

      // All should contain the learn emoji
      messages.forEach((message) => {
        expect(message).toContain('📚');
      });
    });
  });
});
