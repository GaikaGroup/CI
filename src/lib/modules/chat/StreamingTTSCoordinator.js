/**
 * Streaming TTS Coordinator
 *
 * Coordinates TTS synthesis of streaming sentences and manages audio queue.
 * Supports parallel synthesis while maintaining sequential playback order.
 *
 * Requirements: 1.2, 1.5, 2.2, 2.5
 */

export class StreamingTTSCoordinator {
  /**
   * Create a new StreamingTTSCoordinator
   * @param {Object} options - Configuration options
   * @param {Function} options.onAudioReady - Callback when audio is synthesized
   * @param {Function} options.onError - Callback for error handling
   * @param {number} options.maxParallelSynthesis - Max concurrent synthesis operations (default: 3)
   */
  constructor(options = {}) {
    this.synthesisQueue = [];
    this.isActive = false;
    this.onAudioReady = options.onAudioReady || (() => {});
    this.onError = options.onError || (() => {});
    this.maxParallelSynthesis = options.maxParallelSynthesis || 3; // Requirement 1.5
    this.activeSynthesisTasks = 0;
  }

  /**
   * Queue sentence for synthesis
   * Requirement 1.5: Synthesize multiple sentences in parallel
   * @param {string} sentence - Complete sentence to synthesize
   * @param {string} language - Language for synthesis
   */
  async queueSentence(sentence, language) {
    // FIXED: Only check for exact duplicates in active/pending tasks
    const sentenceHash = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
    const isDuplicate = this.synthesisQueue.some(
      (task) =>
        (task.status === 'pending' || task.status === 'synthesizing') &&
        task.text.toLowerCase().replace(/\s+/g, ' ').trim() === sentenceHash
    );

    if (isDuplicate) {
      console.warn(
        '[StreamingTTSCoordinator] Duplicate sentence in active queue, skipping synthesis:',
        sentence.substring(0, 50) + '...'
      );
      return;
    }

    const synthesisTask = {
      id: `sentence_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: sentence,
      language: language,
      status: 'pending',
      queuePosition: this.synthesisQueue.length,
      startTime: null,
      endTime: null,
      error: null
    };

    this.synthesisQueue.push(synthesisTask);
    console.log(
      '[StreamingTTSCoordinator] Queued sentence for synthesis:',
      sentence.substring(0, 50) + '...'
    );

    // Start synthesis immediately if under parallel limit
    // Requirement 1.5: Queue multiple sentences for parallel synthesis
    if (this.activeSynthesisTasks < this.maxParallelSynthesis) {
      this._synthesizeSentence(synthesisTask);
    }
  }

  /**
   * Synthesize a single sentence
   * @private
   * @param {Object} task - Synthesis task
   */
  async _synthesizeSentence(task) {
    this.activeSynthesisTasks++;
    task.status = 'synthesizing';
    task.startTime = Date.now();

    try {
      // Requirement 2.2: Maintain consistent voice characteristics
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: task.text,
          language: task.language,
          isWaitingPhrase: false,
          priority: 1,
          streamingSegment: true // Mark as streaming segment
        })
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      task.status = 'completed';
      task.endTime = Date.now();

      // Requirement 1.3: Begin playback immediately
      this.onAudioReady({
        taskId: task.id,
        audioBlob,
        text: task.text,
        language: task.language,
        synthesisTime: task.endTime - task.startTime,
        queuePosition: task.queuePosition
      });

      // Start next pending task if available
      const nextPending = this.synthesisQueue.find((t) => t.status === 'pending');
      if (nextPending && this.activeSynthesisTasks < this.maxParallelSynthesis) {
        this._synthesizeSentence(nextPending);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error;

      // Requirement 8.3: Log error and continue processing
      console.error('[StreamingTTSCoordinator] TTS failed for sentence:', {
        text: task.text.substring(0, 50),
        error: error.message,
        taskId: task.id,
        timestamp: new Date().toISOString()
      });

      // Notify error handler but don't throw - allow other sentences to continue
      this.onError(error, task);
    } finally {
      this.activeSynthesisTasks--;
    }
  }

  /**
   * Start coordinator
   */
  start() {
    this.isActive = true;
    console.log('[StreamingTTSCoordinator] Started');
  }

  /**
   * Stop coordinator and clear queue
   * Requirement 4.2: Cancel pending TTS operations on interruption
   */
  stop() {
    this.isActive = false;
    this.synthesisQueue = [];
    this.activeSynthesisTasks = 0;
    console.log('[StreamingTTSCoordinator] Stopped and cleared queue');
  }

  /**
   * Get coordinator status
   * Requirement 7.2: Track queue status for monitoring
   */
  getStatus() {
    return {
      isActive: this.isActive,
      queueLength: this.synthesisQueue.length,
      pending: this.synthesisQueue.filter((t) => t.status === 'pending').length,
      synthesizing: this.synthesisQueue.filter((t) => t.status === 'synthesizing').length,
      completed: this.synthesisQueue.filter((t) => t.status === 'completed').length,
      failed: this.synthesisQueue.filter((t) => t.status === 'failed').length,
      activeTasks: this.activeSynthesisTasks
    };
  }
}
