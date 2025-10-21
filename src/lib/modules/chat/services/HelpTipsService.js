/**
 * HelpTipsService
 *
 * Manages contextual help tips for the session interface.
 * Provides localized tips based on context and user state.
 */

class HelpTipsService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
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
      const response = await fetch('/src/lib/config/helpTips.json');
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }
      this.config = await response.json();
      this.isInitialized = true;
      console.log('[HelpTipsService] Initialized successfully');
    } catch (error) {
      console.error('[HelpTipsService] Failed to load configuration:', error);
      // Fallback to minimal configuration
      this.config = {
        tips: {
          default: {
            en: 'Tip: The more detailed your question, the better the answer!',
            ru: 'Совет: Чем подробнее вопрос, тем лучше ответ!',
            es: '¡Consejo: Cuanto más detallada sea tu pregunta, mejor será la respuesta!'
          }
        },
        settings: {
          displayDuration: 0,
          fadeTransition: true,
          defaultLanguage: 'en'
        }
      };
      this.isInitialized = true;
    }
  }

  /**
   * Get a help tip for the specified language and context
   * @param {string} language - Language code (e.g., 'en', 'ru', 'es')
   * @param {string} context - Tip context (default: 'default')
   * @returns {Promise<string>} Localized tip text
   */
  async getTip(language, context = 'default') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache
    const cacheKey = `tip_${language}_${context}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const tip = this._getTipForLanguage(language, context);

    // Cache result
    this.cache.set(cacheKey, tip);

    return tip;
  }

  /**
   * Get all tips for a specific language
   * @param {string} language - Language code
   * @returns {Promise<Object>} Object with context keys and tip values
   */
  async getAllTips(language) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const tips = {};

    for (const context in this.config.tips) {
      tips[context] = this._getTipForLanguage(language, context);
    }

    return tips;
  }

  /**
   * Get all available contexts
   * @returns {Promise<string[]>} Array of context names
   */
  async getContexts() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return Object.keys(this.config.tips);
  }

  /**
   * Check if a context exists
   * @param {string} context - Context name
   * @returns {boolean} True if context exists
   */
  hasContext(context) {
    if (!this.isInitialized || !this.config) {
      return false;
    }

    return !!this.config.tips[context];
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

    // Check if default context has translation for this language
    return !!(this.config.tips.default && this.config.tips.default[language]);
  }

  /**
   * Get display duration from configuration
   * @returns {number} Display duration in milliseconds (0 = always visible)
   */
  getDisplayDuration() {
    return this.config?.settings?.displayDuration ?? 0;
  }

  /**
   * Check if fade transition is enabled
   * @returns {boolean} True if fade transition is enabled
   */
  isFadeTransitionEnabled() {
    return this.config?.settings?.fadeTransition ?? true;
  }

  /**
   * Get tip for a specific language and context
   * @private
   */
  _getTipForLanguage(language, context) {
    if (!this.config || !this.config.tips) {
      return this._getFallbackTip(language);
    }

    const contextTips = this.config.tips[context];

    // If context doesn't exist, use default
    if (!contextTips) {
      return this._getTipForLanguage(language, 'default');
    }

    // Try requested language
    let tip = contextTips[language];

    // Fallback to default language
    if (!tip) {
      const defaultLang = this.config.settings.defaultLanguage || 'en';
      tip = contextTips[defaultLang];
    }

    // Fallback to first available language
    if (!tip) {
      const firstLang = Object.keys(contextTips)[0];
      tip = contextTips[firstLang];
    }

    // Ultimate fallback
    if (!tip) {
      tip = this._getFallbackTip(language);
    }

    return tip;
  }

  /**
   * Get fallback tip
   * @private
   */
  _getFallbackTip(language) {
    const fallbacks = {
      en: 'Tip: The more detailed your question, the better the answer!',
      ru: 'Совет: Чем подробнее вопрос, тем лучше ответ!',
      es: '¡Consejo: Cuanto más detallada sea tu pregunta, mejor será la respuesta!'
    };

    return fallbacks[language] || fallbacks['en'];
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const helpTipsService = new HelpTipsService();
export default helpTipsService;
