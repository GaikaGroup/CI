/**
 * Integration tests for Document Processing
 * 
 * This test demonstrates how the various components work together
 * to process a document using dependency injection.
 */
import { DocumentProcessor } from '../../../src/lib/modules/document/DocumentProcessor';
import { DocumentClassifier } from '../../../src/lib/modules/document/DocumentClassifier';
import { MemoryOCRResultStorage } from '../../../src/lib/modules/document/storage/MemoryOCRResultStorage';
import { ImagePreprocessor } from '../../../src/lib/modules/document/preprocessing/ImagePreprocessor';
import { PDFExtractor } from '../../../src/lib/modules/document/pdf/PDFExtractor';
import { TesseractOCR } from '../../../src/lib/modules/document/engines/TesseractOCR';
import { container } from '../../../src/lib/shared/di/container';
import { DOCUMENT_TYPES } from '../../../src/lib/shared/utils/constants';

// Mock the browser environment
jest.mock('$app/environment', () => ({
  browser: true
}));

describe('Document Processing Integration', () => {
  // Set up the test environment
  beforeEach(() => {
    // Clear the container
    container.clear();
    
    // Create mock components
    const mockImagePreprocessor = new ImagePreprocessor();
    const mockPdfExtractor = new PDFExtractor();
    const mockClassifier = new DocumentClassifier();
    const mockStorage = new MemoryOCRResultStorage();
    
    // Create a mock OCR engine that always returns a fixed result
    const mockOCREngine = new TesseractOCR(mockImagePreprocessor, mockPdfExtractor);
    
    // Mock the recognize method
    mockOCREngine.recognize = jest.fn().mockResolvedValue('This is a test OCR result');
    mockOCREngine.getConfidence = jest.fn().mockResolvedValue(0.9);
    
    // Mock the classifier to always return PRINTED document type
    mockClassifier.classify = jest.fn().mockResolvedValue({
      documentType: DOCUMENT_TYPES.PRINTED,
      confidence: 0.95
    });
    
    // Register the components in the container
    container.register('imagePreprocessor', mockImagePreprocessor);
    container.register('pdfExtractor', mockPdfExtractor);
    container.register('documentClassifier', mockClassifier);
    container.register('ocrStorage', mockStorage);
    
    // Register a factory function that returns the mock OCR engine
    container.registerFactory('ocrEngine', () => {
      return () => mockOCREngine;
    });
  });
  
  test('should process a document end-to-end', async () => {
    // Create a document processor
    const processor = new DocumentProcessor();
    
    // Create a mock file
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    
    // Process the document
    const result = await processor.processDocument(mockFile);
    
    // Verify the result
    expect(result).toEqual({
      text: 'This is a test OCR result',
      documentType: DOCUMENT_TYPES.PRINTED,
      confidence: 0.95
    });
    
    // Verify the classifier was called
    const classifier = container.resolve('documentClassifier');
    expect(classifier.classify).toHaveBeenCalled();
    
    // Verify the OCR engine was used
    const engineFactory = container.resolve('ocrEngine');
    const engine = engineFactory();
    expect(engine.recognize).toHaveBeenCalled();
    
    // Verify the result was stored
    const storage = container.resolve('ocrStorage');
    const allResults = storage.retrieveAll();
    expect(allResults).toHaveLength(1);
    expect(allResults[0].text).toBe('This is a test OCR result');
  });
  
  test('should handle errors gracefully', async () => {
    // Create a document processor
    const processor = new DocumentProcessor();
    
    // Override the classifier to throw an error
    const classifier = container.resolve('documentClassifier');
    classifier.classify.mockRejectedValue(new Error('Test error'));
    
    // Process the document and expect an error
    await expect(processor.processDocument(new File(['test'], 'test.png'))).rejects.toThrow(
      'Failed to process document: Test error'
    );
  });
});