/**
 * EasyOCR Engine Adapter
 *
 * This class is an adapter for the EasyOCR engine, which is optimized for handwritten text.
 * In a real implementation, this would use a server-side Python API for EasyOCR.
 * For this example, we'll simulate the OCR process.
 *
 * Note: This implementation is compatible with both browser and SSR environments.
 */
import { browser } from '$app/environment';

export class EasyOCR {
  constructor(config = {}) {
    this.config = {
      lang: 'en',
      ...config
    };
  }

  /**
   * Recognize text in an image
   * @returns {Promise<string>} - The recognized text
   */
  async recognize() {
    try {
      // Check if we're in the browser environment
      if (!browser) {
        // This is expected behavior during SSR - OCR will be performed client-side
        console.info('Info: Skipping EasyOCR during SSR (this is normal behavior)');
        return 'OCR processing will be performed in the browser.';
      }

      // In a real implementation, this would call a server-side API for EasyOCR
      // For this example, we'll simulate the OCR process

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate recognized text for handwritten content
      // In a real implementation, this would be the actual recognized text
      return 'This is simulated handwritten text recognition. In a real implementation, this would use EasyOCR to recognize handwritten text from the uploaded image.';
    } catch (error) {
      console.error('Error recognizing text with EasyOCR:', error);
      throw new Error('Failed to recognize text with EasyOCR');
    }
  }

  /**
   * Get the confidence score for the recognized text
   * @returns {Promise<number>} - The confidence score (0-1)
   */
  async getConfidence() {
    try {
      // Check if we're in the browser environment
      if (!browser) {
        // This is expected behavior during SSR - confidence check will be performed client-side
        console.info(
          'Info: Skipping EasyOCR confidence check during SSR (this is normal behavior)'
        );
        return 0.8; // Return a default confidence value during SSR
      }

      // In a real implementation, this would call a server-side API for EasyOCR
      // For this example, we'll simulate the confidence score

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulate confidence score
      // In a real implementation, this would be the actual confidence score
      return 0.7 + Math.random() * 0.2; // 70-90% confidence
    } catch (error) {
      console.error('Error getting confidence with EasyOCR:', error);
      return 0;
    }
  }
}
