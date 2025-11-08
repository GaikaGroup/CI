/**
 * Integration test for Voice Mode with PDF attachment
 * Tests the complete flow: voice input → OCR → API → response in correct language
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Voice Mode with PDF Integration', () => {
  let testPDFBase64;
  let mockSessionId;

  beforeAll(() => {
    // Load test PDF
    const pdfPath = join(process.cwd(), 'tests/fixtures/test-vacancy.pdf');
    const pdfBuffer = readFileSync(pdfPath);
    testPDFBase64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    mockSessionId = `voice_test_${Date.now()}`;
  });

  afterAll(() => {
    // Cleanup
  });

  it('should respond in Russian when question is in Russian with PDF', async () => {
    // Arrange
    const russianQuestion = 'Расскажи про вакансию. Какие требования?';
    const images = [
      {
        url: 'blob:test',
        type: 'application/pdf',
        name: 'test-vacancy.pdf'
      }
    ];

    // Mock OCR result
    const mockOCRText = 'Ищем Speech AI Engineer. Требования: Python, ML, английский язык.';

    // Act - simulate Voice mode flow
    const response = await fetch('http://localhost:3005/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=test-session'
      },
      body: JSON.stringify({
        content: russianQuestion,
        images: [testPDFBase64],
        recognizedText: mockOCRText,
        language: 'ru',
        languageConfirmed: true,
        stream: true
      })
    });

    // Assert
    expect(response.ok).toBe(true);

    const text = await response.text();

    // Should NOT contain Spanish
    expect(text).not.toMatch(/¡Claro!/);
    expect(text).not.toMatch(/¿Cómo puedo ayudarte/);

    // Should contain Russian response about the vacancy
    expect(text).toMatch(/вакан|требован|специалист|инженер/i);
  });

  it('should respond in English when question is in English with PDF', async () => {
    // Arrange
    const englishQuestion = 'Tell me about this vacancy. What are the requirements?';
    const mockOCRText = 'Looking for Speech AI Engineer. Requirements: Python, ML, English.';

    // Act
    const response = await fetch('http://localhost:3005/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=test-session'
      },
      body: JSON.stringify({
        content: englishQuestion,
        images: [testPDFBase64],
        recognizedText: mockOCRText,
        language: 'en',
        languageConfirmed: true,
        stream: true
      })
    });

    // Assert
    expect(response.ok).toBe(true);

    const text = await response.text();

    // Should NOT contain Spanish
    expect(text).not.toMatch(/¡Claro!/);
    expect(text).not.toMatch(/¿Cómo puedo ayudarte/);

    // Should contain English response about the vacancy
    expect(text).toMatch(/vacancy|requirement|engineer|position/i);
  });

  it('should include PDF content in response', async () => {
    // Arrange
    const question = 'Какой опыт требуется?';
    const mockOCRText = 'Требуется опыт: 3+ года в ML, знание Python, TensorFlow.';

    // Act
    const response = await fetch('http://localhost:3005/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=test-session'
      },
      body: JSON.stringify({
        content: question,
        images: [testPDFBase64],
        recognizedText: mockOCRText,
        language: 'ru',
        languageConfirmed: true,
        stream: true
      })
    });

    // Assert
    expect(response.ok).toBe(true);

    const text = await response.text();

    // Should mention specific requirements from PDF
    expect(text).toMatch(/3.*год|Python|ML|TensorFlow/i);
  });

  it('should NOT re-detect language when languageConfirmed is true', async () => {
    // Arrange
    const shortRussianQuestion = 'Расскажи.'; // Very short - would normally trigger re-detection
    const mockOCRText = 'Test vacancy content';

    // Act
    const response = await fetch('http://localhost:3005/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'session=test-session'
      },
      body: JSON.stringify({
        content: shortRussianQuestion,
        images: [testPDFBase64],
        recognizedText: mockOCRText,
        language: 'ru',
        languageConfirmed: true, // This should prevent re-detection
        stream: true
      })
    });

    // Assert
    expect(response.ok).toBe(true);

    const text = await response.text();

    // Should respond in Russian, NOT in default language or Spanish
    expect(text).not.toMatch(/¡Claro!/);
    expect(text).not.toMatch(/Hello|Hi there/i);
  });
});
