/**
 * Interruption Event Handler
 * Manages interruption events and coordinates responses
 */

import { get } from 'svelte/store';
import { isVoiceModeActive, isSpeaking } from './voice/index.js';
import { avatarStateManager } from './AvatarStateManager.js';

export class InterruptionEventHandler {
  constructor() {
    this.eventQueue = [];
    this.isProcessingEvent = false;
    this.eventHistory = [];
    this.maxHistorySize = 20;

    // Event processing configuration
    this.processingConfig = {
      minConfidence: 0.3, // Minimum confidence to process interruption
      maxProcessingTime: 5000, // Maximum time to process an event (ms)
      cooldownPeriod: 1000, // Cooldown between interruptions (ms)
      maxQueueSize: 5 // Maximum events in queue
    };

    // Event handlers by type
    this.eventHandlers = new Map();
    this.globalHandlers = [];

    // State tracking
    this.lastProcessedEvent = null;
    this.currentInterruption = null;
    this.interruptionContext = null;

    console.log('InterruptionEventHandler initialized');
  }

  /**
   * Handle an interruption event
   * @param {Object} event - Interruption event
   * @returns {Promise<void>}
   */
  async handleInterruption(event) {
    try {
      console.log('Handling interruption event:', event);

      // Validate event
      if (!this.validateEvent(event)) {
        console.warn('Invalid interruption event, ignoring');
        return;
      }

      // Check if we should process this event
      if (!this.shouldProcessEvent(event)) {
        console.log('Event filtered out, not processing');
        return;
      }

      // Add to queue
      this.queueEvent(event);

      // Process queue
      await this.processEventQueue();
    } catch (error) {
      console.error('Error handling interruption event:', error);
    }
  }

  /**
   * Validate interruption event
   * @param {Object} event - Event to validate
   * @returns {boolean} True if valid
   */
  validateEvent(event) {
    // Check required properties
    const required = ['timestamp', 'energy', 'confidence'];
    for (const prop of required) {
      if (event[prop] === undefined) {
        console.warn(`Missing required property: ${prop}`);
        return false;
      }
    }

    // Check confidence threshold
    if (event.confidence < this.processingConfig.minConfidence) {
      console.log(
        `Event confidence too low: ${event.confidence} < ${this.processingConfig.minConfidence}`
      );
      return false;
    }

    // Check if voice mode is active
    if (!get(isVoiceModeActive)) {
      console.log('Voice mode not active, ignoring interruption');
      return false;
    }

    return true;
  }

  /**
   * Check if event should be processed
   * @param {Object} event - Event to check
   * @returns {boolean} True if should process
   */
  shouldProcessEvent(event) {
    const now = Date.now();

    // Check cooldown period
    if (this.lastProcessedEvent) {
      const timeSinceLastEvent = now - this.lastProcessedEvent.timestamp;
      if (timeSinceLastEvent < this.processingConfig.cooldownPeriod) {
        console.log(
          `Event in cooldown period: ${timeSinceLastEvent}ms < ${this.processingConfig.cooldownPeriod}ms`
        );
        return false;
      }
    }

    // Check if bot is actually speaking
    if (!get(isSpeaking)) {
      console.log('Bot not speaking, interruption not relevant');
      return false;
    }

    return true;
  }

  /**
   * Queue an event for processing
   * @param {Object} event - Event to queue
   */
  queueEvent(event) {
    // Add processing metadata
    const queuedEvent = {
      ...event,
      queuedAt: Date.now(),
      id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    // Manage queue size
    if (this.eventQueue.length >= this.processingConfig.maxQueueSize) {
      console.log('Event queue full, removing oldest event');
      this.eventQueue.shift();
    }

    this.eventQueue.push(queuedEvent);
    console.log(`Event queued: ${queuedEvent.id}, queue size: ${this.eventQueue.length}`);
  }

  /**
   * Process the event queue
   * @returns {Promise<void>}
   */
  async processEventQueue() {
    if (this.isProcessingEvent || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessingEvent = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        await this.processEvent(event);
      }
    } catch (error) {
      console.error('Error processing event queue:', error);
    } finally {
      this.isProcessingEvent = false;
    }
  }

  /**
   * Process a single interruption event
   * @param {Object} event - Event to process
   * @returns {Promise<void>}
   */
  async processEvent(event) {
    const startTime = Date.now();

    try {
      console.log(`Processing interruption event: ${event.id}`);

      // Set current interruption context
      this.currentInterruption = event;
      this.interruptionContext = await this.buildInterruptionContext(event);

      // Create interruption response
      const response = await this.createInterruptionResponse(event, this.interruptionContext);

      // Execute interruption handling
      await this.executeInterruptionHandling(event, response);

      // Add to history
      this.addToHistory(event, response, Date.now() - startTime);

      // Update last processed event
      this.lastProcessedEvent = event;

      console.log(`Interruption event processed successfully: ${event.id}`);
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);

      // Add error to history
      this.addToHistory(event, { error: error.message }, Date.now() - startTime);
    } finally {
      // Clear current interruption
      this.currentInterruption = null;
      this.interruptionContext = null;
    }
  }

  /**
   * Build context for interruption handling
   * @param {Object} event - Interruption event
   * @returns {Promise<Object>} Interruption context
   */
  async buildInterruptionContext(event) {
    try {
      // Get current voice state
      const voiceState = {
        isSpeaking: get(isSpeaking),
        isVoiceModeActive: get(isVoiceModeActive)
      };

      // Get avatar state
      const avatarState = avatarStateManager.getCurrentState();

      // Determine interruption type
      const interruptionType = this.classifyInterruption(event);

      // Get current conversation context (if available)
      const conversationContext = await this.getCurrentConversationContext();

      return {
        event: event,
        voiceState: voiceState,
        avatarState: avatarState,
        interruptionType: interruptionType,
        conversationContext: conversationContext,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error building interruption context:', error);
      return {
        event: event,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Classify the type of interruption
   * @param {Object} event - Interruption event
   * @returns {string} Interruption type
   */
  classifyInterruption(event) {
    // Classify based on confidence and energy levels
    if (event.confidence > 0.8 && event.energy > 0.3) {
      return 'strong_interruption'; // User definitely wants to interrupt
    }

    if (event.confidence > 0.6 && event.energy > 0.2) {
      return 'moderate_interruption'; // Likely interruption
    }

    if (event.confidence > 0.4) {
      return 'weak_interruption'; // Possible interruption
    }

    return 'unclear_interruption'; // Unclear intent
  }

  /**
   * Get current conversation context
   * @returns {Promise<Object>} Conversation context
   */
  async getCurrentConversationContext() {
    // This would integrate with the conversation system
    // For now, return basic context
    return {
      hasActiveResponse: get(isSpeaking),
      responseType: 'unknown', // Could be 'waiting_phrase' or 'main_response'
      language: 'en' // Would get from current language
    };
  }

  /**
   * Create interruption response
   * @param {Object} event - Interruption event
   * @param {Object} context - Interruption context
   * @returns {Promise<Object>} Response configuration
   */
  async createInterruptionResponse(event, context) {
    try {
      const response = {
        type: 'interruption_acknowledgment',
        language: event.detectedLanguage || 'en',
        confidence: event.confidence,
        actions: []
      };

      // Determine response actions based on interruption type
      switch (context.interruptionType) {
        case 'strong_interruption':
          response.actions = [
            { type: 'stop_current_speech', immediate: true },
            { type: 'acknowledge_interruption', priority: 'high' },
            { type: 'offer_continuation_choice', priority: 'normal' }
          ];
          break;

        case 'moderate_interruption':
          response.actions = [
            { type: 'pause_current_speech', duration: 500 },
            { type: 'acknowledge_interruption', priority: 'normal' },
            { type: 'offer_continuation_choice', priority: 'low' }
          ];
          break;

        case 'weak_interruption':
          response.actions = [
            { type: 'brief_pause', duration: 200 },
            { type: 'continue_if_no_further_interruption', timeout: 1000 }
          ];
          break;

        default:
          response.actions = [{ type: 'monitor_for_further_interruption', timeout: 500 }];
      }

      return response;
    } catch (error) {
      console.error('Error creating interruption response:', error);

      // Return minimal response
      return {
        type: 'error_response',
        language: 'en',
        actions: [{ type: 'stop_current_speech', immediate: true }]
      };
    }
  }

  /**
   * Execute interruption handling
   * @param {Object} event - Interruption event
   * @param {Object} response - Response configuration
   * @returns {Promise<void>}
   */
  async executeInterruptionHandling(event, response) {
    try {
      console.log(`Executing interruption handling for ${event.id}:`, response);

      // Execute each action in the response
      for (const action of response.actions) {
        await this.executeAction(action, event, response);
      }

      // Notify global handlers
      await this.notifyGlobalHandlers(event, response);
    } catch (error) {
      console.error('Error executing interruption handling:', error);
      throw error;
    }
  }

  /**
   * Execute a single action
   * @param {Object} action - Action to execute
   * @param {Object} event - Original event
   * @param {Object} response - Full response
   * @returns {Promise<void>}
   */
  async executeAction(action, event, response) {
    try {
      console.log(`Executing action: ${action.type}`);

      switch (action.type) {
        case 'stop_current_speech':
          await this.stopCurrentSpeech(action.immediate);
          break;

        case 'pause_current_speech':
          await this.pauseCurrentSpeech(action.duration);
          break;

        case 'acknowledge_interruption':
          await this.acknowledgeInterruption(response.language, action.priority);
          break;

        case 'offer_continuation_choice':
          await this.offerContinuationChoice(response.language, action.priority);
          break;

        case 'brief_pause':
          await this.briefPause(action.duration);
          break;

        case 'continue_if_no_further_interruption':
          await this.continueIfNoFurtherInterruption(action.timeout);
          break;

        case 'monitor_for_further_interruption':
          await this.monitorForFurtherInterruption(action.timeout);
          break;

        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
    }
  }

  /**
   * Stop current speech
   * @param {boolean} immediate - Whether to stop immediately
   * @returns {Promise<void>}
   */
  async stopCurrentSpeech(immediate = true) {
    console.log(`Stopping current speech (immediate: ${immediate})`);

    // This would integrate with the voice services to stop current audio
    // For now, just update avatar state
    await avatarStateManager.transitionToState(
      {
        currentState: 'listening',
        speaking: false
      },
      {
        priority: immediate ? 'immediate' : 'high',
        duration: immediate ? 0 : 200
      }
    );
  }

  /**
   * Pause current speech
   * @param {number} duration - Pause duration in ms
   * @returns {Promise<void>}
   */
  async pauseCurrentSpeech(duration) {
    console.log(`Pausing current speech for ${duration}ms`);

    // Pause and then resume
    await avatarStateManager.transitionToState(
      {
        currentState: 'listening'
      },
      { priority: 'high', duration: 100 }
    );

    setTimeout(async () => {
      await avatarStateManager.transitionToState(
        {
          currentState: 'speaking',
          speaking: true
        },
        { priority: 'normal', duration: 100 }
      );
    }, duration);
  }

  /**
   * Acknowledge interruption
   * @param {string} language - Language for acknowledgment
   * @param {string} priority - Priority level
   * @returns {Promise<void>}
   */
  async acknowledgeInterruption(language, priority) {
    console.log(`Acknowledging interruption in ${language} (priority: ${priority})`);

    // This would generate and speak an acknowledgment phrase
    // For now, just update avatar state
    await avatarStateManager.transitionToState(
      {
        currentState: 'thinking',
        emotion: 'neutral'
      },
      { priority: priority === 'high' ? 'high' : 'normal', duration: 300 }
    );
  }

  /**
   * Offer continuation choice
   * @param {string} language - Language for the offer
   * @param {string} priority - Priority level
   * @returns {Promise<void>}
   */
  async offerContinuationChoice(language, priority) {
    console.log(`Offering continuation choice in ${language} (priority: ${priority})`);

    // This would generate and speak a continuation choice phrase
    // Implementation would be added in the conversation flow manager
  }

  /**
   * Brief pause
   * @param {number} duration - Pause duration in ms
   * @returns {Promise<void>}
   */
  async briefPause(duration) {
    console.log(`Brief pause for ${duration}ms`);
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  /**
   * Continue if no further interruption
   * @param {number} timeout - Timeout to wait for further interruption
   * @returns {Promise<void>}
   */
  async continueIfNoFurtherInterruption(timeout) {
    console.log(`Waiting ${timeout}ms for further interruption before continuing`);

    // Wait for timeout, then continue if no new interruption
    await new Promise((resolve) => setTimeout(resolve, timeout));

    // Check if there were new interruptions
    if (this.eventQueue.length === 0) {
      console.log('No further interruption detected, continuing');
      // Continue current speech
    } else {
      console.log('Further interruption detected, not continuing');
    }
  }

  /**
   * Monitor for further interruption
   * @param {number} timeout - Monitoring timeout
   * @returns {Promise<void>}
   */
  async monitorForFurtherInterruption(timeout) {
    console.log(`Monitoring for further interruption for ${timeout}ms`);

    // This would set up enhanced monitoring
    // For now, just wait
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }

  /**
   * Notify global handlers
   * @param {Object} event - Interruption event
   * @param {Object} response - Response that was executed
   * @returns {Promise<void>}
   */
  async notifyGlobalHandlers(event, response) {
    for (const handler of this.globalHandlers) {
      try {
        await handler(event, response);
      } catch (error) {
        console.error('Error in global interruption handler:', error);
      }
    }
  }

  /**
   * Add event to history
   * @param {Object} event - Processed event
   * @param {Object} response - Response that was executed
   * @param {number} processingTime - Time taken to process
   */
  addToHistory(event, response, processingTime) {
    const historyEntry = {
      event: event,
      response: response,
      processingTime: processingTime,
      timestamp: Date.now()
    };

    this.eventHistory.push(historyEntry);

    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Register global event handler
   * @param {Function} handler - Handler function
   */
  onInterruption(handler) {
    if (typeof handler === 'function') {
      this.globalHandlers.push(handler);
    }
  }

  /**
   * Unregister global event handler
   * @param {Function} handler - Handler function
   */
  offInterruption(handler) {
    const index = this.globalHandlers.indexOf(handler);
    if (index > -1) {
      this.globalHandlers.splice(index, 1);
    }
  }

  /**
   * Get current interruption context
   * @returns {Object|null} Current interruption context
   */
  getCurrentInterruption() {
    return this.currentInterruption;
  }

  /**
   * Get event processing statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessingEvent,
      historySize: this.eventHistory.length,
      lastProcessed: this.lastProcessedEvent?.timestamp || null,
      currentInterruption: this.currentInterruption?.id || null,
      config: { ...this.processingConfig }
    };
  }

  /**
   * Update processing configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.processingConfig = { ...this.processingConfig, ...config };
    console.log('Updated interruption processing config:', this.processingConfig);
  }

  /**
   * Clear event queue and history
   */
  reset() {
    this.eventQueue = [];
    this.eventHistory = [];
    this.lastProcessedEvent = null;
    this.currentInterruption = null;
    this.interruptionContext = null;
    this.isProcessingEvent = false;

    console.log('InterruptionEventHandler reset');
  }
}

// Export singleton instance
export const interruptionEventHandler = new InterruptionEventHandler();
