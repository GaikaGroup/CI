/**
 * Unit tests for DivergenceDetector service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DivergenceDetector } from '../../../src/lib/modules/chat/services/DivergenceDetector.js';

describe('DivergenceDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new DivergenceDetector();
  });

  describe('normalizeText', () => {
    it('should convert text to lowercase', () => {
      const result = detector.normalizeText('Hello WORLD');
      expect(result).toBe('hello world');
    });

    it('should remove punctuation', () => {
      const result = detector.normalizeText('Hello, world! How are you?');
      expect(result).toBe('hello world how are you');
    });

    it('should normalize whitespace', () => {
      const result = detector.normalizeText('Hello   world\n\ntest');
      expect(result).toBe('hello world test');
    });

    it('should trim leading and trailing spaces', () => {
      const result = detector.normalizeText('  hello world  ');
      expect(result).toBe('hello world');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical texts', () => {
      const text = 'this is a test message';
      const similarity = detector.calculateSimilarity(text, text);
      expect(similarity).toBeCloseTo(1.0, 1);
    });

    it('should return high similarity for very similar texts', () => {
      const text1 = 'the quick brown fox jumps over the lazy dog';
      const text2 = 'the quick brown fox jumps over a lazy dog';
      const similarity = detector.calculateSimilarity(text1, text2);
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should return low similarity for different texts', () => {
      const text1 = 'machine learning is fascinating';
      const text2 = 'cooking pasta requires boiling water';
      const similarity = detector.calculateSimilarity(text1, text2);
      expect(similarity).toBeLessThan(0.3);
    });

    it('should return 0 for empty texts', () => {
      const similarity = detector.calculateSimilarity('', '');
      expect(similarity).toBe(0);
    });

    it('should handle texts with different lengths', () => {
      const text1 = 'short';
      const text2 = 'this is a much longer text with many more words';
      const similarity = detector.calculateSimilarity(text1, text2);
      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('classifyDivergence', () => {
    it('should classify high similarity as low divergence', () => {
      const level = detector.classifyDivergence(0.85);
      expect(level).toBe('low');
    });

    it('should classify medium similarity as medium divergence', () => {
      const level = detector.classifyDivergence(0.65);
      expect(level).toBe('medium');
    });

    it('should classify low similarity as high divergence', () => {
      const level = detector.classifyDivergence(0.3);
      expect(level).toBe('high');
    });

    it('should handle boundary values correctly', () => {
      expect(detector.classifyDivergence(0.8)).toBe('low');
      expect(detector.classifyDivergence(0.79)).toBe('medium');
      expect(detector.classifyDivergence(0.5)).toBe('medium');
      expect(detector.classifyDivergence(0.49)).toBe('high');
    });
  });

  describe('extractKeyConcepts', () => {
    it('should extract significant words', () => {
      const text = 'machine learning algorithms process data efficiently';
      const concepts = detector.extractKeyConcepts(text);
      // Should contain at least some of the significant words
      expect(concepts.length).toBeGreaterThan(0);
      expect(
        concepts.some((c) => ['learning', 'algorithms', 'process', 'efficiently'].includes(c))
      ).toBe(true);
    });

    it('should filter out short words', () => {
      const text = 'the cat sat on the mat';
      const concepts = detector.extractKeyConcepts(text);
      expect(concepts).not.toContain('the');
      expect(concepts).not.toContain('on');
    });

    it('should prioritize repeated words', () => {
      const text = 'learning machine learning is about learning algorithms';
      const concepts = detector.extractKeyConcepts(text);
      expect(concepts).toContain('learning');
    });

    it('should limit results to 10 concepts', () => {
      const text =
        'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12'.repeat(2);
      const concepts = detector.extractKeyConcepts(text);
      expect(concepts.length).toBeLessThanOrEqual(10);
    });
  });

  describe('identifyDifferences', () => {
    it('should identify unique concepts in each text', () => {
      const text1 = 'machine learning uses neural networks';
      const text2 = 'deep learning uses convolutional networks';
      const differences = detector.identifyDifferences(text1, text2);
      expect(differences.length).toBeGreaterThan(0);
    });

    it('should detect significant length differences', () => {
      const text1 = 'short text';
      const text2 =
        'this is a much longer text with many more words and details that goes on and on with additional information to make it significantly longer than the first text';
      const differences = detector.identifyDifferences(text1, text2);
      // Should detect some differences due to length (MIN_WORD_DIFF is 20)
      expect(differences.length).toBeGreaterThan(0);
    });

    it('should limit differences to 5', () => {
      const text1 = 'word1 word2 word3 word4 word5 word6 word7 word8';
      const text2 = 'different1 different2 different3 different4 different5 different6';
      const differences = detector.identifyDifferences(text1, text2);
      expect(differences.length).toBeLessThanOrEqual(5);
    });
  });

  describe('detectContradictions', () => {
    it('should detect affirmation vs negation', () => {
      const text1 = 'this is correct and true';
      const text2 = 'this is not correct and false';
      const contradictions = detector.detectContradictions(text1, text2);
      expect(contradictions.length).toBeGreaterThan(0);
    });

    it('should not detect contradictions in similar texts', () => {
      const text1 = 'this is a good approach';
      const text2 = 'this is also a good approach';
      const contradictions = detector.detectContradictions(text1, text2);
      expect(contradictions.length).toBe(0);
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate questions for high divergence', () => {
      const differences = [
        'First response mentions: concept1',
        'Second response mentions: concept2'
      ];
      const questions = detector.generateFollowUpQuestions(differences, 'high');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some((q) => q.includes('accurate'))).toBe(true);
    });

    it('should generate questions for medium divergence', () => {
      const differences = ['Some differences detected'];
      const questions = detector.generateFollowUpQuestions(differences, 'medium');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some((q) => q.includes('recommend'))).toBe(true);
    });

    it('should limit questions to configured maximum', () => {
      const differences = ['diff1', 'diff2', 'diff3', 'diff4', 'diff5'];
      const questions = detector.generateFollowUpQuestions(differences, 'high');
      expect(questions.length).toBeLessThanOrEqual(detector.config.MAX_FOLLOWUP_QUESTIONS);
    });

    it('should return empty array for no differences', () => {
      const questions = detector.generateFollowUpQuestions([], 'low');
      expect(questions).toEqual([]);
    });
  });

  describe('analyze', () => {
    it('should return null when divergence detection is disabled', () => {
      detector.config.ENABLED = false;
      const result = detector.analyze('text1', 'text2');
      expect(result).toBeNull();
    });

    it('should return complete analysis for similar texts', () => {
      detector.config.ENABLED = true;
      const text1 = 'machine learning is a subset of artificial intelligence';
      const text2 = 'machine learning is part of artificial intelligence';
      const result = detector.analyze(text1, text2);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('similarity');
      expect(result).toHaveProperty('divergenceLevel');
      expect(result).toHaveProperty('differences');
      expect(result).toHaveProperty('suggestedQuestions');
      expect(result).toHaveProperty('metadata');

      // Similarity should be reasonably high for similar texts (> 0.6)
      expect(result.similarity).toBeGreaterThan(0.6);
      // Divergence level should be low or medium based on similarity
      expect(['low', 'medium']).toContain(result.divergenceLevel);
    });

    it('should return complete analysis for different texts', () => {
      detector.config.ENABLED = true;
      const text1 = 'machine learning uses algorithms to learn from data';
      const text2 = 'cooking requires ingredients and proper temperature control';
      const result = detector.analyze(text1, text2);

      expect(result).not.toBeNull();
      expect(result.divergenceLevel).toBe('high');
      expect(result.similarity).toBeLessThan(0.5);
      expect(result.differences.length).toBeGreaterThan(0);
    });

    it('should include metadata about text lengths', () => {
      detector.config.ENABLED = true;
      const text1 = 'short text';
      const text2 = 'this is a longer text with more words';
      const result = detector.analyze(text1, text2);

      expect(result).not.toBeNull();
      expect(result.metadata).toHaveProperty('text1Length');
      expect(result.metadata).toHaveProperty('text2Length');
      expect(result.metadata).toHaveProperty('wordDifference');
      expect(result.metadata.wordDifference).toBeGreaterThan(0);
    });

    it('should generate follow-up questions when enabled', () => {
      detector.config.ENABLED = true;
      detector.config.GENERATE_FOLLOWUP_QUESTIONS = true;
      // Use texts with clear differences to ensure divergence is detected
      const text1 = 'approach one uses method alpha with specific implementation details';
      const text2 = 'approach two uses method beta with different implementation strategy';
      const result = detector.analyze(text1, text2);

      expect(result).not.toBeNull();
      // Should generate questions if there are differences detected
      if (result.differences.length > 0 && result.divergenceLevel !== 'low') {
        expect(result.suggestedQuestions.length).toBeGreaterThan(0);
      }
    });

    it('should not generate follow-up questions when disabled', () => {
      detector.config.ENABLED = true;
      detector.config.GENERATE_FOLLOWUP_QUESTIONS = false;
      const text1 = 'approach one';
      const text2 = 'approach two';
      const result = detector.analyze(text1, text2);

      expect(result).not.toBeNull();
      expect(result.suggestedQuestions).toEqual([]);
    });
  });

  describe('getDivergenceSummary', () => {
    it('should return empty string for null analysis', () => {
      const summary = detector.getDivergenceSummary(null);
      expect(summary).toBe('');
    });

    it('should return English summary by default', () => {
      const analysis = { divergenceLevel: 'low' };
      const summary = detector.getDivergenceSummary(analysis);
      expect(summary).toContain('similar');
    });

    it('should return Russian summary when requested', () => {
      const analysis = { divergenceLevel: 'medium' };
      const summary = detector.getDivergenceSummary(analysis, 'ru');
      expect(summary).toContain('различия');
    });

    it('should return Spanish summary when requested', () => {
      const analysis = { divergenceLevel: 'high' };
      const summary = detector.getDivergenceSummary(analysis, 'es');
      expect(summary).toContain('difieren');
    });

    it('should fallback to English for unknown language', () => {
      const analysis = { divergenceLevel: 'low' };
      const summary = detector.getDivergenceSummary(analysis, 'unknown');
      expect(summary).toContain('similar');
    });
  });

  describe('longestCommonSubsequence', () => {
    it('should find LCS for identical arrays', () => {
      const arr = ['a', 'b', 'c'];
      const lcs = detector.longestCommonSubsequence(arr, arr);
      expect(lcs).toBe(3);
    });

    it('should find LCS for partially matching arrays', () => {
      const arr1 = ['a', 'b', 'c', 'd'];
      const arr2 = ['a', 'c', 'd', 'e'];
      const lcs = detector.longestCommonSubsequence(arr1, arr2);
      expect(lcs).toBe(3); // 'a', 'c', 'd'
    });

    it('should return 0 for completely different arrays', () => {
      const arr1 = ['a', 'b', 'c'];
      const arr2 = ['x', 'y', 'z'];
      const lcs = detector.longestCommonSubsequence(arr1, arr2);
      expect(lcs).toBe(0);
    });

    it('should handle empty arrays', () => {
      const lcs = detector.longestCommonSubsequence([], []);
      expect(lcs).toBe(0);
    });
  });
});
