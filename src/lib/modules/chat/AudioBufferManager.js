/**
 * Audio Buffer Manager
 * Handles audio buffering, crossfading, and smooth transitions to prevent stuttering
 * Enhanced with streaming support and seamless audio transitions (Requirement 2.1)
 */

import { SeamlessAudioTransitionManager } from './SeamlessAudioTransitionManager.js';
import { isSpeaking, audioAmplitude } from './voice/services/avatarAnimation.js';
import { setWaitingPhraseActive, setWaitingPhraseLanguage } from './voice/services/audioQueue.js';

export class AudioBufferManager {
  constructor() {
    this.bufferSize = 8192; // Optimized buffer size for better performance
    this.preloadBuffer = new Map(); // Pre-loaded audio chunks
    this.smoothingWindow = 100; // Reduced for faster response
    this.crossfadeDuration = 30; // Optimized crossfade duration
    this.audioContext = null;
    this.gainNodes = new Map(); // For volume control and fading
    this.isInitialized = false;

    // Audio processing settings - optimized
    this.silencePadding = 0.05; // Reduced padding for faster playback
    this.fadeInDuration = 0.03; // Faster fade-in
    this.fadeOutDuration = 0.03; // Faster fade-out

    // Performance optimization settings
    this.maxConcurrentBuffers = 5; // Limit concurrent processing
    this.bufferCleanupInterval = 30000; // 30 seconds
    this.performanceMode = 'balanced'; // 'fast', 'balanced', 'quality'

    // Worker for heavy processing (if available)
    this.audioWorker = null;
    this.initializeAudioWorker();

    // Performance monitoring
    this.performanceMetrics = {
      bufferProcessingTime: [],
      playbackLatency: [],
      memoryUsage: 0
    };

    // Streaming support (Requirements 1.3, 1.5, 2.1, 8.1)
    this.audioQueue = []; // Queue for streaming segments
    this.isPlaying = false; // Playback state
    this.currentAudioSource = null; // Current playing audio source
    this.onQueueComplete = null; // Callback when queue is empty

    // Seamless audio transition manager (Requirement 2.1)
    this.transitionManager = new SeamlessAudioTransitionManager({
      crossfadeDuration: this.crossfadeDuration
    });

    // Start cleanup interval
    this.startCleanupInterval();

    console.log(
      'AudioBufferManager initialized with performance optimizations and streaming support'
    );
  }

  /**
   * Initialize audio worker for heavy processing
   */
  initializeAudioWorker() {
    try {
      // Create inline worker for audio processing
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          switch (type) {
            case 'processAudio':
              // Perform heavy audio processing in worker
              const result = processAudioData(data);
              self.postMessage({ type: 'audioProcessed', result });
              break;
          }
        };
        
        function processAudioData(audioData) {
          // Simplified audio processing
          return {
            processed: true,
            data: audioData
          };
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.audioWorker = new Worker(URL.createObjectURL(blob));

      this.audioWorker.onmessage = (e) => {
        this.handleWorkerMessage(e.data);
      };

      console.log('Audio worker initialized for performance optimization');
    } catch (error) {
      console.warn('Audio worker not available, using main thread processing:', error);
    }
  }

  /**
   * Handle worker messages
   * @param {Object} message - Worker message
   */
  handleWorkerMessage(message) {
    const { type } = message;

    switch (type) {
      case 'audioProcessed':
        // Handle processed audio result
        break;
    }
  }

  /**
   * Start cleanup interval for performance
   */
  startCleanupInterval() {
    setInterval(() => {
      this.performCleanup();
    }, this.bufferCleanupInterval);
  }

  /**
   * Perform cleanup for performance
   */
  performCleanup() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    // Clean old buffers
    for (const [id, bufferedAudio] of this.preloadBuffer.entries()) {
      const age = now - bufferedAudio.metadata.processedAt;
      if (age > maxAge) {
        this.preloadBuffer.delete(id);
      }
    }

    // Clean old gain nodes
    for (const id of this.gainNodes.keys()) {
      if (!this.preloadBuffer.has(id)) {
        this.gainNodes.delete(id);
      }
    }

    // Update memory usage metric
    this.performanceMetrics.memoryUsage = this.preloadBuffer.size;

    console.log(
      `Cleanup completed: ${this.preloadBuffer.size} buffers, ${this.gainNodes.size} gain nodes`
    );
  }

  /**
   * Initialize the audio buffer manager
   * @param {AudioContext} audioContext - Web Audio API context
   */
  async initialize(audioContext) {
    try {
      this.audioContext = audioContext;

      // Ensure audio context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log('AudioBufferManager initialized with audio context');
    } catch (error) {
      console.error('Failed to initialize AudioBufferManager:', error);
      throw error;
    }
  }

  /**
   * Buffer audio blob for smooth playback with performance optimizations
   * Supports streaming segments with priority queuing (Requirements 1.3, 1.5, 2.1)
   * @param {Blob} audioBlob - Audio data to buffer
   * @param {Object} metadata - Audio metadata
   * @returns {Promise<Object>} Buffered audio data
   */
  async bufferAudio(audioBlob, metadata = {}) {
    const startTime = performance.now();

    try {
      if (!this.isInitialized) {
        throw new Error('AudioBufferManager not initialized');
      }

      // Check if we're at buffer limit
      if (this.preloadBuffer.size >= this.maxConcurrentBuffers) {
        await this.makeSpaceForNewBuffer();
      }

      console.log(`Buffering audio: ${Math.round(audioBlob.size / 1024)}KB`);

      // Optimize based on performance mode
      const processedBuffer = await this.optimizedAudioProcessing(audioBlob, metadata);

      // Create buffered audio object
      const bufferedAudio = {
        id: metadata.id || `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalBlob: audioBlob,
        audioBuffer: processedBuffer,
        metadata: {
          ...metadata,
          duration: processedBuffer.duration,
          sampleRate: processedBuffer.sampleRate,
          numberOfChannels: processedBuffer.numberOfChannels,
          buffered: true,
          processedAt: Date.now(),
          processingTime: performance.now() - startTime,
          // Streaming segment metadata (Requirement 1.5)
          streamingSegment: metadata.streamingSegment || false,
          priority: metadata.priority || 1,
          timestamp: Date.now()
        },
        processingInfo: {
          buffered: true,
          smoothed: this.performanceMode !== 'fast',
          fadingApplied: this.performanceMode === 'quality',
          silencePadded: this.performanceMode !== 'fast'
        }
      };

      // Cache the buffered audio
      this.preloadBuffer.set(bufferedAudio.id, bufferedAudio);

      // Update performance metrics
      this.updatePerformanceMetrics('bufferProcessingTime', performance.now() - startTime);

      console.log(
        `Audio buffered successfully: ${bufferedAudio.id}, duration: ${processedBuffer.duration.toFixed(2)}s, processing: ${(performance.now() - startTime).toFixed(1)}ms, streaming: ${bufferedAudio.metadata.streamingSegment}`
      );

      // If streaming segment, add to queue for sequential playback (Requirement 1.5)
      if (bufferedAudio.metadata.streamingSegment) {
        this.addToQueue(bufferedAudio);
      }

      return bufferedAudio;
    } catch (error) {
      console.error('Error buffering audio:', error);

      // Return fallback object for direct playback
      return {
        id: metadata.id || `fallback_${Date.now()}`,
        originalBlob: audioBlob,
        audioBuffer: null,
        metadata: {
          ...metadata,
          buffered: false,
          error: error.message,
          processingTime: performance.now() - startTime
        },
        processingInfo: {
          buffered: false,
          smoothed: false,
          fadingApplied: false,
          silencePadded: false
        }
      };
    }
  }

  /**
   * Optimized audio processing based on performance mode
   * @param {Blob} audioBlob - Audio blob
   * @param {Object} metadata - Metadata
   * @returns {Promise<AudioBuffer>} Processed audio buffer
   */
  async optimizedAudioProcessing(audioBlob, metadata) {
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Apply processing based on performance mode
    switch (this.performanceMode) {
      case 'fast':
        return audioBuffer; // No additional processing for speed

      case 'balanced':
        return await this.processAudioBufferBalanced(audioBuffer, metadata);

      case 'quality':
        return await this.processAudioBuffer(audioBuffer, metadata);

      default:
        return await this.processAudioBufferBalanced(audioBuffer, metadata);
    }
  }

  /**
   * Balanced audio processing for performance
   * @param {AudioBuffer} audioBuffer - Original audio buffer
   * @param {Object} metadata - Audio metadata
   * @returns {Promise<AudioBuffer>} Processed audio buffer
   */
  async processAudioBufferBalanced(audioBuffer, metadata = {}) {
    try {
      const { sampleRate, numberOfChannels } = audioBuffer;
      const originalLength = audioBuffer.length;

      const silencePaddingConfig = metadata?.silencePadding ?? this.silencePadding;
      const fadeInDurationConfig = metadata?.fadeInDuration ?? this.fadeInDuration;
      const fadeOutDurationConfig = metadata?.fadeOutDuration ?? this.fadeOutDuration;

      // Reduced padding for performance
      const silenceSamples = Math.floor(silencePaddingConfig * sampleRate);
      const fadeInSamples = Math.floor(fadeInDurationConfig * sampleRate);
      const fadeOutSamples = Math.floor(fadeOutDurationConfig * sampleRate);
      const newLength = originalLength + silenceSamples; // Only padding at end

      // Create new buffer
      const processedBuffer = this.audioContext.createBuffer(
        numberOfChannels,
        newLength,
        sampleRate
      );

      // Process each channel with optimized approach
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const processedData = processedBuffer.getChannelData(channel);

        // Copy original audio data with minimal processing
        for (let i = 0; i < originalLength; i++) {
          let sample = originalData[i];

          // Apply fade-in (first 10% of samples)
          if (i < fadeInSamples) {
            sample *= i / fadeInSamples;
          }

          // Apply fade-out (last 10% of samples)
          if (i >= originalLength - fadeOutSamples) {
            sample *= (originalLength - i) / fadeOutSamples;
          }

          processedData[i] = sample;
        }

        // Add minimal silence padding at the end
        for (let i = originalLength; i < newLength; i++) {
          processedData[i] = 0;
        }
      }

      return processedBuffer;
    } catch (error) {
      console.error('Error in balanced audio processing:', error);
      return audioBuffer; // Return original buffer as fallback
    }
  }

  /**
   * Make space for new buffer by removing oldest
   */
  async makeSpaceForNewBuffer() {
    const entries = Array.from(this.preloadBuffer.entries());
    entries.sort((a, b) => a[1].metadata.processedAt - b[1].metadata.processedAt);

    // Remove oldest buffer
    if (entries.length > 0) {
      const [oldestId] = entries[0];
      this.preloadBuffer.delete(oldestId);
      this.gainNodes.delete(oldestId);
      console.log(`Removed oldest buffer: ${oldestId}`);
    }
  }

  /**
   * Update performance metrics
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   */
  updatePerformanceMetrics(metric, value) {
    if (!this.performanceMetrics[metric]) {
      this.performanceMetrics[metric] = [];
    }

    this.performanceMetrics[metric].push(value);

    // Keep only last 100 measurements
    if (this.performanceMetrics[metric].length > 100) {
      this.performanceMetrics[metric].shift();
    }
  }

  /**
   * Set performance mode
   * @param {string} mode - Performance mode ('fast', 'balanced', 'quality')
   */
  setPerformanceMode(mode) {
    if (['fast', 'balanced', 'quality'].includes(mode)) {
      this.performanceMode = mode;
      console.log(`Performance mode set to: ${mode}`);
    }
  }

  /**
   * Process audio buffer with smoothing and effects
   * @param {AudioBuffer} audioBuffer - Original audio buffer
   * @param {Object} metadata - Audio metadata
   * @returns {Promise<AudioBuffer>} Processed audio buffer
   */
  async processAudioBuffer(audioBuffer, metadata = {}) {
    try {
      const { sampleRate, numberOfChannels } = audioBuffer;
      const originalLength = audioBuffer.length;

      const silencePaddingConfig = metadata?.silencePadding ?? this.silencePadding;
      const fadeInDurationConfig = metadata?.fadeInDuration ?? this.fadeInDuration;
      const fadeOutDurationConfig = metadata?.fadeOutDuration ?? this.fadeOutDuration;

      // Calculate new buffer length with padding
      const silenceSamples = Math.floor(silencePaddingConfig * sampleRate);
      const fadeInSamples = Math.floor(fadeInDurationConfig * sampleRate);
      const fadeOutSamples = Math.floor(fadeOutDurationConfig * sampleRate);
      const newLength = originalLength + silenceSamples * 2; // Padding at start and end

      // Create new buffer with padding
      const processedBuffer = this.audioContext.createBuffer(
        numberOfChannels,
        newLength,
        sampleRate
      );

      // Process each channel
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const processedData = processedBuffer.getChannelData(channel);

        // Add silence padding at the beginning
        for (let i = 0; i < silenceSamples; i++) {
          processedData[i] = 0;
        }

        // Copy original audio data with fade effects
        for (let i = 0; i < originalLength; i++) {
          let sample = originalData[i];
          const targetIndex = i + silenceSamples;

          // Apply fade-in
          if (i < fadeInSamples) {
            const fadeMultiplier = i / fadeInSamples;
            sample *= fadeMultiplier;
          }

          // Apply fade-out
          if (i >= originalLength - fadeOutSamples) {
            const fadeMultiplier = (originalLength - i) / fadeOutSamples;
            sample *= fadeMultiplier;
          }

          processedData[targetIndex] = sample;
        }

        // Add silence padding at the end
        for (let i = originalLength + silenceSamples; i < newLength; i++) {
          processedData[i] = 0;
        }
      }

      console.log(`Audio processed: ${originalLength} -> ${newLength} samples`);
      return processedBuffer;
    } catch (error) {
      console.error('Error processing audio buffer:', error);
      return audioBuffer; // Return original buffer as fallback
    }
  }

  /**
   * Play audio with smooth transitions and crossfading
   * @param {Object} bufferedAudio - Buffered audio data
   * @param {Object} options - Playback options
   * @returns {Promise<AudioBufferSourceNode>} Audio source node
   */
  async playWithSmoothing(bufferedAudio, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('AudioBufferManager not initialized');
      }

      const { volume = 1.0, startTime = 0, crossfadeFrom = null, onEnded = null } = options;

      console.log(`Playing buffered audio: ${bufferedAudio.id}`);

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = bufferedAudio.audioBuffer;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

      // Connect audio graph
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Store gain node for potential crossfading
      this.gainNodes.set(bufferedAudio.id, gainNode);

      // Handle crossfading from previous audio
      if (crossfadeFrom) {
        await this.applyCrossfade(crossfadeFrom, gainNode);
      }

      // Set up ended callback
      source.onended = () => {
        console.log(`Audio playback ended: ${bufferedAudio.id}`);
        this.gainNodes.delete(bufferedAudio.id);
        if (onEnded) {
          onEnded();
        }
      };

      // Start playback
      const playStartTime = this.audioContext.currentTime + startTime;
      source.start(playStartTime);

      console.log(`Audio playback started: ${bufferedAudio.id} at ${playStartTime}`);

      return source;
    } catch (error) {
      console.error('Error playing buffered audio:', error);
      throw error;
    }
  }

  /**
   * Apply crossfade between two audio sources
   * @param {AudioBufferSourceNode} fromSource - Source to fade out
   * @param {GainNode} toGainNode - Gain node to fade in
   */
  async applyCrossfade(fromSource, toGainNode) {
    try {
      const currentTime = this.audioContext.currentTime;
      const crossfadeDurationSec = this.crossfadeDuration / 1000;

      // Fade out the previous source
      if (fromSource && this.gainNodes.has(fromSource)) {
        const fromGainNode = this.gainNodes.get(fromSource);
        fromGainNode.gain.setValueAtTime(fromGainNode.gain.value, currentTime);
        fromGainNode.gain.linearRampToValueAtTime(0, currentTime + crossfadeDurationSec);

        // Stop the previous source after fade out
        setTimeout(() => {
          try {
            fromSource.stop();
          } catch (e) {
            // Source might already be stopped
          }
        }, this.crossfadeDuration);
      }

      // Fade in the new source
      toGainNode.gain.setValueAtTime(0, currentTime);
      toGainNode.gain.linearRampToValueAtTime(1, currentTime + crossfadeDurationSec);

      console.log(`Crossfade applied: ${crossfadeDurationSec}s duration`);
    } catch (error) {
      console.error('Error applying crossfade:', error);
    }
  }

  /**
   * Stop audio with fade out
   * @param {string} audioId - ID of audio to stop
   * @param {number} fadeOutTime - Fade out duration in ms
   */
  async stopWithFadeOut(audioId, fadeOutTime = 100) {
    try {
      const gainNode = this.gainNodes.get(audioId);
      if (!gainNode) {
        console.warn(`No gain node found for audio: ${audioId}`);
        return;
      }

      const currentTime = this.audioContext.currentTime;
      const fadeOutDurationSec = fadeOutTime / 1000;

      // Apply fade out
      gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDurationSec);

      console.log(`Fade out applied to audio: ${audioId}`);
    } catch (error) {
      console.error('Error stopping audio with fade out:', error);
    }
  }

  /**
   * Get buffered audio by ID
   * @param {string} audioId - Audio ID
   * @returns {Object|null} Buffered audio data
   */
  getBufferedAudio(audioId) {
    return this.preloadBuffer.get(audioId) || null;
  }

  /**
   * Clear audio buffer cache
   * @param {number} maxAge - Maximum age in ms (optional)
   */
  clearBuffer(maxAge = null) {
    try {
      const now = Date.now();
      let clearedCount = 0;

      for (const [id, bufferedAudio] of this.preloadBuffer.entries()) {
        const age = now - bufferedAudio.metadata.processedAt;

        if (!maxAge || age > maxAge) {
          this.preloadBuffer.delete(id);
          clearedCount++;
        }
      }

      console.log(`Cleared ${clearedCount} buffered audio items`);
    } catch (error) {
      console.error('Error clearing audio buffer:', error);
    }
  }

  /**
   * Get buffer statistics
   * @returns {Object} Buffer statistics
   */
  getBufferStats() {
    const stats = {
      totalBuffered: this.preloadBuffer.size,
      totalSize: 0,
      averageDuration: 0,
      oldestItem: null,
      newestItem: null
    };

    let totalDuration = 0;
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const [audioId, bufferedAudio] of this.preloadBuffer.entries()) {
      const size = bufferedAudio?.originalBlob?.size ?? 0;
      const duration = bufferedAudio?.metadata?.duration ?? 0;
      const processedAt = bufferedAudio?.metadata?.processedAt ?? 0;

      stats.totalSize += size;
      totalDuration += duration;

      if (processedAt && processedAt < oldestTime) {
        oldestTime = processedAt;
        stats.oldestItem = audioId;
      }

      if (processedAt && processedAt > newestTime) {
        newestTime = processedAt;
        stats.newestItem = audioId;
      }
    }

    stats.averageDuration = stats.totalBuffered > 0 ? totalDuration / stats.totalBuffered : 0;

    return stats;
  }

  /**
   * Add buffered audio to queue with priority sorting (Requirement 1.5)
   * @param {Object} bufferedAudio - Buffered audio to queue
   */
  addToQueue(bufferedAudio) {
    const segment = {
      audioBlob: bufferedAudio.originalBlob,
      audioBuffer: bufferedAudio.audioBuffer,
      metadata: bufferedAudio.metadata,
      priority: bufferedAudio.metadata.priority || 1,
      timestamp: bufferedAudio.metadata.timestamp,
      isStreamingSegment: bufferedAudio.metadata.streamingSegment || false
    };

    // Add to queue (Requirement 1.5)
    this.audioQueue.push(segment);

    // Sort by priority and timestamp to maintain order (Requirement 1.5)
    this.audioQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    console.log(
      `[AudioQueue] Segment added to queue, position: ${this.audioQueue.length}, priority: ${segment.priority}`
    );

    // Start playback immediately if not already playing (Requirement 1.3)
    if (!this.isPlaying) {
      this.playNextSegment();
    }
  }

  /**
   * Play next segment from queue with continuous animation (Requirement 3.2)
   * Maintains animation state across segments for streaming
   * Uses seamless transitions for smooth playback (Requirement 2.1)
   */
  async playNextSegment() {
    if (this.audioQueue.length === 0) {
      // No more segments - queue is complete
      this.isPlaying = false;
      console.log('[AudioQueue] Queue complete');

      // Update isSpeaking store - stop lip-sync animation
      isSpeaking.set(false);
      audioAmplitude.set(0);

      // Call onQueueComplete callback if set (Requirement 8.1)
      if (this.onQueueComplete) {
        this.onQueueComplete();
      }

      return;
    }

    const segment = this.audioQueue.shift();
    this.isPlaying = true;

    console.log(`[AudioQueue] Playing segment, ${this.audioQueue.length} remaining`);

    try {
      // Use seamless transition manager for smooth playback (Requirement 2.1)
      const audio = await this.transitionManager.playWithTransition(segment.audioBlob, {
        maintainState: segment.isStreamingSegment // Don't reset between streaming segments
      });

      // Store current audio source
      this.currentAudioSource = audio;

      // Update waiting phrase state if this is a waiting phrase
      if (segment.metadata?.isWaitingPhrase) {
        setWaitingPhraseActive(true);
        setWaitingPhraseLanguage(segment.metadata.language);
        console.log('[AudioQueue] Playing waiting phrase in language:', segment.metadata.language);
      } else {
        setWaitingPhraseActive(false);
        setWaitingPhraseLanguage(null);
      }

      // Update isSpeaking store for lip-sync animation
      isSpeaking.set(true);

      // Start audio amplitude analysis for lip-sync
      this.startAmplitudeAnalysis(audio);

      // Handle segment completion
      audio.onended = () => {
        // Stop amplitude analysis
        this.stopAmplitudeAnalysis();

        // Clear waiting phrase state when segment ends
        if (segment.metadata?.isWaitingPhrase) {
          setWaitingPhraseActive(false);
          setWaitingPhraseLanguage(null);
        }

        // Continue to next segment without resetting animation (Requirement 3.2)
        this.playNextSegment();
      };

      // Handle errors
      audio.onerror = (error) => {
        console.error('[AudioQueue] Playback error:', error);

        // Stop amplitude analysis
        this.stopAmplitudeAnalysis();

        // Continue to next segment on error
        this.playNextSegment();
      };

      console.log('[AudioQueue] Segment playback started with seamless transition');
    } catch (error) {
      console.error('[AudioQueue] Error playing segment:', error);

      // Continue to next segment on error
      this.playNextSegment();
    }
  }

  /**
   * Set callback for queue completion (Requirement 8.1)
   * @param {Function} callback - Callback function
   */
  setOnQueueComplete(callback) {
    this.onQueueComplete = callback;
  }

  /**
   * Get current queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.audioQueue.length,
      isPlaying: this.isPlaying,
      currentSegment: this.currentAudioSource
        ? {
            currentTime: this.currentAudioSource.currentTime,
            duration: this.currentAudioSource.duration
          }
        : null
    };
  }

  /**
   * Clear the audio queue
   */
  clearQueue() {
    // Stop amplitude analysis
    this.stopAmplitudeAnalysis();

    // Stop current playback via transition manager
    this.transitionManager.stop();

    // Stop current audio source if any
    if (this.currentAudioSource) {
      this.currentAudioSource.pause();
      this.currentAudioSource.currentTime = 0;
      this.currentAudioSource = null;
    }

    // Clear queue
    this.audioQueue = [];
    this.isPlaying = false;

    // Update stores
    isSpeaking.set(false);
    audioAmplitude.set(0);
    setWaitingPhraseActive(false);
    setWaitingPhraseLanguage(null);

    console.log('[AudioQueue] Queue cleared');
  }

  /**
   * Start amplitude analysis for lip-sync
   * @param {HTMLAudioElement} audio - Audio element
   */
  startAmplitudeAnalysis(audio) {
    // Stop any existing analysis
    this.stopAmplitudeAnalysis();

    // Don't create analyzer - it's already created by SeamlessAudioTransitionManager
    // Just monitor the audio element directly
    if (!audio) {
      return;
    }

    // Simple amplitude simulation based on audio playback
    const analyze = () => {
      if (!audio || audio.paused || audio.ended) {
        audioAmplitude.set(0);
        return;
      }

      // Simulate amplitude based on playback position
      // This is a simple approximation - real amplitude would need Web Audio API
      const progress = audio.currentTime / audio.duration;
      const amplitude = Math.sin(progress * Math.PI * 10) * 0.5 + 0.5; // Oscillate between 0 and 1

      audioAmplitude.set(amplitude * 0.7); // Scale down a bit
      this.amplitudeAnalysisFrame = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Stop amplitude analysis
   */
  stopAmplitudeAnalysis() {
    if (this.amplitudeAnalysisFrame) {
      cancelAnimationFrame(this.amplitudeAnalysisFrame);
      this.amplitudeAnalysisFrame = null;
    }

    this.currentAnalyser = null;
    this.currentAnalyserData = null;
    audioAmplitude.set(0);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      // Stop all active audio sources
      for (const gainNode of this.gainNodes.values()) {
        try {
          gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }

      // Clear queue
      this.clearQueue();

      // Clear all buffers and caches
      this.preloadBuffer.clear();
      this.gainNodes.clear();

      this.isInitialized = false;

      console.log('AudioBufferManager cleaned up');
    } catch (error) {
      console.error('Error during AudioBufferManager cleanup:', error);
    }
  }
}

// Export singleton instance
export const audioBufferManager = new AudioBufferManager();
