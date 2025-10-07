import { IOCRResultStorage } from '../interfaces/IOCRResultStorage';
import { browser } from '$app/environment';

/**
 * SessionStorage-based OCR Result Storage
 *
 * This class implements the IOCRResultStorage interface and stores OCR results in sessionStorage.
 */
export class SessionStorageOCRResultStorage extends IOCRResultStorage {
  constructor() {
    super();
    this.storageKey = 'ocrResults';
    if (browser) {
      this.initializeFromStorage();
    }
  }

  /**
   * Initialize from existing sessionStorage data
   */
  initializeFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const existingResults = JSON.parse(sessionStorage.getItem(this.storageKey) || '{}');
        console.log(
          `[SessionStorageOCRResultStorage] Loaded ${Object.keys(existingResults).length} OCR results from storage`
        );
      }
    } catch (storageError) {
      console.warn(
        '[SessionStorageOCRResultStorage] Could not load from sessionStorage:',
        storageError
      );
    }
  }

  /**
   * Store OCR result
   * @param {string} messageId - The message ID
   * @param {object} result - The OCR result
   */
  store(messageId, result) {
    try {
      if (!browser || typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('[SessionStorageOCRResultStorage] SessionStorage not available');
        return;
      }

      const existingResults = JSON.parse(sessionStorage.getItem(this.storageKey) || '{}');
      existingResults[messageId] = result;
      sessionStorage.setItem(this.storageKey, JSON.stringify(existingResults));
      console.log(
        `[SessionStorageOCRResultStorage] Stored OCR result in sessionStorage for message ${messageId}`
      );
    } catch (storageError) {
      console.warn(
        '[SessionStorageOCRResultStorage] Could not store in sessionStorage:',
        storageError
      );
    }
  }

  /**
   * Retrieve OCR result
   * @param {string} messageId - The message ID
   * @returns {object|null} - The OCR result or null if not found
   */
  retrieve(messageId) {
    try {
      if (!browser || typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('[SessionStorageOCRResultStorage] SessionStorage not available');
        return null;
      }

      const existingResults = JSON.parse(sessionStorage.getItem(this.storageKey) || '{}');
      return existingResults[messageId] || null;
    } catch (storageError) {
      console.warn(
        '[SessionStorageOCRResultStorage] Could not read from sessionStorage:',
        storageError
      );
      return null;
    }
  }

  /**
   * Retrieve all OCR results
   * @returns {Array} - Array of all OCR results
   */
  retrieveAll() {
    try {
      if (!browser || typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('[SessionStorageOCRResultStorage] SessionStorage not available');
        return [];
      }

      const existingResults = JSON.parse(sessionStorage.getItem(this.storageKey) || '{}');
      return Object.values(existingResults);
    } catch (storageError) {
      console.warn(
        '[SessionStorageOCRResultStorage] Could not read all results from sessionStorage:',
        storageError
      );
      return [];
    }
  }

  /**
   * Clear all OCR results
   */
  clear() {
    try {
      if (!browser || typeof window === 'undefined' || !window.sessionStorage) {
        console.warn('[SessionStorageOCRResultStorage] SessionStorage not available');
        return;
      }

      sessionStorage.removeItem(this.storageKey);
    } catch (storageError) {
      console.warn(
        '[SessionStorageOCRResultStorage] Could not clear sessionStorage:',
        storageError
      );
    }
  }
}
