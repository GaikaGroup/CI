/**
 * InputPlaceholderService
 *
 * Manages input placeholder examples for the session chat interface.
 * Provides rotating placeholders with history tracking to avoid repeats.
 * Supports multiple languages and categories.
 */

class InputPlaceholderService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.placeholderHistory = [];
    this.currentLanguage = null;
    this.cache = new Map();
  }

  /**
   * Initialize the service by loading configuration
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const response = await fetch('/src/lib/config/inputPlaceholders.json');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }
      this.config = await response.json();
      this.isInitialized = true;
      console.log('[InputPlaceholderService] Initialized successfully');
    } catch (error) {
      console.error('[InputPlaceholderService] Failed to load configuration:', error);
      // Fallback to minimal configuration
      this.config = {
        placeholders: {
          general: {
            en: ['Type your question here...'],
            ru: ['Введи свой вопрос здесь...'],
            es: ['Escribe tu pregunta aquí...']
          }
        },
        settings: {
          rotationInterval: 5000,
          avoidRecentRepeats: true,
          historySize: 3,
          defaultLanguage: 'en',
          defaultCategory: 'general'
        }
      };
      this.isInitialized = true;
    }
  }

  /**
   * Get a random placeholder for the specified language and category
   * @param {string} language - Language code (e.g., 'en', 'ru', 'es')
   * @param {string} category - Placeholder category (default: 'general')
   * @returns {Promise<string>} Random placeholder text
   */
  async getPlaceholder(language, category = 'general') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const placeholders = this._getPlaceholdersForLanguage(language, category);

    if (!placeholders || placeholders.length === 0) {
      return this._getFallbackPlaceholder(language);
    }

    // If only one placeholder, return it
    if (placeholders.length === 1) {
      return placeholders[0];
    }

    // Get available placeholders (excluding recent history)
    const availablePlaceholders = this._getAvailablePlaceholders(placeholders);

    // Select random placeholder
    const selected =
      availablePlaceholders[Math.floor(Math.random() * availablePlaceholders.length)];

    // Update history
    this._updateHistory(selected);

    return selected;
  }

  /**
   * Get a sequence of placeholders for rotation
   * @param {string} language - Language code
   * @param {number} count - Number of placeholders to return
   * @param {string} category - Placeholder category
   * @returns {Promise<string[]>} Array of placeholder texts
   */
  async getPlaceholderSequence(language, count = 10, category = 'general') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const placeholders = this._getPlaceholdersForLanguage(language, category);

    if (!placeholders || placeholders.length === 0) {
      const fallback = this._getFallbackPlaceholder(language);
      return Array(count).fill(fallback);
    }

    const sequence = [];
    const tempHistory = [];
    const historySize = this.config.settings.historySize || 3;

    for (let i = 0; i < count; i++) {
      // Filter out recently used placeholders
      const available = placeholders.filter((p) => !tempHistory.includes(p));

      // If all placeholders have been used, reset history
      const pool = available.length > 0 ? available : placeholders;

      // Select random placeholder
      const selected = pool[Math.floor(Math.random() * pool.length)];
      sequence.push(selected);

      // Update temporary history
      tempHistory.push(selected);
      if (tempHistory.length > historySize) {
        tempHistory.shift();
      }
    }

    return sequence;
  }

  /**
   * Check if a language is supported
   * @param {string} language - Language code
   * @returns {boolean} True if language is supported
   */
  isLanguageSupported(language) {
    if (!this.isInitialized || !this.config) {
      return false;
    }

    const category = this.config.settings.defaultCategory || 'general';
    return !!(this.config.placeholders[category] && this.config.placeholders[category][language]);
  }

  /**
   * Get all available categories
   * @returns {string[]} Array of category names
   */
  getCategories() {
    if (!this.isInitialized || !this.config) {
      return ['general'];
    }

    return Object.keys(this.config.placeholders);
  }

  /**
   * Get placeholders for a specific language and category
   * @private
   */
  _getPlaceholdersForLanguage(language, category) {
    if (!this.config || !this.config.placeholders) {
      return null;
    }

    const categoryData = this.config.placeholders[category];
    if (!categoryData) {
      // Try default category
      const defaultCategory = this.config.settings.defaultCategory || 'general';
      return this.config.placeholders[defaultCategory]?.[language];
    }

    // Try requested language
    let placeholders = categoryData[language];

    // Fallback to English
    if (!placeholders || placeholders.length === 0) {
      placeholders = categoryData['en'];
    }

    // Fallback to first available language
    if (!placeholders || placeholders.length === 0) {
      const firstLang = Object.keys(categoryData)[0];
      placeholders = categoryData[firstLang];
    }

    return placeholders;
  }

  /**
   * Get fallback placeholder
   * @private
   */
  _getFallbackPlaceholder(language) {
    const fallbacks = {
      en: 'Type your question here...',
      ru: 'Введи свой вопрос здесь...',
      es: 'Escribe tu pregunta aquí...'
    };

    return fallbacks[language] || fallbacks['en'];
  }

  /**
   * Get available placeholders excluding recent history
   * @private
   */
  _getAvailablePlaceholders(placeholders) {
    if (!this.config.settings.avoidRecentRepeats) {
      return placeholders;
    }

    const available = placeholders.filter((p) => !this.placeholderHistory.includes(p));

    // If all placeholders have been used, reset history and use all
    return available.length > 0 ? available : placeholders;
  }

  /**
   * Update placeholder history
   * @private
   */
  _updateHistory(placeholder) {
    if (!this.config.settings.avoidRecentRepeats) {
      return;
    }

    this.placeholderHistory.push(placeholder);

    const historySize = this.config.settings.historySize || 3;
    if (this.placeholderHistory.length > historySize) {
      this.placeholderHistory.shift();
    }
  }

  /**
   * Clear placeholder history
   */
  clearHistory() {
    this.placeholderHistory = [];
  }

  /**
   * Get rotation interval from configuration
   * @returns {number} Rotation interval in milliseconds
   */
  getRotationInterval() {
    return this.config?.settings?.rotationInterval || 5000;
  }
}

// Export singleton instance
export const inputPlaceholderService = new InputPlaceholderService();
export default inputPlaceholderService;
