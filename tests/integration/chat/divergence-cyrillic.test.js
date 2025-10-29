/**
 * Integration test for Cyrillic text divergence detection
 * Tests the bug fix for Unicode support in DivergenceDetector
 */

import { describe, it, expect } from 'vitest';
import { divergenceDetector } from '$lib/modules/chat/services/DivergenceDetector.js';

describe('Divergence Detection - Cyrillic Support', () => {
  describe('Bug Fix: Cyrillic text should not be treated as empty', () => {
    it('should correctly detect low divergence for identical Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Столица Франции — Париж.';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should correctly detect low divergence for very similar Cyrillic texts (original bug case)', () => {
      // This is the exact case from the bug report
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Столица Франции — Париж (Париж).';

      const result = divergenceDetector.analyze(text1, text2);

      // Before fix: similarity was 0.3 (HIGH divergence) ❌
      // After fix: similarity should be > 0.8 (LOW divergence) ✅
      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
      expect(result.differences).toBeDefined();
    });

    it('should correctly detect medium divergence for somewhat different Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Столица Франции — Лион.';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.similarity).toBeLessThan(0.8);
      expect(result.divergenceLevel).toBe('medium');
    });

    it('should correctly detect high divergence for very different Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Москва является крупнейшим городом России.';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeLessThan(0.5);
      expect(result.divergenceLevel).toBe('high');
    });
  });

  describe('Multi-language support', () => {
    it('should handle Russian text correctly', () => {
      const text1 = 'Привет, как дела?';
      const text2 = 'Привет, как дела? Всё хорошо.';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.divergenceLevel).toMatch(/low|medium/);
    });

    it('should handle Spanish text correctly', () => {
      const text1 = 'La capital de Francia es París.';
      const text2 = 'La capital de Francia es París (París).';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should handle mixed language text correctly', () => {
      const text1 = 'Paris is столица France.';
      const text2 = 'Paris is столица France (Париж).';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.5);
    });

    it('should handle Chinese characters correctly', () => {
      const text1 = '法国的首都是巴黎。';
      const text2 = '法国的首都是巴黎（巴黎）。';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should handle Arabic text correctly', () => {
      const text1 = 'عاصمة فرنسا هي باريس.';
      const text2 = 'عاصمة فرنسا هي باريس (باريس).';

      const result = divergenceDetector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });
  });

  describe('Regression prevention', () => {
    it('should not regress to treating non-ASCII as empty', () => {
      const cyrillicText = 'Столица Франции — Париж.';
      const normalized = divergenceDetector.normalizeText(cyrillicText);

      // Before fix: normalized would be empty string ""
      // After fix: normalized should contain actual words
      expect(normalized).not.toBe('');
      expect(normalized.length).toBeGreaterThan(0);
      expect(normalized).toContain('столица');
      expect(normalized).toContain('франции');
      expect(normalized).toContain('париж');
    });

    it('should extract key concepts from Cyrillic text', () => {
      const text = 'столица столица франции франции париж париж';
      const concepts = divergenceDetector.extractKeyConcepts(text);

      expect(concepts).toBeDefined();
      expect(Array.isArray(concepts)).toBe(true);
      expect(concepts.length).toBeGreaterThan(0);
      expect(concepts).toContain('столица');
    });
  });
});
