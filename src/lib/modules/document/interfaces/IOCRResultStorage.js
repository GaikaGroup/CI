export class IOCRResultStorage {
  /**
   * Store OCR result
   * @param {string} messageId - The message ID
   * @param {object} result - The OCR result
   */
  store(messageId, result) { 
    throw new Error('Not implemented'); 
  }
  
  /**
   * Retrieve OCR result
   * @param {string} messageId - The message ID
   * @returns {object|null} - The OCR result or null if not found
   */
  retrieve(messageId) { 
    throw new Error('Not implemented'); 
  }
  
  /**
   * Retrieve all OCR results
   * @returns {Array} - Array of all OCR results
   */
  retrieveAll() { 
    throw new Error('Not implemented'); 
  }
  
  /**
   * Clear all OCR results
   */
  clear() { 
    throw new Error('Not implemented'); 
  }
}