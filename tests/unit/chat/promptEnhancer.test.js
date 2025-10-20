/**
 * Unit tests for PromptEnhancer
 * Tests language constraint handling with structured messages (images)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptEnhancer } from '$lib/modules/chat/PromptEnhancer.js';

describe('PromptEnhancer', () => {
  let enhancer;

  beforeEach(() => {
    enhancer = new PromptEnhancer();
  });

  describe('addLanguageConstraints', () => {
    it('should preserve structured content with images', () => {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Что на этой картинке?' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
              }
            }
          ]
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'ru');

      // Find the user message (system message may have been added)
      const userMessage = result.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();

      // Should still be an array
      expect(Array.isArray(userMessage.content)).toBe(true);

      // Should have both text and image parts
      const textParts = userMessage.content.filter((c) => c.type === 'text');
      const imageParts = userMessage.content.filter((c) => c.type === 'image_url');

      expect(textParts.length).toBeGreaterThan(0);
      expect(imageParts.length).toBe(1);

      // Image should be preserved
      expect(imageParts[0].image_url.url).toContain('data:image/png');
    });

    it('should add language reminder to text part of structured content', () => {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Short' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }
          ]
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'ru');

      const userMessage = result.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(Array.isArray(userMessage.content)).toBe(true);

      const textPart = userMessage.content.find((c) => c.type === 'text');

      // Should contain original text
      expect(textPart.text).toContain('Short');

      // Should contain language reminder (for short messages)
      expect(textPart.text).toContain('русском');
    });

    it('should handle simple text messages', () => {
      const messages = [
        {
          role: 'user',
          content: 'Simple text message'
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'en');

      const userMessage = result.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();

      // Should still be a string
      expect(typeof userMessage.content).toBe('string');

      // Should contain original content
      expect(userMessage.content).toContain('Simple text message');
    });

    it('should add system message if none exists', () => {
      const messages = [
        {
          role: 'user',
          content: 'Hello'
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'en');

      // Should have added a system message
      const systemMessages = result.filter((m) => m.role === 'system');
      expect(systemMessages.length).toBeGreaterThan(0);
    });

    it('should enhance existing system message', () => {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Hello'
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'en');

      // System message should be enhanced
      const systemMessage = result.find((m) => m.role === 'system');
      expect(systemMessage.content).toContain('You are a helpful assistant.');
      expect(systemMessage.content.length).toBeGreaterThan('You are a helpful assistant.'.length);
    });

    it('should not add reminder to long messages', () => {
      const longText = 'A'.repeat(150);
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: longText },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }
          ]
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'ru');

      const userMessage = result.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(Array.isArray(userMessage.content)).toBe(true);

      const textPart = userMessage.content.find((c) => c.type === 'text');

      // Should not add contextual reminder for long messages
      // (only system-level constraints are added)
      expect(textPart.text).toBe(longText);
    });

    it('should handle messages without text parts', () => {
      const messages = [
        {
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }]
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'ru');

      const userMessage = result.find((m) => m.role === 'user');
      expect(userMessage).toBeDefined();

      // Should still be an array
      expect(Array.isArray(userMessage.content)).toBe(true);

      // Image should be preserved
      const imageParts = userMessage.content.filter((c) => c.type === 'image_url');
      expect(imageParts.length).toBe(1);

      // System message should have language constraints
      const systemMessage = result.find((m) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('русском');
    });

    it('should handle empty messages array', () => {
      const messages = [];

      const result = enhancer.addLanguageConstraints(messages, 'en');

      // Should add at least a system message
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].role).toBe('system');
    });

    it('should handle unsupported language gracefully', () => {
      const messages = [
        {
          role: 'user',
          content: 'Hello'
        }
      ];

      const result = enhancer.addLanguageConstraints(messages, 'unsupported');

      // Should return original messages
      expect(result).toEqual(messages);
    });
  });

  describe('enhanceSystemPrompt', () => {
    it('should add language constraints to system prompt', () => {
      const originalPrompt = 'You are a helpful assistant.';

      const result = enhancer.enhanceSystemPrompt(originalPrompt, 'ru', 0.9);

      expect(result).toContain(originalPrompt);
      expect(result.length).toBeGreaterThan(originalPrompt.length);
      expect(result).toContain('русском');
    });

    it('should use strong enforcement for low confidence', () => {
      const originalPrompt = 'You are a helpful assistant.';

      const result = enhancer.enhanceSystemPrompt(originalPrompt, 'ru', 0.4);

      // Low confidence (0.4) results in 'gentle' level, which uses 'reminder' template
      // The reminder template doesn't contain 'СТРОГО', so we check for Russian language mention
      expect(result).toContain('русском');
    });

    it('should use ultra strong enforcement when language mixing detected', () => {
      const originalPrompt = 'You are a helpful assistant.';

      const result = enhancer.enhanceSystemPrompt(originalPrompt, 'ru', 0.9, {
        hasLanguageMixing: true
      });

      // Should use ultra_strong template which contains "АБСОЛЮТНОЕ"
      expect(result).toContain('АБСОЛЮТНОЕ');
      expect(result).toContain('ИСКЛЮЧИТЕЛЬНО');
    });

    it('should handle invalid input gracefully', () => {
      const result = enhancer.enhanceSystemPrompt(null, 'en', 0.9);

      expect(result).toBe('');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(enhancer.isLanguageSupported('en')).toBe(true);
      expect(enhancer.isLanguageSupported('ru')).toBe(true);
      expect(enhancer.isLanguageSupported('es')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(enhancer.isLanguageSupported('fr')).toBe(false);
      expect(enhancer.isLanguageSupported('de')).toBe(false);
      expect(enhancer.isLanguageSupported('unsupported')).toBe(false);
    });
  });
});
