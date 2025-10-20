/**
 * OCR Chat Integration
 * Connects universal OCR pipeline with chat functionality
 */

import { ocrTextbookUniversal, normalizeTextbookStrings, defaultConfig } from './ocrTextbookUniversal';

/**
 * Process any image using FAST OCR
 * @param {File} file - Image file to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} OCR results with text and structured data
 */
export async function processImage(file, options = {}) {
  try {
    // Use simple fast OCR instead of complex pipeline
    const { processImageFast } = await import('./simpleFastOCR.js');
    const result = await processImageFast(file);
    
    if (!result) return null;
    
    return {
      text: result.text,
      structured: result.structured,
      count: result.count,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    return null;
  }
}

/**
 * Extract structured data from OCR results
 * Auto-detects: measurements, instruments, math, formulas, scales, etc.
 */
function extractStructuredData(results) {
  const structured = {
    measurements: [],
    instruments: [],
    numbers: [],
    scales: [],
    units: [],
    formulas: [],
    questions: []
  };
  
  for (const result of results) {
    const text = result.text;
    
    // Extract measurements (number + unit)
    const measurementRegex = /(\d+(?:[.,]\d+)?)\s*(°C|см|км\/ч|А|м|мм|кг|г|л|мл|°|%|Вт|В|Ом)/gi;
    let match;
    while ((match = measurementRegex.exec(text)) !== null) {
      structured.measurements.push({
        value: match[1].replace(',', '.'),
        unit: match[2],
        text: match[0]
      });
    }
    
    // Extract ALL numbers (including scale markings)
    const numberRegex = /\b\d+(?:[.,]\d+)?\b/g;
    while ((match = numberRegex.exec(text)) !== null) {
      const num = match[0].replace(',', '.');
      structured.numbers.push(num);
    }
    
    // Detect scale ranges (e.g., "0-100", "35 37 39 41")
    const rangeRegex = /(\d+)\s*[-–—]\s*(\d+)/g;
    while ((match = rangeRegex.exec(text)) !== null) {
      structured.scales.push({
        min: match[1],
        max: match[2],
        text: match[0]
      });
    }
    
    // Detect instrument types
    const instrumentKeywords = {
      thermometer: /термометр/i,
      ruler: /линейка/i,
      ammeter: /амперметр/i,
      speedometer: /спидометр/i,
      stopwatch: /секундомер/i,
      voltmeter: /вольтметр/i,
      scale: /весы/i
    };
    
    for (const [type, regex] of Object.entries(instrumentKeywords)) {
      if (regex.test(text)) {
        structured.instruments.push({ type, text: result.text });
      }
    }
    
    // Detect math formulas
    const formulaRegex = /[a-zA-Zа-яА-Я]\s*[=+\-*/]\s*[\d.]+|[a-zA-Zа-яА-Я]\^?\d+/g;
    while ((match = formulaRegex.exec(text)) !== null) {
      structured.formulas.push(match[0]);
    }
    
    // Detect questions
    if (/\?|задача|найти|определить|вычислить|решить|какова|цена деления/i.test(text)) {
      structured.questions.push(text);
    }
  }
  
  return structured;
}

// Backward compatibility alias
export const processInstrumentImage = processImage;

/**
 * Create OCR context message for LLM
 */
export function createOCRContextMessage(ocrData) {
  if (!ocrData || !ocrData.text) return null;
  
  let context = `📊 Распознанный текст с изображения:\n${ocrData.text}\n`;
  
  if (ocrData.structured.numbers.length > 0) {
    context += `\n🔢 Обнаруженные числа на изображении: ${ocrData.structured.numbers.join(', ')}`;
  }
  
  if (ocrData.structured.scales.length > 0) {
    context += `\n📏 Шкалы: ${ocrData.structured.scales.map(s => `${s.min}-${s.max}`).join(', ')}`;
  }
  
  if (ocrData.structured.measurements.length > 0) {
    context += `\n📐 Измерения: ${ocrData.structured.measurements.map(m => `${m.value} ${m.unit}`).join(', ')}`;
  }
  
  if (ocrData.structured.instruments.length > 0) {
    context += `\n🔬 Приборы: ${ocrData.structured.instruments.map(i => i.type).join(', ')}`;
  }
  
  context += `\n\n💡 Используй эти данные для ответа на вопрос. Все числа и шкалы уже распознаны.`;
  
  return context;
}

/**
 * Enhance message with OCR data
 */
export function enhanceMessageWithOCR(message, ocrData) {
  if (!ocrData) return message;
  
  const context = createOCRContextMessage(ocrData);
  if (!context) return message;
  
  return `${message}\n\n${context}`;
}
