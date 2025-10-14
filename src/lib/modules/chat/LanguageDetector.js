/**
 * Language Detector for Interruptions
 * Detects language from audio characteristics and patterns
 */

import { get } from 'svelte/store';
import { selectedLanguage, languages } from '$modules/i18n/stores';
import { languageConsistencyLogger } from './LanguageConsistencyLogger.js';

export class LanguageDetector {
  constructor() {
    this.supportedLanguages = ['en', 'es', 'ru'];
    this.detectionCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes

    // Language-specific audio characteristics
    this.languageProfiles = {
      en: {
        // English characteristics
        fundamentalRange: [85, 255], // Hz - typical F0 range
        formantPatterns: [
          [730, 1090], // /a/ vowel formants
          [270, 2290], // /i/ vowel formants
          [300, 870] // /u/ vowel formants
        ],
        rhythmPattern: 'stress-timed',
        consonantRatio: 0.6,
        voicingRatio: 0.4
      },
      es: {
        // Spanish characteristics
        fundamentalRange: [90, 280],
        formantPatterns: [
          [700, 1200], // /a/ vowel formants
          [280, 2200], // /i/ vowel formants
          [320, 800] // /u/ vowel formants
        ],
        rhythmPattern: 'syllable-timed',
        consonantRatio: 0.55,
        voicingRatio: 0.45
      },
      ru: {
        // Russian characteristics
        fundamentalRange: [80, 300],
        formantPatterns: [
          [650, 1100], // /a/ vowel formants
          [250, 2100], // /i/ vowel formants
          [300, 700] // /u/ vowel formants
        ],
        rhythmPattern: 'stress-timed',
        consonantRatio: 0.65,
        voicingRatio: 0.35
      }
    };

    // Phonetic pattern recognition
    this.phoneticPatterns = {
      en: {
        // English-specific phonetic patterns
        rhoticSounds: true, // R-coloring
        thSounds: true, // /θ/ and /ð/ sounds
        vowelReduction: true, // Schwa in unstressed syllables
        consonantClusters: true // Complex consonant clusters
      },
      es: {
        // Spanish-specific patterns
        rhoticSounds: true, // Rolled R
        thSounds: false, // No /θ/ sounds (in most dialects)
        vowelReduction: false, // Clear vowels
        consonantClusters: false // Simpler consonant structure
      },
      ru: {
        // Russian-specific patterns
        rhoticSounds: true, // Rolled R
        thSounds: false, // No /θ/ sounds
        vowelReduction: true, // Vowel reduction in unstressed syllables
        consonantClusters: true, // Complex consonant clusters
        palatalization: true // Palatalized consonants
      }
    };

    console.log('LanguageDetector initialized');
  }

  /**
   * Detect language from audio buffer
   * @param {ArrayBuffer} audioBuffer - Audio data
   * @param {Object} audioMetrics - Additional audio metrics
   * @returns {Promise<Object>} Detection result with language and confidence
   */
  async detectLanguage(audioBuffer, audioMetrics = {}) {
    try {
      console.log('Detecting language from audio buffer...');

      // Check cache first
      const cacheKey = this.generateCacheKey(audioBuffer, audioMetrics);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`Language detection cache hit: ${cached.language} (${cached.confidence})`);
        return cached;
      }

      // Perform detection analysis
      const detectionResult = await this.performLanguageDetection(audioBuffer, audioMetrics);

      // Cache the result
      this.addToCache(cacheKey, detectionResult);

      console.log(
        `Language detected: ${detectionResult.language} (confidence: ${detectionResult.confidence})`
      );

      return detectionResult;
    } catch (error) {
      console.error('Error in language detection:', error);

      // Return fallback result
      return this.getFallbackLanguage();
    }
  }

  /**
   * Perform language detection analysis
   * @param {ArrayBuffer} audioBuffer - Audio data
   * @param {Object} audioMetrics - Audio metrics from interruption detector
   * @returns {Promise<Object>} Detection result
   */
  async performLanguageDetection(audioBuffer, audioMetrics) {
    // Since we don't have actual audio processing capabilities in this context,
    // we'll use a combination of heuristics and the current language context

    const detectionScores = {};

    // Initialize scores for all supported languages
    this.supportedLanguages.forEach((lang) => {
      detectionScores[lang] = 0;
    });

    // Factor 1: Current language context (high weight)
    const currentLang = get(selectedLanguage);
    if (this.supportedLanguages.includes(currentLang)) {
      detectionScores[currentLang] += 0.4;
    }

    // Factor 2: Audio characteristics analysis
    if (audioMetrics.energy !== undefined) {
      const audioScores = this.analyzeAudioCharacteristics(audioMetrics);
      Object.keys(audioScores).forEach((lang) => {
        if (detectionScores[lang] !== undefined) {
          detectionScores[lang] += audioScores[lang] * 0.3;
        }
      });
    }

    // Factor 3: Prosodic pattern analysis (simulated)
    const prosodicScores = this.analyzeProsodicPatterns(audioMetrics);
    Object.keys(prosodicScores).forEach((lang) => {
      if (detectionScores[lang] !== undefined) {
        detectionScores[lang] += prosodicScores[lang] * 0.2;
      }
    });

    // Factor 4: User's language history
    const historyScores = this.analyzeLanguageHistory();
    Object.keys(historyScores).forEach((lang) => {
      if (detectionScores[lang] !== undefined) {
        detectionScores[lang] += historyScores[lang] * 0.1;
      }
    });

    // Find the language with the highest score
    let bestLanguage = currentLang || 'en';
    let bestScore = detectionScores[bestLanguage] || 0;

    Object.entries(detectionScores).forEach(([lang, score]) => {
      if (score > bestScore) {
        bestLanguage = lang;
        bestScore = score;
      }
    });

    // Calculate confidence based on score distribution
    const confidence = this.calculateConfidence(detectionScores, bestLanguage);

    return {
      language: bestLanguage,
      confidence: confidence,
      scores: detectionScores,
      method: 'heuristic_analysis',
      timestamp: Date.now()
    };
  }

  /**
   * Analyze audio characteristics for language detection
   * @param {Object} audioMetrics - Audio metrics
   * @returns {Object} Language scores based on audio characteristics
   */
  analyzeAudioCharacteristics(audioMetrics) {
    const scores = {};
    const { energy, vadThreshold } = audioMetrics;

    // Analyze energy patterns
    const energyRatio = energy / (vadThreshold || 0.15);

    // Different languages have different typical energy patterns
    if (energyRatio > 2.0) {
      // High energy - could indicate stress-timed languages (English, Russian)
      scores.en = 0.3;
      scores.ru = 0.3;
      scores.es = 0.1;
    } else if (energyRatio > 1.2) {
      // Medium energy - balanced across languages
      scores.en = 0.2;
      scores.es = 0.3;
      scores.ru = 0.2;
    } else {
      // Lower energy - might favor syllable-timed languages (Spanish)
      scores.en = 0.1;
      scores.es = 0.4;
      scores.ru = 0.1;
    }

    return scores;
  }

  /**
   * Analyze prosodic patterns (simulated)
   * @param {Object} audioMetrics - Audio metrics
   * @returns {Object} Language scores based on prosodic analysis
   */
  analyzeProsodicPatterns(audioMetrics) {
    const scores = {};

    // Simulate prosodic analysis based on available metrics
    // In a real implementation, this would analyze rhythm, stress, and intonation

    // For now, use energy variance as a proxy for prosodic complexity
    const energyVariance = audioMetrics.energyHistory
      ? this.calculateVariance(audioMetrics.energyHistory)
      : 0.1;

    if (energyVariance > 0.05) {
      // High variance - stress-timed languages
      scores.en = 0.4;
      scores.ru = 0.3;
      scores.es = 0.1;
    } else {
      // Low variance - syllable-timed languages
      scores.en = 0.2;
      scores.ru = 0.2;
      scores.es = 0.4;
    }

    return scores;
  }

  /**
   * Analyze user's language history
   * @returns {Object} Language scores based on usage history
   */
  analyzeLanguageHistory() {
    const scores = {};

    // Get available languages from the i18n system
    const availableLanguages = languages.map((lang) => lang.code);

    // Current language gets a boost
    const currentLang = get(selectedLanguage);

    availableLanguages.forEach((lang) => {
      if (this.supportedLanguages.includes(lang)) {
        scores[lang] = lang === currentLang ? 0.5 : 0.1;
      }
    });

    return scores;
  }

  /**
   * Calculate detection confidence
   * @param {Object} scores - Language scores
   * @param {string} bestLanguage - Detected language
   * @returns {number} Confidence (0-1)
   */
  calculateConfidence(scores, bestLanguage) {
    const bestScore = scores[bestLanguage] || 0;
    const allScores = Object.values(scores);
    const totalScore = allScores.reduce((sum, score) => sum + score, 0);

    if (totalScore === 0) return 0.5; // Default confidence

    // Confidence based on how much the best score dominates
    const dominance = bestScore / totalScore;

    // Also consider the absolute score
    const absoluteConfidence = Math.min(1, bestScore / 0.8);

    // Combine dominance and absolute confidence
    return Math.min(1, dominance * 0.7 + absoluteConfidence * 0.3);
  }

  /**
   * Calculate variance of an array
   * @param {Array<number>} values - Values to analyze
   * @returns {number} Variance
   */
  calculateVariance(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Detect language from text patterns with enhanced confidence scoring
   * @param {string} text - Text to analyze
   * @returns {Object} Detection result with confidence scores
   */
  detectLanguageFromText(text) {
    if (!text || text.length < 3) {
      return this.getFallbackLanguage();
    }

    const scores = {};
    const confidenceFactors = {};

    // Initialize scores
    this.supportedLanguages.forEach((lang) => {
      scores[lang] = 0;
      confidenceFactors[lang] = [];
    });

    // Enhanced Russian detection with improved Cyrillic patterns
    const russianScore = this.detectRussianLanguage(text, confidenceFactors.ru);
    scores.ru = russianScore;
    
    // If high confidence Russian detected, return early
    if (russianScore > 0.8) {
      return {
        language: 'ru',
        confidence: russianScore,
        scores: scores,
        confidenceFactors: confidenceFactors.ru,
        method: 'enhanced_russian_analysis',
        timestamp: Date.now()
      };
    }

    // Spanish detection - Spanish-specific characters and patterns
    const spanishKeywordMatches =
      text.match(/\b(el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|están|y|o|pero|si|no|muy|más|todo|todos|hacer|tener|ser|estar)\b/gi) || [];
    const hasSpanishAccents = /[ñáéíóúü¿¡]/i.test(text);
    const spanishAccentMatches = text.match(/[ñáéíóúü¿¡]/gi) || [];

    if (hasSpanishAccents) {
      const accentRatio = spanishAccentMatches.length / text.length;
      scores.es += Math.min(0.4, accentRatio * 2);
      confidenceFactors.es.push({
        factor: 'spanish_accents',
        weight: accentRatio,
        confidence: scores.es
      });
    }

    if (spanishKeywordMatches.length > 0) {
      const keywordRatio = spanishKeywordMatches.length / text.split(/\s+/).length;
      scores.es += Math.min(0.5, keywordRatio * 0.8);
      confidenceFactors.es.push({
        factor: 'spanish_keywords',
        weight: keywordRatio,
        confidence: keywordRatio * 0.8
      });
    }

    // English detection - English-specific patterns
    const englishKeywordMatches =
      text.match(/\b(the|and|or|but|if|not|very|more|all|some|make|have|be|is|are|was|were|will|would|could|should|this|that|these|those)\b/gi) || [];
    
    if (englishKeywordMatches.length > 0) {
      const keywordRatio = englishKeywordMatches.length / text.split(/\s+/).length;
      scores.en += Math.min(0.6, keywordRatio * 0.9);
      confidenceFactors.en.push({
        factor: 'english_keywords',
        weight: keywordRatio,
        confidence: keywordRatio * 0.9
      });
    }

    // Default scoring for Latin script
    if (!/[а-яё]/i.test(text)) {
      if (scores.es < 0.3 && scores.en < 0.3) {
        scores.en = 0.5; // Default to English for unidentified Latin script
        confidenceFactors.en.push({
          factor: 'latin_script_default',
          weight: 0.5,
          confidence: 0.5
        });
      }
    }

    const bestLanguage = Object.entries(scores).reduce(
      (best, [lang, score]) => (score > best.score ? { language: lang, score } : best),
      { language: 'en', score: 0 }
    ).language;

    // Calculate final confidence based on score distribution and factors
    const finalConfidence = this.calculateTextConfidence(scores, bestLanguage, confidenceFactors[bestLanguage]);

    return {
      language: bestLanguage,
      confidence: finalConfidence,
      scores: scores,
      confidenceFactors: confidenceFactors[bestLanguage],
      method: 'text_analysis',
      timestamp: Date.now()
    };
  }

  /**
   * Calculate confidence for text-based detection
   * @param {Object} scores - Language scores
   * @param {string} bestLanguage - Detected language
   * @param {Array} factors - Confidence factors
   * @returns {number} Final confidence score
   */
  calculateTextConfidence(scores, bestLanguage, factors = []) {
    const bestScore = scores[bestLanguage] || 0;
    const allScores = Object.values(scores);
    const totalScore = allScores.reduce((sum, score) => sum + score, 0);

    if (totalScore === 0) return 0.3; // Low confidence for no matches

    // Base confidence from score dominance
    const dominance = bestScore / totalScore;
    
    // Factor in the number and quality of confidence factors
    const factorBonus = factors.length > 0 ? Math.min(0.2, factors.length * 0.1) : 0;
    
    // Text length factor - longer text generally means higher confidence
    const lengthFactor = factors.length > 0 ? 
      Math.min(0.1, factors.reduce((sum, f) => sum + (f.weight || 0), 0)) : 0;

    return Math.min(0.95, dominance * 0.7 + bestScore * 0.2 + factorBonus + lengthFactor);
  }

  /**
   * Enhanced detection method with confidence scoring
   * @param {string} text - Text to analyze
   * @param {string} sessionId - Optional session ID for logging
   * @param {Object} context - Optional context for logging
   * @returns {Object} Detection result with detailed confidence information
   */
  detectWithConfidence(text, sessionId = null, context = {}) {
    const result = this.detectLanguageFromText(text);
    
    // Add additional confidence metadata
    result.confidenceLevel = this.getConfidenceLevel(result.confidence);
    result.isReliable = result.confidence >= 0.7;
    result.needsValidation = result.confidence < 0.5;
    
    // Log detection result if session ID provided
    if (sessionId) {
      try {
        languageConsistencyLogger.logDetection(sessionId, result, {
          messageLength: text?.length || 0,
          ...context
        });
      } catch (error) {
        console.warn('Failed to log detection result:', error);
      }
    }
    
    return result;
  }

  /**
   * Get confidence level description
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} Confidence level
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }

  /**
   * Validate language consistency between expected and detected language
   * @param {string} text - Text to validate
   * @param {string} expectedLanguage - Expected language code
   * @param {string} sessionId - Optional session ID for logging
   * @param {Object} context - Optional context for logging
   * @returns {Object} Validation result
   */
  validateLanguageConsistency(text, expectedLanguage, sessionId = null, context = {}) {
    const detection = this.detectWithConfidence(text, sessionId, context);
    
    const isConsistent = detection.language === expectedLanguage;
    const confidenceGap = Math.abs(detection.confidence - (detection.scores[expectedLanguage] || 0));
    
    const validationResult = {
      isConsistent,
      detectedLanguage: detection.language,
      expectedLanguage,
      confidence: detection.confidence,
      expectedLanguageScore: detection.scores[expectedLanguage] || 0,
      confidenceGap,
      severity: this.getInconsistencySeverity(isConsistent, confidenceGap, detection.confidence),
      recommendation: this.getValidationRecommendation(isConsistent, confidenceGap, detection.confidence),
      detectionDetails: detection
    };

    // Log validation result if session ID provided
    if (sessionId) {
      try {
        languageConsistencyLogger.logValidation(sessionId, validationResult, {
          responseLength: text?.length || 0,
          ...context
        });
      } catch (error) {
        console.warn('Failed to log validation result:', error);
      }
    }
    
    return validationResult;
  }

  /**
   * Get inconsistency severity level
   * @param {boolean} isConsistent - Whether languages match
   * @param {number} confidenceGap - Gap between detected and expected confidence
   * @param {number} detectionConfidence - Detection confidence
   * @returns {string} Severity level
   */
  getInconsistencySeverity(isConsistent, confidenceGap, detectionConfidence) {
    if (isConsistent) return 'none';
    
    if (detectionConfidence >= 0.8 && confidenceGap > 0.5) return 'high';
    if (detectionConfidence >= 0.6 && confidenceGap > 0.3) return 'medium';
    return 'low';
  }

  /**
   * Get validation recommendation
   * @param {boolean} isConsistent - Whether languages match
   * @param {number} confidenceGap - Gap between detected and expected confidence
   * @param {number} detectionConfidence - Detection confidence
   * @returns {string} Recommendation
   */
  getValidationRecommendation(isConsistent, confidenceGap, detectionConfidence) {
    if (isConsistent && detectionConfidence >= 0.7) return 'accept';
    if (isConsistent && detectionConfidence >= 0.5) return 'accept_with_monitoring';
    if (!isConsistent && detectionConfidence >= 0.8) return 'regenerate';
    if (!isConsistent && detectionConfidence >= 0.5) return 'review_and_correct';
    return 'manual_review';
  }

  /**
   * Enhanced Russian language detection with improved accuracy
   * @param {string} text - Text to analyze
   * @param {Array} confidenceFactors - Array to store confidence factors
   * @returns {number} Russian language confidence score
   */
  detectRussianLanguage(text, confidenceFactors) {
    let russianScore = 0;

    // Enhanced Cyrillic character detection with better patterns
    const cyrillicMatches = text.match(/[а-яё]/gi) || [];
    const extendedCyrillicMatches = text.match(/[а-яёъьэюийцукенгшщзхфывапролджячсмитбщ]/gi) || [];
    
    if (cyrillicMatches.length > 0) {
      const cyrillicRatio = cyrillicMatches.length / text.replace(/\s+/g, '').length;
      const extendedRatio = extendedCyrillicMatches.length / text.replace(/\s+/g, '').length;
      
      // Base Cyrillic score with improved calculation
      const cyrillicScore = Math.min(0.6, cyrillicRatio * 1.2);
      russianScore += cyrillicScore;
      
      confidenceFactors.push({
        factor: 'cyrillic_characters',
        weight: cyrillicRatio,
        confidence: cyrillicScore,
        details: `${cyrillicMatches.length}/${text.length} characters`
      });

      // Bonus for extended Cyrillic coverage
      if (extendedRatio > cyrillicRatio * 0.8) {
        const extendedBonus = Math.min(0.15, extendedRatio * 0.3);
        russianScore += extendedBonus;
        confidenceFactors.push({
          factor: 'extended_cyrillic',
          weight: extendedRatio,
          confidence: extendedBonus
        });
      }
    }

    // Russian-specific keyword patterns with improved coverage
    const russianKeywords = [
      // Common words
      'это', 'что', 'как', 'где', 'когда', 'почему', 'который', 'которая', 'которое',
      // Pronouns
      'я', 'ты', 'он', 'она', 'оно', 'мы', 'вы', 'они',
      // Verbs
      'быть', 'есть', 'был', 'была', 'было', 'были', 'буду', 'будешь', 'будет', 'будем', 'будете', 'будут',
      'делать', 'сделать', 'говорить', 'сказать', 'знать', 'думать', 'хотеть', 'мочь', 'должен',
      // Prepositions and conjunctions
      'в', 'на', 'с', 'по', 'для', 'от', 'до', 'за', 'под', 'над', 'между', 'через', 'без', 'при',
      'и', 'или', 'но', 'а', 'да', 'если', 'чтобы', 'потому', 'поэтому',
      // Common adjectives
      'хороший', 'плохой', 'большой', 'маленький', 'новый', 'старый', 'красивый', 'умный'
    ];

    const keywordPattern = new RegExp(`\\b(${russianKeywords.join('|')})\\b`, 'gi');
    const keywordMatches = text.match(keywordPattern) || [];
    
    if (keywordMatches.length > 0) {
      const wordCount = text.split(/\s+/).length;
      const keywordRatio = keywordMatches.length / wordCount;
      const keywordScore = Math.min(0.4, keywordRatio * 0.8);
      russianScore += keywordScore;
      
      confidenceFactors.push({
        factor: 'russian_keywords',
        weight: keywordRatio,
        confidence: keywordScore,
        details: `${keywordMatches.length} keywords found: ${keywordMatches.slice(0, 5).join(', ')}${keywordMatches.length > 5 ? '...' : ''}`
      });
    }

    // Russian-specific grammatical patterns
    const grammaticalPatterns = [
      // Typical Russian word endings
      /[а-я]+(ся|сь)$/gi, // reflexive verbs
      /[а-я]+(ть|ти)$/gi, // infinitive verbs
      /[а-я]+(ый|ая|ое|ые)$/gi, // adjective endings
      /[а-я]+(ов|ев|ей|ами|ах)$/gi, // plural/case endings
      /[а-я]+(ность|ство|ение|ание)$/gi // abstract noun endings
    ];

    let grammaticalScore = 0;
    const grammaticalMatches = [];

    grammaticalPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern) || [];
      if (matches.length > 0) {
        grammaticalMatches.push(...matches);
        grammaticalScore += Math.min(0.05, matches.length * 0.02);
      }
    });

    if (grammaticalScore > 0) {
      russianScore += grammaticalScore;
      confidenceFactors.push({
        factor: 'russian_grammar',
        weight: grammaticalScore,
        confidence: grammaticalScore,
        details: `${grammaticalMatches.length} grammatical patterns`
      });
    }

    // Russian letter frequency analysis
    const russianFrequentLetters = ['о', 'е', 'а', 'и', 'н', 'т', 'с', 'р', 'в', 'л'];
    const letterCounts = {};
    const textLower = text.toLowerCase();
    
    russianFrequentLetters.forEach(letter => {
      letterCounts[letter] = (textLower.match(new RegExp(letter, 'g')) || []).length;
    });

    const totalRussianLetters = Object.values(letterCounts).reduce((sum, count) => sum + count, 0);
    const textLetters = text.replace(/[^а-яё]/gi, '').length;
    
    if (textLetters > 0) {
      const frequencyRatio = totalRussianLetters / textLetters;
      if (frequencyRatio > 0.6) { // Russian texts typically have high frequency of these letters
        const frequencyScore = Math.min(0.15, (frequencyRatio - 0.6) * 0.5);
        russianScore += frequencyScore;
        confidenceFactors.push({
          factor: 'letter_frequency',
          weight: frequencyRatio,
          confidence: frequencyScore,
          details: `${(frequencyRatio * 100).toFixed(1)}% frequent letters`
        });
      }
    }

    // Penalty for mixed scripts (Cyrillic + Latin)
    const latinLetters = text.match(/[a-z]/gi) || [];
    if (cyrillicMatches.length > 0 && latinLetters.length > 0) {
      const mixedScriptPenalty = Math.min(0.2, latinLetters.length / text.length);
      russianScore = Math.max(0, russianScore - mixedScriptPenalty);
      confidenceFactors.push({
        factor: 'mixed_script_penalty',
        weight: -mixedScriptPenalty,
        confidence: -mixedScriptPenalty,
        details: `${latinLetters.length} Latin characters detected`
      });
    }

    return Math.min(0.95, russianScore);
  }

  /**
   * Detect language from raw text and synchronize the selected language store
   * to mirror the behaviour used in voice mode flows.
   *
   * @param {string} text - Text content to analyse
   * @returns {Object|null} Detection result or null if detection failed
   */
  syncLanguageFromText(text) {
    try {
      const detectionResult = this.detectLanguageFromText(text);

      if (detectionResult?.language) {
        const currentLanguage = get(selectedLanguage);

        if (detectionResult.language !== currentLanguage) {
          console.log(
            `Detected message language: ${detectionResult.language}, updating from ${currentLanguage}`
          );
          selectedLanguage.set(detectionResult.language);
        }

        return detectionResult;
      }

      return null;
    } catch (error) {
      console.warn('Failed to synchronize language from text:', error);
      return null;
    }
  }

  /**
   * Get fallback language detection result
   * @returns {Object} Fallback result
   */
  getFallbackLanguage() {
    const currentLang = get(selectedLanguage);
    const fallbackLang = this.supportedLanguages.includes(currentLang) ? currentLang : 'en';

    return {
      language: fallbackLang,
      confidence: 0.5,
      scores: { [fallbackLang]: 0.5 },
      method: 'fallback',
      timestamp: Date.now()
    };
  }

  /**
   * Generate cache key for detection result
   * @param {ArrayBuffer} audioBuffer - Audio buffer
   * @param {Object} audioMetrics - Audio metrics
   * @returns {string} Cache key
   */
  generateCacheKey(audioBuffer, audioMetrics) {
    // Create a simple hash based on buffer size and metrics
    const bufferSize = audioBuffer.byteLength;
    const energy = audioMetrics.energy || 0;
    const timestamp = Math.floor(Date.now() / 60000); // 1-minute buckets

    return `${bufferSize}_${energy.toFixed(3)}_${timestamp}`;
  }

  /**
   * Get result from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached result or null
   */
  getFromCache(key) {
    const cached = this.detectionCache.get(key);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.detectionCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Add result to cache
   * @param {string} key - Cache key
   * @param {Object} result - Detection result
   */
  addToCache(key, result) {
    // Limit cache size
    if (this.detectionCache.size > 100) {
      // Remove oldest entries
      const entries = Array.from(this.detectionCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 20 entries
      for (let i = 0; i < 20 && i < entries.length; i++) {
        this.detectionCache.delete(entries[i][0]);
      }
    }

    this.detectionCache.set(key, { ...result, cached: true });
  }

  /**
   * Clear detection cache
   */
  clearCache() {
    this.detectionCache.clear();
    console.log('Language detection cache cleared');
  }

  /**
   * Get detection statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      supportedLanguages: [...this.supportedLanguages],
      cacheSize: this.detectionCache.size,
      cacheTimeout: this.cacheTimeout,
      currentLanguage: get(selectedLanguage)
    };
  }

  /**
   * Update supported languages
   * @param {Array<string>} languages - Language codes
   */
  updateSupportedLanguages(languages) {
    this.supportedLanguages = languages.filter(
      (lang) => typeof lang === 'string' && lang.length === 2
    );

    console.log('Updated supported languages:', this.supportedLanguages);
  }
}

// Export singleton instance
export const languageDetector = new LanguageDetector();
