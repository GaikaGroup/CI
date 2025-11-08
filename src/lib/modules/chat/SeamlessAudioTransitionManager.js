/**
 * SeamlessAudioTransitionManager
 *
 * Manages smooth audio transitions between streaming segments using crossfading
 * and audio pre-loading to eliminate gaps and clicks between segments.
 *
 * Requirements: 2.1 - Seamless audio transitions without audible gaps or clicks
 */

export class SeamlessAudioTransitionManager {
  constructor(options = {}) {
    this.currentAudio = null;
    this.nextAudio = null;
    this.crossfadeDuration = options.crossfadeDuration || 50; // 50ms default crossfade
    this.isTransitioning = false;
  }

  /**
   * Play audio with seamless transition from previous segment
   * @param {Blob} audioBlob - Audio blob to play
   * @param {Object} options - Playback options
   * @returns {Promise<HTMLAudioElement>} Audio element
   */
  async playWithTransition(audioBlob, options = {}) {
    const audio = new Audio(URL.createObjectURL(audioBlob));

    // Pre-load audio to ensure it's ready (Requirement 2.1)
    await this.preloadAudio(audio);

    if (this.currentAudio && !this.currentAudio.paused) {
      // Crossfade from current to next (Requirement 2.1)
      await this.crossfade(this.currentAudio, audio);
    } else {
      // First segment - just play
      audio.volume = 1.0;
      await audio.play();
    }

    this.currentAudio = audio;
    return audio;
  }

  /**
   * Pre-load audio to ensure smooth playback
   * @param {HTMLAudioElement} audio - Audio element to pre-load
   * @returns {Promise<void>}
   */
  async preloadAudio(audio) {
    return new Promise((resolve, reject) => {
      // Set up event listeners
      const onCanPlay = () => {
        cleanup();
        resolve();
      };

      const onError = (error) => {
        cleanup();
        reject(new Error(`Audio preload failed: ${error.message || 'Unknown error'}`));
      };

      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });

      // Start loading
      audio.load();

      // Timeout after 5 seconds
      setTimeout(() => {
        cleanup();
        reject(new Error('Audio preload timeout'));
      }, 5000);
    });
  }

  /**
   * Crossfade between two audio segments
   * @param {HTMLAudioElement} fromAudio - Current audio to fade out
   * @param {HTMLAudioElement} toAudio - Next audio to fade in
   * @returns {Promise<void>}
   */
  async crossfade(fromAudio, toAudio) {
    if (this.isTransitioning) {
      // Already transitioning, skip crossfade
      return;
    }

    this.isTransitioning = true;

    try {
      const steps = 10;
      const stepDuration = this.crossfadeDuration / steps;

      // Start next audio at zero volume
      toAudio.volume = 0;
      await toAudio.play();

      // Perform volume ramping (Requirement 2.1)
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;

        // Fade out current audio
        fromAudio.volume = Math.max(0, 1 - progress);

        // Fade in next audio
        toAudio.volume = Math.min(1, progress);

        // Wait for next step
        if (i < steps) {
          await new Promise((resolve) => setTimeout(resolve, stepDuration));
        }
      }

      // Ensure final volumes are correct
      fromAudio.volume = 0;
      toAudio.volume = 1;

      // Stop and cleanup previous audio
      fromAudio.pause();
      fromAudio.currentTime = 0;

      // Revoke object URL to free memory
      if (fromAudio.src && fromAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(fromAudio.src);
      }
    } catch (error) {
      console.error('[SeamlessAudioTransition] Crossfade error:', error);

      // Fallback: just play the new audio
      toAudio.volume = 1;
      if (toAudio.paused) {
        await toAudio.play();
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Stop current audio playback
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;

      // Revoke object URL
      if (this.currentAudio.src && this.currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentAudio.src);
      }

      this.currentAudio = null;
    }

    this.isTransitioning = false;
  }

  /**
   * Get current playback status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isPlaying: this.currentAudio && !this.currentAudio.paused,
      isTransitioning: this.isTransitioning,
      currentTime: this.currentAudio?.currentTime || 0,
      duration: this.currentAudio?.duration || 0
    };
  }

  /**
   * Set crossfade duration
   * @param {number} duration - Duration in milliseconds
   */
  setCrossfadeDuration(duration) {
    this.crossfadeDuration = Math.max(0, Math.min(1000, duration)); // Clamp between 0-1000ms
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stop();
    this.nextAudio = null;
  }
}
