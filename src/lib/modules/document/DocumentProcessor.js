/**
 * Document Processor
 *
 * This class is responsible for processing documents using the appropriate OCR engine.
 * It uses a document classifier to determine the type of document and selects the
 * appropriate OCR engine based on the document type.
 */
import { DOCUMENT_TYPES } from '$lib/shared/utils/constants';
import { DocumentClassifier } from './DocumentClassifier';
import { OCREngineRegistry } from './OCREngineRegistry';
import { browser } from '$app/environment';

export class DocumentProcessor {
  constructor() {
    this.classifier = new DocumentClassifier();
    this.engineRegistry = new OCREngineRegistry();
  }

  /**
   * Process a document and extract text
   * @param {File} file - The document file to process
   * @returns {Promise<Object>} - The processing result with text, document type, and confidence
   */
  async processDocument(file) {
    console.log(`[OCR] Processing document in ${browser ? 'browser' : 'server'} environment`);
    console.log('DocumentProcessor.processDocument called with file:', file);
    console.log('File type:', file.type, 'File size:', file.size);

    try {
      // Check if we're in the browser environment
      console.log(
        'Browser environment check:',
        browser ? 'Running in browser' : 'Not running in browser'
      );
      if (!browser) {
        // This is expected behavior during SSR - document processing will be performed client-side
        console.info('[OCR] Skipping document processing during SSR (this is normal behavior)');
        return {
          text: 'Document processing will be performed in the browser.',
          documentType: DOCUMENT_TYPES.UNKNOWN,
          confidence: 0.8
        };
      }

      console.log('Converting file to ArrayBuffer for processing...');
      // Convert file to ArrayBuffer for processing
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      console.log('File converted to ArrayBuffer, size:', buffer.length);

      console.log('Classifying document...');
      // Classify the document
      const classification = await this.classifier.classify(buffer);
      const { documentType, confidence } = classification;
      console.log('Document classified as:', documentType, 'with confidence:', confidence);

      console.log('Getting OCR engine for document type:', documentType);
      // Get the appropriate OCR engine
      const engine = this.engineRegistry.getEngine(documentType);
      console.log('OCR engine selected:', engine.constructor.name);

      console.log('Processing document with selected engine...');
      // Process the document with the selected engine
      const text = await engine.recognize(buffer);
      console.log('Document processed, text length:', text ? text.length : 0);
      console.log(
        'First 100 characters of recognized text:',
        text ? text.substring(0, 100) : 'No text recognized'
      );

      return {
        text,
        documentType,
        confidence
      };
    } catch (error) {
      console.error('Error processing document:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });

      // Throw a more descriptive error
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }
}
