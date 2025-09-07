/**
 * Translation Bridge Service
 * Integrates waiting phrases with the existing i18n translation system
 */

import { getTranslation } from '$modules/i18n/translations.js';

/**
 * TranslationBridge class handles translation of waiting phrases using existing i18n system
 */
export class TranslationBridge {
  constructor() {
    this.translationCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      translations: 0,
      failures: 0
    };
    
    // Predefined translations for common waiting phrases
    this.waitingPhraseTranslations = {
      en: {
        'Let me think about this...': 'thinking',
        'Give me a moment to process this...': 'processing',
        'Hmm, interesting question...': 'interesting',
        'I need to consider this carefully...': 'considering',
        'Let me gather my thoughts...': 'gathering',
        'One moment please...': 'moment',
        'Processing your request...': 'processingRequest',
        'Analyzing your question...': 'analyzing',
        'Working on this...': 'working',
        'Just a second...': 'second',
        'Ooh, this is a good one! Let me chew on this for a sec... I\'m piecing together some really cool connections that\'ll make this worth the wait.': 'goodOne',
        'You\'ve got me thinking hard on this one! I\'m digging through everything I know to make sure I don\'t miss anything important.': 'thinkingHard',
        'Hang on, this deserves the full treatment... I\'m sorting through a bunch of different angles so I can give you something really solid.': 'fullTreatment',
        'Nice question! I\'m taking a beat to really think this through properly instead of just throwing something quick at you.': 'niceQuestion',
        'You\'ve stumped me in the best way! I\'m working through this step by step because I want to make sure I nail it for you.': 'stumped',
        'Hold up, let me really dig into this one... There\'s more to unpack here than meets the eye, and I want to get it right.': 'digDeep',
        'This is the kind of question I love! Give me a moment to connect all the pieces - I\'ve got some interesting stuff brewing up here.': 'loveQuestion',
        'You\'re making me work for it, and I\'m here for it! I\'m taking my time to make sure I give you something actually useful, not just quick and dirty.': 'workForIt',
        'Alright, you\'ve got my gears turning... I\'m running through this from a few different directions to make sure I cover all the bases.': 'gearsTurning',
        'This one\'s got layers! I\'m taking a minute to really break it down properly because you deserve better than a half-baked answer.': 'gotLayers'
      }
    };
    
    // Extended translations for waiting phrases
    this.extendedTranslations = {
      ru: {
        thinking: 'Позвольте мне подумать об этом...',
        processing: 'Дайте мне момент, чтобы обработать это...',
        interesting: 'Хм, интересный вопрос...',
        considering: 'Мне нужно тщательно это рассмотреть...',
        gathering: 'Позвольте мне собраться с мыслями...',
        moment: 'Один момент, пожалуйста...',
        processingRequest: 'Обрабатываю ваш запрос...',
        analyzing: 'Анализирую ваш вопрос...',
        working: 'Работаю над этим...',
        second: 'Секундочку...',
        goodOne: 'Ого, это интересный вопрос! Дай-ка я над этим покумекаю... Тут такие классные связи вырисовываются, что стоит подождать.',
        thinkingHard: 'Ты меня реально заставил задуматься! Перерываю все, что знаю, чтобы ничего важного не упустить.',
        fullTreatment: 'Подожди, это заслуживает серьезного подхода... Разбираю кучу разных углов зрения, чтобы дать тебе что-то реально толковое.',
        niceQuestion: 'Классный вопрос! Беру паузу, чтобы как следует все обдумать, а не выдавать первое, что в голову пришло.',
        stumped: 'Ты меня здорово озадачил! Разбираю по шагам, потому что хочу точно попасть в яблочко.',
        digDeep: 'Стоп, дай-ка я в это углублюсь... Тут больше нюансов, чем кажется на первый взгляд, и я хочу все правильно разложить.',
        loveQuestion: 'Обожаю такие вопросы! Дай минутку связать все кусочки - тут такая интересная штука вырисовывается.',
        workForIt: 'Заставляешь меня попотеть, и мне это нравится! Не тороплюсь, чтобы дать тебе что-то реально полезное, а не абы как.',
        gearsTurning: 'Ладно, ты запустил мои мозги... Прогоняю это с разных сторон, чтобы ничего не упустить.',
        gotLayers: 'Тут много слоев! Беру минутку, чтобы все как следует разобрать, потому что ты заслуживаешь не сырой ответ.'
      },
      es: {
        thinking: 'Déjame pensar en esto...',
        processing: 'Dame un momento para procesar esto...',
        interesting: 'Hmm, pregunta interesante...',
        considering: 'Necesito considerar esto cuidadosamente...',
        gathering: 'Déjame ordenar mis pensamientos...',
        moment: 'Un momento por favor...',
        processingRequest: 'Procesando tu solicitud...',
        analyzing: 'Analizando tu pregunta...',
        working: 'Trabajando en esto...',
        second: 'Solo un segundo...',
        goodOne: '¡Uy, esta está buena! Déjame masticar esto un ratito... Estoy conectando cosas súper interesantes que van a valer la pena.',
        thinkingHard: '¡Me tienes pensando en serio con esta! Estoy rebuscando todo lo que sé para no dejarme nada importante.',
        fullTreatment: 'Espérate, esto se merece el tratamiento completo... Estoy revisando un montón de enfoques diferentes para darte algo realmente sólido.',
        niceQuestion: '¡Buena pregunta! Me tomo un momento para pensarlo bien en lugar de soltarte cualquier cosa rápida.',
        stumped: '¡Me has dejado pensando de la mejor manera! Lo estoy trabajando paso a paso porque quiero clavártela perfecta.',
        digDeep: 'Para, déjame profundizar en esta... Hay más que desentrañar de lo que parece a simple vista, y quiero hacerlo bien.',
        loveQuestion: '¡Este es el tipo de pregunta que me encanta! Dame un momento para conectar todas las piezas - tengo algo interesante cocinándose aquí.',
        workForIt: 'Me estás haciendo trabajar, ¡y me gusta! Me tomo mi tiempo para darte algo realmente útil, no algo rápido y chapucero.',
        gearsTurning: 'Bueno, me tienes los engranajes girando... Lo estoy viendo desde varias direcciones para asegurarme de cubrir todas las bases.',
        gotLayers: '¡Esta tiene capas! Me tomo un minuto para desglosarla bien porque te mereces algo mejor que una respuesta a medias.'
      }
    };
  }

  /**
   * Translate a waiting phrase to the target language
   * @param {string} phrase - Original phrase to translate
   * @param {string} targetLanguage - Target language code
   * @returns {Promise<string|null>} Translated phrase or null if translation fails
   */
  async translatePhrase(phrase, targetLanguage) {
    try {
      // Check cache first
      const cacheKey = `${phrase}:${targetLanguage}`;
      if (this.translationCache.has(cacheKey)) {
        this.cacheStats.hits++;
        return this.translationCache.get(cacheKey);
      }

      this.cacheStats.misses++;

      // If target language is English, return original phrase
      if (targetLanguage === 'en') {
        const result = phrase;
        this._cacheTranslation(cacheKey, result);
        return result;
      }

      console.log(`Translating phrase to ${targetLanguage}: "${phrase.substring(0, 50)}..."`);

      // Try to find translation using predefined mappings
      let translatedPhrase = await this._translateUsingPredefinedMappings(phrase, targetLanguage);
      
      if (translatedPhrase) {
        this.cacheStats.translations++;
        this._cacheTranslation(cacheKey, translatedPhrase);
        console.log(`Successfully translated phrase to ${targetLanguage}`);
        return translatedPhrase;
      }

      // Try pattern-based translation for common phrase patterns
      translatedPhrase = await this._translateUsingPatterns(phrase, targetLanguage);
      
      if (translatedPhrase) {
        this.cacheStats.translations++;
        this._cacheTranslation(cacheKey, translatedPhrase);
        console.log(`Successfully translated phrase using patterns to ${targetLanguage}`);
        return translatedPhrase;
      }

      // If no translation found, cache null to avoid repeated attempts
      this.cacheStats.failures++;
      this._cacheTranslation(cacheKey, null);
      console.log(`Translation not available for ${targetLanguage}, will use original phrase`);
      
      return null;

    } catch (error) {
      console.error('Error translating phrase:', error);
      this.cacheStats.failures++;
      return null;
    }
  }

  /**
   * Translate using predefined mappings
   * @param {string} phrase - Original phrase
   * @param {string} targetLanguage - Target language
   * @returns {Promise<string|null>} Translated phrase or null
   * @private
   */
  async _translateUsingPredefinedMappings(phrase, targetLanguage) {
    // Check if we have a direct mapping for this phrase
    const englishMappings = this.waitingPhraseTranslations.en;
    const translationKey = englishMappings[phrase];
    
    if (translationKey && this.extendedTranslations[targetLanguage]) {
      const translation = this.extendedTranslations[targetLanguage][translationKey];
      if (translation) {
        return translation;
      }
    }

    // Try to find similar phrases (case-insensitive, trimmed)
    const normalizedPhrase = phrase.toLowerCase().trim();
    for (const [originalPhrase, key] of Object.entries(englishMappings)) {
      if (originalPhrase.toLowerCase().trim() === normalizedPhrase) {
        const translation = this.extendedTranslations[targetLanguage]?.[key];
        if (translation) {
          return translation;
        }
      }
    }

    return null;
  }

  /**
   * Translate using pattern-based matching
   * @param {string} phrase - Original phrase
   * @param {string} targetLanguage - Target language
   * @returns {Promise<string|null>} Translated phrase or null
   * @private
   */
  async _translateUsingPatterns(phrase, targetLanguage) {
    // Define common patterns and their translations
    const patterns = {
      ru: [
        { pattern: /^let me think/i, translation: 'Позвольте мне подумать' },
        { pattern: /^give me a moment/i, translation: 'Дайте мне момент' },
        { pattern: /^one moment/i, translation: 'Один момент' },
        { pattern: /^just a second/i, translation: 'Секундочку' },
        { pattern: /^processing/i, translation: 'Обрабатываю' },
        { pattern: /^analyzing/i, translation: 'Анализирую' },
        { pattern: /^working on/i, translation: 'Работаю над' },
        { pattern: /^hmm/i, translation: 'Хм' }
      ],
      es: [
        { pattern: /^let me think/i, translation: 'Déjame pensar' },
        { pattern: /^give me a moment/i, translation: 'Dame un momento' },
        { pattern: /^one moment/i, translation: 'Un momento' },
        { pattern: /^just a second/i, translation: 'Solo un segundo' },
        { pattern: /^processing/i, translation: 'Procesando' },
        { pattern: /^analyzing/i, translation: 'Analizando' },
        { pattern: /^working on/i, translation: 'Trabajando en' },
        { pattern: /^hmm/i, translation: 'Hmm' }
      ]
    };

    const languagePatterns = patterns[targetLanguage];
    if (!languagePatterns) {
      return null;
    }

    // Try to match patterns
    for (const { pattern, translation } of languagePatterns) {
      if (pattern.test(phrase)) {
        // Add ellipsis if original phrase had it
        const hasEllipsis = phrase.includes('...');
        return hasEllipsis ? `${translation}...` : translation;
      }
    }

    return null;
  }

  /**
   * Cache a translation result
   * @param {string} cacheKey - Cache key
   * @param {string|null} translation - Translation result
   * @private
   */
  _cacheTranslation(cacheKey, translation) {
    this.translationCache.set(cacheKey, translation);
    
    // Limit cache size to prevent memory issues
    if (this.translationCache.size > 200) {
      const firstKey = this.translationCache.keys().next().value;
      this.translationCache.delete(firstKey);
    }
  }

  /**
   * Add a new phrase translation
   * @param {string} englishPhrase - English phrase
   * @param {string} translationKey - Translation key
   * @param {Object} translations - Object with language codes as keys and translations as values
   */
  addPhraseTranslation(englishPhrase, translationKey, translations) {
    // Add to English mappings
    this.waitingPhraseTranslations.en[englishPhrase] = translationKey;
    
    // Add translations for each language
    for (const [lang, translation] of Object.entries(translations)) {
      if (!this.extendedTranslations[lang]) {
        this.extendedTranslations[lang] = {};
      }
      this.extendedTranslations[lang][translationKey] = translation;
    }
    
    console.log(`Added translation for phrase: "${englishPhrase}" with key: "${translationKey}"`);
  }

  /**
   * Get available languages for translation
   * @returns {Array<string>} Array of supported language codes
   */
  getSupportedLanguages() {
    return ['en', ...Object.keys(this.extendedTranslations)];
  }

  /**
   * Check if a language is supported for translation
   * @param {string} languageCode - Language code to check
   * @returns {boolean} True if language is supported
   */
  isLanguageSupported(languageCode) {
    return languageCode === 'en' || this.extendedTranslations.hasOwnProperty(languageCode);
  }

  /**
   * Get translation statistics
   * @returns {Object} Translation statistics
   */
  getTranslationStats() {
    return {
      cacheSize: this.translationCache.size,
      supportedLanguages: this.getSupportedLanguages(),
      predefinedPhrases: Object.keys(this.waitingPhraseTranslations.en).length,
      stats: {
        ...this.cacheStats,
        hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
        successRate: this.cacheStats.translations / (this.cacheStats.translations + this.cacheStats.failures) || 0
      }
    };
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      translations: 0,
      failures: 0
    };
    console.log('Translation cache cleared');
  }

  /**
   * Warm up cache by pre-translating common phrases
   * @param {Array<string>} languages - Languages to warm up
   * @param {Array<string>} phrases - Phrases to pre-translate
   */
  async warmUpCache(languages = ['ru', 'es'], phrases = null) {
    const phrasesToTranslate = phrases || Object.keys(this.waitingPhraseTranslations.en);
    
    console.log(`Warming up translation cache for ${languages.length} languages and ${phrasesToTranslate.length} phrases...`);
    
    let translatedCount = 0;
    
    for (const language of languages) {
      if (language === 'en') continue; // Skip English
      
      for (const phrase of phrasesToTranslate) {
        try {
          const translation = await this.translatePhrase(phrase, language);
          if (translation) {
            translatedCount++;
          }
        } catch (error) {
          console.warn(`Failed to warm up translation for "${phrase}" in ${language}:`, error);
        }
      }
    }
    
    console.log(`Translation cache warmed up: ${translatedCount} translations cached`);
  }

  /**
   * Export translations for debugging or configuration
   * @returns {Object} Current translation mappings
   */
  exportTranslations() {
    return {
      mappings: this.waitingPhraseTranslations,
      translations: this.extendedTranslations,
      cache: Object.fromEntries(this.translationCache.entries()),
      stats: this.getTranslationStats()
    };
  }

  /**
   * Import additional translations
   * @param {Object} translationData - Translation data to import
   */
  importTranslations(translationData) {
    if (translationData.mappings) {
      Object.assign(this.waitingPhraseTranslations, translationData.mappings);
    }
    
    if (translationData.translations) {
      for (const [lang, translations] of Object.entries(translationData.translations)) {
        if (!this.extendedTranslations[lang]) {
          this.extendedTranslations[lang] = {};
        }
        Object.assign(this.extendedTranslations[lang], translations);
      }
    }
    
    console.log('Additional translations imported successfully');
  }
}

// Create and export singleton instance
export const translationBridge = new TranslationBridge();

// Export the class for testing
export default TranslationBridge;