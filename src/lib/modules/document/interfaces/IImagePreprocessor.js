export class IImagePreprocessor {
  /**
   * Preprocess image: resize if small and convert to grayscale
   * @param {Uint8Array} buffer - The image buffer
   * @returns {Promise<HTMLCanvasElement>} - The preprocessed canvas
   */
  async preprocess(buffer) {
    throw new Error('Not implemented');
  }

  /**
   * Detect image format from buffer based on magic numbers
   * @param {Uint8Array} buffer - The image buffer
   * @returns {string} - The MIME type (e.g., 'image/png', 'image/jpeg')
   */
  detectImageFormat(buffer) {
    throw new Error('Not implemented');
  }
}
