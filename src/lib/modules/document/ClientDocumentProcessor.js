/**
 * Client Document Processor
 *
 * This module provides a function for processing documents entirely on the client-side.
 * It ensures OCR processing only happens in the browser context.
 */
import { DocumentProcessor } from './DocumentProcessor';
import { browser } from '$app/environment';

/**
 * Process a document in the client
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<Object>} - The processing result with text, document type, and confidence
 * @throws {Error} - If called outside of browser context
 */
export async function processDocumentInClient(imageData) {
  if (!browser) {
    throw new Error('This function must only be called in browser context');
  }

  console.log('[ClientDocumentProcessor] Processing document in client');

  // Convert base64 to blob
  const base64String = imageData.split(',')[1];
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Get the MIME type from the data URL
  const mimeMatch = imageData.match(/^data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const blob = new Blob([bytes], { type: mimeType });

  // Process in client
  console.log('[ClientDocumentProcessor] Creating DocumentProcessor instance');
  const processor = new DocumentProcessor();
  console.log('[ClientDocumentProcessor] Calling processDocument');
  return await processor.processDocument(blob);
}
