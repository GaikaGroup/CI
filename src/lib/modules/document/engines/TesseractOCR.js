/**
 * Enhanced Tesseract OCR Engine with Multi-Language and PDF Support
 *
 * Features:
 * 1. Multi-language support for English, Russian, and Spanish
 * 2. Image preprocessing with resizing and grayscale conversion
 * 3. PDF recognition: extracts text or runs OCR on rendered pages
 * 4. Orientation and sparse text handling using PSM 12 for images
 * 5. Confidence score retrieval for OCR results
 */
import { browser } from '$app/environment';
import { IOCREngine } from '../interfaces/IOCREngine';

let tesseractModule;
let createWorker;

/**
 * TesseractOCR engine that implements the IOCREngine interface
 * Uses composition with ImagePreprocessor and PDFExtractor
 */
export class TesseractOCR extends IOCREngine {
  /**
   * Create a new TesseractOCR engine
   * @param {ImagePreprocessor} preprocessor - The image preprocessor
   * @param {PDFExtractor} pdfExtractor - The PDF extractor
   * @param {object} config - Optional configuration
   */
  constructor(preprocessor, pdfExtractor, config = {}) {
    super();
    this.preprocessor = preprocessor;
    this.pdfExtractor = pdfExtractor;
    this.config = {
      lang: 'eng+rus+spa', // Support English, Russian, and Spanish
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/cmaps/',
      cMapPacked: true,
      ...config
    };
  }

  /**
   * Post-process the recognized text to clean up whitespace
   * @param {string} text - Raw OCR text
   * @returns {string} - Cleaned text
   */
  postProcessText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
  }

  /**
   * Create an optimized Tesseract worker with language support
   * @returns {Promise<object>} - The configured worker
   */
  async createOptimizedWorker() {
    if (!tesseractModule) {
      tesseractModule = await import('tesseract.js');
      createWorker = tesseractModule.createWorker;
    }
    // Use default Tesseract.js CDN which works reliably
    return await createWorker(this.config.lang, 1, {
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.3/dist/worker.min.js'
    });
  }

  /**
   * Run OCR on a canvas and return the result
   * @param {HTMLCanvasElement} canvas - The canvas to process
   * @returns {Promise<{text: string, confidence: number}>} - The recognized text and confidence
   */
  async _ocrCanvas(canvas) {
    const worker = await this.createOptimizedWorker();

    // Optimized for measurement instruments with numbers
    await worker.setParameters({
      tessedit_pageseg_mode: '11', // Sparse text - better for scattered numbers
      tessedit_char_whitelist:
        '0123456789.,°CАампервтсекундлинйкмчабвгдежзийклмнопрстуфхцчшщъыьэюяABCDEFGHIJKLMNOPQRSTUVWXYZ ',
      classify_bln_numeric_mode: '1' // Better number recognition
    });

    const result = await worker.recognize(canvas);
    await worker.terminate();
    return {
      text: this.postProcessText(result.data.text),
      confidence: result.data.confidence / 100 // Normalize confidence to 0-1 range
    };
  }

  /**
   * Recognize text from an image or PDF buffer
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<string>} - The recognized text
   */
  async recognize(buffer) {
    try {
      if (!browser) {
        return 'OCR processing will be performed in the browser.';
      }

      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to recognize method');
        return 'No valid content to recognize';
      }

      // Safely check if it's a PDF using the PDFExtractor
      const isPdf = this.pdfExtractor.isPDF(buffer);

      if (isPdf) {
        // Use PDFExtractor to extract text from PDF
        return await this.pdfExtractor.extractText(buffer);
      } else {
        // Use ImagePreprocessor to preprocess the image
        const canvas = await this.preprocessor.preprocess(buffer);
        const { text } = await this._ocrCanvas(canvas);
        return text;
      }
    } catch (error) {
      console.error('Error in recognize method:', error);
      throw new Error(`Text recognition failed: ${error.message}`);
    }
  }

  /**
   * Get the confidence score of the OCR recognition
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<number>} - The confidence score (0 to 1)
   */
  async getConfidence(buffer) {
    try {
      if (!browser) {
        return 0; // Default confidence during SSR
      }

      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to getConfidence method');
        return 0;
      }

      // Safely check if it's a PDF using the PDFExtractor
      const isPdf = this.pdfExtractor.isPDF(buffer);

      if (isPdf) {
        try {
          const pdfText = await this.pdfExtractor.extractText(buffer);
          if (pdfText && pdfText.trim().length > 0) {
            return 1; // High confidence if text is directly extracted
          } else {
            const canvas = await this.pdfExtractor.renderPDFToCanvas(buffer);
            const { confidence } = await this._ocrCanvas(canvas);
            return confidence;
          }
        } catch (pdfError) {
          console.error('Error getting confidence for PDF:', pdfError);
          return 0;
        }
      } else {
        try {
          const canvas = await this.preprocessor.preprocess(buffer);
          const { confidence } = await this._ocrCanvas(canvas);
          return confidence;
        } catch (imgError) {
          console.error('Error getting confidence for image:', imgError);
          return 0;
        }
      }
    } catch (error) {
      console.error('Error in getConfidence method:', error);
      return 0; // Return 0 confidence on error
    }
  }
}
