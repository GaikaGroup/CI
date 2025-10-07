/**
 * Document Processor
 *
 * This class is responsible for processing documents using the appropriate OCR engine.
 * It uses a document classifier to determine the type of document and selects the
 * appropriate OCR engine based on the document type.
 */
import { DOCUMENT_TYPES } from '$lib/shared/utils/constants';
import { browser } from '$app/environment';
import { container } from '$lib/shared/di/container';
import { OCREngineFactory } from './factories/OCREngineFactory';
import { DocumentClassifier } from './DocumentClassifier';
import { ImagePreprocessor } from './preprocessing/ImagePreprocessor';
import { PDFExtractor } from './pdf/PDFExtractor';
import { SessionStorageOCRResultStorage } from './storage/SessionStorageOCRResultStorage';

/**
 * Initialize the document processing components and register them in the DI container
 */
function initializeDocumentProcessing() {
  // Create instances of the components
  const imagePreprocessor = new ImagePreprocessor();
  const pdfExtractor = new PDFExtractor();
  const documentClassifier = new DocumentClassifier();
  const ocrStorage = new SessionStorageOCRResultStorage();

  // Register the components in the DI container
  container.register('imagePreprocessor', imagePreprocessor);
  container.register('pdfExtractor', pdfExtractor);
  container.register('documentClassifier', documentClassifier);
  container.register('ocrStorage', ocrStorage);

  // Register factory functions
  container.registerFactory('ocrEngine', (container) => {
    return (documentType) => {
      return OCREngineFactory.createEngine(documentType, {
        // Optional configuration
      });
    };
  });
}

// Initialize document processing components
initializeDocumentProcessing();

export class DocumentProcessor {
  /**
   * Create a new DocumentProcessor
   * @param {IDocumentClassifier} classifier - The document classifier
   * @param {SessionStorageAdapter} sessionStorageAdapter - The session storage adapter
   */
  constructor(classifier = null, sessionStorageAdapter = null) {
    // Use dependency injection if components are provided, otherwise get from container
    this.classifier = classifier || container.resolve('documentClassifier');
    this.sessionStorageAdapter =
      sessionStorageAdapter ||
      (container.has('sessionStorageAdapter') ? container.resolve('sessionStorageAdapter') : null);
  }

  /**
   * Process a document and extract text
   * @param {File} file - The document file to process
   * @param {string} sessionId - Optional session ID for maintaining context
   * @returns {Promise<Object>} - The processing result with text, document type, and confidence
   */
  async processDocument(file, sessionId = null) {
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
      // Get the appropriate OCR engine using the factory from the container
      const engineFactory = container.resolve('ocrEngine');
      const engine = engineFactory(documentType);
      console.log('OCR engine selected:', engine.constructor.name);

      console.log('Processing document with selected engine...');
      // Process the document with the selected engine
      const text = await engine.recognize(buffer);
      console.log('Document processed, text length:', text ? text.length : 0);
      console.log(
        'First 100 characters of recognized text:',
        text ? text.substring(0, 100) : 'No text recognized'
      );

      // Store the result in OCR storage
      const ocrStorage = container.resolve('ocrStorage');
      const messageId = Date.now().toString();
      ocrStorage.store(messageId, {
        messageId,
        fileName: file.name,
        text,
        documentType,
        confidence,
        timestamp: new Date().toISOString()
      });

      // If session storage adapter is available and sessionId is provided, store in session
      if (this.sessionStorageAdapter && sessionId) {
        console.log(`[Session] Storing document in session ${sessionId}`);
        this.sessionStorageAdapter.processAndStoreDocument(
          {
            file: file,
            result: {
              text,
              documentType,
              confidence
            }
          },
          sessionId,
          { processDocument: async () => ({ text, documentType, confidence }) }
        );
      }

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
