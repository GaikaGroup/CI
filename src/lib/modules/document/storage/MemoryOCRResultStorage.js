import { IOCRResultStorage } from '../interfaces/IOCRResultStorage';

/**
 * Memory-based OCR Result Storage
 *
 * This class implements the IOCRResultStorage interface and stores OCR results in memory.
 */
export class MemoryOCRResultStorage extends IOCRResultStorage {
  constructor() {
    super();
    this.results = new Map();
  }

  /**
   * Store OCR result
   * @param {string} messageId - The message ID
   * @param {object} result - The OCR result
   */
  store(messageId, result) {
    this.results.set(messageId, result);
  }

  /**
   * Retrieve OCR result
   * @param {string} messageId - The message ID
   * @returns {object|null} - The OCR result or null if not found
   */
  retrieve(messageId) {
    return this.results.has(messageId) ? this.results.get(messageId) : null;
  }

  /**
   * Retrieve all OCR results
   * @returns {Array} - Array of all OCR results
   */
  retrieveAll() {
    return Array.from(this.results.values());
  }

  /**
   * Clear all OCR results
   */
  clear() {
    this.results.clear();
  }
}
