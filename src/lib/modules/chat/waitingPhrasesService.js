/**
 * Waiting Phrases Service
 * Core service for managing phrase selection, caching, and playback coordination
 */

import {
  loadWaitingPhrasesConfig,
  getPhrasesForLanguage,
  isLanguageSupported
} from './waitingPhrasesConfig.js';
import { get } from 'svelte/store';
import { selectedLanguage, languages } from '$modules/i18n/stores';
import { translationBridge } from './translationBridge.js';

const DEFAULT_CATEGORY = 'DefaultWaitingAnswer';
const DETAILED_CATEGORY = 'DetailedWaitingAnswer';

/**
 * WaitingPhrasesService class handles phrase selection logic and history management
 */
export class WaitingPhrasesService {
  constructor() {
    this.config = null;
    this.phraseHistory = [];
    this.isInitialized = false;
    this.cache = new Map();
    this.lastSelectedPhrase = null;
    this.lastSelectedCategory = null;
    this.currentLanguage = null;
    this.translationCache = new Map();
    this.supportedLanguages = new Set();
    this.phraseCache = new Map();
    this.configLoadPromise = null;
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Initialize the waiting phrases service with lazy loading
   * @returns {Promise<void>}
   */
  async initializeWaitingPhrases() {
    // Implement lazy loading - return existing promise if already loading
    if (this.configLoadPromise) {
      console.log('Configuration already loading, waiting for existing promise...');
      return this.configLoadPromise;
    }

    // If already initialized, return immediately
    if (this.isInitialized) {
      console.log('WaitingPhrasesService already initialized');
      return Promise.resolve();
    }

    // Create and cache the loading promise
    this.configLoadPromise = this._performInitialization();

    try {
      await this.configLoadPromise;
    } finally {
      // Clear the promise once completed (success or failure)
      this.configLoadPromise = null;
    }
  }

  /**
   * Perform the actual initialization with comprehensive error handling
   * @returns {Promise<void>}
   * @private
   */
  async _performInitialization() {
    const initStartTime = Date.now();
    let initializationSteps = [];

    try {
      console.log('Initializing WaitingPhrasesService...');

      // Step 1: Load configuration with error handling
      try {
        initializationSteps.push('loading-config');
        console.log('Step 1: Loading configuration...');
        this.config = await loadWaitingPhrasesConfig();

        if (!this.config) {
          throw new Error('Configuration loader returned null');
        }

        console.log('Configuration loaded successfully');
        initializationSteps.push('config-loaded');
      } catch (configError) {
        console.error('Configuration loading failed:', configError);

        // Try to create emergency configuration
        console.log('Attempting to create emergency configuration...');
        this.config = this._createEmergencyConfig();
        initializationSteps.push('emergency-config');

        if (!this.config) {
          throw new Error('Failed to create emergency configuration');
        }
      }

      // Step 2: Initialize phrase history
      try {
        initializationSteps.push('init-history');
        console.log('Step 2: Initializing phrase history...');
        this.phraseHistory = [];
        console.log('Phrase history initialized');
        initializationSteps.push('history-ready');
      } catch (historyError) {
        console.error('Phrase history initialization failed:', historyError);
        this.phraseHistory = []; // Ensure it's at least an empty array
      }

      // Step 3: Initialize supported languages
      try {
        initializationSteps.push('init-languages');
        console.log('Step 3: Initializing supported languages...');
        this._initializeSupportedLanguages();
        console.log('Supported languages initialized');
        initializationSteps.push('languages-ready');
      } catch (languagesError) {
        console.error('Supported languages initialization failed:', languagesError);
        // Fallback to minimal language support
        this.supportedLanguages = new Set(['en']);
      }

      // Step 4: Pre-cache common phrases (non-critical)
      try {
        initializationSteps.push('pre-caching');
        console.log('Step 4: Pre-caching common phrases...');
        this._preCacheCommonPhrases();
        console.log('Pre-caching completed');
        initializationSteps.push('cache-ready');
      } catch (cacheError) {
        console.warn('Pre-caching failed (non-critical):', cacheError);
        // Continue initialization even if pre-caching fails
      }

      // Step 5: Validate final state
      try {
        initializationSteps.push('validation');
        console.log('Step 5: Validating initialization state...');
        this._validateInitializationState();
        console.log('Initialization state validation passed');
        initializationSteps.push('validated');
      } catch (validationError) {
        console.error('Initialization state validation failed:', validationError);
        throw new Error(`Initialization validation failed: ${validationError.message}`);
      }

      this.isInitialized = true;

      const initTime = Date.now() - initStartTime;
      console.log(`WaitingPhrasesService initialized successfully in ${initTime}ms`);
      console.log('Available categories:', Object.keys(this.config.phrases));
      console.log('Supported languages:', Array.from(this.supportedLanguages));
      console.log('Pre-cached phrases:', this.phraseCache.size);
      console.log('Initialization steps completed:', initializationSteps);
    } catch (error) {
      const initTime = Date.now() - initStartTime;
      console.error(`Failed to initialize WaitingPhrasesService after ${initTime}ms:`, error);
      console.error('Initialization steps completed before failure:', initializationSteps);

      // Log detailed error information
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        initializationSteps,
        initTime,
        timestamp: new Date().toISOString()
      };
      console.error('Initialization error details:', errorDetails);

      this.isInitialized = false;

      // Set minimal fallback state to prevent complete failure
      this._setFallbackState();

      throw error;
    }
  }

  /**
   * Create emergency configuration when normal loading fails
   * @returns {Object} Emergency configuration
   * @private
   */
  _createEmergencyConfig() {
    try {
      console.log('Creating emergency configuration...');

      return {
        phrases: {
          general: {
            en: [
              'Please wait...',
              'Processing...',
              'One moment...',
              'Working on this...',
              'Just a second...'
            ]
          }
        },
        settings: {
          avoidConsecutiveRepeats: false,
          maxPhraseLength: 5,
          fallbackToTranslation: false,
          defaultLanguage: 'en',
          maxHistorySize: 3,
          enableContextualPhrases: false
        }
      };
    } catch (error) {
      console.error('Failed to create emergency configuration:', error);
      return null;
    }
  }

  /**
   * Validate the initialization state
   * @private
   */
  _validateInitializationState() {
    // Check configuration
    if (!this.config || typeof this.config !== 'object') {
      throw new Error('Configuration is invalid or missing');
    }

    if (!this.config.phrases || typeof this.config.phrases !== 'object') {
      throw new Error('Configuration phrases section is invalid or missing');
    }

    if (!this.config.settings || typeof this.config.settings !== 'object') {
      throw new Error('Configuration settings section is invalid or missing');
    }

    // Check phrase history
    if (!Array.isArray(this.phraseHistory)) {
      throw new Error('Phrase history is not properly initialized');
    }

    // Check supported languages
    if (!this.supportedLanguages || !(this.supportedLanguages instanceof Set)) {
      throw new Error('Supported languages set is not properly initialized');
    }

    if (this.supportedLanguages.size === 0) {
      throw new Error('No supported languages found');
    }

    // Check that at least English is supported
    if (!this.supportedLanguages.has('en')) {
      throw new Error('English language support is missing');
    }

    // Check that at least one category exists
    const categories = Object.keys(this.config.phrases);
    if (categories.length === 0) {
      throw new Error('No phrase categories found in configuration');
    }

    // Check that at least one phrase exists
    let totalPhrases = 0;
    for (const category of categories) {
      const languages = Object.keys(this.config.phrases[category]);
      for (const lang of languages) {
        const phrases = this.config.phrases[category][lang];
        if (Array.isArray(phrases)) {
          totalPhrases += phrases.length;
        }
      }
    }

    if (totalPhrases === 0) {
      throw new Error('No phrases found in configuration');
    }

    console.log(
      `Initialization validation passed: ${categories.length} categories, ${this.supportedLanguages.size} languages, ${totalPhrases} total phrases`
    );
  }

  /**
   * Set fallback state when initialization fails
   * @private
   */
  _setFallbackState() {
    try {
      console.log('Setting fallback state for partial functionality...');

      // Ensure basic properties exist
      if (!this.config) {
        this.config = this._createEmergencyConfig();
      }

      if (!Array.isArray(this.phraseHistory)) {
        this.phraseHistory = [];
      }

      if (!this.supportedLanguages || !(this.supportedLanguages instanceof Set)) {
        this.supportedLanguages = new Set(['en']);
      }

      if (!this.cache) {
        this.cache = new Map();
      }

      if (!this.translationCache) {
        this.translationCache = new Map();
      }

      console.log('Fallback state set - service will operate with limited functionality');
    } catch (fallbackError) {
      console.error('Failed to set fallback state:', fallbackError);
    }
  }

  /**
   * Select a waiting phrase for the given language and category
   * @param {string} language - Target language code (optional, uses current language if not provided)
   * @param {string} category - Phrase category (default: DEFAULT_CATEGORY)
   * @returns {Promise<string>} Selected phrase
   */
  async selectWaitingPhrase(language = null, category = DEFAULT_CATEGORY) {
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initializeWaitingPhrases();
      }

      // Detect and validate target language
      const targetLanguage = this._detectTargetLanguage(language);

      // Update current language tracking
      this.currentLanguage = targetLanguage;

      console.log(
        `Selecting waiting phrase for language: ${targetLanguage}, category: ${category}`
      );

      // Try to get phrases with fallback logic
      const phrase = await this._getPhraseWithFallback(targetLanguage, category);

      // Update history and tracking
      this._updatePhraseHistory(phrase, category);

      console.log(`Selected phrase: "${phrase.substring(0, 50)}..."`);

      return phrase;
    } catch (error) {
      console.error('Error selecting waiting phrase:', error);

      // Ultimate fallback to a simple default phrase
      const fallbackPhrase = 'Let me think about this...';
      console.warn(`Using ultimate fallback phrase: "${fallbackPhrase}"`);

      return fallbackPhrase;
    }
  }

  /**
   * Random selection algorithm that avoids consecutive repeats
   * @param {Array<string>} phrases - Available phrases
   * @param {string} category - Current category
   * @returns {string} Selected phrase
   * @private
   */
  _selectRandomPhrase(phrases, category) {
    if (!phrases || phrases.length === 0) {
      throw new Error('No phrases available for selection');
    }

    // If only one phrase available, return it
    if (phrases.length === 1) {
      return phrases[0];
    }

    let availablePhrases = [...phrases];

    // Apply consecutive repeat avoidance if enabled
    if (this.config.settings.avoidConsecutiveRepeats) {
      // Remove the last selected phrase if it's in the same category
      if (this.lastSelectedPhrase && this.lastSelectedCategory === category) {
        availablePhrases = availablePhrases.filter((phrase) => phrase !== this.lastSelectedPhrase);
      }

      // If we filtered out all phrases, use the original array
      if (availablePhrases.length === 0) {
        availablePhrases = [...phrases];
      }
    }

    // Apply history-based filtering to avoid recent repeats
    if (this.phraseHistory.length > 0) {
      const recentPhrases = this.phraseHistory.slice(-Math.min(2, this.phraseHistory.length));
      const filteredPhrases = availablePhrases.filter(
        (phrase) => !recentPhrases.some((historyEntry) => historyEntry.phrase === phrase)
      );

      // Use filtered phrases if we have options, otherwise use available phrases
      if (filteredPhrases.length > 0) {
        availablePhrases = filteredPhrases;
      }
    }

    // Select random phrase from available options
    const randomIndex = Math.floor(Math.random() * availablePhrases.length);
    return availablePhrases[randomIndex];
  }

  /**
   * Update phrase history and tracking
   * @param {string} phrase - Selected phrase
   * @param {string} category - Phrase category
   * @private
   */
  _updatePhraseHistory(phrase, category) {
    // Update last selected tracking
    this.lastSelectedPhrase = phrase;
    this.lastSelectedCategory = category;

    // Add to history with timestamp
    const historyEntry = {
      phrase,
      category,
      language: this.currentLanguage,
      timestamp: Date.now()
    };

    this.phraseHistory.push(historyEntry);

    // Maintain history size limit
    const maxHistorySize = this.config.settings.maxHistorySize || 5;
    if (this.phraseHistory.length > maxHistorySize) {
      this.phraseHistory = this.phraseHistory.slice(-maxHistorySize);
    }

    console.log(`Updated phrase history. Current size: ${this.phraseHistory.length}`);
  }

  /**
   * Get phrase history for debugging or analysis
   * @returns {Array} Current phrase history
   */
  getPhraseHistory() {
    return [...this.phraseHistory];
  }

  /**
   * Clear phrase history
   */
  clearPhraseHistory() {
    this.phraseHistory = [];
    this.lastSelectedPhrase = null;
    this.lastSelectedCategory = null;
    console.log('Phrase history cleared');
  }

  /**
   * Check if the service is initialized
   * @returns {boolean} True if initialized
   */
  isServiceInitialized() {
    return this.isInitialized;
  }

  /**
   * Get available categories
   * @returns {Array<string>} Available category names
   */
  getAvailableCategories() {
    if (!this.config) {
      return [DEFAULT_CATEGORY];
    }
    return Object.keys(this.config.phrases);
  }

  /**
   * Get available languages for a category
   * @param {string} category - Category name (default: DEFAULT_CATEGORY)
   * @returns {Array<string>} Available language codes
   */
  getAvailableLanguages(category = DEFAULT_CATEGORY) {
    if (!this.config || !this.config.phrases[category]) {
      return ['en'];
    }
    return Object.keys(this.config.phrases[category]);
  }

  /**
   * Check if a language is supported for a category
   * @param {string} language - Language code
   * @param {string} category - Category name (default: DEFAULT_CATEGORY)
   * @returns {boolean} True if language is supported
   */
  isLanguageSupported(language, category = DEFAULT_CATEGORY) {
    if (!this.config) {
      return language === 'en';
    }
    return isLanguageSupported(this.config, language, category);
  }

  /**
   * Get configuration settings
   * @returns {Object} Current configuration settings
   */
  getSettings() {
    return this.config ? { ...this.config.settings } : null;
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      historySize: this.phraseHistory.length,
      lastSelected: this.lastSelectedPhrase
        ? this.lastSelectedPhrase.substring(0, 30) + '...'
        : null,
      currentLanguage: this.currentLanguage,
      translationCacheSize: this.translationCache.size,
      supportedLanguages: Array.from(this.supportedLanguages)
    };
  }

  /**
   * Initialize supported languages set from configuration
   * @private
   */
  _initializeSupportedLanguages() {
    this.supportedLanguages.clear();

    if (!this.config || !this.config.phrases) {
      this.supportedLanguages.add('en');
      return;
    }

    // Collect all unique languages across all categories
    for (const category of Object.keys(this.config.phrases)) {
      const categoryLanguages = Object.keys(this.config.phrases[category]);
      categoryLanguages.forEach((lang) => this.supportedLanguages.add(lang));
    }

    console.log('Initialized supported languages:', Array.from(this.supportedLanguages));
  }

  /**
   * Detect target language with preference detection and validation
   * @param {string} language - Provided language code
   * @returns {string} Validated target language
   * @private
   */
  _detectTargetLanguage(language) {
    // Priority order for language detection:
    // 1. Explicitly provided language (if valid)
    // 2. Current selected language from i18n store
    // 3. Default language from configuration
    // 4. Fallback to English

    let targetLanguage = null;

    // Check explicitly provided language
    if (language && this._isValidLanguageCode(language)) {
      targetLanguage = language;
      console.log(`Using explicitly provided language: ${targetLanguage}`);
    }

    // Fall back to selected language from i18n store
    if (!targetLanguage) {
      const currentLanguage = get(selectedLanguage);
      if (currentLanguage && this._isValidLanguageCode(currentLanguage)) {
        targetLanguage = currentLanguage;
        console.log(`Using current selected language: ${targetLanguage}`);
      }
    }

    // Fall back to default language from configuration
    if (!targetLanguage && this.config && this.config.settings.defaultLanguage) {
      const defaultLang = this.config.settings.defaultLanguage;
      if (this._isValidLanguageCode(defaultLang)) {
        targetLanguage = defaultLang;
        console.log(`Using default language from config: ${targetLanguage}`);
      }
    }

    // Ultimate fallback to English
    if (!targetLanguage) {
      targetLanguage = 'en';
      console.log(`Using ultimate fallback language: ${targetLanguage}`);
    }

    return targetLanguage;
  }

  /**
   * Validate if a language code is supported by the application
   * @param {string} languageCode - Language code to validate
   * @returns {boolean} True if language is valid
   * @private
   */
  _isValidLanguageCode(languageCode) {
    if (!languageCode || typeof languageCode !== 'string') {
      return false;
    }

    // Check if language is in the supported languages from i18n
    const appLanguages = languages.map((lang) => lang.code);
    return appLanguages.includes(languageCode);
  }

  /**
   * Get phrase with comprehensive fallback logic and caching
   * @param {string} targetLanguage - Target language code
   * @param {string} category - Phrase category
   * @returns {Promise<string>} Selected phrase
   * @private
   */
  async _getPhraseWithFallback(targetLanguage, category) {
    // Check cache first
    const cacheKey = `${targetLanguage}:${category}`;
    const cachedPhrases = this._getCachedPhrases(cacheKey);

    if (cachedPhrases && cachedPhrases.length > 0) {
      this.cacheStats.hits++;
      console.log(`Cache hit for ${cacheKey}, found ${cachedPhrases.length} phrases`);
      return this._selectRandomPhrase(cachedPhrases, category);
    }

    this.cacheStats.misses++;

    // Step 1: Try to get phrases in target language for target category
    let phrases = getPhrasesForLanguage(this.config, targetLanguage, category);

    if (phrases && phrases.length > 0) {
      console.log(`Found ${phrases.length} phrases for ${targetLanguage}/${category}`);
      // Cache the phrases for future use
      this._cachePhrases(cacheKey, phrases);
      return this._selectRandomPhrase(phrases, category);
    }

    console.log(`No phrases found for ${targetLanguage}/${category}, trying fallbacks...`);

    // Step 2: Try target language with default category if not already default
    if (category !== DEFAULT_CATEGORY) {
      phrases = getPhrasesForLanguage(this.config, targetLanguage, DEFAULT_CATEGORY);
      if (phrases && phrases.length > 0) {
        console.log(
          `Found ${phrases.length} phrases for ${targetLanguage}/${DEFAULT_CATEGORY} (category fallback)`
        );
        return this._selectRandomPhrase(phrases, DEFAULT_CATEGORY);
      }
    }

    // Step 3: Try English with target category and translation
    if (targetLanguage !== 'en') {
      phrases = getPhrasesForLanguage(this.config, 'en', category);
      if (phrases && phrases.length > 0) {
        console.log(`Found ${phrases.length} phrases for en/${category} (language fallback)`);

        // Always try translation if enabled and target language is not English
        if (this.config.settings.fallbackToTranslation) {
          const englishPhrase = this._selectRandomPhrase(phrases, category);

          try {
            const translatedPhrase = await this._translatePhraseWithRetry(
              englishPhrase,
              targetLanguage
            );
            if (translatedPhrase) {
              console.log(`Successfully translated English phrase to ${targetLanguage}`);
              return translatedPhrase;
            }
          } catch (translationError) {
            console.warn(
              `Translation failed for "${englishPhrase}" to ${targetLanguage}:`,
              translationError
            );
          }

          // If translation fails, return English phrase as fallback
          console.log(`Using English phrase as fallback for ${targetLanguage}`);
          return englishPhrase;
        }

        return this._selectRandomPhrase(phrases, category);
      }
    }

    // Step 4: Try English with default category and translation
    phrases = getPhrasesForLanguage(this.config, 'en', DEFAULT_CATEGORY);
    if (phrases && phrases.length > 0) {
      console.log(`Found ${phrases.length} phrases for en/general (full fallback)`);

      // Always try translation if enabled and target language is not English
      if (this.config.settings.fallbackToTranslation && targetLanguage !== 'en') {
        const englishPhrase = this._selectRandomPhrase(phrases, DEFAULT_CATEGORY);

        try {
          const translatedPhrase = await this._translatePhraseWithRetry(
            englishPhrase,
            targetLanguage
          );
          if (translatedPhrase) {
            console.log(`Successfully translated English general phrase to ${targetLanguage}`);
            return translatedPhrase;
          }
        } catch (translationError) {
          console.warn(
            `Translation failed for general phrase "${englishPhrase}" to ${targetLanguage}:`,
            translationError
          );
        }

        // If translation fails, return English phrase as fallback
        console.log(`Using English general phrase as fallback for ${targetLanguage}`);
        return englishPhrase;
      }

      return this._selectRandomPhrase(phrases, DEFAULT_CATEGORY);
    }

    // Step 5: Ultimate fallback with translation attempt
    console.warn('No phrases found in configuration, using hardcoded fallback');
    const hardcodedFallbacks = [
      'Let me think about this...',
      'Give me a moment...',
      'Processing your request...',
      'One moment please...'
    ];

    const selectedFallback =
      hardcodedFallbacks[Math.floor(Math.random() * hardcodedFallbacks.length)];

    // Try to translate hardcoded fallback if translation is enabled
    if (this.config.settings.fallbackToTranslation && targetLanguage !== 'en') {
      try {
        const translatedFallback = await this._translatePhraseWithRetry(
          selectedFallback,
          targetLanguage
        );
        if (translatedFallback) {
          console.log(`Successfully translated hardcoded fallback to ${targetLanguage}`);
          return translatedFallback;
        }
      } catch (translationError) {
        console.warn(
          `Translation failed for hardcoded fallback "${selectedFallback}" to ${targetLanguage}:`,
          translationError
        );
      }
    }

    console.log(`Using English hardcoded fallback: "${selectedFallback}"`);
    return selectedFallback;
  }

  /**
   * Translate phrase with retry logic and error handling
   * @param {string} phrase - Phrase to translate
   * @param {string} targetLanguage - Target language
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<string|null>} Translated phrase or null
   * @private
   */
  async _translatePhraseWithRetry(phrase, targetLanguage, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Translation attempt ${attempt}/${maxRetries} for "${phrase.substring(0, 30)}..." to ${targetLanguage}`
        );

        const translatedPhrase = await this._translatePhrase(phrase, targetLanguage);

        if (translatedPhrase) {
          console.log(`Translation successful on attempt ${attempt}`);
          return translatedPhrase;
        } else {
          console.log(`Translation returned null on attempt ${attempt}`);
          return null; // Don't retry if translation service returns null (not supported)
        }
      } catch (error) {
        lastError = error;
        console.warn(`Translation attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 100; // 100ms, 200ms, 400ms...
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      `All translation attempts failed for "${phrase}" to ${targetLanguage}:`,
      lastError
    );
    throw lastError || new Error('Translation failed after all retries');
  }

  /**
   * Translate a phrase to the target language using translation bridge
   * @param {string} phrase - Phrase to translate
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string|null>} Translated phrase or null if translation fails
   * @private
   */
  async _translatePhrase(phrase, targetLanguage) {
    try {
      console.log(
        `Attempting to translate phrase to ${targetLanguage}: "${phrase.substring(0, 50)}..."`
      );

      // Use the translation bridge service for translation
      const translatedPhrase = await translationBridge.translatePhrase(phrase, targetLanguage);

      if (translatedPhrase) {
        console.log(`Successfully translated phrase to ${targetLanguage}`);
      } else {
        console.log(`Translation not available for ${targetLanguage}, will use original phrase`);
      }

      return translatedPhrase;
    } catch (error) {
      console.error('Error translating phrase:', error);
      return null;
    }
  }

  /**
   * Clear translation cache (delegates to translation bridge)
   */
  clearTranslationCache() {
    translationBridge.clearCache();
    console.log('Translation cache cleared via translation bridge');
  }

  /**
   * Get translation cache statistics (from translation bridge)
   * @returns {Object} Translation cache statistics
   */
  getTranslationCacheStats() {
    return translationBridge.getTranslationStats();
  }

  /**
   * Warm up translation cache for current language
   * @param {string} language - Language to warm up (optional)
   */
  async warmUpTranslationCache(language = null) {
    try {
      const targetLanguage = language || this.currentLanguage || get(selectedLanguage) || 'en';

      if (targetLanguage === 'en') {
        console.log('Skipping translation cache warmup for English');
        return;
      }

      console.log(`Warming up translation cache for ${targetLanguage}...`);

      // Get common phrases to warm up
      const commonPhrases = [];
      const categories = this.getAvailableCategories();

      for (const category of categories) {
        const phrases = getPhrasesForLanguage(this.config, 'en', category);
        if (phrases && phrases.length > 0) {
          commonPhrases.push(...phrases.slice(0, 3)); // Take first 3 phrases from each category
        }
      }

      // Warm up translation bridge
      await translationBridge.warmUpCache([targetLanguage], commonPhrases);

      console.log(`Translation cache warmed up for ${targetLanguage}`);
    } catch (error) {
      console.error('Error warming up translation cache:', error);
    }
  }

  /**
   * Add custom phrase translation
   * @param {string} englishPhrase - English phrase
   * @param {Object} translations - Object with language codes as keys
   */
  addCustomTranslation(englishPhrase, translations) {
    const translationKey = `custom_${Date.now()}`;
    translationBridge.addPhraseTranslation(englishPhrase, translationKey, translations);
    console.log(`Added custom translation for: "${englishPhrase}"`);
  }

  /**
   * Check if translation service is available and working
   * @param {string} targetLanguage - Language to test
   * @returns {Promise<boolean>} True if translation service is working
   */
  async isTranslationServiceAvailable(targetLanguage = 'ru') {
    try {
      if (targetLanguage === 'en') {
        return true; // No translation needed for English
      }

      // Test with a simple phrase
      const testPhrase = 'Hello';
      const result = await this._translatePhrase(testPhrase, targetLanguage);

      return result !== null;
    } catch (error) {
      console.warn('Translation service availability check failed:', error);
      return false;
    }
  }

  /**
   * Get fallback phrase when all translation attempts fail
   * @param {string} targetLanguage - Target language
   * @param {string} category - Phrase category
   * @returns {string} Fallback phrase
   * @private
   */
  _getFallbackPhrase(targetLanguage, category) {
    // Language-specific hardcoded fallbacks
    const fallbacks = {
      ru: {
        [DEFAULT_CATEGORY]: 'Позвольте мне подумать...',
        [DETAILED_CATEGORY]: 'Собираю подробный ответ...'
      },
      es: {
        [DEFAULT_CATEGORY]: 'Déjame pensar...',
        [DETAILED_CATEGORY]: 'Preparando una explicación completa...'
      },
      en: {
        [DEFAULT_CATEGORY]: 'Let me think...',
        [DETAILED_CATEGORY]: 'Preparing a detailed answer...'
      }
    };

    // Try to get language-specific fallback
    if (fallbacks[targetLanguage] && fallbacks[targetLanguage][category]) {
      return fallbacks[targetLanguage][category];
    }

    // Try default category for the language
    if (fallbacks[targetLanguage] && fallbacks[targetLanguage][DEFAULT_CATEGORY]) {
      return fallbacks[targetLanguage][DEFAULT_CATEGORY];
    }

    // Ultimate fallback to English
    if (fallbacks.en[category]) {
      return fallbacks.en[category];
    }

    return fallbacks.en.general;
  }

  /**
   * Handle translation service errors gracefully
   * @param {Error} error - Translation error
   * @param {string} phrase - Original phrase
   * @param {string} targetLanguage - Target language
   * @returns {string} Fallback phrase or original phrase
   * @private
   */
  _handleTranslationError(error, phrase, targetLanguage) {
    console.error(`Translation service error for "${phrase}" to ${targetLanguage}:`, error);

    // Log error details for debugging
    const errorInfo = {
      message: error.message,
      phrase: phrase.substring(0, 50),
      targetLanguage,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    console.error('Translation error details:', errorInfo);

    // Return appropriate fallback
    if (targetLanguage === 'en') {
      return phrase; // Return original if target is English
    }

    // Try to get a hardcoded fallback for the language
    const fallback = this._getFallbackPhrase(targetLanguage, DEFAULT_CATEGORY);

    console.log(`Using hardcoded fallback for ${targetLanguage}: "${fallback}"`);
    return fallback;
  }

  /**
   * Pre-cache commonly used phrases for performance optimization
   * @private
   */
  _preCacheCommonPhrases() {
    if (!this.config || !this.config.phrases) {
      return;
    }

    console.log('Pre-caching common phrases...');

    // Cache phrases for supported languages and common categories
    const commonCategories = Object.keys(this.config.phrases);
    const supportedLangs = Array.from(this.supportedLanguages);

    for (const language of supportedLangs) {
      for (const category of commonCategories) {
        const phrases = getPhrasesForLanguage(this.config, language, category);
        if (phrases && phrases.length > 0) {
          const cacheKey = `${language}:${category}`;
          this._cachePhrases(cacheKey, phrases);
        }
      }
    }

    console.log(`Pre-cached ${this.phraseCache.size} phrase collections`);
  }

  /**
   * Cache phrases for a specific language and category
   * @param {string} cacheKey - Cache key (language:category)
   * @param {Array<string>} phrases - Phrases to cache
   * @private
   */
  _cachePhrases(cacheKey, phrases) {
    if (!phrases || phrases.length === 0) {
      return;
    }

    // Create cache entry with metadata
    const cacheEntry = {
      phrases: [...phrases],
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.phraseCache.set(cacheKey, cacheEntry);

    // Manage cache size to prevent memory issues
    this._manageCacheSize();
  }

  /**
   * Get cached phrases for a language and category
   * @param {string} cacheKey - Cache key (language:category)
   * @returns {Array<string>|null} Cached phrases or null if not found
   * @private
   */
  _getCachedPhrases(cacheKey) {
    const cacheEntry = this.phraseCache.get(cacheKey);

    if (!cacheEntry) {
      return null;
    }

    // Update access statistics
    cacheEntry.accessCount++;
    cacheEntry.lastAccessed = Date.now();

    return cacheEntry.phrases;
  }

  /**
   * Manage cache size by evicting least recently used entries
   * @private
   */
  _manageCacheSize() {
    const maxCacheSize = 50; // Maximum number of cached phrase collections

    if (this.phraseCache.size <= maxCacheSize) {
      return;
    }

    console.log(
      `Cache size (${this.phraseCache.size}) exceeds limit (${maxCacheSize}), evicting entries...`
    );

    // Convert to array and sort by last accessed time (oldest first)
    const entries = Array.from(this.phraseCache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    // Remove oldest entries until we're under the limit
    const entriesToRemove = this.phraseCache.size - maxCacheSize + 5; // Remove a few extra to avoid frequent evictions

    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      const [key] = entries[i];
      this.phraseCache.delete(key);
      this.cacheStats.evictions++;
    }

    console.log(
      `Evicted ${entriesToRemove} cache entries. New cache size: ${this.phraseCache.size}`
    );
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.phraseCache.clear();
    this.translationCache.clear();
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    console.log('All caches cleared');
  }

  /**
   * Warm up cache by pre-loading phrases for current language
   * @param {string} language - Language to warm up (optional, uses current language)
   */
  async warmUpCache(language = null) {
    try {
      if (!this.isInitialized) {
        await this.initializeWaitingPhrases();
      }

      const targetLanguage = language || this.currentLanguage || get(selectedLanguage) || 'en';
      console.log(`Warming up cache for language: ${targetLanguage}`);

      const categories = this.getAvailableCategories();

      for (const category of categories) {
        const phrases = getPhrasesForLanguage(this.config, targetLanguage, category);
        if (phrases && phrases.length > 0) {
          const cacheKey = `${targetLanguage}:${category}`;
          this._cachePhrases(cacheKey, phrases);
        }
      }

      console.log(`Cache warmed up for ${targetLanguage}. Cache size: ${this.phraseCache.size}`);
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   * @returns {Object} Detailed cache statistics
   */
  getDetailedCacheStats() {
    const phraseCacheEntries = Array.from(this.phraseCache.entries()).map(([key, entry]) => {
      const [language, category] = key.split(':');
      return {
        language,
        category,
        phraseCount: entry.phrases.length,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
        ageMinutes: Math.round((Date.now() - entry.timestamp) / (1000 * 60))
      };
    });

    return {
      phraseCache: {
        size: this.phraseCache.size,
        entries: phraseCacheEntries
      },
      translationCache: {
        size: this.translationCache.size,
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
      },
      statistics: {
        ...this.cacheStats,
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
      },
      memory: {
        historySize: this.phraseHistory.length,
        supportedLanguagesCount: this.supportedLanguages.size,
        isInitialized: this.isInitialized
      }
    };
  }

  /**
   * Optimize cache by removing unused entries and reorganizing
   */
  optimizeCache() {
    console.log('Optimizing phrase cache...');

    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const minAccessCount = 1;

    let removedCount = 0;

    // Remove old or unused entries
    for (const [key, entry] of this.phraseCache.entries()) {
      const age = now - entry.timestamp;
      const isOld = age > maxAge;
      const isUnused = entry.accessCount < minAccessCount && age > 5 * 60 * 1000; // 5 minutes

      if (isOld || isUnused) {
        this.phraseCache.delete(key);
        removedCount++;
      }
    }

    console.log(
      `Cache optimization complete. Removed ${removedCount} entries. Current size: ${this.phraseCache.size}`
    );

    // Update eviction stats
    this.cacheStats.evictions += removedCount;
  }
}

// Create and export a singleton instance
export const waitingPhrasesService = new WaitingPhrasesService();

// Export the class for testing purposes
export default WaitingPhrasesService;
