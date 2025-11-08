/**
 * Avatar State Transition Manager
 * Manages smooth transitions between different avatar states and animations
 */

import { writable, get } from 'svelte/store';

// Avatar state store
export const avatarState = writable({
  currentState: 'idle',
  emotion: 'neutral',
  speaking: false,
  transitioning: false,
  mouthPosition: null,
  lastTransition: 0
});

export class AvatarStateManager {
  constructor() {
    this.transitionQueue = [];
    this.isProcessingTransition = false;
    this.transitionCallbacks = new Map();
    this.stateHistory = [];
    this.maxHistorySize = 10;

    // Transition timing configuration
    this.transitionDurations = {
      emotion: 500, // ms for emotion changes
      speaking: 200, // ms for speaking state changes
      mouth: 100, // ms for mouth position changes
      idle: 300 // ms for idle transitions
    };

    // State validation rules
    this.validStates = ['idle', 'speaking', 'listening', 'thinking', 'transitioning'];
    this.validEmotions = ['neutral', 'happy', 'sad', 'surprised', 'angry', 'resting'];

    // Streaming animation support (Requirements 3.1, 3.2, 3.3, 3.4, 3.5)
    this.currentMouthState = 'neutral';
    this.isAnimating = false;
    this.currentEmotion = 'neutral';
    this.phonemeAnalysisInterval = null;

    // Mouth shape mapping for phonemes (Requirement 3.4)
    this.mouthShapes = {
      a: 'open',
      e: 'smile',
      i: 'narrow',
      o: 'round',
      u: 'pucker',
      silence: 'closed',
      neutral: 'neutral'
    };

    console.log('AvatarStateManager initialized with streaming support');
  }

  /**
   * Get current avatar state
   * @returns {Object} Current state object
   */
  getCurrentState() {
    return get(avatarState);
  }

  /**
   * Transition to a new avatar state
   * @param {Object} newState - New state properties
   * @param {Object} options - Transition options
   * @returns {Promise<void>}
   */
  async transitionToState(newState, options = {}) {
    const {
      duration = null,
      easing = 'ease-out',
      priority = 'normal',
      force = false,
      onComplete = null
    } = options;

    try {
      console.log(`Avatar state transition requested:`, newState);

      // Validate new state
      const validatedState = this.validateState(newState);
      if (!validatedState) {
        throw new Error('Invalid state provided');
      }

      // Create transition object
      const transition = {
        id: `transition_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        targetState: validatedState,
        duration: duration || this.calculateTransitionDuration(validatedState),
        easing,
        priority,
        force,
        onComplete,
        timestamp: Date.now()
      };

      // Add to queue or process immediately
      if (priority === 'immediate' || force) {
        await this.processTransitionImmediate(transition);
      } else {
        this.queueTransition(transition);
        await this.processTransitionQueue();
      }
    } catch (error) {
      console.error('Error in avatar state transition:', error);
      throw error;
    }
  }

  /**
   * Validate state properties
   * @param {Object} state - State to validate
   * @returns {Object|null} Validated state or null if invalid
   */
  validateState(state) {
    const currentState = this.getCurrentState();
    const validatedState = { ...currentState };

    // Validate and update each property
    if (state.currentState !== undefined) {
      if (this.validStates.includes(state.currentState)) {
        validatedState.currentState = state.currentState;
      } else {
        console.warn(`Invalid state: ${state.currentState}`);
        return null;
      }
    }

    if (state.emotion !== undefined) {
      if (this.validEmotions.includes(state.emotion)) {
        validatedState.emotion = state.emotion;
      } else {
        console.warn(`Invalid emotion: ${state.emotion}`);
        return null;
      }
    }

    if (state.speaking !== undefined) {
      validatedState.speaking = Boolean(state.speaking);
    }

    if (state.mouthPosition !== undefined) {
      validatedState.mouthPosition = state.mouthPosition;
    }

    return validatedState;
  }

  /**
   * Calculate appropriate transition duration based on state changes
   * @param {Object} targetState - Target state
   * @returns {number} Duration in milliseconds
   */
  calculateTransitionDuration(targetState) {
    const currentState = this.getCurrentState();
    let maxDuration = 0;

    // Check each property for required transition time
    if (targetState.emotion !== currentState.emotion) {
      maxDuration = Math.max(maxDuration, this.transitionDurations.emotion);
    }

    if (targetState.speaking !== currentState.speaking) {
      maxDuration = Math.max(maxDuration, this.transitionDurations.speaking);
    }

    if (targetState.currentState !== currentState.currentState) {
      maxDuration = Math.max(maxDuration, this.transitionDurations.idle);
    }

    if (targetState.mouthPosition !== currentState.mouthPosition) {
      maxDuration = Math.max(maxDuration, this.transitionDurations.mouth);
    }

    return maxDuration || this.transitionDurations.idle;
  }

  /**
   * Queue a transition for processing
   * @param {Object} transition - Transition object
   */
  queueTransition(transition) {
    // Remove any existing transitions with lower priority
    if (transition.priority === 'high') {
      this.transitionQueue = this.transitionQueue.filter((t) => t.priority === 'high');
    }

    // Add to queue
    this.transitionQueue.push(transition);

    // Sort by priority and timestamp
    this.transitionQueue.sort((a, b) => {
      const priorityOrder = { immediate: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return a.timestamp - b.timestamp;
    });

    console.log(`Transition queued: ${transition.id}, queue size: ${this.transitionQueue.length}`);
  }

  /**
   * Process the transition queue
   * @returns {Promise<void>}
   */
  async processTransitionQueue() {
    if (this.isProcessingTransition || this.transitionQueue.length === 0) {
      return;
    }

    this.isProcessingTransition = true;

    try {
      while (this.transitionQueue.length > 0) {
        const transition = this.transitionQueue.shift();
        await this.executeTransition(transition);
      }
    } catch (error) {
      console.error('Error processing transition queue:', error);
    } finally {
      this.isProcessingTransition = false;
    }
  }

  /**
   * Process transition immediately (bypass queue)
   * @param {Object} transition - Transition object
   * @returns {Promise<void>}
   */
  async processTransitionImmediate(transition) {
    // Clear queue if this is a force transition
    if (transition.force) {
      this.transitionQueue = [];
    }

    await this.executeTransition(transition);
  }

  /**
   * Execute a single transition
   * @param {Object} transition - Transition object
   * @returns {Promise<void>}
   */
  async executeTransition(transition) {
    try {
      console.log(`Executing avatar transition: ${transition.id}`);

      const currentState = this.getCurrentState();

      // Add to history
      this.addToHistory(currentState);

      // Set transitioning flag
      avatarState.update((state) => ({
        ...state,
        transitioning: true,
        lastTransition: Date.now()
      }));

      // Apply the transition with timing
      await this.applyStateTransition(currentState, transition.targetState, transition);

      // Update to final state
      avatarState.update((state) => ({
        ...transition.targetState,
        transitioning: false,
        lastTransition: Date.now()
      }));

      // Call completion callback
      if (transition.onComplete) {
        try {
          transition.onComplete(transition.targetState);
        } catch (callbackError) {
          console.error('Error in transition completion callback:', callbackError);
        }
      }

      console.log(`Avatar transition completed: ${transition.id}`);
    } catch (error) {
      console.error(`Error executing transition ${transition.id}:`, error);

      // Reset transitioning flag on error
      avatarState.update((state) => ({
        ...state,
        transitioning: false
      }));

      throw error;
    }
  }

  /**
   * Apply state transition with smooth timing
   * @param {Object} fromState - Current state
   * @param {Object} toState - Target state
   * @param {Object} transition - Transition configuration
   * @returns {Promise<void>}
   */
  async applyStateTransition(fromState, toState, transition) {
    const steps = this.calculateTransitionSteps(fromState, toState, transition);

    for (const step of steps) {
      await this.executeTransitionStep(step);
    }
  }

  /**
   * Calculate transition steps for smooth animation
   * @param {Object} fromState - Current state
   * @param {Object} toState - Target state
   * @param {Object} transition - Transition configuration
   * @returns {Array} Array of transition steps
   */
  calculateTransitionSteps(fromState, toState, transition) {
    const steps = [];
    const stepCount = Math.max(1, Math.floor(transition.duration / 50)); // 50ms per step
    const stepDuration = transition.duration / stepCount;

    // Create intermediate steps for smooth transitions
    for (let i = 1; i <= stepCount; i++) {
      const progress = i / stepCount;
      const easedProgress = this.applyEasing(progress, transition.easing);

      const stepState = this.interpolateState(fromState, toState, easedProgress);

      steps.push({
        state: stepState,
        duration: stepDuration,
        progress: easedProgress
      });
    }

    return steps;
  }

  /**
   * Interpolate between two states
   * @param {Object} fromState - Starting state
   * @param {Object} toState - Ending state
   * @param {number} progress - Progress (0-1)
   * @returns {Object} Interpolated state
   */
  interpolateState(fromState, toState, progress) {
    const interpolated = { ...fromState };

    // For discrete properties, switch at 50% progress
    if (progress >= 0.5) {
      if (toState.currentState !== fromState.currentState) {
        interpolated.currentState = toState.currentState;
      }

      if (toState.emotion !== fromState.emotion) {
        interpolated.emotion = toState.emotion;
      }

      if (toState.speaking !== fromState.speaking) {
        interpolated.speaking = toState.speaking;
      }

      if (toState.mouthPosition !== fromState.mouthPosition) {
        interpolated.mouthPosition = toState.mouthPosition;
      }
    }

    return interpolated;
  }

  /**
   * Execute a single transition step
   * @param {Object} step - Transition step
   * @returns {Promise<void>}
   */
  async executeTransitionStep(step) {
    // Update state
    avatarState.update((currentState) => ({
      ...currentState,
      ...step.state
    }));

    // Wait for step duration
    if (step.duration > 0) {
      await new Promise((resolve) => setTimeout(resolve, step.duration));
    }
  }

  /**
   * Apply easing function to progress
   * @param {number} progress - Linear progress (0-1)
   * @param {string} easing - Easing function name
   * @returns {number} Eased progress
   */
  applyEasing(progress, easing) {
    switch (easing) {
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'linear':
      default:
        return progress;
    }
  }

  /**
   * Add state to history
   * @param {Object} state - State to add to history
   */
  addToHistory(state) {
    this.stateHistory.push({
      ...state,
      timestamp: Date.now()
    });

    // Maintain history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * Get state history
   * @returns {Array} State history
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Register callback for state changes
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  onStateChange(event, callback) {
    if (!this.transitionCallbacks.has(event)) {
      this.transitionCallbacks.set(event, []);
    }
    this.transitionCallbacks.get(event).push(callback);
  }

  /**
   * Unregister callback
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  offStateChange(event, callback) {
    const callbacks = this.transitionCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Start lip-sync animation with optional state maintenance (Requirements 3.1, 3.2)
   * @param {HTMLAudioElement} audio - Audio element to sync with
   * @param {Object} options - Animation options
   */
  startLipSync(audio, options = {}) {
    const { maintainState = false, onPhoneme = null } = options;

    if (!maintainState) {
      // Reset to neutral only for non-streaming segments (Requirement 3.2)
      this.currentMouthState = 'neutral';
      console.log('[AvatarAnimation] Starting lip-sync with state reset');
    } else {
      console.log(
        '[AvatarAnimation] Starting lip-sync maintaining current state:',
        this.currentMouthState
      );
    }

    this.isAnimating = true;

    // Update avatar state to speaking
    avatarState.update((state) => ({
      ...state,
      speaking: true,
      currentState: 'speaking'
    }));

    // Analyze audio for phonemes (Requirement 3.4)
    this.analyzeAudioForPhonemes(audio, (phoneme) => {
      this.updateMouthShape(phoneme);
      if (onPhoneme) {
        onPhoneme(phoneme);
      }
    });

    console.log('[AvatarAnimation] Lip-sync started');
  }

  /**
   * Analyze audio for phoneme detection (Requirement 3.4)
   * @param {HTMLAudioElement} audio - Audio element to analyze
   * @param {Function} onPhoneme - Callback for phoneme detection
   */
  analyzeAudioForPhonemes(audio, onPhoneme) {
    // Simple phoneme simulation based on audio playback
    // In a real implementation, this would use Web Audio API for frequency analysis

    let lastPhoneme = 'silence';
    const phonemes = ['a', 'e', 'i', 'o', 'u', 'silence'];

    // Clear any existing interval
    if (this.phonemeAnalysisInterval) {
      clearInterval(this.phonemeAnalysisInterval);
    }

    // Simulate phoneme changes during playback
    this.phonemeAnalysisInterval = setInterval(() => {
      if (audio.paused || audio.ended) {
        clearInterval(this.phonemeAnalysisInterval);
        this.phonemeAnalysisInterval = null;
        onPhoneme('silence');
        return;
      }

      // Simple simulation: alternate between phonemes
      // In production, this would analyze audio frequency data
      const randomPhoneme = phonemes[Math.floor(Math.random() * phonemes.length)];

      if (randomPhoneme !== lastPhoneme) {
        lastPhoneme = randomPhoneme;
        onPhoneme(randomPhoneme);
      }
    }, 100); // Update every 100ms

    // Cleanup on audio end
    audio.addEventListener(
      'ended',
      () => {
        if (this.phonemeAnalysisInterval) {
          clearInterval(this.phonemeAnalysisInterval);
          this.phonemeAnalysisInterval = null;
        }
      },
      { once: true }
    );
  }

  /**
   * Update mouth shape based on phoneme (Requirement 3.4)
   * @param {string} phoneme - Phoneme identifier
   */
  updateMouthShape(phoneme) {
    const newShape = this.mouthShapes[phoneme] || 'neutral';

    // Only update if shape changed
    if (newShape !== this.currentMouthState) {
      console.log(`[AvatarAnimation] Mouth shape: ${this.currentMouthState} -> ${newShape}`);

      // Smooth transition between shapes
      this.transitionMouthShape(this.currentMouthState, newShape);
      this.currentMouthState = newShape;
    }
  }

  /**
   * Transition between mouth shapes smoothly (Requirement 3.4)
   * @param {string} fromShape - Current mouth shape
   * @param {string} toShape - Target mouth shape
   */
  transitionMouthShape(fromShape, toShape) {
    // Update avatar state with new mouth position
    avatarState.update((state) => ({
      ...state,
      mouthPosition: toShape
    }));

    // In a real implementation, this would trigger CSS animations or
    // canvas-based morphing between mouth shapes
    console.log(`[AvatarAnimation] Transitioning mouth: ${fromShape} -> ${toShape}`);
  }

  /**
   * Apply emotion consistently across segments (Requirement 3.5)
   * @param {string} emotion - Emotion to apply
   */
  applyEmotion(emotion) {
    if (!this.validEmotions.includes(emotion)) {
      console.warn(`[AvatarAnimation] Invalid emotion: ${emotion}`);
      return;
    }

    this.currentEmotion = emotion;

    // Update avatar state
    avatarState.update((state) => ({
      ...state,
      emotion: emotion
    }));

    // Apply facial expression
    this.updateFacialExpression(emotion);

    // Emotion persists across streaming segments (Requirement 3.5)
    console.log(`[AvatarAnimation] Emotion applied: ${emotion} (persists across segments)`);
  }

  /**
   * Update facial expression based on emotion (Requirement 3.5)
   * @param {string} emotion - Emotion to express
   */
  updateFacialExpression(emotion) {
    // In a real implementation, this would update eye shape, eyebrow position, etc.
    // For now, we just log the change
    console.log(`[AvatarAnimation] Facial expression updated: ${emotion}`);
  }

  /**
   * Return to neutral state after streaming complete (Requirement 3.3)
   */
  returnToNeutral() {
    console.log('[AvatarAnimation] Returning to neutral state');

    this.isAnimating = false;

    // Clear phoneme analysis
    if (this.phonemeAnalysisInterval) {
      clearInterval(this.phonemeAnalysisInterval);
      this.phonemeAnalysisInterval = null;
    }

    // Transition mouth to closed
    this.transitionMouthShape(this.currentMouthState, 'closed');
    this.currentMouthState = 'closed';

    // Update avatar state
    avatarState.update((state) => ({
      ...state,
      speaking: false,
      currentState: 'idle',
      mouthPosition: 'closed'
    }));

    console.log('[AvatarAnimation] Returned to neutral state');
  }

  /**
   * Clear all transitions and reset to idle state (enhanced for streaming)
   */
  reset() {
    console.log('[AvatarAnimation] Resetting avatar state');

    // Clear streaming animation state
    this.isAnimating = false;
    this.currentMouthState = 'neutral';
    this.currentEmotion = 'neutral';

    // Clear phoneme analysis
    if (this.phonemeAnalysisInterval) {
      clearInterval(this.phonemeAnalysisInterval);
      this.phonemeAnalysisInterval = null;
    }

    // Clear transition queue
    this.transitionQueue = [];
    this.isProcessingTransition = false;
    this.stateHistory = [];

    // Reset avatar state
    avatarState.set({
      currentState: 'idle',
      emotion: 'neutral',
      speaking: false,
      transitioning: false,
      mouthPosition: null,
      lastTransition: Date.now()
    });

    console.log('AvatarStateManager reset to idle state');
  }

  /**
   * Get transition statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      queueSize: this.transitionQueue.length,
      isProcessing: this.isProcessingTransition,
      historySize: this.stateHistory.length,
      currentState: this.getCurrentState(),
      lastTransition:
        this.stateHistory.length > 0
          ? this.stateHistory[this.stateHistory.length - 1].timestamp
          : null
    };
  }
}

// Export singleton instance
export const avatarStateManager = new AvatarStateManager();
