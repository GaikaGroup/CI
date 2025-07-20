import { DOCUMENT_TYPES } from '$lib/shared/utils/constants';
import { TesseractOCR } from '../engines/TesseractOCR';
import { EasyOCR } from '../engines/EasyOCR';
import { PdfJS } from '../engines/PdfJS';
import { ImagePreprocessor } from '../preprocessing/ImagePreprocessor';
import { PDFExtractor } from '../pdf/PDFExtractor';

/**
 * OCR Engine Factory
 * 
 * This class is responsible for creating OCR engines based on document type.
 * It follows the factory pattern to create the appropriate OCR engine for a given document type.
 */
export class OCREngineFactory {
  /**
   * Create an OCR engine for the specified document type
   * @param {string} documentType - The document type from DOCUMENT_TYPES
   * @param {object} config - Optional configuration for the OCR engine
   * @returns {IOCREngine} - The OCR engine instance
   */
  static createEngine(documentType, config = {}) {
    console.log(`[OCREngineFactory] Creating engine for document type: ${documentType}`);
    
    // Create shared dependencies
    const preprocessor = new ImagePreprocessor();
    const pdfExtractor = new PDFExtractor(config);
    
    // Select the appropriate engine based on document type
    switch (documentType) {
      case DOCUMENT_TYPES.PRINTED:
        console.log('[OCREngineFactory] Creating TesseractOCR engine for printed document');
        return new TesseractOCR(preprocessor, pdfExtractor, config);
        
      case DOCUMENT_TYPES.HANDWRITTEN:
        console.log('[OCREngineFactory] Creating EasyOCR engine for handwritten document');
        return new EasyOCR(preprocessor, pdfExtractor, config);
        
      case DOCUMENT_TYPES.PDF:
        console.log('[OCREngineFactory] Creating PdfJS engine for PDF document');
        return new PdfJS(pdfExtractor, config);
        
      case DOCUMENT_TYPES.MIXED:
        console.log('[OCREngineFactory] Creating TesseractOCR engine for mixed document');
        return new TesseractOCR(preprocessor, pdfExtractor, config);
        
      case DOCUMENT_TYPES.UNKNOWN:
      default:
        console.log('[OCREngineFactory] Creating default TesseractOCR engine for unknown document type');
        return new TesseractOCR(preprocessor, pdfExtractor, config);
    }
  }
}