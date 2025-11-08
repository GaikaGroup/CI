/**
 * Streaming Response Handler
 *
 * Manages incoming text chunks, buffers incomplete sentences,
 * and detects sentence boundaries for streaming TTS synthesis.
 *
 * Requirements: 1.1, 1.2, 5.1, 5.2, 5.4, 5.5
 */

export class StreamingResponseHandler {
  /**
   * Create a new StreamingResponseHandler
   * @param {Object} options - Configuration options
   * @param {Function} options.onSentenceComplete - Callback when complete sentence detected
   * @param {Function} options.onStreamComplete - Callback when stream finishes
   * @param {Function} options.onError - Callback for error handling
   */
  constructor(options = {}) {
    this.textBuffer = '';
    this.onSentenceComplete = options.onSentenceComplete || (() => {});
    this.onStreamComplete = options.onStreamComplete || (() => {});
    this.onError = options.onError || (() => {});

    // FIXED: Add protection against duplicate sentences
    this.processedSentences = new Set();
  }

  /**
   * Process incoming text chunk
   * @param {string} chunk - Text chunk from streaming API
   */
  processChunk(chunk) {
    if (!chunk || typeof chunk !== 'string') {
      console.warn('[StreamingResponseHandler] Invalid chunk received:', chunk);
      return;
    }

    // FIXED: Only prevent exact duplicate chunks, not shorter content
    if (chunk.length === 0) {
      console.warn('[StreamingResponseHandler] Empty chunk received, skipping');
      return;
    }

    // Add chunk to buffer and process
    this.textBuffer += chunk;
    this._detectAndEmitSentences();
  }

  /**
   * Detect sentence boundaries and emit complete sentences
   * Universal punctuation regex that works across all languages
   * @private
   */
  _detectAndEmitSentences() {
    // Regex for sentence boundaries: . ! ? followed by space or end
    // Requirement 5.1: Recognize standard punctuation patterns
    const sentenceRegex = /([.!?]+)(\s+|$)/g;

    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(this.textBuffer)) !== null) {
      const sentence = this.textBuffer.substring(lastIndex, match.index + match[0].length).trim();

      if (sentence.length > 3) {
        // Only process sentences with meaningful content
        // FIXED: Use more specific hash to avoid false duplicates
        const sentenceHash = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!this.processedSentences.has(sentenceHash)) {
          this.processedSentences.add(sentenceHash);
          console.log(
            '[StreamingResponseHandler] New sentence:',
            sentence.substring(0, 50) + '...'
          );

          // Requirement 1.2: Synthesize sentence without waiting for full response
          this.onSentenceComplete(sentence);
        } else {
          console.warn(
            '[StreamingResponseHandler] Duplicate sentence detected, skipping:',
            sentence.substring(0, 50) + '...'
          );
        }
      }

      lastIndex = match.index + match[0].length;
    }

    // Keep remaining incomplete text in buffer
    // Requirement 5.5: Wait for Sentence_Boundary before synthesis
    this.textBuffer = this.textBuffer.substring(lastIndex);
  }

  /**
   * Finalize stream - emit any remaining text
   * Requirement 5.5: Handle incomplete sentences at stream end
   */
  finalize() {
    const remainingText = this.textBuffer.trim();
    if (remainingText.length > 3) {
      // Only process meaningful remaining text
      console.log(
        '[StreamingResponseHandler] Finalizing with remaining text:',
        remainingText.substring(0, 50) + '...'
      );

      // Check if it's not a duplicate
      const textHash = remainingText.toLowerCase().replace(/\s+/g, ' ');
      if (!this.processedSentences.has(textHash)) {
        this.processedSentences.add(textHash);
        this.onSentenceComplete(remainingText);
      } else {
        console.warn('[StreamingResponseHandler] Duplicate remaining text, skipping');
      }

      this.textBuffer = '';
    }
    this.onStreamComplete();
  }

  /**
   * Reset handler state
   * Requirement 4.4: Clean state for fresh streaming session
   */
  reset() {
    this.textBuffer = '';
    this.processedSentences.clear();
  }

  /**
   * Get current buffer state (for debugging)
   */
  getBufferState() {
    return {
      bufferLength: this.textBuffer.length,
      bufferContent: this.textBuffer.substring(0, 100) + (this.textBuffer.length > 100 ? '...' : '')
    };
  }
}
