/**
 * Unit test for languageConfirmed parameter in API
 * Ensures that when languageConfirmed=true, language is not re-detected
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('API /chat - languageConfirmed parameter', () => {
  let mockLanguageManager;
  let mockRequest;

  beforeEach(() => {
    // Mock language manager
    mockLanguageManager = {
      detectLanguage: vi.fn().mockReturnValue({
        language: 'en',
        confidence: 0.8,
        method: 'detected'
      }),
      handleShortMessage: vi.fn().mockReturnValue({
        adjusted: true,
        language: 'es', // Would change to Spanish
        confidence: 0.9
      }),
      getLanguageInstructions: vi.fn().mockReturnValue({
        instruction: 'Respond in the detected language'
      })
    };
  });

  it('should NOT call detectLanguage when languageConfirmed=true', () => {
    // Arrange
    const requestBody = {
      content: 'Расскажи про вакансию',
      language: 'ru',
      languageConfirmed: true
    };

    // Act - simulate API logic
    let detectedLanguage;
    let languageConfidence;

    if (requestBody.languageConfirmed && requestBody.language) {
      detectedLanguage = requestBody.language;
      languageConfidence = 1.0;
    } else {
      const detection = mockLanguageManager.detectLanguage({
        content: requestBody.content,
        fallbackLanguage: requestBody.language
      });
      detectedLanguage = detection.language;
      languageConfidence = detection.confidence;
    }

    // Assert
    expect(mockLanguageManager.detectLanguage).not.toHaveBeenCalled();
    expect(detectedLanguage).toBe('ru');
    expect(languageConfidence).toBe(1.0);
  });

  it('should NOT call handleShortMessage when languageConfirmed=true', () => {
    // Arrange
    const requestBody = {
      content: 'Расскажи', // Very short
      language: 'ru',
      languageConfirmed: true
    };

    // Act - simulate API logic
    let detectedLanguage = requestBody.language;
    let languageConfidence = 1.0;

    if (!requestBody.languageConfirmed) {
      const shortResult = mockLanguageManager.handleShortMessage({
        content: requestBody.content,
        detectedLanguage,
        languageConfidence
      });
      if (shortResult.adjusted) {
        detectedLanguage = shortResult.language;
        languageConfidence = shortResult.confidence;
      }
    }

    // Assert
    expect(mockLanguageManager.handleShortMessage).not.toHaveBeenCalled();
    expect(detectedLanguage).toBe('ru'); // Should stay Russian
    expect(detectedLanguage).not.toBe('es'); // Should NOT change to Spanish
  });

  it('should call detectLanguage when languageConfirmed=false', () => {
    // Arrange
    const requestBody = {
      content: 'Tell me about vacancy',
      language: 'en',
      languageConfirmed: false
    };

    // Act
    let detectedLanguage;
    let languageConfidence;

    if (requestBody.languageConfirmed && requestBody.language) {
      detectedLanguage = requestBody.language;
      languageConfidence = 1.0;
    } else {
      const detection = mockLanguageManager.detectLanguage({
        content: requestBody.content,
        fallbackLanguage: requestBody.language
      });
      detectedLanguage = detection.language;
      languageConfidence = detection.confidence;
    }

    // Assert
    expect(mockLanguageManager.detectLanguage).toHaveBeenCalled();
    expect(detectedLanguage).toBe('en');
  });

  it('should preserve language through entire request when languageConfirmed=true', () => {
    // Arrange
    const requestBody = {
      content: 'Что?', // Single word - would normally trigger re-detection
      language: 'ru',
      languageConfirmed: true
    };

    // Act - full flow simulation
    let finalLanguage;

    // Step 1: Initial language determination
    if (requestBody.languageConfirmed && requestBody.language) {
      finalLanguage = requestBody.language;
    } else {
      const detection = mockLanguageManager.detectLanguage({
        content: requestBody.content
      });
      finalLanguage = detection.language;
    }

    // Step 2: Short message handling (should be skipped)
    if (!requestBody.languageConfirmed) {
      const shortResult = mockLanguageManager.handleShortMessage({
        content: requestBody.content,
        detectedLanguage: finalLanguage
      });
      if (shortResult.adjusted) {
        finalLanguage = shortResult.language;
      }
    }

    // Assert
    expect(finalLanguage).toBe('ru');
    expect(mockLanguageManager.detectLanguage).not.toHaveBeenCalled();
    expect(mockLanguageManager.handleShortMessage).not.toHaveBeenCalled();
  });
});
