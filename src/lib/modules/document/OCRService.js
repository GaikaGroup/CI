/**
 * OCR Service
 *
 * This service handles OCR processing and ensures results are properly stored
 * in the chat context for memory persistence.
 */
import { container } from '$lib/shared/di/container';
import { DOCUMENT_TYPES } from '$lib/shared/utils/constants';
import { DocumentClassifier } from './DocumentClassifier';
import { ImagePreprocessor } from './preprocessing/ImagePreprocessor';
import { PDFExtractor } from './pdf/PDFExtractor';
import { SessionStorageOCRResultStorage } from './storage/SessionStorageOCRResultStorage';
import { OCREngineFactory } from './factories/OCREngineFactory';

// Initialize the service if not already initialized
if (!container.has('ocrStorage')) {
  // This should have been initialized by DocumentProcessor, but we'll check just in case
  console.log('[OCR Service] Initializing OCR service components');

  // Create instances
  const imagePreprocessor = new ImagePreprocessor();
  const pdfExtractor = new PDFExtractor();
  const documentClassifier = new DocumentClassifier();
  const ocrStorage = new SessionStorageOCRResultStorage();

  // Register in container
  container.register('imagePreprocessor', imagePreprocessor);
  container.register('pdfExtractor', pdfExtractor);
  container.register('documentClassifier', documentClassifier);
  container.register('ocrStorage', ocrStorage);

  // Register the OCR engine factory if it's not already registered
  if (!container.has('ocrEngine')) {
    console.log('[OCR Service] Registering OCR engine factory');
    container.registerFactory('ocrEngine', () => {
      return (documentType) => {
        return OCREngineFactory.createEngine(documentType);
      };
    });
  }
}

/**
 * Process OCR and store results for chat memory
 * @param {string} messageId - The message ID
 * @param {Uint8Array} imageBuffer - The image buffer
 * @param {string} fileName - The image file name
 * @returns {Promise<string>} - The OCR result
 */
export async function processOCRWithMemory(messageId, imageBuffer, fileName) {
  try {
    console.log(`[OCR Service] Processing OCR for message ${messageId}, file: ${fileName}`);

    // Get the document classifier from the container
    const classifier = container.resolve('documentClassifier');

    // Classify the document
    const classification = await classifier.classify(imageBuffer);
    const { documentType, confidence: classificationConfidence } = classification;
    console.log(`[OCR Service] Document classified as: ${documentType}`);

    // Get the OCR engine factory from the container
    // The factory should have been registered during initialization
    const engineFactory = container.resolve('ocrEngine');

    // Get the appropriate OCR engine
    const engine = engineFactory(documentType);
    console.log(`[OCR Service] Using OCR engine: ${engine.constructor.name}`);

    // Perform OCR
    const ocrResult = await engine.recognize(imageBuffer);
    const confidence = await engine.getConfidence(imageBuffer);

    console.log(`[OCR Service] OCR completed for message ${messageId}`);
    console.log(`[OCR Service] Result length: ${ocrResult.length}`);
    console.log(`[OCR Service] Confidence: ${confidence}`);
    console.log(`[OCR Service] Text preview: ${ocrResult.substring(0, 200)}...`);

    // Store the result with metadata
    const ocrData = {
      messageId,
      fileName,
      text: ocrResult,
      documentType,
      confidence,
      timestamp: new Date().toISOString(),
      processed: true
    };

    // Get the OCR storage from the container
    const ocrStorage = container.resolve('ocrStorage');
    ocrStorage.store(messageId, ocrData);
    console.log(`[OCR Service] Stored OCR result for message ${messageId}`);

    return ocrResult;
  } catch (error) {
    console.error(`[OCR Service] Error processing OCR for message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Get OCR result from storage
 * @param {string} messageId - The message ID
 * @returns {object|null} - The OCR data or null if not found
 */
export function getOCRResult(messageId) {
  try {
    // Get the OCR storage from the container
    const ocrStorage = container.resolve('ocrStorage');
    return ocrStorage.retrieve(messageId);
  } catch (error) {
    console.error('[OCR Service] Error getting OCR result:', error);
    return null;
  }
}

/**
 * Get all OCR results for context building
 * @returns {Array} - Array of all OCR results
 */
export function getAllOCRResults() {
  try {
    // Get the OCR storage from the container
    const ocrStorage = container.resolve('ocrStorage');
    const results = ocrStorage.retrieveAll();

    // Sort by timestamp
    return results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (error) {
    console.error('[OCR Service] Error getting all OCR results:', error);
    return [];
  }
}

/**
 * Build context string from OCR results for chat memory
 * @param {string} currentMessageId - Current message ID to include context for
 * @returns {string} - Context string for the chat
 */
export function buildOCRContextForChat(currentMessageId) {
  const allResults = getAllOCRResults();

  if (allResults.length === 0) {
    return '';
  }

  let contextString = '\n\n--- Previous OCR Results (for context) ---\n';

  allResults.forEach((result, index) => {
    const isCurrentMessage = result.messageId === currentMessageId;
    const marker = isCurrentMessage ? '>>> CURRENT IMAGE <<<' : `Image ${index + 1}`;

    contextString += `\n${marker} (${result.fileName || 'unknown'}):\n`;
    contextString += `"${result.text.trim()}"\n`;
    contextString += `(Confidence: ${(result.confidence * 100).toFixed(1)}%)\n`;
  });

  contextString += '\n--- End of OCR Context ---\n';

  return contextString;
}

/**
 * Clear OCR results (for cleanup)
 */
export function clearOCRResults() {
  try {
    // Get the OCR storage from the container
    const ocrStorage = container.resolve('ocrStorage');
    ocrStorage.clear();
  } catch (error) {
    console.error('[OCR Service] Error clearing OCR results:', error);
  }
}

/**
 * Initialize OCR service (load existing results from storage)
 */
export function initializeOCRService() {
  try {
    // The SessionStorageOCRResultStorage already initializes from storage in its constructor
    console.log('[OCR Service] OCR service initialized');
  } catch (error) {
    console.error('[OCR Service] Error initializing OCR service:', error);
  }
}
