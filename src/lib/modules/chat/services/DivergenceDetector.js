/**
 * Divergence Detector Service
 *
 * Analyzes semantic differences between two LLM responses to detect
 * divergence levels and generate follow-up questions.
 */

import { SECOND_OPINION_CONFIG } from '$lib/config/secondOpinion.js';

/**
 * DivergenceDetector class
 */
export class DivergenceDetector {
  constructor() {
    this.config = SECOND_OPINION_CONFIG.DIVERGENCE;
  }

  /**
   * Analyze divergence between two responses
   * @param {string} response1 - First response text
   * @param {string} response2 - Second response text
   * @returns {Object} Divergence analysis result
   */
  analyze(response1, response2) {
    if (!this.config.ENABLED) {
      return null;
    }

    // Normalize texts
    const text1 = this.normalizeText(response1);
    const text2 = this.normalizeText(response2);

    // Calculate similarity
    const similarity = this.calculateSimilarity(text1, text2);

    // Determine divergence level
    const divergenceLevel = this.classifyDivergence(similarity);

    // Identify key differences
    const differences = this.identifyDifferences(text1, text2);

    // Generate follow-up questions if enabled
    const suggestedQuestions =
      this.config.GENERATE_FOLLOWUP_QUESTIONS && divergenceLevel !== 'low'
        ? this.generateFollowUpQuestions(differences, divergenceLevel)
        : [];

    return {
      similarity,
      divergenceLevel,
      differences,
      suggestedQuestions,
      metadata: {
        text1Length: text1.split(/\s+/).length,
        text2Length: text2.split(/\s+/).length,
        wordDifference: Math.abs(text1.split(/\s+/).length - text2.split(/\s+/).length)
      }
    };
  }

  /**
   * Normalize text for comparison
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Remove punctuation (Unicode-aware)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Calculate semantic similarity between two texts
   * Uses Jaccard similarity coefficient based on word sets
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(text1, text2) {
    // Tokenize texts into words
    const words1 = new Set(text1.split(/\s+/).filter((w) => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter((w) => w.length > 2));

    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) {
      return 0;
    }

    const jaccardSimilarity = intersection.size / union.size;

    // Also consider sequence similarity (simple approach)
    const sequenceSimilarity = this.calculateSequenceSimilarity(text1, text2);

    // Weighted average (70% Jaccard, 30% sequence)
    return jaccardSimilarity * 0.7 + sequenceSimilarity * 0.3;
  }

  /**
   * Calculate sequence similarity using longest common subsequence
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateSequenceSimilarity(text1, text2) {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);

    const lcsLength = this.longestCommonSubsequence(words1, words2);
    const maxLength = Math.max(words1.length, words2.length);

    return maxLength > 0 ? lcsLength / maxLength : 0;
  }

  /**
   * Find longest common subsequence length
   * @param {Array} arr1 - First array
   * @param {Array} arr2 - Second array
   * @returns {number} LCS length
   */
  longestCommonSubsequence(arr1, arr2) {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Classify divergence level based on similarity score
   * @param {number} similarity - Similarity score (0-1)
   * @returns {string} Divergence level ('low', 'medium', 'high')
   */
  classifyDivergence(similarity) {
    const thresholds = this.config.SIMILARITY_THRESHOLD;

    if (similarity >= thresholds.LOW) {
      return 'low';
    } else if (similarity >= thresholds.MEDIUM) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Identify key differences between two texts
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {Array<string>} List of differences
   */
  identifyDifferences(text1, text2) {
    const differences = [];

    // Extract key concepts from each text
    const concepts1 = this.extractKeyConcepts(text1);
    const concepts2 = this.extractKeyConcepts(text2);

    // Find concepts unique to text1
    const uniqueToText1 = concepts1.filter((c) => !concepts2.includes(c));
    if (uniqueToText1.length > 0) {
      differences.push(`First response mentions: ${uniqueToText1.slice(0, 3).join(', ')}`);
    }

    // Find concepts unique to text2
    const uniqueToText2 = concepts2.filter((c) => !concepts1.includes(c));
    if (uniqueToText2.length > 0) {
      differences.push(`Second response mentions: ${uniqueToText2.slice(0, 3).join(', ')}`);
    }

    // Check for length difference
    const words1 = text1.split(/\s+/).length;
    const words2 = text2.split(/\s+/).length;
    const wordDiff = Math.abs(words1 - words2);

    if (wordDiff >= this.config.MIN_WORD_DIFF) {
      const longer = words1 > words2 ? 'first' : 'second';
      differences.push(
        `The ${longer} response is significantly more detailed (${wordDiff} words difference)`
      );
    }

    // Check for contradictions (simple heuristic)
    const contradictions = this.detectContradictions(text1, text2);
    if (contradictions.length > 0) {
      differences.push(...contradictions);
    }

    return differences.slice(0, 5); // Limit to 5 differences
  }

  /**
   * Extract key concepts from text
   * @param {string} text - Text to analyze
   * @returns {Array<string>} List of key concepts
   */
  extractKeyConcepts(text) {
    // Simple approach: extract significant words (length > 4)
    // In production, this could use NLP libraries or embeddings
    const words = text.split(/\s+/);
    const significantWords = words.filter((w) => w.length > 4);

    // Count word frequency
    const frequency = {};
    significantWords.forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return words that appear more than once or are long
    return Object.keys(frequency)
      .filter((word) => frequency[word] > 1 || word.length > 7)
      .slice(0, 10);
  }

  /**
   * Detect potential contradictions between texts
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {Array<string>} List of contradictions
   */
  detectContradictions(text1, text2) {
    const contradictions = [];

    // Simple contradiction patterns
    const negationPatterns = [
      {
        pattern: /\b(is|are|was|were)\b/g,
        negation: /\b(is not|are not|was not|were not|isn't|aren't|wasn't|weren't)\b/g
      },
      {
        pattern: /\b(can|could|will|would|should)\b/g,
        negation:
          /\b(cannot|could not|will not|would not|should not|can't|couldn't|won't|wouldn't|shouldn't)\b/g
      },
      { pattern: /\b(yes|correct|true|right)\b/g, negation: /\b(no|incorrect|false|wrong)\b/g }
    ];

    for (const { pattern, negation } of negationPatterns) {
      const hasPattern1 = pattern.test(text1);
      const hasNegation1 = negation.test(text1);
      const hasPattern2 = pattern.test(text2);
      const hasNegation2 = negation.test(text2);

      // Check if one text affirms while the other negates
      if (
        (hasPattern1 && !hasNegation1 && hasNegation2) ||
        (hasPattern2 && !hasNegation2 && hasNegation1)
      ) {
        contradictions.push('Responses may contain contradictory statements');
        break;
      }
    }

    return contradictions;
  }

  /**
   * Generate follow-up questions based on differences
   * @param {Array<string>} differences - List of differences
   * @param {string} divergenceLevel - Divergence level
   * @returns {Array<string>} List of suggested questions
   */
  generateFollowUpQuestions(differences, divergenceLevel) {
    const questions = [];
    const maxQuestions = this.config.MAX_FOLLOWUP_QUESTIONS;

    if (differences.length === 0) {
      return questions;
    }

    // Generate questions based on divergence level
    if (divergenceLevel === 'high') {
      questions.push('Which response is more accurate for my specific situation?');
      questions.push('Can you explain why these responses differ so much?');
      questions.push('What are the key points I should focus on?');
    } else if (divergenceLevel === 'medium') {
      questions.push('Which approach would you recommend and why?');
      questions.push('Are these differences significant for my use case?');
      questions.push('Can you clarify the main points of disagreement?');
    }

    // Add specific questions based on differences
    if (differences.some((d) => d.includes('mentions'))) {
      questions.push('Which concepts are most important to understand?');
    }

    if (differences.some((d) => d.includes('detailed'))) {
      questions.push('Do I need the additional details, or is the shorter explanation sufficient?');
    }

    if (differences.some((d) => d.includes('contradictory'))) {
      questions.push('Which statement is correct?');
      questions.push('How can I verify the correct information?');
    }

    // Return limited number of questions
    return questions.slice(0, maxQuestions);
  }

  /**
   * Get divergence summary for display
   * @param {Object} analysis - Divergence analysis result
   * @param {string} language - Language code
   * @returns {string} Human-readable summary
   */
  getDivergenceSummary(analysis, language = 'en') {
    if (!analysis) {
      return '';
    }

    const summaries = {
      en: {
        low: 'The responses are very similar with minor variations.',
        medium: 'The responses have some notable differences in approach or detail.',
        high: 'The responses differ significantly. Consider reviewing both carefully.'
      },
      ru: {
        low: 'Ответы очень похожи с незначительными вариациями.',
        medium: 'Ответы имеют заметные различия в подходе или деталях.',
        high: 'Ответы значительно отличаются. Рекомендуется внимательно изучить оба.'
      },
      es: {
        low: 'Las respuestas son muy similares con variaciones menores.',
        medium: 'Las respuestas tienen algunas diferencias notables en enfoque o detalle.',
        high: 'Las respuestas difieren significativamente. Considera revisar ambas cuidadosamente.'
      }
    };

    const langSummaries = summaries[language] || summaries.en;
    return langSummaries[analysis.divergenceLevel] || langSummaries.low;
  }
}

// Export singleton instance
export const divergenceDetector = new DivergenceDetector();
