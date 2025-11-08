/**
 * StreamingPerformanceMonitor
 *
 * Tracks and analyzes performance metrics for streaming voice responses.
 * Monitors TTFA (Time to First Audio), synthesis times, error rates, and other
 * key performance indicators to ensure the system meets latency reduction goals.
 *
 * Requirements: 7.1, 7.2, 7.5 - Comprehensive monitoring and metrics tracking
 */

export class StreamingPerformanceMonitor {
  constructor() {
    this.sessions = [];
    this.currentSession = null;
  }

  /**
   * Start a new monitoring session
   * @param {string} sessionId - Unique session identifier
   * @param {Object} context - Additional context (language, user, etc.)
   */
  startSession(sessionId, context = {}) {
    this.currentSession = {
      sessionId,
      startTime: Date.now(),
      context,

      // Timing metrics
      firstChunkArrival: null,
      firstSentenceDetected: null,
      firstAudioReady: null,
      firstAudioPlaying: null,
      endTime: null,

      // Processing metrics
      chunks: [],
      sentences: [],
      errors: [],
      audioGaps: [],

      // Counters
      totalChunks: 0,
      totalSentences: 0,
      totalErrors: 0,
      failedSyntheses: 0,

      // Buffer metrics
      peakBufferSize: 0,
      maxQueueLength: 0
    };

    console.log('[StreamingPerformance] Session started', {
      sessionId,
      timestamp: new Date().toISOString(),
      context
    });
  }

  /**
   * Record a received chunk
   * @param {string} chunk - Text chunk received
   * @param {Object} metadata - Additional metadata
   */
  recordChunk(chunk, metadata = {}) {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session');
      return;
    }

    const timestamp = Date.now();
    const chunkData = {
      timestamp,
      size: chunk.length,
      processingTime: metadata.processingTime || 0,
      bufferSize: metadata.bufferSize || 0
    };

    this.currentSession.chunks.push(chunkData);
    this.currentSession.totalChunks++;

    // Record first chunk arrival (Requirement 7.1)
    if (this.currentSession.firstChunkArrival === null) {
      this.currentSession.firstChunkArrival = timestamp - this.currentSession.startTime;
      console.log('[StreamingPerformance] First chunk arrived', {
        timeFromStart: this.currentSession.firstChunkArrival,
        chunkSize: chunk.length
      });
    }

    // Track peak buffer size
    if (metadata.bufferSize > this.currentSession.peakBufferSize) {
      this.currentSession.peakBufferSize = metadata.bufferSize;
    }

    console.log('[StreamingPerformance] Chunk recorded', {
      chunkNumber: this.currentSession.totalChunks,
      size: chunk.length,
      bufferSize: metadata.bufferSize,
      processingTime: metadata.processingTime
    });
  }

  /**
   * Record a detected sentence
   * @param {string} sentence - Detected sentence text
   * @param {Object} metadata - Additional metadata
   */
  recordSentence(sentence, metadata = {}) {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session');
      return;
    }

    const timestamp = Date.now();
    const sentenceData = {
      timestamp,
      text: sentence.substring(0, 100), // Store first 100 chars
      synthesisTime: metadata.synthesisTime || 0,
      queuePosition: metadata.queuePosition || 0,
      status: metadata.status || 'pending'
    };

    this.currentSession.sentences.push(sentenceData);
    this.currentSession.totalSentences++;

    // Record first sentence detection (Requirement 7.2)
    if (this.currentSession.firstSentenceDetected === null) {
      this.currentSession.firstSentenceDetected = timestamp - this.currentSession.startTime;
      console.log('[StreamingPerformance] First sentence detected', {
        timeFromStart: this.currentSession.firstSentenceDetected,
        text: sentence.substring(0, 50)
      });
    }

    // Track max queue length
    if (metadata.queuePosition > this.currentSession.maxQueueLength) {
      this.currentSession.maxQueueLength = metadata.queuePosition;
    }

    console.log('[StreamingPerformance] Sentence recorded', {
      sentenceNumber: this.currentSession.totalSentences,
      text: sentence.substring(0, 50),
      synthesisTime: metadata.synthesisTime,
      queuePosition: metadata.queuePosition
    });
  }

  /**
   * Record audio ready event
   * @param {Object} audioData - Audio data and metadata
   */
  recordAudioReady(audioData) {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session');
      return;
    }

    const timestamp = Date.now();

    // Record first audio ready (Requirement 7.2)
    if (this.currentSession.firstAudioReady === null) {
      this.currentSession.firstAudioReady = timestamp - this.currentSession.startTime;
      console.log('[StreamingPerformance] First audio ready', {
        timeFromStart: this.currentSession.firstAudioReady,
        synthesisTime: audioData.synthesisTime
      });
    }
  }

  /**
   * Record audio playback start
   * @param {Object} playbackData - Playback data and metadata
   */
  recordAudioPlayback(playbackData) {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session');
      return;
    }

    const timestamp = Date.now();

    // Record first audio playback - this is TTFA! (Requirement 7.1, 7.5)
    if (this.currentSession.firstAudioPlaying === null) {
      this.currentSession.firstAudioPlaying = timestamp - this.currentSession.startTime;
      console.log('[StreamingPerformance] First audio playing (TTFA)', {
        ttfa: this.currentSession.firstAudioPlaying,
        target: '2000-3000ms',
        achieved: this.currentSession.firstAudioPlaying <= 3000
      });
    }
  }

  /**
   * Record an audio gap
   * @param {number} gapDuration - Duration of the gap in milliseconds
   * @param {Object} context - Additional context
   */
  recordAudioGap(gapDuration, context = {}) {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session');
      return;
    }

    const gapData = {
      timestamp: Date.now(),
      duration: gapDuration,
      context
    };

    this.currentSession.audioGaps.push(gapData);

    console.warn('[StreamingPerformance] Audio gap detected', {
      duration: gapDuration,
      context
    });
  }

  /**
   * Record an error
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  recordError(error, context = {}) {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session');
      return;
    }

    const errorData = {
      timestamp: Date.now(),
      message: error.message,
      type: error.name,
      context,
      stack: error.stack
    };

    this.currentSession.errors.push(errorData);
    this.currentSession.totalErrors++;

    if (context.failurePoint === 'synthesis') {
      this.currentSession.failedSyntheses++;
    }

    console.error('[StreamingPerformance] Error recorded', {
      errorType: error.name,
      message: error.message,
      context
    });
  }

  /**
   * End the current session and calculate final metrics
   * @returns {Object} Session summary with calculated metrics
   */
  endSession() {
    if (!this.currentSession) {
      console.warn('[StreamingPerformance] No active session to end');
      return null;
    }

    const session = this.currentSession;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Calculate metrics (Requirement 7.5)
    const metrics = this.calculateMetrics(session);

    // Log summary (Requirement 7.5)
    console.log('[StreamingPerformance] Session complete', {
      sessionId: session.sessionId,
      duration: session.duration,
      ttfa: metrics.ttfa,
      totalSentences: session.totalSentences,
      totalChunks: session.totalChunks,
      avgSynthesisTime: metrics.avgSynthesisTime,
      errorRate: metrics.errorRate,
      audioGaps: session.audioGaps.length,
      timestamp: new Date().toISOString()
    });

    // Store session
    this.sessions.push(session);
    this.currentSession = null;

    return {
      sessionId: session.sessionId,
      metrics,
      summary: this.generateSummary(session)
    };
  }

  /**
   * Calculate metrics from session data
   * @param {Object} session - Session data
   * @returns {Object} Calculated metrics
   */
  calculateMetrics(session) {
    const totalSynthesisTime = session.sentences.reduce(
      (sum, s) => sum + (s.synthesisTime || 0),
      0
    );

    const avgSynthesisTime =
      session.totalSentences > 0 ? totalSynthesisTime / session.totalSentences : 0;

    const avgChunkSize =
      session.totalChunks > 0
        ? session.chunks.reduce((sum, c) => sum + c.size, 0) / session.totalChunks
        : 0;

    const avgProcessingTime =
      session.totalChunks > 0
        ? session.chunks.reduce((sum, c) => sum + (c.processingTime || 0), 0) / session.totalChunks
        : 0;

    const errorRate =
      session.totalSentences > 0 ? (session.failedSyntheses / session.totalSentences) * 100 : 0;

    return {
      // Primary metric (Requirement 7.5)
      ttfa: session.firstAudioPlaying || 0,

      // Timing breakdown
      firstChunkArrival: session.firstChunkArrival || 0,
      firstSentenceDetected: session.firstSentenceDetected || 0,
      firstAudioReady: session.firstAudioReady || 0,
      firstAudioPlaying: session.firstAudioPlaying || 0,

      // Processing metrics (Requirement 7.2)
      totalDuration: session.duration,
      totalChunks: session.totalChunks,
      totalSentences: session.totalSentences,
      avgChunkSize,
      avgProcessingTime,
      avgSynthesisTime,

      // Buffer metrics
      peakBufferSize: session.peakBufferSize,
      maxQueueLength: session.maxQueueLength,

      // Error metrics (Requirement 7.3)
      totalErrors: session.totalErrors,
      failedSyntheses: session.failedSyntheses,
      errorRate,

      // Quality metrics (Requirement 7.4)
      audioGaps: session.audioGaps.length,
      totalGapDuration: session.audioGaps.reduce((sum, g) => sum + g.duration, 0)
    };
  }

  /**
   * Generate human-readable summary
   * @param {Object} session - Session data
   * @returns {string} Summary text
   */
  generateSummary(session) {
    const metrics = this.calculateMetrics(session);

    const ttfaStatus = metrics.ttfa <= 3000 ? '✅ ACHIEVED' : '❌ MISSED';
    const errorStatus = metrics.errorRate < 1 ? '✅ GOOD' : '⚠️ HIGH';

    return `
Streaming Performance Summary
============================
Session ID: ${session.sessionId}
Duration: ${metrics.totalDuration}ms

TTFA (Time to First Audio): ${metrics.ttfa}ms ${ttfaStatus}
Target: 2000-3000ms

Processing:
- Chunks: ${metrics.totalChunks} (avg ${Math.round(metrics.avgChunkSize)} chars)
- Sentences: ${metrics.totalSentences}
- Avg Synthesis Time: ${Math.round(metrics.avgSynthesisTime)}ms

Errors: ${metrics.totalErrors} (${metrics.errorRate.toFixed(2)}%) ${errorStatus}
Audio Gaps: ${metrics.audioGaps}

Timing Breakdown:
- First Chunk: ${metrics.firstChunkArrival}ms
- First Sentence: ${metrics.firstSentenceDetected}ms
- First Audio Ready: ${metrics.firstAudioReady}ms
- First Audio Playing: ${metrics.firstAudioPlaying}ms
		`.trim();
  }

  /**
   * Get average metrics across all sessions
   * @returns {Object} Average metrics
   */
  getAverageMetrics() {
    if (this.sessions.length === 0) {
      return null;
    }

    const allMetrics = this.sessions.map((s) => this.calculateMetrics(s));

    const avg = (arr, key) => arr.reduce((sum, m) => sum + m[key], 0) / arr.length;

    return {
      avgTTFA: avg(allMetrics, 'ttfa'),
      avgDuration: avg(allMetrics, 'totalDuration'),
      avgSentences: avg(allMetrics, 'totalSentences'),
      avgSynthesisTime: avg(allMetrics, 'avgSynthesisTime'),
      avgErrorRate: avg(allMetrics, 'errorRate'),
      totalSessions: this.sessions.length
    };
  }

  /**
   * Get current session status
   * @returns {Object|null} Current session info or null
   */
  getCurrentSessionStatus() {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionId: this.currentSession.sessionId,
      duration: Date.now() - this.currentSession.startTime,
      chunks: this.currentSession.totalChunks,
      sentences: this.currentSession.totalSentences,
      errors: this.currentSession.totalErrors,
      ttfa: this.currentSession.firstAudioPlaying ? this.currentSession.firstAudioPlaying : null
    };
  }

  /**
   * Reset all stored sessions
   */
  reset() {
    this.sessions = [];
    this.currentSession = null;
  }

  /**
   * Export session data for analysis
   * @returns {Object} All session data
   */
  exportData() {
    return {
      sessions: this.sessions.map((s) => ({
        ...s,
        metrics: this.calculateMetrics(s)
      })),
      averageMetrics: this.getAverageMetrics(),
      exportedAt: new Date().toISOString()
    };
  }
}
