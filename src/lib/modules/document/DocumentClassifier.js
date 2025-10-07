/**
 * Document Classifier
 *
 * This class is responsible for classifying documents as printed, handwritten, or mixed.
 * It analyzes the document and returns a classification with a confidence score.
 */
import { DOCUMENT_TYPES } from '$lib/shared/utils/constants';
import { IDocumentClassifier } from './interfaces/IDocumentClassifier';

/**
 * Document classifier that implements the IDocumentClassifier interface
 */
export class DocumentClassifier extends IDocumentClassifier {
  /**
   * Classify a document
   * @param {Uint8Array} buffer - The document buffer to classify
   * @returns {Promise<Object>} - The classification result with document type and confidence
   */
  async classify(buffer) {
    try {
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.warn('Invalid or empty buffer provided to classify method');
        return {
          documentType: DOCUMENT_TYPES.UNKNOWN,
          confidence: 0
        };
      }

      // In a real implementation, this would use machine learning or heuristics
      // to classify the document based on the buffer content.
      // For this example, we'll use a simple approach that always classifies
      // documents as printed text to ensure reliable OCR.

      // Check if it's a PDF by examining the header
      const isPdf = this.isPDF(buffer);
      if (isPdf) {
        return {
          documentType: DOCUMENT_TYPES.PDF,
          confidence: 0.95 // Very high confidence for PDF detection
        };
      }

      // Always classify as printed text to use Tesseract OCR
      return {
        documentType: DOCUMENT_TYPES.PRINTED,
        confidence: 0.9 // High confidence
      };
    } catch (error) {
      console.error('Error classifying document:', error);
      return {
        documentType: DOCUMENT_TYPES.UNKNOWN,
        confidence: 0
      };
    }
  }

  /**
   * Check if the buffer is a PDF by examining its header
   * @param {Uint8Array} buffer - The input buffer
   * @returns {boolean} - True if PDF, false otherwise
   */
  isPDF(buffer) {
    try {
      // Check if buffer is valid and has sufficient length
      if (!buffer || buffer.length < 5) {
        return false;
      }

      // Check if the underlying ArrayBuffer is detached
      if (buffer.buffer.byteLength === 0) {
        return false;
      }

      // Create a new Uint8Array from the first 5 bytes to avoid detached buffer issues
      const headerBytes = new Uint8Array(buffer.buffer.slice(0, 5));
      const header = String.fromCharCode(...headerBytes);
      return header === '%PDF-';
    } catch (error) {
      console.warn('Error checking PDF format:', error);
      return false;
    }
  }
}
