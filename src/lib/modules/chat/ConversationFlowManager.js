/**
 * Conversation Flow Manager
 * Manages conversation state and provides natural interruption responses
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { interruptionResponseGenerator } from './InterruptionResponseGenerator.js';

export class ConversationFlowManager {
  constructor() {
    this.currentResponse = null;
    this.interruptionPoint = null;
    this.conversationContext = new Map();
    this.responseHistory = [];
    this.maxHistorySize = 10;

    // State preservation
    this.preservedStates = new Map();
    this.maxPreservedStates = 5;

    // Response tracking
    this.activeResponses = new Map();
    this.responseMetadata = new Map();

    // Interruption handling
    this.interruptionHandlers = new Map();
    this.continuationOptions = new Map();

    console.log('ConversationFlowManager initialized');
  }

  /**
   * Start tracking a response
   * @param {Object} response - Response object
   * @returns {string} Response ID
   */
  startResponse(response) {
    const responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const responseData = {
      id: responseId,
      text: response.text || '',
      language: response.language || get(selectedLanguage),
      type: response.type || 'main_response', // 'main_response' or 'waiting_phrase'
      startTime: Date.now(),
      estimatedDuration: response.estimatedDuration || this.estimateResponseDuration(response.text),
      priority: response.priority || 1,
      isInterruptible: response.isInterruptible !== false,
      segments: this.segmentResponse(response.text || ''),
      currentSegment: 0,
      status: 'active'
    };

    this.activeResponses.set(responseId, responseData);
    this.currentResponse = responseData;

    console.log(`Started tracking response: ${responseId} (${responseData.type})`);

    return responseId;
  }

  /**
   * Segment response text for interruption points
   * @param {string} text - Response text
   * @returns {Array} Array of text segments
   */
  segmentResponse(text) {
    if (!text || typeof text !== 'string') {
      return [''];
    }

    // Split on natural pause points (sentences, clauses)
    const segments = text
      .split(/[.!?]+/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .map((segment) => segment + (text.includes('.') ? '.' : ''));

    // If no natural breaks, split on commas or long phrases
    if (segments.length === 1 && text.length > 100) {
      const commaSegments = text
        .split(',')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0);

      if (commaSegments.length > 1) {
        return commaSegments.map((segment, index) =>
          index < commaSegments.length - 1 ? segment + ',' : segment
        );
      }
    }

    return segments.length > 0 ? segments : [text];
  }

  /**
   * Estimate response duration based on text length
   * @param {string} text - Response text
   * @returns {number} Estimated duration in milliseconds
   */
  estimateResponseDuration(text) {
    if (!text) return 1000;

    // Rough estimate: 150 words per minute, average 5 characters per word
    const wordsPerMinute = 150;
    const charactersPerWord = 5;
    const estimatedWords = text.length / charactersPerWord;
    const estimatedMinutes = estimatedWords / wordsPerMinute;

    return Math.max(1000, estimatedMinutes * 60 * 1000); // At least 1 second
  }

  /**
   * Handle interruption of current response
   * @param {Object} interruptionEvent - Interruption event
   * @returns {Promise<Object>} Interruption handling result
   */
  async handleInterruption(interruptionEvent) {
    try {
      console.log('Handling conversation interruption:', interruptionEvent);

      if (!this.currentResponse) {
        console.log('No active response to interrupt');
        return { handled: false, reason: 'no_active_response' };
      }

      // Preserve current response state
      const preservedState = await this.preserveResponseState(
        this.currentResponse,
        interruptionEvent
      );

      // Create interruption point
      this.interruptionPoint = {
        responseId: this.currentResponse.id,
        segmentIndex: this.currentResponse.currentSegment,
        timestamp: Date.now(),
        interruptionEvent: interruptionEvent,
        preservedStateId: preservedState.id
      };

      // Generate interruption response
      const interruptionResponse = await this.generateInterruptionResponse(
        interruptionEvent.detectedLanguage || this.currentResponse.language,
        this.currentResponse,
        interruptionEvent
      );

      // Update response status
      this.currentResponse.status = 'interrupted';
      this.currentResponse.interruptedAt = Date.now();

      console.log(
        `Response interrupted: ${this.currentResponse.id} at segment ${this.currentResponse.currentSegment}`
      );

      return {
        handled: true,
        interruptionPoint: this.interruptionPoint,
        preservedState: preservedState,
        interruptionResponse: interruptionResponse
      };
    } catch (error) {
      console.error('Error handling conversation interruption:', error);
      return { handled: false, error: error.message };
    }
  }

  /**
   * Preserve response state for potential continuation
   * @param {Object} response - Current response
   * @param {Object} interruptionEvent - Interruption event
   * @returns {Promise<Object>} Preserved state
   */
  async preserveResponseState(response, interruptionEvent) {
    const stateId = `state_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const preservedState = {
      id: stateId,
      responseId: response.id,
      originalText: response.text,
      language: response.language,
      type: response.type,
      segments: [...response.segments],
      currentSegment: response.currentSegment,
      completedSegments: response.segments.slice(0, response.currentSegment),
      remainingSegments: response.segments.slice(response.currentSegment),
      interruptionTimestamp: Date.now(),
      interruptionEvent: interruptionEvent,
      context: this.captureConversationContext(),
      canContinue: response.isInterruptible && response.segments.length > response.currentSegment
    };

    // Store preserved state
    this.preservedStates.set(stateId, preservedState);

    // Manage preserved states size
    if (this.preservedStates.size > this.maxPreservedStates) {
      const oldestKey = Array.from(this.preservedStates.keys())[0];
      this.preservedStates.delete(oldestKey);
    }

    console.log(`Response state preserved: ${stateId}`);

    return preservedState;
  }

  /**
   * Capture current conversation context
   * @returns {Object} Conversation context
   */
  captureConversationContext() {
    return {
      timestamp: Date.now(),
      language: get(selectedLanguage),
      responseHistory: this.responseHistory.slice(-3), // Last 3 responses
      activeResponseCount: this.activeResponses.size,
      conversationFlow: this.analyzeConversationFlow()
    };
  }

  /**
   * Analyze conversation flow patterns
   * @returns {Object} Flow analysis
   */
  analyzeConversationFlow() {
    const recentResponses = this.responseHistory.slice(-5);

    return {
      averageResponseLength: this.calculateAverageResponseLength(recentResponses),
      responseTypes: this.analyzeResponseTypes(recentResponses),
      interruptionFrequency: this.calculateInterruptionFrequency(recentResponses),
      conversationPace: this.analyzeConversationPace(recentResponses)
    };
  }

  /**
   * Calculate average response length
   * @param {Array} responses - Recent responses
   * @returns {number} Average length
   */
  calculateAverageResponseLength(responses) {
    if (responses.length === 0) return 0;

    const totalLength = responses.reduce((sum, resp) => sum + (resp.text?.length || 0), 0);
    return totalLength / responses.length;
  }

  /**
   * Analyze response types
   * @param {Array} responses - Recent responses
   * @returns {Object} Type analysis
   */
  analyzeResponseTypes(responses) {
    const types = {};
    responses.forEach((resp) => {
      const type = resp.type || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  /**
   * Calculate interruption frequency
   * @param {Array} responses - Recent responses
   * @returns {number} Interruption frequency (0-1)
   */
  calculateInterruptionFrequency(responses) {
    if (responses.length === 0) return 0;

    const interruptedCount = responses.filter((resp) => resp.status === 'interrupted').length;
    return interruptedCount / responses.length;
  }

  /**
   * Analyze conversation pace
   * @param {Array} responses - Recent responses
   * @returns {string} Pace description
   */
  analyzeConversationPace(responses) {
    if (responses.length < 2) return 'unknown';

    const intervals = [];
    for (let i = 1; i < responses.length; i++) {
      const interval = responses[i].startTime - responses[i - 1].startTime;
      intervals.push(interval);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    if (avgInterval < 2000) return 'fast';
    if (avgInterval < 5000) return 'normal';
    return 'slow';
  }

  /**
   * Generate interruption response
   * @param {string} language - Target language
   * @param {Object} currentResponse - Current response being interrupted
   * @param {Object} interruptionEvent - Interruption event
   * @returns {Promise<Object>} Interruption response
   */
  async generateInterruptionResponse(language, currentResponse, interruptionEvent) {
    try {
      console.log(`Generating interruption response in ${language}`);

      // Build context for response generation
      const context = {
        interruptionEvent: interruptionEvent,
        currentResponse: currentResponse,
        conversationContext: this.captureConversationContext(),
        voiceState: {
          isSpeaking: true // We know we're speaking if we're being interrupted
        }
      };

      // Use the interruption response generator
      const generatedResponse = await interruptionResponseGenerator.generateResponse(
        language,
        context
      );

      // Create continuation options
      const continuationOptions = this.createContinuationOptions(language, currentResponse);

      return {
        type: generatedResponse.type,
        text: generatedResponse.text,
        language: language,
        continuationOptions: continuationOptions,
        priority: 'high',
        isInterruptionResponse: true,
        originalResponseId: currentResponse.id,
        confidence: generatedResponse.confidence
      };
    } catch (error) {
      console.error('Error generating interruption response:', error);

      // Return fallback response
      return this.getFallbackInterruptionResponse(language);
    }
  }

  /**
   * Determine interruption response type
   * @param {Object} interruptionEvent - Interruption event
   * @param {Object} currentResponse - Current response
   * @returns {string} Response type
   */
  determineInterruptionResponseType(interruptionEvent, currentResponse) {
    const confidence = interruptionEvent.confidence || 0;
    const energy = interruptionEvent.energy || 0;

    // High confidence interruption
    if (confidence > 0.8 && energy > 0.3) {
      return 'immediate_acknowledgment';
    }

    // Medium confidence interruption
    if (confidence > 0.6) {
      return 'polite_acknowledgment';
    }

    // Lower confidence interruption
    if (confidence > 0.4) {
      return 'gentle_acknowledgment';
    }

    return 'minimal_acknowledgment';
  }

  /**
   * Generate interruption text based on type and language
   * @param {string} language - Target language
   * @param {string} responseType - Response type
   * @param {Object} currentResponse - Current response
   * @returns {Promise<string>} Generated text
   */
  async generateInterruptionText(language, responseType, currentResponse) {
    const templates = this.getInterruptionTemplates(language);
    const template = templates[responseType] || templates.minimal_acknowledgment;

    // Select random template if multiple options
    const selectedTemplate = Array.isArray(template)
      ? template[Math.floor(Math.random() * template.length)]
      : template;

    // Replace placeholders if any
    return selectedTemplate.replace(/\{(\w+)\}/g, (match, key) => {
      switch (key) {
        case 'responseType':
          return currentResponse.type === 'waiting_phrase' ? 'thinking' : 'explaining';
        default:
          return match;
      }
    });
  }

  /**
   * Get interruption response templates by language
   * @param {string} language - Target language
   * @returns {Object} Templates object
   */
  getInterruptionTemplates(language) {
    const templates = {
      en: {
        immediate_acknowledgment: [
          "Yes? I'm listening.",
          'What would you like to know?',
          "Go ahead, I'm here."
        ],
        polite_acknowledgment: [
          'Sorry, did you want to ask something?',
          "I can pause here - what's your question?",
          'Yes, what can I help you with?'
        ],
        gentle_acknowledgment: [
          'Did you have a question?',
          'Would you like me to pause?',
          "Is there something you'd like to ask?"
        ],
        minimal_acknowledgment: ['Yes?', 'Mm-hmm?', 'What is it?']
      },
      es: {
        immediate_acknowledgment: [
          '¿Sí? Te escucho.',
          '¿Qué te gustaría saber?',
          'Adelante, estoy aquí.'
        ],
        polite_acknowledgment: [
          'Perdón, ¿querías preguntar algo?',
          'Puedo pausar aquí - ¿cuál es tu pregunta?',
          'Sí, ¿en qué puedo ayudarte?'
        ],
        gentle_acknowledgment: [
          '¿Tenías una pregunta?',
          '¿Te gustaría que haga una pausa?',
          '¿Hay algo que quisieras preguntar?'
        ],
        minimal_acknowledgment: ['¿Sí?', '¿Mm-hmm?', '¿Qué pasa?']
      },
      ru: {
        immediate_acknowledgment: [
          'Да? Я слушаю.',
          'Что бы вы хотели узнать?',
          'Продолжайте, я здесь.'
        ],
        polite_acknowledgment: [
          'Извините, вы хотели что-то спросить?',
          'Я могу сделать паузу - какой у вас вопрос?',
          'Да, чем могу помочь?'
        ],
        gentle_acknowledgment: [
          'У вас есть вопрос?',
          'Хотите, чтобы я сделал паузу?',
          'Есть что-то, что вы хотели бы спросить?'
        ],
        minimal_acknowledgment: ['Да?', 'Мм-хм?', 'Что такое?']
      }
    };

    return templates[language] || templates.en;
  }

  /**
   * Create continuation options
   * @param {string} language - Target language
   * @param {Object} currentResponse - Current response
   * @returns {Object} Continuation options
   */
  createContinuationOptions(language, currentResponse) {
    const hasRemainingContent = currentResponse.currentSegment < currentResponse.segments.length;

    const options = {
      canContinue: hasRemainingContent,
      canRestart: true,
      canSkip: true
    };

    if (hasRemainingContent) {
      options.continueText = this.getContinuationText(language, 'continue');
      options.restartText = this.getContinuationText(language, 'restart');
    }

    options.skipText = this.getContinuationText(language, 'skip');
    options.newQuestionText = this.getContinuationText(language, 'new_question');

    return options;
  }

  /**
   * Get continuation text by language and type
   * @param {string} language - Target language
   * @param {string} type - Continuation type
   * @returns {string} Continuation text
   */
  getContinuationText(language, type) {
    const texts = {
      en: {
        continue: 'Should I continue where I left off?',
        restart: 'Should I start over?',
        skip: 'Should I move on to something else?',
        new_question: 'What would you like to know?'
      },
      es: {
        continue: '¿Debo continuar donde me quedé?',
        restart: '¿Debo empezar de nuevo?',
        skip: '¿Debo pasar a otra cosa?',
        new_question: '¿Qué te gustaría saber?'
      },
      ru: {
        continue: 'Должен ли я продолжить с того места, где остановился?',
        restart: 'Должен ли я начать сначала?',
        skip: 'Должен ли я перейти к чему-то другому?',
        new_question: 'Что бы вы хотели узнать?'
      }
    };

    return texts[language]?.[type] || texts.en[type];
  }

  /**
   * Get fallback interruption response
   * @param {string} language - Target language
   * @returns {Object} Fallback response
   */
  getFallbackInterruptionResponse(language) {
    const fallbackTexts = {
      en: 'Yes? What can I help you with?',
      es: '¿Sí? ¿En qué puedo ayudarte?',
      ru: 'Да? Чем могу помочь?'
    };

    return {
      type: 'fallback_acknowledgment',
      text: fallbackTexts[language] || fallbackTexts.en,
      language: language,
      continuationOptions: {
        canContinue: false,
        canRestart: true,
        canSkip: true,
        newQuestionText: this.getContinuationText(language, 'new_question')
      },
      priority: 'high',
      isInterruptionResponse: true
    };
  }

  /**
   * Continue interrupted response
   * @param {string} preservedStateId - ID of preserved state
   * @param {Object} options - Continuation options
   * @returns {Promise<Object>} Continuation result
   */
  async continueResponse(preservedStateId, options = {}) {
    try {
      const preservedState = this.preservedStates.get(preservedStateId);

      if (!preservedState) {
        throw new Error('Preserved state not found');
      }

      if (!preservedState.canContinue) {
        throw new Error('Response cannot be continued');
      }

      console.log(`Continuing response from preserved state: ${preservedStateId}`);

      // Determine continuation strategy
      const continuationStrategy = this.determineContinuationStrategy(preservedState, options);

      // Create continuation response based on strategy
      const continuationResponse = await this.createContinuationResponse(
        preservedState,
        continuationStrategy,
        options
      );

      // Update current response
      this.currentResponse = continuationResponse;
      this.activeResponses.set(continuationResponse.id, continuationResponse);

      // Generate transition phrase if needed
      const transitionPhrase = await this.generateTransitionPhrase(
        preservedState,
        continuationStrategy
      );

      return {
        success: true,
        continuationResponse: continuationResponse,
        preservedState: preservedState,
        transitionPhrase: transitionPhrase,
        strategy: continuationStrategy
      };
    } catch (error) {
      console.error('Error continuing response:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Determine continuation strategy
   * @param {Object} preservedState - Preserved state
   * @param {Object} options - Continuation options
   * @returns {string} Continuation strategy
   */
  determineContinuationStrategy(preservedState, options) {
    const timeSinceInterruption = Date.now() - preservedState.interruptionTimestamp;
    const remainingSegments = preservedState.remainingSegments.length;

    // If interruption was recent and there are few segments left, continue directly
    if (timeSinceInterruption < 10000 && remainingSegments <= 2) {
      return 'direct_continuation';
    }

    // If interruption was longer ago, provide context
    if (timeSinceInterruption > 30000) {
      return 'contextual_continuation';
    }

    // If there are many segments left, offer summary
    if (remainingSegments > 3) {
      return 'summary_continuation';
    }

    // Default to smooth continuation
    return 'smooth_continuation';
  }

  /**
   * Create continuation response
   * @param {Object} preservedState - Preserved state
   * @param {string} strategy - Continuation strategy
   * @param {Object} options - Options
   * @returns {Promise<Object>} Continuation response
   */
  async createContinuationResponse(preservedState, strategy, options) {
    const continuationId = `cont_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    let continuationText = '';
    let segments = [];

    switch (strategy) {
      case 'direct_continuation':
        continuationText = preservedState.remainingSegments.join(' ');
        segments = preservedState.remainingSegments;
        break;

      case 'contextual_continuation':
        const contextPhrase = await this.generateContextPhrase(preservedState);
        continuationText = contextPhrase + ' ' + preservedState.remainingSegments.join(' ');
        segments = [contextPhrase, ...preservedState.remainingSegments];
        break;

      case 'summary_continuation':
        const summaryPhrase = await this.generateSummaryPhrase(preservedState);
        const keySegments = this.selectKeySegments(preservedState.remainingSegments);
        continuationText = summaryPhrase + ' ' + keySegments.join(' ');
        segments = [summaryPhrase, ...keySegments];
        break;

      case 'smooth_continuation':
      default:
        const transitionPhrase = await this.generateSmoothTransition(preservedState);
        continuationText = transitionPhrase + ' ' + preservedState.remainingSegments.join(' ');
        segments = [transitionPhrase, ...preservedState.remainingSegments];
        break;
    }

    return {
      id: continuationId,
      text: continuationText,
      language: preservedState.language,
      type: 'continuation',
      strategy: strategy,
      originalResponseId: preservedState.responseId,
      preservedStateId: preservedState.id,
      segments: segments,
      currentSegment: 0,
      startTime: Date.now(),
      status: 'active',
      estimatedDuration: this.estimateResponseDuration(continuationText)
    };
  }

  /**
   * Generate context phrase for continuation
   * @param {Object} preservedState - Preserved state
   * @returns {Promise<string>} Context phrase
   */
  async generateContextPhrase(preservedState) {
    const contextPhrases = {
      en: [
        'As I was saying,',
        'To continue my previous point,',
        'Going back to what I was explaining,',
        'Let me pick up where I left off:'
      ],
      es: [
        'Como estaba diciendo,',
        'Para continuar con mi punto anterior,',
        'Volviendo a lo que estaba explicando,',
        'Permíteme retomar donde me quedé:'
      ],
      ru: [
        'Как я говорил,',
        'Продолжая мою предыдущую мысль,',
        'Возвращаясь к тому, что я объяснял,',
        'Позвольте мне продолжить с того места, где остановился:'
      ]
    };

    const phrases = contextPhrases[preservedState.language] || contextPhrases.en;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Generate summary phrase for continuation
   * @param {Object} preservedState - Preserved state
   * @returns {Promise<string>} Summary phrase
   */
  async generateSummaryPhrase(preservedState) {
    const summaryPhrases = {
      en: [
        'To summarize the key points:',
        'Let me highlight the main ideas:',
        'The essential points are:',
        'In brief:'
      ],
      es: [
        'Para resumir los puntos clave:',
        'Permíteme destacar las ideas principales:',
        'Los puntos esenciales son:',
        'En resumen:'
      ],
      ru: [
        'Чтобы подвести итог ключевых моментов:',
        'Позвольте мне выделить основные идеи:',
        'Основные моменты:',
        'Вкратце:'
      ]
    };

    const phrases = summaryPhrases[preservedState.language] || summaryPhrases.en;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Generate smooth transition phrase
   * @param {Object} preservedState - Preserved state
   * @returns {Promise<string>} Transition phrase
   */
  async generateSmoothTransition(preservedState) {
    const transitionPhrases = {
      en: ['So,', 'Now,', 'Continuing,', 'Moving on,'],
      es: ['Entonces,', 'Ahora,', 'Continuando,', 'Siguiendo,'],
      ru: ['Итак,', 'Теперь,', 'Продолжая,', 'Далее,']
    };

    const phrases = transitionPhrases[preservedState.language] || transitionPhrases.en;
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /**
   * Select key segments from remaining segments
   * @param {Array} segments - All remaining segments
   * @returns {Array} Key segments
   */
  selectKeySegments(segments) {
    if (segments.length <= 3) {
      return segments;
    }

    // Select first, middle, and last segments
    const keySegments = [
      segments[0],
      segments[Math.floor(segments.length / 2)],
      segments[segments.length - 1]
    ];

    return keySegments;
  }

  /**
   * Generate transition phrase for continuation
   * @param {Object} preservedState - Preserved state
   * @param {string} strategy - Continuation strategy
   * @returns {Promise<string>} Transition phrase
   */
  async generateTransitionPhrase(preservedState, strategy) {
    const transitionPhrases = {
      en: {
        direct_continuation: 'Where was I? Ah yes,',
        contextual_continuation: 'Let me continue from where we left off.',
        summary_continuation: 'Let me give you the key points.',
        smooth_continuation: 'Alright, continuing on,'
      },
      es: {
        direct_continuation: '¿Dónde estaba? Ah sí,',
        contextual_continuation: 'Permíteme continuar desde donde lo dejamos.',
        summary_continuation: 'Déjame darte los puntos clave.',
        smooth_continuation: 'Bien, continuando,'
      },
      ru: {
        direct_continuation: 'Где я остановился? Ах да,',
        contextual_continuation: 'Позвольте мне продолжить с того места, где мы остановились.',
        summary_continuation: 'Позвольте мне дать вам ключевые моменты.',
        smooth_continuation: 'Хорошо, продолжаем,'
      }
    };

    const phrases = transitionPhrases[preservedState.language] || transitionPhrases.en;
    return phrases[strategy] || phrases.smooth_continuation;
  }

  /**
   * Handle user choice for continuation
   * @param {string} choice - User's choice
   * @param {string} preservedStateId - Preserved state ID
   * @returns {Promise<Object>} Choice handling result
   */
  async handleUserChoice(choice, preservedStateId) {
    try {
      console.log(`Handling user choice: ${choice} for state: ${preservedStateId}`);

      const preservedState = this.preservedStates.get(preservedStateId);
      if (!preservedState) {
        throw new Error('Preserved state not found');
      }

      switch (choice) {
        case 'continue':
          return await this.continueResponse(preservedStateId, { strategy: 'smooth_continuation' });

        case 'restart':
          return await this.restartResponse(preservedState);

        case 'skip':
          return await this.skipResponse(preservedState);

        case 'new_question':
          return await this.handleNewQuestion(preservedState);

        default:
          throw new Error(`Unknown choice: ${choice}`);
      }
    } catch (error) {
      console.error('Error handling user choice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restart response from the beginning
   * @param {Object} preservedState - Preserved state
   * @returns {Promise<Object>} Restart result
   */
  async restartResponse(preservedState) {
    const restartResponse = {
      id: `restart_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: preservedState.originalText,
      language: preservedState.language,
      type: 'restart',
      originalResponseId: preservedState.responseId,
      segments: [...preservedState.segments],
      currentSegment: 0,
      startTime: Date.now(),
      status: 'active'
    };

    this.currentResponse = restartResponse;
    this.activeResponses.set(restartResponse.id, restartResponse);

    return {
      success: true,
      restartResponse: restartResponse,
      action: 'restart'
    };
  }

  /**
   * Skip current response
   * @param {Object} preservedState - Preserved state
   * @returns {Promise<Object>} Skip result
   */
  async skipResponse(preservedState) {
    // Mark the original response as skipped
    const originalResponse = this.activeResponses.get(preservedState.responseId);
    if (originalResponse) {
      originalResponse.status = 'skipped';
      this.completeResponse(preservedState.responseId, { skipped: true });
    }

    return {
      success: true,
      action: 'skip',
      message: 'Response skipped, ready for new interaction'
    };
  }

  /**
   * Handle new question request
   * @param {Object} preservedState - Preserved state
   * @returns {Promise<Object>} New question result
   */
  async handleNewQuestion(preservedState) {
    // Complete the current response as interrupted
    this.completeResponse(preservedState.responseId, {
      interrupted: true,
      newQuestionRequested: true
    });

    return {
      success: true,
      action: 'new_question',
      message: 'Ready for your new question'
    };
  }

  /**
   * Complete current response
   * @param {string} responseId - Response ID
   * @param {Object} completionData - Completion data
   */
  completeResponse(responseId, completionData = {}) {
    const response = this.activeResponses.get(responseId);

    if (response) {
      response.status = 'completed';
      response.completedAt = Date.now();
      response.duration = response.completedAt - response.startTime;

      // Add to history
      this.responseHistory.push({
        ...response,
        ...completionData
      });

      // Maintain history size
      if (this.responseHistory.length > this.maxHistorySize) {
        this.responseHistory.shift();
      }

      // Remove from active responses
      this.activeResponses.delete(responseId);

      // Clear current response if this was it
      if (this.currentResponse?.id === responseId) {
        this.currentResponse = null;
      }

      console.log(`Response completed: ${responseId}`);
    }
  }

  /**
   * Get preserved state
   * @param {string} stateId - State ID
   * @returns {Object|null} Preserved state
   */
  getPreservedState(stateId) {
    return this.preservedStates.get(stateId) || null;
  }

  /**
   * Get current response
   * @returns {Object|null} Current response
   */
  getCurrentResponse() {
    return this.currentResponse;
  }

  /**
   * Get conversation statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      activeResponses: this.activeResponses.size,
      preservedStates: this.preservedStates.size,
      responseHistory: this.responseHistory.length,
      currentResponse: this.currentResponse?.id || null,
      interruptionPoint: this.interruptionPoint?.responseId || null,
      conversationFlow: this.analyzeConversationFlow()
    };
  }

  /**
   * Reset conversation state
   */
  reset() {
    this.currentResponse = null;
    this.interruptionPoint = null;
    this.conversationContext.clear();
    this.responseHistory = [];
    this.preservedStates.clear();
    this.activeResponses.clear();
    this.responseMetadata.clear();
    this.continuationOptions.clear();

    console.log('ConversationFlowManager reset');
  }
}

// Export singleton instance
export const conversationFlowManager = new ConversationFlowManager();
