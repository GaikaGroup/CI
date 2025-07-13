/**
 * OCR Engine Registry
 *
 * This class is responsible for managing OCR engines and selecting the appropriate
 * engine for a given document type.
 */
import { DOCUMENT_TYPES } from '$lib/shared/utils/constants';
import { TesseractOCR } from './engines/TesseractOCR';
import { EasyOCR } from './engines/EasyOCR';
import { PdfJS } from './engines/PdfJS';

export class OCREngineRegistry {
  constructor() {
    this.engines = {
      [DOCUMENT_TYPES.PRINTED]: new TesseractOCR(),
      [DOCUMENT_TYPES.HANDWRITTEN]: new EasyOCR(),
      [DOCUMENT_TYPES.MIXED]: new TesseractOCR(), // Default to Tesseract for mixed content
      [DOCUMENT_TYPES.PDF]: new PdfJS(), // Use PdfJS for PDF documents
      [DOCUMENT_TYPES.UNKNOWN]: new TesseractOCR() // Default to Tesseract for unknown content
    };
  }

  /**
   * Get the appropriate OCR engine for a document type
   * @param {string} documentType - The document type
   * @returns {Object} - The OCR engine
   */
  getEngine(documentType) {
    console.log('OCREngineRegistry.getEngine called with document type:', documentType);

    // If the document type is not supported, use the default engine (Tesseract)
    if (!this.engines[documentType]) {
      console.warn(`Unsupported document type: ${documentType}. Using default engine.`);
      const defaultEngine = this.engines[DOCUMENT_TYPES.PRINTED];
      console.log('Using default engine:', defaultEngine.constructor.name);
      return defaultEngine;
    }

    const selectedEngine = this.engines[documentType];
    console.log(
      'Selected engine for document type:',
      documentType,
      'is',
      selectedEngine.constructor.name
    );
    return selectedEngine;
  }

  /**
   * Register a new OCR engine
   * @param {string} documentType - The document type
   * @param {Object} engine - The OCR engine
   */
  registerEngine(documentType, engine) {
    this.engines[documentType] = engine;
  }
}
