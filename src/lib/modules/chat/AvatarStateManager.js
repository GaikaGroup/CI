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

    console.log('AvatarStateManager initialized');
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
   * Clear all transitions and reset to idle state
   */
  reset() {
    this.transitionQueue = [];
    this.isProcessingTransition = false;
    this.stateHistory = [];

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
