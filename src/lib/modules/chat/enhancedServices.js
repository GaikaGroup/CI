/**
 * Enhanced Chat Services
 *
 * This module provides enhanced chat services with OCR memory integration.
 * It extends the basic chat services to include OCR context in messages.
 */
import { addMessage, updateMessage, messages } from './stores';
import { selectedLanguage } from '$modules/i18n/stores';
import { get } from 'svelte/store';
import { setLoading, setError } from '$lib/stores/app';
import { synthesizeResponseSpeech } from './voiceServices';
import { examProfile } from '$lib/stores/examProfile';
import {
  processOCRWithMemory,
  buildOCRContextForChat,
  initializeOCRService
} from '$lib/modules/document/OCRService';
import {
  WAITING_PHRASES_DEFAULT,
  WAITING_PHRASES_DETAILED,
  OPENAI_CONFIG
} from '$lib/config/api.js';
import { waitingPhrasesService } from './waitingPhrasesService.js';
import { languageDetector } from './LanguageDetector.js';

// Initialize OCR service when this module is imported
if (typeof window !== 'undefined') {
  initializeOCRService();
}

/**
 * Enhanced message sending with OCR context
 * @param {string} content - The message content
 * @param {Array} images - Array of image URLs
 * @returns {Promise<boolean>} - Promise that resolves when the message is sent
 */
export async function sendMessageWithOCRContext(
  content,
  images = [],
  maxTokens = null,
  detailLevel = null,
  minWords = null
) {
  let waitingMessageId;
  try {
    console.log('sendMessageWithOCRContext called with content:', content);
    console.log('sendMessageWithOCRContext called with images:', images?.length || 0);

    setLoading(true);

    const activeExamProfile = get(examProfile);

    // Detect the message language prior to waiting phrase selection
    let targetLanguage = get(selectedLanguage);
    try {
      const detectionResult = languageDetector.detectLanguageFromText(content);
      if (detectionResult?.language) {
        targetLanguage = detectionResult.language;
        const currentLanguage = get(selectedLanguage);
        if (targetLanguage !== currentLanguage) {
          console.log(`Detected OCR message language: ${targetLanguage} (was ${currentLanguage})`);
          // Sync the app's selected language to the detected one
          selectedLanguage.set(targetLanguage);
        }
      }
    } catch (error) {
      console.warn('Failed to detect language from OCR-enhanced content:', error);
    }

    const phraseCategory =
      (maxTokens && maxTokens > OPENAI_CONFIG.MAX_TOKENS) || detailLevel === 'detailed'
        ? WAITING_PHRASES_DETAILED
        : WAITING_PHRASES_DEFAULT;
    const waitingPhrase = await waitingPhrasesService.selectWaitingPhrase(
      targetLanguage,
      phraseCategory
    );
    waitingMessageId = Date.now();
    addMessage('tutor', waitingPhrase, null, waitingMessageId, { waiting: true });

    // Generate a unique message ID for this message
    const messageId = Date.now().toString();

    // If there are images, process them
    if (images && images.length > 0) {
      console.log('Converting blob URLs to base64 strings...');
      const imageDataPromises = images.map(async (imageUrl, index) => {
        try {
          console.log(`Fetching image ${index + 1} from URL:`, imageUrl);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image ${index + 1}: ${response.statusText}`);
          }
          const blob = await response.blob();
          console.log(`Image ${index + 1} fetched successfully, blob size:`, blob.size);

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log(`Image ${index + 1} converted to base64 successfully`);
              resolve({
                data: reader.result,
                blob,
                name: `image_${index + 1}.${blob.type.split('/')[1] || 'png'}`
              });
            };
            reader.onerror = (error) => {
              console.error(`Error reading blob as data URL for image ${index + 1}:`, error);
              reject(error);
            };
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error(`Error converting image ${index + 1} to base64:`, error);
          return null;
        }
      });

      const imageData = await Promise.all(imageDataPromises);
      const validImageData = imageData.filter((data) => data !== null);
      console.log('Valid image data count:', validImageData.length);

      if (validImageData.length === 0) {
        console.error('No valid images to process');
        throw new Error('Failed to process images: No valid images found');
      }

      // Process images locally with OCR memory
      let recognizedText = '';
      console.log('[OCR] Processing images locally in the browser with memory');

      for (let i = 0; i < validImageData.length; i++) {
        const image = validImageData[i];
        try {
          // Convert base64 to buffer for OCR processing
          const base64String = image.data.split(',')[1];
          const binaryString = atob(base64String);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }

          // Process with OCR memory service
          const imgMessageId = `${messageId}_img_${i}`;
          const ocrResult = await processOCRWithMemory(imgMessageId, bytes, image.name);
          recognizedText += ocrResult + '\n\n';
          console.log(
            `[OCR] Image ${i + 1} processed successfully, text length:`,
            ocrResult.length
          );
        } catch (error) {
          console.error(`[OCR] Error processing image ${i + 1}:`, error);
        }
      }

      // Update UI with recognized text
      const userMessage = [...get(messages)]
        .reverse()
        .find((m) => m.type === 'user' && m.images && m.images.length > 0);

      if (userMessage && recognizedText) {
        console.log('[OCR] Updating message with recognized text');
        updateMessage(userMessage.id, { ocrText: recognizedText });
      }

      // Build OCR context for chat
      const ocrContext = buildOCRContextForChat(messageId);
      console.log('[OCR] OCR context built, length:', ocrContext.length);

      // Combine original content with OCR context
      const enhancedContent = content + ocrContext;
      console.log('[OCR] Enhanced content length:', enhancedContent.length);

      // Extract base64 strings for API call
      const base64Images = validImageData.map((img) => img.data);

      // Make API call with images and already processed text
      console.log('[OCR] Sending image and recognized text for message', content, {
        snippet: base64Images[0].slice(0, 50) + '…',
        textLength: recognizedText.length
      });

      const requestBody = {
        content: enhancedContent, // Send enhanced content with OCR context
        images: base64Images,
        recognizedText, // Send the already processed text
        language: get(selectedLanguage),
        ...(activeExamProfile ? { examProfile: activeExamProfile } : {}),
        ...(maxTokens ? { maxTokens } : {}),
        ...(detailLevel ? { detailLevel } : {}),
        ...(minWords ? { minWords } : {})
      };
      console.log('Request body size (approximate):', JSON.stringify(requestBody).length);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`[OCR] Response status:`, response.status);

      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[OCR] Response body:', data);

      // Check if the response contains the expected data
      if (!data.response) {
        console.error('API response missing expected data:', data);
        throw new Error('Invalid response from API');
      }

      console.log('Adding AI response to chat');
      // Add the AI's response to the chat
      updateMessage(waitingMessageId, {
        content: data.response,
        waiting: false,
        animate: true,
        ...(data.provider ? { provider: data.provider } : {})
      });

      // Synthesize speech for the AI response if in voice mode
      console.log('Checking if speech synthesis is needed for OCR response');
      await synthesizeResponseSpeech(data.response);

      return true;
    } else {
      // No images, just send the text message
      console.log('No images to process, sending text-only message');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          images: [],
          language: get(selectedLanguage),
          ...(maxTokens ? { maxTokens } : {}),
          ...(detailLevel ? { detailLevel } : {}),
          ...(minWords ? { minWords } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      // Add the AI's response to the chat
      updateMessage(waitingMessageId, {
        content: data.response,
        waiting: false,
        animate: true,
        ...(data.provider ? { provider: data.provider } : {})
      });

      return true;
    }
  } catch (error) {
    console.error('Error sending message with OCR context:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Set a more descriptive error message for the user
    const errorMessage = error.message || 'Unknown error occurred';
    setError(`Failed to send message: ${errorMessage}. Please try again.`);
    updateMessage(waitingMessageId, { content: `Error: ${errorMessage}`, waiting: false });
    return false;
  } finally {
    console.log('sendMessageWithOCRContext function completed, setting loading to false');
    setLoading(false);
  }
}
