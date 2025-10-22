/**
 * OCR Chat Service
 * Handles OCR integration in chat messages
 */

import {
  createOCRContextMessage,
  enhanceMessageWithOCR
} from '$lib/modules/ocr/ocrChatIntegration';
import { setOcrResults, ocrResults } from './stores';
import { get } from 'svelte/store';

/**
 * Process images with OCR data and prepare context for LLM
 */
export function prepareOCRContext(images) {
  if (!images || images.length === 0) return null;

  const ocrImages = images.filter((img) => typeof img === 'object' && img.ocrData);

  if (ocrImages.length === 0) return null;

  // Combine all OCR data
  let combinedText = '';
  let totalCount = 0;
  const structuredData = {};

  ocrImages.forEach((img, index) => {
    const data = img.ocrData;
    combinedText += `\n📊 Изображение ${index + 1} (${img.name}):\n${data.text}\n`;
    totalCount += data.count;

    // Merge structured data
    Object.entries(data.structured).forEach(([label, items]) => {
      if (!structuredData[label]) {
        structuredData[label] = [];
      }
      structuredData[label].push(...items);
    });
  });

  return {
    text: combinedText.trim(),
    structured: structuredData,
    count: totalCount
  };
}

/**
 * Create system message with OCR context for LLM
 */
export function createOCRSystemMessage(ocrContext) {
  if (!ocrContext) return null;

  return {
    role: 'system',
    content: `На изображениях распознаны следующие измерительные приборы:\n\n${ocrContext.text}\n\nИспользуй эту информацию для ответа на вопросы пользователя. Если пользователь спрашивает о цене деления, показаниях приборов или других измерениях, используй распознанные данные.`
  };
}

/**
 * Enhance user message with OCR context
 */
export function enhanceUserMessage(content, ocrContext) {
  if (!ocrContext) return content;

  // Check if user is asking about instruments
  const instrumentKeywords = [
    'цена деления',
    'прибор',
    'термометр',
    'линейка',
    'амперметр',
    'спидометр',
    'секундомер',
    'показания',
    'измерение',
    'шкала'
  ];

  const hasInstrumentQuestion = instrumentKeywords.some((keyword) =>
    content.toLowerCase().includes(keyword)
  );

  if (hasInstrumentQuestion) {
    return `${content}\n\n[Контекст: На изображениях распознано ${ocrContext.count} прибор(ов)]`;
  }

  return content;
}

/**
 * Build complete message history with OCR context
 */
export function buildMessagesWithOCR(messages, userMessage, images) {
  const history = [];

  // Add previous messages
  messages.forEach((msg) => {
    if (msg.type === 'user') {
      history.push({
        role: 'user',
        content: msg.content
      });
    } else if (msg.type === 'tutor' || msg.type === 'assistant') {
      history.push({
        role: 'assistant',
        content: msg.content
      });
    }
  });

  // Prepare OCR context from images
  const ocrContext = prepareOCRContext(images);

  // Add OCR system message if available
  if (ocrContext) {
    const systemMessage = createOCRSystemMessage(ocrContext);
    if (systemMessage) {
      history.push(systemMessage);
    }
  }

  // Add current user message (enhanced with OCR context if relevant)
  const enhancedMessage = enhanceUserMessage(userMessage, ocrContext);
  history.push({
    role: 'user',
    content: enhancedMessage
  });

  return {
    messages: history,
    ocrContext
  };
}

/**
 * Extract OCR summary for display
 */
export function getOCRSummary(ocrContext) {
  if (!ocrContext) return null;

  const { structured, count } = ocrContext;

  const instrumentLabels = {
    speedometer: 'Спидометр',
    ammeter: 'Амперметр',
    thermometer: 'Термометр',
    ruler: 'Линейка',
    stopwatch: 'Секундомер',
    unknown: 'Неизвестный прибор'
  };

  const summary = [];

  Object.entries(structured).forEach(([label, items]) => {
    const labelName = instrumentLabels[label] || label;
    summary.push(`${labelName}: ${items.length}`);
  });

  return {
    total: count,
    breakdown: summary.join(', ')
  };
}

/**
 * Check if message should trigger OCR processing
 */
export function shouldProcessOCR(content) {
  const triggers = [
    'цена деления',
    'измерительный прибор',
    'термометр',
    'линейка',
    'амперметр',
    'спидометр',
    'секундомер',
    'показания',
    'шкала',
    'деление',
    'измерение'
  ];

  const lower = content.toLowerCase();
  return triggers.some((trigger) => lower.includes(trigger));
}

/**
 * Format OCR results for chat display
 */
export function formatOCRForChat(ocrContext) {
  if (!ocrContext) return '';

  const summary = getOCRSummary(ocrContext);
  if (!summary) return '';

  return `📊 Распознано приборов: ${summary.total}\n${summary.breakdown}`;
}
