/**
 * Unit tests for MemoryOCRResultStorage
 */
import { MemoryOCRResultStorage } from '../../../../src/lib/modules/document/storage/MemoryOCRResultStorage';

describe('MemoryOCRResultStorage', () => {
  let storage;

  // Sample OCR result for testing
  const sampleResult = {
    messageId: 'test-message-123',
    fileName: 'test.png',
    text: 'This is a test OCR result',
    confidence: 0.85,
    timestamp: '2023-01-01T00:00:00.000Z'
  };

  // Set up a fresh storage instance before each test
  beforeEach(() => {
    storage = new MemoryOCRResultStorage();
  });

  test('should store and retrieve an OCR result', () => {
    // Store the result
    storage.store(sampleResult.messageId, sampleResult);

    // Retrieve the result
    const retrievedResult = storage.retrieve(sampleResult.messageId);

    // Verify the result was stored correctly
    expect(retrievedResult).toEqual(sampleResult);
  });

  test('should return null for non-existent message ID', () => {
    // Attempt to retrieve a non-existent result
    const result = storage.retrieve('non-existent-id');

    // Verify null is returned
    expect(result).toBeNull();
  });

  test('should retrieve all OCR results', () => {
    // Store multiple results
    const result1 = { ...sampleResult, messageId: 'message-1' };
    const result2 = { ...sampleResult, messageId: 'message-2' };

    storage.store(result1.messageId, result1);
    storage.store(result2.messageId, result2);

    // Retrieve all results
    const allResults = storage.retrieveAll();

    // Verify all results are returned
    expect(allResults).toHaveLength(2);
    expect(allResults).toContainEqual(result1);
    expect(allResults).toContainEqual(result2);
  });

  test('should clear all OCR results', () => {
    // Store a result
    storage.store(sampleResult.messageId, sampleResult);

    // Verify it was stored
    expect(storage.retrieve(sampleResult.messageId)).toEqual(sampleResult);

    // Clear all results
    storage.clear();

    // Verify the result was cleared
    expect(storage.retrieve(sampleResult.messageId)).toBeNull();
    expect(storage.retrieveAll()).toHaveLength(0);
  });
});
