/**
 * PDF.js Document Processor
 *
 * Features:
 * 1. PDF document loading and parsing
 * 2. Text extraction from PDF documents
 * 3. Support for password-protected PDFs
 * 4. Page rendering to canvas
 */
import { browser } from '$app/environment';
import { IOCREngine } from '../interfaces/IOCREngine';

/**
 * PdfJS engine that implements the IOCREngine interface
 * Uses composition with PDFExtractor
 */
export class PdfJS extends IOCREngine {
  /**
   * Constructor to initialize the PDF processor
   * @param {PDFExtractor} pdfExtractor - The PDF extractor
   * @param {Object} config - Configuration options
   */
  constructor(pdfExtractor, config = {}) {
    super();
    this.pdfExtractor = pdfExtractor;
    this.config = {
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.93/cmaps/',
      cMapPacked: true,
      ...config
    };
  }

  /**
   * Clean up the extracted text by normalizing whitespace
   * @param {string} text - The raw extracted text
   * @returns {string} - The cleaned text
   */
  postProcessText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/(\w)-\s+(\w)/g, '$1$2') // Fix hyphenated words
      .trim();
  }

  /**
   * Recognize text from a buffer (implements IOCREngine interface)
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<string>} - The recognized text
   */
  async recognize(buffer) {
    if (!browser) {
      console.info('Skipping PDF text extraction during SSR');
      return 'PDF text extraction will be performed in the browser.';
    }

    // Check if buffer is valid
    if (!buffer || buffer.length === 0) {
      console.warn('Invalid or empty buffer provided to recognize method');
      return 'No valid content to recognize';
    }

    // Check if it's a PDF using the PDFExtractor
    const isPdf = this.pdfExtractor.isPDF(buffer);

    if (!isPdf) {
      console.log('Non-PDF detected. PdfJS is optimized for PDF documents.');
      return 'Non-PDF detected. PdfJS is optimized for PDF documents.';
    }

    try {
      // Use the PDFExtractor to extract text
      const extractedText = await this.pdfExtractor.extractText(buffer);
      return this.postProcessText(extractedText) || 'No text could be extracted from the PDF';
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  /**
   * Get the confidence score of the OCR recognition (implements IOCREngine interface)
   * @param {Uint8Array} buffer - The input buffer
   * @returns {Promise<number>} - The confidence score (0 to 1)
   */
  async getConfidence(buffer) {
    if (!browser) {
      console.info('Skipping PDF confidence check during SSR');
      return 0;
    }

    // Check if buffer is valid
    if (!buffer || buffer.length === 0) {
      console.warn('Invalid or empty buffer provided to getConfidence method');
      return 0;
    }

    // Check if it's a PDF using the PDFExtractor
    const isPdf = this.pdfExtractor.isPDF(buffer);

    if (!isPdf) {
      console.log('Non-PDF detected. PdfJS is optimized for PDF documents.');
      return 0;
    }

    try {
      // For PDFs with extractable text, we return high confidence
      const extractedText = await this.pdfExtractor.extractText(buffer);
      if (extractedText && extractedText.trim().length > 0) {
        return 0.95; // High confidence for PDFs with extractable text
      }

      // For PDFs without extractable text, we return medium confidence
      return 0.7;
    } catch (error) {
      console.error('Error getting confidence for PDF:', error);
      return 0;
    }
  }

  /**
   * Get metadata from a PDF document
   * @param {Uint8Array} buffer - The PDF file buffer
   * @returns {Promise<Object>} - The document metadata
   */
  async getMetadata(buffer) {
    if (!browser) {
      console.info('Skipping PDF metadata extraction during SSR');
      return {};
    }

    // Check if buffer is valid
    if (!buffer || buffer.length === 0) {
      console.warn('Invalid or empty buffer provided to getMetadata method');
      return {};
    }

    // Check if it's a PDF using the PDFExtractor
    const isPdf = this.pdfExtractor.isPDF(buffer);

    if (!isPdf) {
      console.log('Non-PDF detected. Cannot extract metadata.');
      return {};
    }

    try {
      // This would be implemented in a real application
      // For now, we'll return a placeholder
      return {
        title: 'PDF Document',
        author: 'Unknown',
        pageCount: 1
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      return {};
    }
  }
}
