/**
 * Interruption Detector
 * Detects when users want to interrupt the bot during speech
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { languageDetector } from './LanguageDetector.js';

export class InterruptionDetector {
  constructor() {
    this.isListening = false;
    this.speechThreshold = 0.08; // Optimized amplitude threshold
    this.interruptionTimeout = 400; // Reduced for faster response
    this.backgroundNoiseLevel = 0.02; // Background noise threshold

    // Audio processing
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.dataArray = null;
    this.sourceNode = null;

    // Optimized Voice Activity Detection (VAD) parameters
    this.vadBuffer = [];
    this.vadBufferSize = 8; // Reduced for faster detection
    this.vadThreshold = 0.12; // Lowered for better sensitivity
    this.vadConsecutiveFrames = 2; // Reduced for quicker response

    // Adaptive sensitivity settings
    this.adaptiveSensitivity = {
      enabled: true,
      baseThreshold: 0.12,
      currentThreshold: 0.12,
      adaptationRate: 0.1,
      minThreshold: 0.08,
      maxThreshold: 0.25,
      recentFalsePositives: 0,
      recentMissedDetections: 0
    };

    // Performance optimization
    this.detectionOptimization = {
      skipFrames: 0, // Skip frames for performance
      frameSkipCount: 0,
      maxSkipFrames: 2,
      fastMode: false
    };

    // Interruption detection state
    this.interruptionCallbacks = [];
    this.lastInterruptionTime = 0;
    this.interruptionCooldown = 1000; // ms between interruptions
    this.detectionActive = false;

    // Audio analysis
    this.analysisFrame = null;
    this.energyHistory = [];
    this.energyHistorySize = 20;

    console.log('InterruptionDetector initialized');
  }

  /**
   * Initialize the interruption detector
   * @param {AudioContext} audioContext - Web Audio API context
   * @returns {Promise<void>}
   */
  async initialize(audioContext) {
    try {
      this.audioContext = audioContext;

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      // Create audio analysis chain
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();

      // Configure analyser for voice detection
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Connect audio chain
      this.sourceNode.connect(this.analyser);

      // Initialize data array
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Calibrate background noise
      await this.calibrateBackgroundNoise();

      console.log('InterruptionDetector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize InterruptionDetector:', error);
      throw error;
    }
  }

  /**
   * Calibrate background noise level
   * @returns {Promise<void>}
   */
  async calibrateBackgroundNoise() {
    console.log('Calibrating background noise level...');

    const samples = [];
    const sampleCount = 30; // 30 samples over 1.5 seconds

    for (let i = 0; i < sampleCount; i++) {
      const energy = this.getAudioEnergy();
      samples.push(energy);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Calculate average and set threshold above background noise
    const avgNoise = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    this.backgroundNoiseLevel = Math.max(0.02, avgNoise * 1.5);
    this.vadThreshold = Math.max(0.15, avgNoise * 3);

    console.log(
      `Background noise calibrated: ${this.backgroundNoiseLevel.toFixed(3)}, VAD threshold: ${this.vadThreshold.toFixed(3)}`
    );
  }

  /**
   * Start listening for interruptions
   */
  startListening() {
    if (!this.audioContext || !this.analyser) {
      console.error('InterruptionDetector not initialized');
      return;
    }

    if (this.isListening) {
      console.log('Already listening for interruptions');
      return;
    }

    this.isListening = true;
    this.detectionActive = true;
    this.vadBuffer = [];
    this.energyHistory = [];

    console.log('Started listening for interruptions');
    this.startAudioAnalysis();
  }

  /**
   * Stop listening for interruptions
   */
  stopListening() {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.detectionActive = false;

    if (this.analysisFrame) {
      cancelAnimationFrame(this.analysisFrame);
      this.analysisFrame = null;
    }

    console.log('Stopped listening for interruptions');
  }

  /**
   * Start audio analysis loop
   */
  startAudioAnalysis() {
    const analyze = () => {
      if (!this.isListening || !this.detectionActive) {
        return;
      }

      try {
        // Get current audio energy
        const energy = this.getAudioEnergy();

        // Add to energy history
        this.energyHistory.push(energy);
        if (this.energyHistory.length > this.energyHistorySize) {
          this.energyHistory.shift();
        }

        // Perform voice activity detection
        const isVoiceDetected = this.detectVoiceActivity(energy);

        if (isVoiceDetected) {
          this.handlePotentialInterruption(energy);
        }

        // Continue analysis
        this.analysisFrame = requestAnimationFrame(analyze);
      } catch (error) {
        console.error('Error in audio analysis:', error);
        this.stopListening();
      }
    };

    analyze();
  }

  /**
   * Get current audio energy level
   * @returns {number} Energy level (0-1)
   */
  getAudioEnergy() {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate RMS energy focusing on speech frequencies (300-3400 Hz)
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;
    const startBin = Math.floor(300 / binSize);
    const endBin = Math.floor(3400 / binSize);

    let sum = 0;
    let count = 0;

    for (let i = startBin; i < Math.min(endBin, this.dataArray.length); i++) {
      sum += this.dataArray[i] * this.dataArray[i];
      count++;
    }

    if (count === 0) return 0;

    const rms = Math.sqrt(sum / count) / 255; // Normalize to 0-1
    return rms;
  }

  /**
   * Optimized voice activity detection with adaptive sensitivity
   * @param {number} energy - Current energy level
   * @returns {boolean} True if voice activity detected
   */
  detectVoiceActivity(energy) {
    // Performance optimization - skip frames if in fast mode
    if (this.detectionOptimization.fastMode) {
      this.detectionOptimization.frameSkipCount++;
      if (this.detectionOptimization.frameSkipCount <= this.detectionOptimization.maxSkipFrames) {
        return false; // Skip this frame
      }
      this.detectionOptimization.frameSkipCount = 0;
    }

    // Add to VAD buffer
    this.vadBuffer.push(energy);
    if (this.vadBuffer.length > this.vadBufferSize) {
      this.vadBuffer.shift();
    }

    // Need enough samples for analysis
    if (this.vadBuffer.length < this.vadConsecutiveFrames) {
      return false;
    }

    // Use adaptive threshold
    const currentThreshold = this.adaptiveSensitivity.enabled
      ? this.adaptiveSensitivity.currentThreshold
      : this.vadThreshold;

    // Quick energy check with background noise consideration
    const adjustedBackgroundLevel = this.backgroundNoiseLevel * 1.5; // Add margin
    if (energy < adjustedBackgroundLevel) {
      return false;
    }

    // Optimized threshold checking
    const recentSamples = this.vadBuffer.slice(-this.vadConsecutiveFrames);
    const aboveThreshold = recentSamples.filter((sample) => sample > currentThreshold).length;

    if (aboveThreshold < this.vadConsecutiveFrames) {
      return false;
    }

    // Enhanced energy pattern analysis
    const energyVariance = this.calculateEnergyVariance(recentSamples);
    const isConsistentEnergy = energyVariance < 0.05; // Low variance indicates consistent speech

    // Skip expensive spectral analysis in fast mode or if energy is very high
    if (this.detectionOptimization.fastMode || energy > currentThreshold * 2) {
      return isConsistentEnergy;
    }

    // Full spectral analysis for borderline cases
    const hasVoiceCharacteristics = this.analyzeVoiceCharacteristics();

    return hasVoiceCharacteristics && isConsistentEnergy;
  }

  /**
   * Calculate energy variance for consistency check
   * @param {Array<number>} samples - Energy samples
   * @returns {number} Variance value
   */
  calculateEnergyVariance(samples) {
    if (samples.length < 2) return 0;

    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const squaredDiffs = samples.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / samples.length;
  }

  /**
   * Optimized voice characteristics analysis
   * @returns {boolean} True if voice characteristics detected
   */
  analyzeVoiceCharacteristics() {
    if (!this.analyser || !this.dataArray) {
      return true; // Assume voice if we can't analyze
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Quick frequency analysis - focus on speech range
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;

    // Optimized frequency bands
    const speechBand = this.getEnergyInBand(300, 3000, binSize); // Core speech range
    const noiseBand = this.getEnergyInBand(50, 200, binSize); // Low frequency noise
    const highBand = this.getEnergyInBand(4000, 8000, binSize); // High frequency

    const totalEnergy = speechBand + noiseBand + highBand;
    if (totalEnergy < 0.05) return false;

    const speechRatio = speechBand / totalEnergy;
    const noiseRatio = noiseBand / totalEnergy;

    // Optimized voice detection criteria
    return speechRatio > 0.4 && speechRatio < 0.85 && noiseRatio < 0.3;
  }

  /**
   * Analyze audio for voice characteristics
   * @returns {boolean} True if voice characteristics detected
   */
  analyzeVoiceCharacteristics() {
    if (!this.analyser || !this.dataArray) {
      return false;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Analyze frequency distribution for speech patterns
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;

    // Define frequency bands for speech analysis
    const fundamentalBand = this.getEnergyInBand(80, 300, binSize); // Fundamental frequency
    const formantBand = this.getEnergyInBand(300, 3400, binSize); // Formant frequencies
    const highBand = this.getEnergyInBand(3400, 8000, binSize); // High frequencies

    // Voice characteristics:
    // 1. Strong formant energy
    // 2. Moderate fundamental energy
    // 3. Lower high-frequency energy (compared to noise)

    const totalEnergy = fundamentalBand + formantBand + highBand;
    if (totalEnergy < 0.1) return false;

    const formantRatio = formantBand / totalEnergy;
    const highRatio = highBand / totalEnergy;

    // Voice typically has strong formant energy (40-70%) and lower high-frequency content
    return formantRatio > 0.4 && formantRatio < 0.8 && highRatio < 0.4;
  }

  /**
   * Get energy in a specific frequency band
   * @param {number} startFreq - Start frequency in Hz
   * @param {number} endFreq - End frequency in Hz
   * @param {number} binSize - Frequency bin size
   * @returns {number} Energy in the band
   */
  getEnergyInBand(startFreq, endFreq, binSize) {
    const startBin = Math.floor(startFreq / binSize);
    const endBin = Math.floor(endFreq / binSize);

    let sum = 0;
    let count = 0;

    for (let i = startBin; i < Math.min(endBin, this.dataArray.length); i++) {
      sum += this.dataArray[i];
      count++;
    }

    return count > 0 ? sum / count / 255 : 0;
  }

  /**
   * Handle potential interruption detection
   * @param {number} energy - Current energy level
   */
  async handlePotentialInterruption(energy) {
    const now = Date.now();

    // Check cooldown period
    if (now - this.lastInterruptionTime < this.interruptionCooldown) {
      return;
    }

    // Confirm interruption with sustained voice activity
    const isConfirmed = await this.confirmInterruption(energy);

    if (isConfirmed) {
      this.lastInterruptionTime = now;
      await this.triggerInterruption(energy);
    }
  }

  /**
   * Confirm interruption with sustained analysis
   * @param {number} initialEnergy - Initial energy level
   * @returns {Promise<boolean>} True if interruption confirmed
   */
  async confirmInterruption(initialEnergy) {
    return new Promise((resolve) => {
      let confirmationSamples = 0;
      const requiredSamples = 5; // Need 5 consecutive samples
      let sampleCount = 0;
      const maxSamples = 10; // Maximum samples to check

      const checkSample = () => {
        if (sampleCount >= maxSamples) {
          resolve(false);
          return;
        }

        const energy = this.getAudioEnergy();
        sampleCount++;

        if (energy > this.vadThreshold && this.analyzeVoiceCharacteristics()) {
          confirmationSamples++;
          if (confirmationSamples >= requiredSamples) {
            resolve(true);
            return;
          }
        } else {
          confirmationSamples = 0; // Reset if voice stops
        }

        setTimeout(checkSample, 50); // Check every 50ms
      };

      checkSample();
    });
  }

  /**
   * Trigger interruption event
   * @param {number} energy - Energy level at interruption
   */
  async triggerInterruption(energy) {
    try {
      console.log(`Interruption detected! Energy: ${energy.toFixed(3)}`);

      // Capture audio buffer for language detection
      const audioBuffer = await this.captureAudioBuffer();

      // Detect language from the interruption
      const languageDetection = await this.detectInterruptionLanguage(audioBuffer, energy);

      // Create interruption event
      const interruptionEvent = {
        timestamp: Date.now(),
        energy: energy,
        audioBuffer: audioBuffer,
        confidence: this.calculateConfidence(energy),
        backgroundNoise: this.backgroundNoiseLevel,
        vadThreshold: this.vadThreshold,
        detectedLanguage: languageDetection.language,
        languageConfidence: languageDetection.confidence,
        languageScores: languageDetection.scores
      };

      console.log(
        `Language detected in interruption: ${languageDetection.language} (confidence: ${languageDetection.confidence})`
      );

      // Notify all callbacks
      this.interruptionCallbacks.forEach((callback) => {
        try {
          callback(interruptionEvent);
        } catch (error) {
          console.error('Error in interruption callback:', error);
        }
      });
    } catch (error) {
      console.error('Error triggering interruption:', error);
    }
  }

  /**
   * Detect language from interruption audio
   * @param {ArrayBuffer} audioBuffer - Audio buffer
   * @param {number} energy - Energy level
   * @returns {Promise<Object>} Language detection result
   */
  async detectInterruptionLanguage(audioBuffer, energy) {
    try {
      // Prepare audio metrics for language detection
      const audioMetrics = {
        energy: energy,
        backgroundNoise: this.backgroundNoiseLevel,
        vadThreshold: this.vadThreshold,
        energyHistory: [...this.energyHistory]
      };

      // Use language detector
      const detection = await languageDetector.detectLanguage(audioBuffer, audioMetrics);

      return detection;
    } catch (error) {
      console.error('Error detecting language from interruption:', error);

      // Return fallback language
      return languageDetector.getFallbackLanguage();
    }
  }

  /**
   * Capture audio buffer for analysis
   * @returns {Promise<ArrayBuffer>} Audio buffer
   */
  async captureAudioBuffer() {
    // For now, return a placeholder
    // In a full implementation, this would capture recent audio
    return new ArrayBuffer(0);
  }

  /**
   * Calculate confidence level for interruption
   * @param {number} energy - Energy level
   * @returns {number} Confidence (0-1)
   */
  calculateConfidence(energy) {
    // Base confidence on energy level relative to thresholds
    const energyRatio = energy / this.vadThreshold;
    const baseConfidence = Math.min(1, energyRatio / 2);

    // Adjust based on recent energy history
    if (this.energyHistory.length > 5) {
      const recentAvg = this.energyHistory.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
      const consistencyBonus = recentAvg > this.vadThreshold ? 0.2 : 0;
      return Math.min(1, baseConfidence + consistencyBonus);
    }

    return baseConfidence;
  }

  /**
   * Register callback for interruption events
   * @param {Function} callback - Callback function
   */
  onInterruption(callback) {
    if (typeof callback === 'function') {
      this.interruptionCallbacks.push(callback);
    }
  }

  /**
   * Unregister interruption callback
   * @param {Function} callback - Callback function
   */
  offInterruption(callback) {
    const index = this.interruptionCallbacks.indexOf(callback);
    if (index > -1) {
      this.interruptionCallbacks.splice(index, 1);
    }
  }

  /**
   * Update detection sensitivity with adaptive learning
   * @param {Object} settings - Sensitivity settings
   */
  updateSensitivity(settings) {
    if (settings.speechThreshold !== undefined) {
      this.speechThreshold = Math.max(0.05, Math.min(0.5, settings.speechThreshold));
    }

    if (settings.vadThreshold !== undefined) {
      this.vadThreshold = Math.max(0.08, Math.min(0.8, settings.vadThreshold));
      this.adaptiveSensitivity.currentThreshold = this.vadThreshold;
    }

    if (settings.interruptionTimeout !== undefined) {
      this.interruptionTimeout = Math.max(100, Math.min(2000, settings.interruptionTimeout));
    }

    if (settings.adaptiveSensitivity !== undefined) {
      this.adaptiveSensitivity.enabled = settings.adaptiveSensitivity;
    }

    console.log(
      `Updated sensitivity: speech=${this.speechThreshold}, vad=${this.vadThreshold}, timeout=${this.interruptionTimeout}, adaptive=${this.adaptiveSensitivity.enabled}`
    );
  }

  /**
   * Adapt sensitivity based on detection performance
   * @param {boolean} wasCorrectDetection - Whether the detection was correct
   * @param {boolean} wasFalsePositive - Whether it was a false positive
   */
  adaptSensitivity(wasCorrectDetection, wasFalsePositive = false) {
    if (!this.adaptiveSensitivity.enabled) return;

    const adaptation = this.adaptiveSensitivity;

    if (wasFalsePositive) {
      adaptation.recentFalsePositives++;
      // Increase threshold to reduce false positives
      adaptation.currentThreshold = Math.min(
        adaptation.maxThreshold,
        adaptation.currentThreshold + adaptation.adaptationRate * 0.5
      );
      console.log(
        `Adapted threshold up due to false positive: ${adaptation.currentThreshold.toFixed(3)}`
      );
    } else if (!wasCorrectDetection) {
      adaptation.recentMissedDetections++;
      // Decrease threshold to catch more interruptions
      adaptation.currentThreshold = Math.max(
        adaptation.minThreshold,
        adaptation.currentThreshold - adaptation.adaptationRate * 0.3
      );
      console.log(
        `Adapted threshold down due to missed detection: ${adaptation.currentThreshold.toFixed(3)}`
      );
    } else {
      // Correct detection - gradually return to base threshold
      const targetThreshold = adaptation.baseThreshold;
      const diff = targetThreshold - adaptation.currentThreshold;
      adaptation.currentThreshold += diff * 0.1; // Slow convergence
    }

    // Update the actual VAD threshold
    this.vadThreshold = adaptation.currentThreshold;

    // Reset counters periodically
    if (adaptation.recentFalsePositives > 10 || adaptation.recentMissedDetections > 10) {
      adaptation.recentFalsePositives = Math.max(0, adaptation.recentFalsePositives - 5);
      adaptation.recentMissedDetections = Math.max(0, adaptation.recentMissedDetections - 5);
    }
  }

  /**
   * Enable fast detection mode for better performance
   * @param {boolean} enabled - Whether to enable fast mode
   */
  setFastMode(enabled) {
    this.detectionOptimization.fastMode = enabled;

    if (enabled) {
      // Optimize for speed
      this.detectionOptimization.maxSkipFrames = 3;
      this.vadConsecutiveFrames = 1;
      this.vadBufferSize = 5;
    } else {
      // Optimize for accuracy
      this.detectionOptimization.maxSkipFrames = 1;
      this.vadConsecutiveFrames = 2;
      this.vadBufferSize = 8;
    }

    console.log(`Fast detection mode: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get optimal sensitivity settings based on environment
   * @param {Object} environment - Environment characteristics
   * @returns {Object} Recommended settings
   */
  getOptimalSettings(environment = {}) {
    const {
      noiseLevel = 'medium',
      userSpeechPattern = 'normal',
      deviceType = 'desktop',
      networkLatency = 'low'
    } = environment;

    let settings = {
      speechThreshold: 0.08,
      vadThreshold: 0.12,
      interruptionTimeout: 400,
      adaptiveSensitivity: true
    };

    // Adjust for noise level
    switch (noiseLevel) {
      case 'low':
        settings.vadThreshold = 0.1;
        settings.speechThreshold = 0.06;
        break;
      case 'high':
        settings.vadThreshold = 0.18;
        settings.speechThreshold = 0.12;
        break;
    }

    // Adjust for user speech pattern
    switch (userSpeechPattern) {
      case 'quiet':
        settings.vadThreshold *= 0.8;
        settings.speechThreshold *= 0.8;
        break;
      case 'loud':
        settings.vadThreshold *= 1.2;
        settings.speechThreshold *= 1.2;
        break;
    }

    // Adjust for device type
    if (deviceType === 'mobile') {
      settings.interruptionTimeout += 100; // Account for touch latency
      this.setFastMode(true); // Enable fast mode for mobile
    }

    // Adjust for network latency
    if (networkLatency === 'high') {
      settings.interruptionTimeout += 200;
    }

    return settings;
  }

  /**
   * Get detection statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      isListening: this.isListening,
      detectionActive: this.detectionActive,
      backgroundNoise: this.backgroundNoiseLevel,
      vadThreshold: this.vadThreshold,
      speechThreshold: this.speechThreshold,
      energyHistory: [...this.energyHistory],
      lastInterruption: this.lastInterruptionTime,
      callbackCount: this.interruptionCallbacks.length
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      this.stopListening();

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      this.analyser = null;
      this.dataArray = null;
      this.interruptionCallbacks = [];

      console.log('InterruptionDetector cleaned up');
    } catch (error) {
      console.error('Error cleaning up InterruptionDetector:', error);
    }
  }
}

// Export singleton instance
export const interruptionDetector = new InterruptionDetector();
