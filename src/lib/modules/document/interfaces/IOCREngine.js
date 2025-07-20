export class IOCREngine {
  /**
   * Recognize text from an image or PDF buffer
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<string>} - The recognized text
   */
  async recognize(buffer) { 
    throw new Error('Not implemented'); 
  }
  
  /**
   * Get the confidence score of the OCR recognition
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<number>} - The confidence score (0 to 1)
   */
  async getConfidence(buffer) { 
    throw new Error('Not implemented'); 
  }
}