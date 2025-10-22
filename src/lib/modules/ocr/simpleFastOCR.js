/**
 * Simple and Fast OCR for instruments
 * No complex preprocessing - just quick recognition
 */

import { createWorker } from 'tesseract.js';

/**
 * Fast OCR - just recognize text without heavy preprocessing
 */
export async function fastOCR(imageFile) {
  const worker = await createWorker('rus+eng', 1, {
    logger: () => {} // Disable logging for speed
  });

  try {
    // Simple recognition with PSM 6 (uniform text block)
    await worker.setParameters({
      tessedit_pageseg_mode: '6',
      preserve_interword_spaces: '1'
    });

    const { data } = await worker.recognize(imageFile);

    return {
      text: data.text || '',
      confidence: data.confidence || 0
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract all useful data from OCR text
 */
export function extractData(ocrText) {
  const data = {
    text: ocrText,
    numbers: [],
    measurements: [],
    instruments: []
  };

  // Extract all numbers
  const numberRegex = /\b\d+(?:[.,]\d+)?\b/g;
  let match;
  while ((match = numberRegex.exec(ocrText)) !== null) {
    data.numbers.push(match[0].replace(',', '.'));
  }

  // Extract measurements
  const measurementRegex = /(\d+(?:[.,]\d+)?)\s*(°C|см|км\/ч|А|м|мм|кг|г|°|%)/gi;
  while ((match = measurementRegex.exec(ocrText)) !== null) {
    data.measurements.push({
      value: match[1].replace(',', '.'),
      unit: match[2]
    });
  }

  // Detect instruments
  const instruments = {
    термометр: 'thermometer',
    линейка: 'ruler',
    амперметр: 'ammeter',
    спидометр: 'speedometer',
    секундомер: 'stopwatch'
  };

  for (const [keyword, type] of Object.entries(instruments)) {
    if (new RegExp(keyword, 'i').test(ocrText)) {
      data.instruments.push(type);
    }
  }

  return data;
}

/**
 * Process image with fast OCR
 */
export async function processImageFast(file) {
  try {
    const result = await fastOCR(file);
    const extracted = extractData(result.text);

    return {
      text: result.text,
      confidence: result.confidence,
      structured: extracted,
      count: extracted.numbers.length
    };
  } catch (error) {
    console.error('Fast OCR error:', error);
    return null;
  }
}
