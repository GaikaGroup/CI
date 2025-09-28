/**
 * Language Detector for Interruptions
 * Detects language from audio characteristics and patterns
 */

import { get } from 'svelte/store';
import { selectedLanguage, languages } from '$modules/i18n/stores';

export class LanguageDetector {
  constructor() {
    this.supportedLanguages = ['en', 'es', 'ru'];
    this.detectionCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    
    // Language-specific audio characteristics
    this.languageProfiles = {
      en: {
        // English characteristics
        fundamentalRange: [85, 255],     // Hz - typical F0 range
        formantPatterns: [
          [730, 1090],  // /a/ vowel formants
          [270, 2290],  // /i/ vowel formants
          [300, 870]    // /u/ vowel formants
        ],
        rhythmPattern: 'stress-timed',
        consonantRatio: 0.6,
        voicingRatio: 0.4
      },
      es: {
        // Spanish characteristics
        fundamentalRange: [90, 280],
        formantPatterns: [
          [700, 1200],  // /a/ vowel formants
          [280, 2200],  // /i/ vowel formants
          [320, 800]    // /u/ vowel formants
        ],
        rhythmPattern: 'syllable-timed',
        consonantRatio: 0.55,
        voicingRatio: 0.45
      },
      ru: {
        // Russian characteristics
        fundamentalRange: [80, 300],
        formantPatterns: [
          [650, 1100],  // /a/ vowel formants
          [250, 2100],  // /i/ vowel formants
          [300, 700]    // /u/ vowel formants
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
        rhoticSounds: true,        // R-coloring
        thSounds: true,            // /θ/ and /ð/ sounds
        vowelReduction: true,      // Schwa in unstressed syllables
        consonantClusters: true    // Complex consonant clusters
      },
      es: {
        // Spanish-specific patterns
        rhoticSounds: true,        // Rolled R
        thSounds: false,           // No /θ/ sounds (in most dialects)
        vowelReduction: false,     // Clear vowels
        consonantClusters: false   // Simpler consonant structure
      },
      ru: {
        // Russian-specific patterns
        rhoticSounds: true,        // Rolled R
        thSounds: false,           // No /θ/ sounds
        vowelReduction: true,      // Vowel reduction in unstressed syllables
        consonantClusters: true,   // Complex consonant clusters
        palatalization: true       // Palatalized consonants
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
      
      console.log(`Language detected: ${detectionResult.language} (confidence: ${detectionResult.confidence})`);
      
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
    this.supportedLanguages.forEach(lang => {
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
      Object.keys(audioScores).forEach(lang => {
        if (detectionScores[lang] !== undefined) {
          detectionScores[lang] += audioScores[lang] * 0.3;
        }
      });
    }

    // Factor 3: Prosodic pattern analysis (simulated)
    const prosodicScores = this.analyzeProsodicPatterns(audioMetrics);
    Object.keys(prosodicScores).forEach(lang => {
      if (detectionScores[lang] !== undefined) {
        detectionScores[lang] += prosodicScores[lang] * 0.2;
      }
    });

    // Factor 4: User's language history
    const historyScores = this.analyzeLanguageHistory();
    Object.keys(historyScores).forEach(lang => {
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
    const { energy, backgroundNoise, vadThreshold } = audioMetrics;

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
    const energyVariance = audioMetrics.energyHistory ? 
      this.calculateVariance(audioMetrics.energyHistory) : 0.1;

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
    const availableLanguages = languages.map(lang => lang.code);
    
    // Current language gets a boost
    const currentLang = get(selectedLanguage);
    
    availableLanguages.forEach(lang => {
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
    return Math.min(1, (dominance * 0.7) + (absoluteConfidence * 0.3));
  }

  /**
   * Calculate variance of an array
   * @param {Array<number>} values - Values to analyze
   * @returns {number} Variance
   */
  calculateVariance(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Detect language from text patterns (fallback method)
   * @param {string} text - Text to analyze
   * @returns {Object} Detection result
   */
  detectLanguageFromText(text) {
    if (!text || text.length < 3) {
      return this.getFallbackLanguage();
    }

    const scores = {};
    
    // Initialize scores
    this.supportedLanguages.forEach(lang => {
      scores[lang] = 0;
    });

    // Russian detection - Cyrillic characters
    if (/[а-яё]/i.test(text)) {
      scores.ru = 0.9;
      return {
        language: 'ru',
        confidence: 0.9,
        scores: scores,
        method: 'text_analysis',
        timestamp: Date.now()
      };
    }

    // Spanish detection - Spanish-specific characters and patterns
    if (/[ñáéíóúü¿¡]/i.test(text) || 
        /\b(el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|están)\b/i.test(text)) {
      scores.es = 0.8;
      scores.en = 0.1;
    } else {
      // Default to English for Latin script
      scores.en = 0.7;
      scores.es = 0.2;
    }

    const bestLanguage = Object.entries(scores).reduce((best, [lang, score]) => 
      score > best.score ? { language: lang, score } : best, 
      { language: 'en', score: 0 }
    ).language;

    return {
      language: bestLanguage,
      confidence: scores[bestLanguage],
      scores: scores,
      method: 'text_analysis',
      timestamp: Date.now()
    };
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
    this.supportedLanguages = languages.filter(lang => 
      typeof lang === 'string' && lang.length === 2
    );
    
    console.log('Updated supported languages:', this.supportedLanguages);
  }
}

// Export singleton instance
export const languageDetector = new LanguageDetector();