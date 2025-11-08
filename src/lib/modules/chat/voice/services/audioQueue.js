/**
 * Audio Queue Service
 * Manages audio playback queue and state
 */

// Queue state
export let phraseQueue = [];
export let isPlayingSequence = false;
export let currentlyPlayingMetadata = null;
export let waitingPhraseActive = false;
export let waitingPhraseLanguage = null;

export let queueState = {
  lastTransitionTime: 0,
  transitionInProgress: false,
  pendingInterruption: false,
  interruptionOccurred: false,
  interruptionTime: null,
  lastInterruptionId: null
};

/**
 * Setters for queue state
 */
export function setPlayingSequence(value) {
  isPlayingSequence = value;
}

export function setCurrentMetadata(value) {
  currentlyPlayingMetadata = value;
}

export function setWaitingPhraseActive(value) {
  waitingPhraseActive = value;
}

export function setWaitingPhraseLanguage(value) {
  waitingPhraseLanguage = value;
}

/**
 * Clear audio queue
 */
export function clearQueue() {
  const queueLength = phraseQueue.length;
  phraseQueue.length = 0;

  if (queueLength > 0) {
    console.log(`Cleared ${queueLength} items from audio queue`);
  }

  return queueLength;
}

/**
 * Add to queue
 */
export function addToQueue(audioWithMetadata) {
  phraseQueue.push(audioWithMetadata);
}

/**
 * Add to front of queue
 */
export function addToFrontOfQueue(audioWithMetadata) {
  phraseQueue.unshift(audioWithMetadata);
}

/**
 * Get next from queue
 */
export function getNextFromQueue() {
  return phraseQueue.shift();
}

/**
 * Get queue length
 */
export function getQueueLength() {
  return phraseQueue.length;
}

/**
 * Filter queue
 */
export function filterQueue(predicate) {
  const originalLength = phraseQueue.length;
  phraseQueue = phraseQueue.filter(predicate);
  return originalLength - phraseQueue.length;
}

/**
 * Check if response in queue
 */
export function hasResponseInQueue() {
  return phraseQueue.some((item) => !item.metadata?.isWaitingPhrase);
}

/**
 * Clear waiting phrases from queue
 */
export function clearWaitingPhrasesFromQueue() {
  const removed = filterQueue((item) => !item.metadata?.isWaitingPhrase);

  if (removed > 0) {
    console.log(`Cleared ${removed} waiting phrases from audio queue`);
  }

  return removed;
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  const waitingPhrases = phraseQueue.filter((item) => item.metadata?.isWaitingPhrase).length;
  const responses = phraseQueue.filter((item) => !item.metadata?.isWaitingPhrase).length;

  return {
    totalItems: phraseQueue.length,
    waitingPhrases,
    responses,
    isPlaying: isPlayingSequence,
    currentlyPlaying: currentlyPlayingMetadata
      ? {
          type: currentlyPlayingMetadata.isWaitingPhrase ? 'waiting_phrase' : 'response',
          language: currentlyPlayingMetadata.language,
          priority: currentlyPlayingMetadata.priority
        }
      : null
  };
}

/**
 * Optimize queue
 */
export function optimizeQueue() {
  const originalLength = phraseQueue.length;

  phraseQueue = phraseQueue.filter((item, index) => {
    if (item.metadata?.isWaitingPhrase && index > 0) {
      const hasResponseBefore = phraseQueue
        .slice(0, index)
        .some((i) => !i.metadata?.isWaitingPhrase);
      if (hasResponseBefore) {
        return false;
      }
    }
    return true;
  });

  const removed = originalLength - phraseQueue.length;
  if (removed > 0) {
    console.log(`Optimized queue: removed ${removed} redundant items`);
  }

  return removed;
}

/**
 * Get enhanced state
 */
export function getEnhancedState() {
  return {
    queue: {
      length: phraseQueue.length,
      waitingPhrases: phraseQueue.filter((i) => i.metadata?.isWaitingPhrase).length,
      responses: phraseQueue.filter((i) => !i.metadata?.isWaitingPhrase).length
    },
    playback: {
      isPlaying: isPlayingSequence,
      waitingPhraseActive,
      currentMetadata: currentlyPlayingMetadata
    },
    state: queueState
  };
}

/**
 * Reset queue state
 */
export function resetQueueState() {
  phraseQueue.length = 0;
  isPlayingSequence = false;
  currentlyPlayingMetadata = null;
  waitingPhraseActive = false;
  waitingPhraseLanguage = null;
  queueState = {
    lastTransitionTime: 0,
    transitionInProgress: false,
    pendingInterruption: false,
    interruptionOccurred: false,
    interruptionTime: null,
    lastInterruptionId: null
  };
}
