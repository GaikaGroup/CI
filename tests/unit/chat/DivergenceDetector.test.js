/**
 * Tests for DivergenceDetector service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DivergenceDetector } from '$lib/modules/chat/services/DivergenceDetector.js';

describe('DivergenceDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new DivergenceDetector();
  });

  describe('normalizeText', () => {
    it('should normalize English text', () => {
      const text = 'The Capital of France is Paris!';
      const normalized = detector.normalizeText(text);
      expect(normalized).toBe('the capital of france is paris');
    });

    it('should normalize Cyrillic text', () => {
      const text = 'Столица Франции — Париж.';
      const normalized = detector.normalizeText(text);
      expect(normalized).toBe('столица франции париж');
    });

    it('should normalize mixed language text', () => {
      const text = 'Paris is столица France!';
      const normalized = detector.normalizeText(text);
      expect(normalized).toBe('paris is столица france');
    });

    it('should remove punctuation', () => {
      const text = 'Hello, world! How are you?';
      const normalized = detector.normalizeText(text);
      expect(normalized).toBe('hello world how are you');
    });

    it('should normalize whitespace', () => {
      const text = 'Hello    world   test';
      const normalized = detector.normalizeText(text);
      expect(normalized).toBe('hello world test');
    });
  });

  describe('analyze - Cyrillic texts', () => {
    it('should detect low divergence for identical Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Столица Франции — Париж.';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should detect low divergence for very similar Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Столица Франции — Париж (Париж).';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should detect medium divergence for somewhat different Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Столица Франции — Лион.';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.similarity).toBeLessThan(0.8);
      expect(result.divergenceLevel).toBe('medium');
    });

    it('should detect high divergence for very different Cyrillic texts', () => {
      const text1 = 'Столица Франции — Париж.';
      const text2 = 'Москва является крупнейшим городом России.';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeLessThan(0.5);
      expect(result.divergenceLevel).toBe('high');
    });
  });

  describe('analyze - English texts', () => {
    it('should detect low divergence for identical English texts', () => {
      const text1 = 'The capital of France is Paris.';
      const text2 = 'The capital of France is Paris.';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should detect low divergence for very similar English texts', () => {
      const text1 = 'The capital of France is Paris.';
      const text2 = 'The capital of France is Paris (Paris).';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.8);
      expect(result.divergenceLevel).toBe('low');
    });

    it('should detect medium divergence for somewhat different English texts', () => {
      const text1 = 'The capital of France is Paris.';
      const text2 = 'The capital of France is Lyon.';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.similarity).toBeLessThan(0.8);
      expect(result.divergenceLevel).toBe('medium');
    });

    it('should detect high divergence for very different English texts', () => {
      const text1 = 'The capital of France is Paris.';
      const text2 = 'Moscow is the largest city in Russia.';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeLessThan(0.5);
      expect(result.divergenceLevel).toBe('high');
    });
  });

  describe('analyze - Mixed languages', () => {
    it('should handle mixed language texts', () => {
      const text1 = 'Paris is столица France.';
      const text2 = 'Paris is столица France (Париж).';

      const result = detector.analyze(text1, text2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0.5);
      expect(result.divergenceLevel).toMatch(/low|medium/);
    });
  });

  describe('analyze - Edge cases', () => {
    it('should handle empty strings', () => {
      const result = detector.analyze('', '');

      expect(result).toBeDefined();
      expect(result.similarity).toBe(0);
    });

    it('should handle very short texts', () => {
      const result = detector.analyze('Hello', 'Hello');

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThan(0);
    });

    it('should handle texts with only punctuation', () => {
      const result = detector.analyze('!!!', '???');

      expect(result).toBeDefined();
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical normalized texts', () => {
      const text = 'hello world test';
      const similarity = detector.calculateSimilarity(text, text);

      expect(similarity).toBe(1.0);
    });

    it('should return value between 0 and 1', () => {
      const text1 = 'hello world';
      const text2 = 'goodbye world';
      const similarity = detector.calculateSimilarity(text1, text2);

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('classifyDivergence', () => {
    it('should classify high similarity as low divergence', () => {
      const level = detector.classifyDivergence(0.9);
      expect(level).toBe('low');
    });

    it('should classify medium similarity as medium divergence', () => {
      const level = detector.classifyDivergence(0.6);
      expect(level).toBe('medium');
    });

    it('should classify low similarity as high divergence', () => {
      const level = detector.classifyDivergence(0.3);
      expect(level).toBe('high');
    });

    it('should handle threshold boundaries', () => {
      expect(detector.classifyDivergence(0.8)).toBe('low');
      expect(detector.classifyDivergence(0.79)).toBe('medium');
      expect(detector.classifyDivergence(0.5)).toBe('medium');
      expect(detector.classifyDivergence(0.49)).toBe('high');
    });
  });

  describe('identifyDifferences', () => {
    it('should identify differences in Cyrillic texts', () => {
      const text1 = 'столица франции париж';
      const text2 = 'столица франции лион';

      const differences = detector.identifyDifferences(text1, text2);

      expect(differences).toBeDefined();
      expect(Array.isArray(differences)).toBe(true);
    });

    it('should return empty array for identical texts', () => {
      const text = 'hello world';
      const differences = detector.identifyDifferences(text, text);

      expect(differences).toBeDefined();
      expect(Array.isArray(differences)).toBe(true);
    });
  });

  describe('getDivergenceSummary', () => {
    it('should return summary for low divergence in English', () => {
      const analysis = { divergenceLevel: 'low', similarity: 0.9 };
      const summary = detector.getDivergenceSummary(analysis, 'en');

      expect(summary).toContain('similar');
    });

    it('should return summary for low divergence in Russian', () => {
      const analysis = { divergenceLevel: 'low', similarity: 0.9 };
      const summary = detector.getDivergenceSummary(analysis, 'ru');

      expect(summary).toContain('похожи');
    });

    it('should return summary for high divergence', () => {
      const analysis = { divergenceLevel: 'high', similarity: 0.3 };
      const summary = detector.getDivergenceSummary(analysis, 'en');

      expect(summary).toContain('differ');
    });

    it('should handle null analysis', () => {
      const summary = detector.getDivergenceSummary(null, 'en');
      expect(summary).toBe('');
    });
  });
});
