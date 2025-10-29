/**
 * Regression Test: Cyrillic Text Divergence Detection
 *
 * Bug: Second opinion feature showed "Significant Differences" for identical
 * or very similar Cyrillic text responses.
 *
 * Root Cause: The normalizeText() method used /[^\w\s]/g regex which only
 * matches ASCII characters, causing all Cyrillic letters to be removed.
 *
 * Fix: Changed to Unicode-aware regex /[^\p{L}\p{N}\s]/gu
 *
 * Date: October 29, 2025
 */

import { describe, it, expect } from 'vitest';
import { divergenceDetector } from '$lib/modules/chat/services/DivergenceDetector.js';

describe('Bug Fix: Cyrillic Text Divergence Detection', () => {
  it('should not show "Significant Differences" for identical Cyrillic responses', () => {
    // Exact case from bug report
    const response1 = 'Столица Франции — Париж.';
    const response2 = 'Столица Франции — Париж (Париж).';

    const result = divergenceDetector.analyze(response1, response2);

    // Before fix: similarity = 0.3, divergenceLevel = 'high' ❌
    // After fix: similarity > 0.8, divergenceLevel = 'low' ✅
    expect(result.similarity).toBeGreaterThan(0.8);
    expect(result.divergenceLevel).toBe('low');
  });

  it('should correctly normalize Cyrillic text', () => {
    const text = 'Столица Франции — Париж.';
    const normalized = divergenceDetector.normalizeText(text);

    // Before fix: normalized = "" (empty string) ❌
    // After fix: normalized = "столица франции париж" ✅
    expect(normalized).not.toBe('');
    expect(normalized).toContain('столица');
    expect(normalized).toContain('франции');
    expect(normalized).toContain('париж');
  });

  it('should work with other Unicode scripts (Chinese)', () => {
    const text1 = '法国的首都是巴黎。';
    const text2 = '法国的首都是巴黎（巴黎）。';

    const result = divergenceDetector.analyze(text1, text2);

    expect(result.similarity).toBeGreaterThan(0.8);
    expect(result.divergenceLevel).toBe('low');
  });

  it('should work with other Unicode scripts (Arabic)', () => {
    const text1 = 'عاصمة فرنسا هي باريس.';
    const text2 = 'عاصمة فرنسا هي باريس (باريس).';

    const result = divergenceDetector.analyze(text1, text2);

    expect(result.similarity).toBeGreaterThan(0.8);
    expect(result.divergenceLevel).toBe('low');
  });
});
