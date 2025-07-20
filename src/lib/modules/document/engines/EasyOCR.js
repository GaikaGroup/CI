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
import { IOCREngine } from '../interfaces/IOCREngine';

/**
 * EasyOCR engine that implements the IOCREngine interface
 * Uses composition with ImagePreprocessor and PDFExtractor
 */
export class EasyOCR extends IOCREngine {
  /**
   * Create a new EasyOCR engine
   * @param {ImagePreprocessor} preprocessor - The image preprocessor
   * @param {PDFExtractor} pdfExtractor - The PDF extractor
   * @param {object} config - Optional configuration
   */
  constructor(preprocessor, pdfExtractor, config = {}) {
    super();
    this.preprocessor = preprocessor;
    this.pdfExtractor = pdfExtractor;
    this.config = {
      lang: 'en',
      ...config
    };
  }

  /**
   * Recognize text in an image or PDF
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<string>} - The recognized text
   */
  async recognize(buffer) {
    try {
      // Check if we're in the browser environment
      if (!browser) {
        // This is expected behavior during SSR - OCR will be performed client-side
        console.info('Info: Skipping EasyOCR during SSR (this is normal behavior)');
        return 'OCR processing will be performed in the browser.';
      }

      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to recognize method');
        return 'No valid content to recognize';
      }

      // Check if it's a PDF using the PDFExtractor
      const isPdf = this.pdfExtractor.isPDF(buffer);

      if (isPdf) {
        console.log('PDF detected, but EasyOCR is optimized for handwritten text in images');
        // In a real implementation, we might still try to process PDFs
        // For this example, we'll just return a message
        return 'PDF detected. EasyOCR is optimized for handwritten text in images.';
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
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<number>} - The confidence score (0-1)
   */
  async getConfidence(buffer) {
    try {
      // Check if we're in the browser environment
      if (!browser) {
        // This is expected behavior during SSR - confidence check will be performed client-side
        console.info(
          'Info: Skipping EasyOCR confidence check during SSR (this is normal behavior)'
        );
        return 0.8; // Return a default confidence value during SSR
      }

      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to getConfidence method');
        return 0;
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
