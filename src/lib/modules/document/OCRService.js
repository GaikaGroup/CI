/**
 * OCR Service
 *
 * This service handles OCR processing and ensures results are properly stored
 * in the chat context for memory persistence.
 */

// Store OCR results in memory for chat context
const ocrResultsStore = new Map();

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

    // Import and use the fixed TesseractOCR
    const { TesseractOCR } = await import('./engines/TesseractOCR.js');
    const ocrEngine = new TesseractOCR();

    // Perform OCR
    const ocrResult = await ocrEngine.recognize(imageBuffer);
    const confidence = await ocrEngine.getConfidence(imageBuffer);

    console.log(`[OCR Service] OCR completed for message ${messageId}`);
    console.log(`[OCR Service] Result length: ${ocrResult.length}`);
    console.log(`[OCR Service] Confidence: ${confidence}`);
    console.log(`[OCR Service] Text preview: ${ocrResult.substring(0, 200)}...`);

    // Store the result with metadata
    const ocrData = {
      messageId,
      fileName,
      text: ocrResult,
      confidence,
      timestamp: new Date().toISOString(),
      processed: true
    };

    ocrResultsStore.set(messageId, ocrData);

    // Also store in sessionStorage for persistence across page reloads
    // Note: This is for the main app, not artifacts
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const existingResults = JSON.parse(sessionStorage.getItem('ocrResults') || '{}');
        existingResults[messageId] = ocrData;
        sessionStorage.setItem('ocrResults', JSON.stringify(existingResults));
        console.log(`[OCR Service] Stored OCR result in sessionStorage for message ${messageId}`);
      } catch (storageError) {
        console.warn('[OCR Service] Could not store in sessionStorage:', storageError);
      }
    }

    return ocrResult;
  } catch (error) {
    console.error(`[OCR Service] Error processing OCR for message ${messageId}:`, error);
    throw error;
  }
}

/**
 * Get OCR result from memory
 * @param {string} messageId - The message ID
 * @returns {object|null} - The OCR data or null if not found
 */
export function getOCRResult(messageId) {
  // First check in-memory store
  if (ocrResultsStore.has(messageId)) {
    return ocrResultsStore.get(messageId);
  }

  // Then check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const existingResults = JSON.parse(sessionStorage.getItem('ocrResults') || '{}');
      if (existingResults[messageId]) {
        // Also store back in memory for faster access
        ocrResultsStore.set(messageId, existingResults[messageId]);
        return existingResults[messageId];
      }
    } catch (storageError) {
      console.warn('[OCR Service] Could not read from sessionStorage:', storageError);
    }
  }

  return null;
}

/**
 * Get all OCR results for context building
 * @returns {Array} - Array of all OCR results
 */
export function getAllOCRResults() {
  const results = [];

  // Collect from in-memory store
  for (const [, data] of ocrResultsStore.entries()) {
    results.push(data);
  }

  // Also collect from sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const existingResults = JSON.parse(sessionStorage.getItem('ocrResults') || '{}');
      for (const [messageId, data] of Object.entries(existingResults)) {
        if (!ocrResultsStore.has(messageId)) {
          results.push(data);
        }
      }
    } catch (storageError) {
      console.warn('[OCR Service] Could not read all results from sessionStorage:', storageError);
    }
  }

  return results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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
  ocrResultsStore.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.removeItem('ocrResults');
  }
}

/**
 * Initialize OCR service (load existing results from storage)
 */
export function initializeOCRService() {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const existingResults = JSON.parse(sessionStorage.getItem('ocrResults') || '{}');
      for (const [messageId, data] of Object.entries(existingResults)) {
        ocrResultsStore.set(messageId, data);
      }
      console.log(
        `[OCR Service] Loaded ${Object.keys(existingResults).length} OCR results from storage`
      );
    } catch (storageError) {
      console.warn('[OCR Service] Could not load from sessionStorage:', storageError);
    }
  }
}
