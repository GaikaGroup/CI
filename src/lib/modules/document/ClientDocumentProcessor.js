/**
 * Client Document Processor with Advanced OCR
 *
 * Uses advanced Tesseract OCR with preprocessing for better number recognition
 * Uses PdfJS for PDF documents
 */
import { AdvancedTesseractOCR } from './engines/AdvancedTesseractOCR';
import { PdfJS } from './engines/PdfJS';
import { PDFExtractor } from './pdf/PDFExtractor';
import { browser } from '$app/environment';

/**
 * Process a document in the client with advanced OCR
 * @param {string} imageData - Base64 encoded image data
 * @returns {Promise<Object>} - The processing result with text, document type, and confidence
 * @throws {Error} - If called outside of browser context
 */
export async function processDocumentInClient(imageData) {
  if (!browser) {
    throw new Error('This function must only be called in browser context');
  }

  // Check if it's a PDF
  const isPDF = imageData.startsWith('data:application/pdf');

  if (isPDF) {
    console.log('[PDF] Processing PDF document');

    // Convert base64 to Uint8Array
    const base64String = imageData.split(',')[1];
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Use PdfJS for PDF
    const pdfExtractor = new PDFExtractor();
    const pdfEngine = new PdfJS(pdfExtractor);

    const text = await pdfEngine.recognize(bytes);
    const confidence = 0.9; // PDF text extraction is usually reliable

    console.log('[PDF] Result:', {
      textLength: text.length,
      preview: text.substring(0, 100)
    });

    return {
      text,
      documentType: 'pdf',
      confidence,
      metadata: {
        engine: 'PdfJS',
        timestamp: new Date().toISOString()
      }
    };
  } else {
    console.log('[Advanced OCR] Processing image with enhanced recognition');

    // Convert base64 to Uint8Array
    const base64String = imageData.split(',')[1];
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Use advanced OCR for images
    const ocr = new AdvancedTesseractOCR({
      upscale: 2.5,
      minConf: 50
    });

    const text = await ocr.recognize(bytes);
    const confidence = await ocr.getConfidence(bytes);

    console.log('[Advanced OCR] Result:', {
      textLength: text.length,
      confidence: confidence,
      preview: text.substring(0, 100)
    });

    return {
      text,
      documentType: 'image',
      confidence,
      metadata: {
        engine: 'AdvancedTesseractOCR',
        timestamp: new Date().toISOString()
      }
    };
  }
}
