/**
 * Interruption Response Generator
 * Generates contextual, multilingual responses for interruptions
 */

// Interruption Response Generator imports are handled by the class

export class InterruptionResponseGenerator {
  constructor() {
    this.responseTemplates = new Map();
    this.contextualModifiers = new Map();
    this.responseCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes

    // Initialize response templates
    this.initializeResponseTemplates();
    this.initializeContextualModifiers();

    console.log('InterruptionResponseGenerator initialized');
  }

  /**
   * Initialize response templates for different languages
   */
  initializeResponseTemplates() {
    const templates = {
      en: {
        immediate_acknowledgment: [
          "Yes? I'm listening.",
          'What would you like to know?',
          "Go ahead, I'm here.",
          "I'm all ears.",
          "What's on your mind?",
          "I hear you - what's up?",
          'Sure, what can I help with?',
          "I'm with you - go ahead."
        ],
        polite_acknowledgment: [
          "I noticed you wanted to say something - what's your question?",
          'I can pause here - what would you like to know?',
          "Yes, I'm happy to help - what do you need?",
          'Did you have something you wanted to ask?',
          "I'm here to help - what's your question?",
          'Of course - what can I assist you with?',
          "I'd be glad to help - what's on your mind?"
        ],
        gentle_acknowledgment: [
          'Did you have a question?',
          'Would you like me to pause for a moment?',
          "Is there something you'd like to ask?",
          'What would you like to know?',
          'How can I assist you?',
          'I think you wanted to say something?',
          'Feel free to ask me anything.',
          "I'm here if you have questions."
        ],
        minimal_acknowledgment: [
          'Yes?',
          'Mm-hmm?',
          'What is it?',
          'Go on.',
          "I'm listening.",
          'Sure?',
          "What's that?",
          'Uh-huh?'
        ],
        continuation_offer: [
          'Should I continue where I left off, or would you like to ask something else?',
          'Would you like me to finish my previous thought, or do you have a new question?',
          'I can continue my explanation or address your question - what would you prefer?',
          "Shall I pick up where I was, or is there something else you'd like to know?",
          'Would you like me to keep going with what I was saying, or do something different?',
          'I can either continue from where I paused, or we can explore your question - your choice.',
          'What would work better - continuing my explanation or focusing on your question?',
          "I'm happy to either resume where I left off or tackle whatever you'd like to discuss."
        ]
      },
      es: {
        immediate_acknowledgment: [
          '¿Sí? Te escucho.',
          '¿Qué te gustaría saber?',
          'Adelante, estoy aquí.',
          'Soy todo oídos.',
          '¿Qué tienes en mente?'
        ],
        polite_acknowledgment: [
          'Perdón, ¿querías preguntar algo?',
          'Puedo pausar aquí - ¿cuál es tu pregunta?',
          'Sí, ¿en qué puedo ayudarte?',
          '¿Tenías una pregunta?',
          'Estaré encantado de ayudar - ¿qué necesitas?'
        ],
        gentle_acknowledgment: [
          '¿Tenías una pregunta?',
          '¿Te gustaría que haga una pausa?',
          '¿Hay algo que quisieras preguntar?',
          '¿Qué te gustaría saber?',
          '¿Cómo puedo asistirte?'
        ],
        minimal_acknowledgment: ['¿Sí?', '¿Mm-hmm?', '¿Qué pasa?', 'Continúa.', 'Te escucho.'],
        continuation_offer: [
          '¿Debo continuar donde me quedé, o te gustaría preguntar algo más?',
          '¿Quieres que termine mi idea anterior, o tienes una nueva pregunta?',
          'Puedo continuar mi explicación o responder tu pregunta - ¿qué prefieres?',
          '¿Debo retomar donde estaba, o hay algo más que te gustaría saber?'
        ]
      },
      ru: {
        immediate_acknowledgment: [
          'Да? Я слушаю.',
          'Что бы вы хотели узнать?',
          'Продолжайте, я здесь.',
          'Я весь внимание.',
          'О чём вы думаете?'
        ],
        polite_acknowledgment: [
          'Извините, вы хотели что-то спросить?',
          'Я могу сделать паузу - какой у вас вопрос?',
          'Да, чем могу помочь?',
          'У вас был вопрос?',
          'Буду рад помочь - что вам нужно?'
        ],
        gentle_acknowledgment: [
          'У вас есть вопрос?',
          'Хотите, чтобы я сделал паузу?',
          'Есть что-то, что вы хотели бы спросить?',
          'Что бы вы хотели узнать?',
          'Как я могу вам помочь?'
        ],
        minimal_acknowledgment: ['Да?', 'Мм-хм?', 'Что такое?', 'Продолжайте.', 'Слушаю.'],
        continuation_offer: [
          'Должен ли я продолжить с того места, где остановился, или вы хотите спросить что-то ещё?',
          'Хотите, чтобы я закончил предыдущую мысль, или у вас новый вопрос?',
          'Я могу продолжить объяснение или ответить на ваш вопрос - что предпочитаете?',
          'Мне продолжить с того места, или есть что-то ещё, что вы хотели бы узнать?'
        ]
      }
    };

    // Store templates
    Object.entries(templates).forEach(([language, langTemplates]) => {
      this.responseTemplates.set(language, langTemplates);
    });
  }

  /**
   * Initialize contextual modifiers
   */
  initializeContextualModifiers() {
    const modifiers = {
      en: {
        waiting_phrase_context: {
          prefix: 'I was just thinking, but ',
          suffix: ''
        },
        main_response_context: {
          prefix: 'I was explaining, but ',
          suffix: ''
        },
        high_confidence: {
          prefix: '',
          suffix: " What's your question?"
        },
        low_confidence: {
          prefix: 'I think I heard you - ',
          suffix: ''
        },
        repeated_interruption: {
          prefix: "I notice you're trying to ask something - ",
          suffix: ''
        }
      },
      es: {
        waiting_phrase_context: {
          prefix: 'Estaba pensando, pero ',
          suffix: ''
        },
        main_response_context: {
          prefix: 'Estaba explicando, pero ',
          suffix: ''
        },
        high_confidence: {
          prefix: '',
          suffix: ' ¿Cuál es tu pregunta?'
        },
        low_confidence: {
          prefix: 'Creo que te escuché - ',
          suffix: ''
        },
        repeated_interruption: {
          prefix: 'Noto que estás tratando de preguntar algo - ',
          suffix: ''
        }
      },
      ru: {
        waiting_phrase_context: {
          prefix: 'Я думал, но ',
          suffix: ''
        },
        main_response_context: {
          prefix: 'Я объяснял, но ',
          suffix: ''
        },
        high_confidence: {
          prefix: '',
          suffix: ' Какой у вас вопрос?'
        },
        low_confidence: {
          prefix: 'Кажется, я вас услышал - ',
          suffix: ''
        },
        repeated_interruption: {
          prefix: 'Я замечаю, что вы пытаетесь что-то спросить - ',
          suffix: ''
        }
      }
    };

    Object.entries(modifiers).forEach(([language, langModifiers]) => {
      this.contextualModifiers.set(language, langModifiers);
    });
  }

  /**
   * Generate interruption response
   * @param {string} language - Target language
   * @param {Object} context - Interruption context
   * @returns {Promise<Object>} Generated response
   */
  async generateResponse(language, context) {
    try {
      console.log(`Generating interruption response in ${language}:`, context);

      // Check cache first
      const cacheKey = this.generateCacheKey(language, context);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Determine response type
      const responseType = this.determineResponseType(context);

      // Get base response
      const baseResponse = this.selectBaseResponse(language, responseType);

      // Apply contextual modifications
      const modifiedResponse = this.applyContextualModifications(baseResponse, language, context);

      // Create response object
      const response = {
        text: modifiedResponse,
        language: language,
        type: responseType,
        context: context,
        timestamp: Date.now(),
        confidence: this.calculateResponseConfidence(context)
      };

      // Cache the response
      this.addToCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('Error generating interruption response:', error);
      return this.getFallbackResponse(language);
    }
  }

  /**
   * Determine response type based on context
   * @param {Object} context - Interruption context
   * @returns {string} Response type
   */
  determineResponseType(context) {
    const { interruptionEvent, currentResponse } = context;

    // High confidence interruption
    if (interruptionEvent.confidence > 0.8) {
      return 'immediate_acknowledgment';
    }

    // Medium confidence with context
    if (interruptionEvent.confidence > 0.6) {
      // If interrupting a waiting phrase, be more gentle
      if (currentResponse?.type === 'waiting_phrase') {
        return 'gentle_acknowledgment';
      }
      return 'polite_acknowledgment';
    }

    // Lower confidence
    if (interruptionEvent.confidence > 0.4) {
      return 'gentle_acknowledgment';
    }

    return 'minimal_acknowledgment';
  }

  /**
   * Select base response from templates
   * @param {string} language - Target language
   * @param {string} responseType - Response type
   * @returns {string} Base response text
   */
  selectBaseResponse(language, responseType) {
    const templates = this.responseTemplates.get(language) || this.responseTemplates.get('en');
    const typeTemplates = templates[responseType] || templates.minimal_acknowledgment;

    // Select random template
    const randomIndex = Math.floor(Math.random() * typeTemplates.length);
    return typeTemplates[randomIndex];
  }

  /**
   * Apply contextual modifications to response
   * @param {string} baseResponse - Base response text
   * @param {string} language - Target language
   * @param {Object} context - Interruption context
   * @returns {string} Modified response
   */
  applyContextualModifications(baseResponse, language, context) {
    const modifiers = this.contextualModifiers.get(language) || this.contextualModifiers.get('en');
    let modifiedResponse = baseResponse;

    // Apply context-specific modifiers
    const { interruptionEvent, currentResponse } = context;

    // Waiting phrase context
    if (currentResponse?.type === 'waiting_phrase') {
      const modifier = modifiers.waiting_phrase_context;
      modifiedResponse = modifier.prefix + modifiedResponse + modifier.suffix;
    }
    // Main response context
    else if (currentResponse?.type === 'main_response') {
      const modifier = modifiers.main_response_context;
      modifiedResponse = modifier.prefix + modifiedResponse + modifier.suffix;
    }

    // High confidence modifier
    if (interruptionEvent.confidence > 0.8) {
      const modifier = modifiers.high_confidence;
      modifiedResponse = modifier.prefix + modifiedResponse + modifier.suffix;
    }
    // Low confidence modifier
    else if (interruptionEvent.confidence < 0.5) {
      const modifier = modifiers.low_confidence;
      modifiedResponse = modifier.prefix + modifiedResponse + modifier.suffix;
    }

    // Repeated interruption modifier
    if (this.isRepeatedInterruption(context)) {
      const modifier = modifiers.repeated_interruption;
      modifiedResponse = modifier.prefix + modifiedResponse + modifier.suffix;
    }

    return modifiedResponse.trim();
  }

  /**
   * Check if this is a repeated interruption
   * @param {Object} context - Interruption context
   * @returns {boolean} True if repeated interruption
   */
  isRepeatedInterruption(context) {
    // eslint-disable-line no-unused-vars
    // This would check conversation history for recent interruptions
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Calculate response confidence
   * @param {Object} context - Interruption context
   * @returns {number} Confidence score (0-1)
   */
  calculateResponseConfidence(context) {
    const { interruptionEvent } = context;

    // Base confidence on interruption confidence
    let confidence = interruptionEvent.confidence || 0.5;

    // Adjust based on context
    if (context.currentResponse?.type === 'waiting_phrase') {
      confidence *= 0.9; // Slightly less confident when interrupting waiting phrases
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate continuation offer
   * @param {string} language - Target language
   * @param {Object} preservedState - Preserved conversation state
   * @returns {string} Continuation offer text
   */
  generateContinuationOffer(language, preservedState) {
    // eslint-disable-line no-unused-vars
    const templates = this.responseTemplates.get(language) || this.responseTemplates.get('en');
    const continuationTemplates = templates.continuation_offer;

    // Select random template
    const randomIndex = Math.floor(Math.random() * continuationTemplates.length);
    return continuationTemplates[randomIndex];
  }

  /**
   * Generate choice options for user
   * @param {string} language - Target language
   * @param {Object} preservedState - Preserved conversation state
   * @returns {Object} Choice options
   */
  generateChoiceOptions(language, preservedState) {
    const choiceTexts = {
      en: {
        continue: 'Continue where you left off',
        restart: 'Start over',
        new_question: 'Ask a new question',
        skip: 'Move on to something else'
      },
      es: {
        continue: 'Continuar donde te quedaste',
        restart: 'Empezar de nuevo',
        new_question: 'Hacer una nueva pregunta',
        skip: 'Pasar a otra cosa'
      },
      ru: {
        continue: 'Продолжить с того места, где остановились',
        restart: 'Начать сначала',
        new_question: 'Задать новый вопрос',
        skip: 'Перейти к чему-то другому'
      }
    };

    const texts = choiceTexts[language] || choiceTexts.en;

    const options = {
      canContinue: preservedState?.canContinue || false,
      choices: []
    };

    if (options.canContinue) {
      options.choices.push({
        id: 'continue',
        text: texts.continue,
        action: 'continue_response'
      });
    }

    options.choices.push(
      {
        id: 'restart',
        text: texts.restart,
        action: 'restart_response'
      },
      {
        id: 'new_question',
        text: texts.new_question,
        action: 'new_question'
      },
      {
        id: 'skip',
        text: texts.skip,
        action: 'skip_topic'
      }
    );

    return options;
  }

  /**
   * Get fallback response
   * @param {string} language - Target language
   * @returns {Object} Fallback response
   */
  getFallbackResponse(language) {
    const fallbackTexts = {
      en: 'Yes? What can I help you with?',
      es: '¿Sí? ¿En qué puedo ayudarte?',
      ru: 'Да? Чем могу помочь?'
    };

    return {
      text: fallbackTexts[language] || fallbackTexts.en,
      language: language,
      type: 'fallback_acknowledgment',
      timestamp: Date.now(),
      confidence: 0.5
    };
  }

  /**
   * Generate cache key
   * @param {string} language - Target language
   * @param {Object} context - Interruption context
   * @returns {string} Cache key
   */
  generateCacheKey(language, context) {
    const { interruptionEvent, currentResponse } = context;
    const confidence = Math.round((interruptionEvent.confidence || 0) * 10) / 10;
    const responseType = currentResponse?.type || 'unknown';

    return `${language}_${confidence}_${responseType}`;
  }

  /**
   * Get response from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached response
   */
  getFromCache(key) {
    const cached = this.responseCache.get(key);
    if (!cached) return null;

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.responseCache.delete(key);
      return null;
    }

    return { ...cached, fromCache: true };
  }

  /**
   * Add response to cache
   * @param {string} key - Cache key
   * @param {Object} response - Response to cache
   */
  addToCache(key, response) {
    // Limit cache size
    if (this.responseCache.size > 50) {
      // Remove oldest entries
      const entries = Array.from(this.responseCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 10 entries
      for (let i = 0; i < 10 && i < entries.length; i++) {
        this.responseCache.delete(entries[i][0]);
      }
    }

    this.responseCache.set(key, response);
  }

  /**
   * Clear response cache
   */
  clearCache() {
    this.responseCache.clear();
    console.log('Interruption response cache cleared');
  }

  /**
   * Add custom response template
   * @param {string} language - Language code
   * @param {string} type - Response type
   * @param {Array<string>} templates - Template strings
   */
  addCustomTemplate(language, type, templates) {
    if (!this.responseTemplates.has(language)) {
      this.responseTemplates.set(language, {});
    }

    const langTemplates = this.responseTemplates.get(language);
    langTemplates[type] = templates;

    console.log(`Added custom template for ${language}/${type}`);
  }

  /**
   * Get generation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      supportedLanguages: Array.from(this.responseTemplates.keys()),
      cacheSize: this.responseCache.size,
      cacheTimeout: this.cacheTimeout,
      templateCount: Array.from(this.responseTemplates.values()).reduce(
        (total, templates) => total + Object.keys(templates).length,
        0
      )
    };
  }
}

// Export singleton instance
export const interruptionResponseGenerator = new InterruptionResponseGenerator();
