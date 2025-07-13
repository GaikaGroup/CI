/**
 * Document Recognition Services
 *
 * This file contains services for document recognition.
 */
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, API_ENDPOINTS } from '$lib/shared/utils/constants';

/**
 * Validate a file for document recognition
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result with isValid and error properties
 */
export function validateFile(file) {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: 'No file selected'
    };
  }

  // Check file type
  const fileType = file.type.toLowerCase();
  if (!SUPPORTED_FILE_TYPES.includes(fileType)) {
    return {
      isValid: false,
      error: `Unsupported file type. Supported types: ${SUPPORTED_FILE_TYPES.map((type) => type.split('/')[1]).join(', ')}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Recognize text in a document
 * @param {File} file - The document file
 * @returns {Promise<Object>} - Recognition result with text, documentType, and confidence
 */
export async function recognizeDocument(file) {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Send request to API
    const response = await fetch(API_ENDPOINTS.DOCUMENT.RECOGNIZE, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to recognize document');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error recognizing document:', error);
    throw error;
  }
}
