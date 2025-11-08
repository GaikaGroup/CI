/**
 * Enhanced Chat Services
 *
 * This module provides enhanced chat services with OCR memory integration.
 * It extends the basic chat services to include OCR context in messages.
 */
/* eslint-disable no-constant-condition */
import { addMessage, updateMessage, messages } from './stores';
import { selectedLanguage } from '$modules/i18n/stores';
import { get } from 'svelte/store';
import { setLoading, setError } from '$lib/stores/app';
import { synthesizeResponseSpeech, determineEmotion } from './voice';
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
import { StreamingResponseHandler } from './StreamingResponseHandler.js';
import { StreamingTTSCoordinator } from './StreamingTTSCoordinator.js';
import { isVoiceModeActive, clearWaitingPhrasesFromQueue } from './voice/index.js';
import { audioBufferManager } from './AudioBufferManager.js';

// Initialize OCR service when this module is imported
if (typeof window !== 'undefined') {
  initializeOCRService();
}

/**
 * Enhanced message sending with OCR context
 * @param {string} content - The message content
 * @param {Array} images - Array of image URLs
 * @param {boolean} useOCRMemory - Whether to use OCR memory context (default: true)
 * @returns {Promise<boolean>} - Promise that resolves when the message is sent
 */
export async function sendMessageWithOCRContext(
  content,
  images = [],
  maxTokens = null,
  detailLevel = null,
  minWords = null,
  useOCRMemory = true
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
      const imageDataPromises = images.map(async (imageObj, index) => {
        try {
          // imageObj can be either a string URL or an object with {url, type, name}
          const imageUrl = typeof imageObj === 'string' ? imageObj : imageObj.url;
          const originalType = typeof imageObj === 'object' ? imageObj.type : null;
          const originalName = typeof imageObj === 'object' ? imageObj.name : null;

          console.log(`Fetching image ${index + 1} from URL:`, imageObj);
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
              // Use original type if available, otherwise use blob type
              const fileType = originalType || blob.type;
              const fileName =
                originalName || `image_${index + 1}.${fileType.split('/')[1] || 'png'}`;

              resolve({
                data: reader.result,
                blob,
                name: fileName,
                type: fileType
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

      // Separate images and PDFs
      const imageFiles = validImageData.filter((data) => data.type.startsWith('image/'));
      const pdfFiles = validImageData.filter((data) => data.type === 'application/pdf');

      console.log(`[OCR] Found ${imageFiles.length} images and ${pdfFiles.length} PDFs`);

      // Process images locally with OCR memory
      let recognizedText = '';

      if (imageFiles.length > 0) {
        console.log('[OCR] Processing images locally in the browser with memory');

        for (let i = 0; i < imageFiles.length; i++) {
          const image = imageFiles[i];
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
      }

      // Process PDFs locally with OCR memory
      if (pdfFiles.length > 0) {
        console.log('[OCR] Processing PDFs locally in the browser with memory');

        for (let i = 0; i < pdfFiles.length; i++) {
          const pdf = pdfFiles[i];
          try {
            // Convert base64 to buffer for OCR processing
            const base64String = pdf.data.split(',')[1];
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }

            // Process with OCR memory service
            const pdfMessageId = `${messageId}_pdf_${i}`;
            const ocrResult = await processOCRWithMemory(pdfMessageId, bytes, pdf.name);
            recognizedText += ocrResult + '\n\n';
            console.log(
              `[OCR] PDF ${i + 1} processed successfully, text length:`,
              ocrResult.length
            );
          } catch (error) {
            console.error(`[OCR] Error processing PDF ${i + 1}:`, error);
            recognizedText += `\n[Error processing PDF ${i + 1}: ${error.message}]\n\n`;
          }
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

      // Build OCR context for chat (only if useOCRMemory is true)
      let ocrContext = '';
      if (useOCRMemory) {
        ocrContext = buildOCRContextForChat(messageId);
        console.log('[OCR] OCR context built, length:', ocrContext.length);
      } else {
        console.log('[OCR] Skipping OCR memory context (useOCRMemory=false)');
      }

      // Combine original content with OCR context
      // For Voice mode, don't add OCR context to content (it's sent separately as recognizedText)
      const isVoiceMode = get(isVoiceModeActive);
      const enhancedContent = isVoiceMode ? content : content + ocrContext;
      console.log(
        '[OCR] Enhanced content length:',
        enhancedContent.length,
        isVoiceMode ? '(Voice mode - no OCR in content)' : '(Text mode - OCR in content)'
      );

      // Extract base64 strings for API call (only the data field, not the whole object)
      const base64Images = validImageData.map((img) => img.data);

      // Separate actual images from PDFs for API call
      // PDFs should NOT be sent to OpenAI vision API - only actual images
      const base64OnlyImages = imageFiles.map((img) => img.data);
      const hasPDF = pdfFiles.length > 0;
      const hasActualImages = imageFiles.length > 0;

      console.log('[OCR] Sending files and recognized text for message', content, {
        imagesCount: imageFiles.length,
        pdfsCount: pdfFiles.length,
        hasActualImages,
        hasPDF,
        firstFileSnippet: base64Images[0]?.slice(0, 50) + '…',
        textLength: recognizedText.length
      });

      // Use targetLanguage which was used to select waiting phrase
      // This ensures language consistency between waiting phrase and response
      const requestLanguage = targetLanguage;
      const languageConfirmed = true; // Language is confirmed from message detection

      console.log(
        '[OCR] Using language for API request:',
        requestLanguage,
        '(from message detection - CONFIRMED)'
      );

      const requestBody = {
        content: enhancedContent, // Send enhanced content with OCR context
        images: base64OnlyImages, // ONLY actual images, NOT PDFs
        recognizedText, // Send the already processed text
        language: requestLanguage,
        languageConfirmed, // Tell API not to re-detect language if true
        stream: get(isVoiceModeActive), // Enable streaming in voice mode (Requirement 1.1)
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

      // Check if streaming response (Requirement 1.1)
      const contentType = response.headers.get('content-type');
      if (get(isVoiceModeActive) && contentType && contentType.includes('text/plain')) {
        console.log('[OCR] Processing streaming response');

        // Initialize streaming handlers (Requirement 1.2, 1.3)
        // Use language from waiting phrase if available (avoid re-detection)
        const { getWaitingPhraseLanguage } = await import('./voice/index.js');
        const waitingLanguage = getWaitingPhraseLanguage();
        const language = waitingLanguage || get(selectedLanguage);
        console.log(
          '[OCR Streaming] Using language:',
          language,
          waitingLanguage ? '(from waiting phrase)' : '(from store)'
        );

        const streamingTTSCoordinator = new StreamingTTSCoordinator({
          onAudioReady: async (audioData) => {
            console.log('[OCR Streaming] Audio ready:', audioData.taskId);

            // Wait for waiting phrase to complete before adding to queue
            const { isWaitingPhraseActive } = await import('./voice/index.js');
            if (isWaitingPhraseActive()) {
              console.log('[OCR Streaming] Waiting for waiting phrase to complete...');
              // Poll until waiting phrase is done
              await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  if (!isWaitingPhraseActive()) {
                    clearInterval(checkInterval);
                    console.log('[OCR Streaming] Waiting phrase completed, proceeding with audio');
                    resolve();
                  }
                }, 100); // Check every 100ms
              });
            }

            // Add to audio buffer for playback
            try {
              await audioBufferManager.bufferAudio(audioData.audioBlob, {
                isWaitingPhrase: false,
                originalText: audioData.text,
                language: language,
                priority: 1,
                streamingSegment: true,
                id: audioData.taskId
              });
            } catch (bufferError) {
              console.error('[OCR Streaming] Buffer error:', bufferError);
            }
          },
          onError: (error, task) => {
            console.error('[OCR Streaming] TTS error:', error, task);
          }
        });

        streamingTTSCoordinator.start();

        let firstSentenceReceived = false;

        const streamingHandler = new StreamingResponseHandler({
          onSentenceComplete: async (sentence) => {
            console.log('[OCR Streaming] Complete sentence:', sentence.substring(0, 50));

            // Stop waiting phrase on first real sentence (Requirement 8.1)
            if (!firstSentenceReceived) {
              firstSentenceReceived = true;
              console.log('[OCR Streaming] First sentence received, stopping waiting phrase');

              // Clear waiting phrases from queue
              clearWaitingPhrasesFromQueue();

              // Stop any currently playing audio if it's a waiting phrase
              if (
                typeof window !== 'undefined' &&
                window.audioPlayer &&
                !window.audioPlayer.paused
              ) {
                try {
                  // Check if current audio is a waiting phrase
                  const currentMetadata = window.audioPlayer.dataset?.metadata;
                  if (currentMetadata && JSON.parse(currentMetadata).isWaitingPhrase) {
                    console.log('[OCR Streaming] Stopping currently playing waiting phrase');
                    window.audioPlayer.pause();
                    window.audioPlayer.currentTime = 0;
                  }
                } catch (e) {
                  console.warn('[OCR Streaming] Could not stop audio player:', e);
                }
              }
            }

            // Queue sentence for TTS synthesis
            await streamingTTSCoordinator.queueSentence(sentence, language);
          },
          onStreamComplete: () => {
            console.log('[OCR Streaming] Stream complete');
          },
          onError: (error) => {
            console.error('[OCR Streaming] Handler error:', error);
          }
        });

        let fullResponse = '';

        try {
          // Read stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;

            // Process chunk through streaming handler
            streamingHandler.processChunk(chunk);
          }

          // Finalize stream
          streamingHandler.finalize();

          // Update message with full response
          updateMessage(waitingMessageId, {
            content: fullResponse,
            waiting: false,
            animate: true
          });

          // Trigger avatar animation based on response emotion
          determineEmotion(fullResponse);

          return true;
        } catch (streamError) {
          console.error('[OCR] Streaming error:', streamError);
          streamingTTSCoordinator.stop();
          throw streamError;
        }
      } else {
        // Non-streaming response (backward compatibility)
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

        // Trigger avatar animation based on response emotion
        determineEmotion(data.response);

        // Synthesize speech for the AI response if in voice mode
        console.log('Checking if speech synthesis is needed for OCR response');
        await synthesizeResponseSpeech(data.response);

        return true;
      }
    } else {
      // No images, just send the text message
      console.log('No images to process, sending text-only message');

      // Use targetLanguage which was used to select waiting phrase
      // This ensures language consistency between waiting phrase and response
      const requestLanguage = targetLanguage;
      const languageConfirmed = true; // Language is confirmed from message detection

      console.log(
        '[Text-only] Using language for API request:',
        requestLanguage,
        '(from message detection - CONFIRMED)'
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          images: [],
          language: requestLanguage,
          languageConfirmed, // Tell API not to re-detect language if true
          stream: get(isVoiceModeActive), // Enable streaming in voice mode
          ...(maxTokens ? { maxTokens } : {}),
          ...(detailLevel ? { detailLevel } : {}),
          ...(minWords ? { minWords } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      // Check if streaming response
      const contentType = response.headers.get('content-type');
      if (get(isVoiceModeActive) && contentType && contentType.includes('text/plain')) {
        console.log('[Text-only] Processing streaming response');

        // Initialize streaming handlers
        // Use language from waiting phrase if available (avoid re-detection)
        const { getWaitingPhraseLanguage } = await import('./voice/index.js');
        const waitingLanguage = getWaitingPhraseLanguage();
        const language = waitingLanguage || get(selectedLanguage);
        console.log(
          '[Text-only Streaming] Using language:',
          language,
          waitingLanguage ? '(from waiting phrase)' : '(from store)'
        );

        const streamingTTSCoordinator = new StreamingTTSCoordinator({
          onAudioReady: async (audioData) => {
            console.log('[Text-only Streaming] Audio ready:', audioData.taskId);

            // Wait for waiting phrase to complete before adding to queue
            const { isWaitingPhraseActive } = await import('./voice/index.js');
            if (isWaitingPhraseActive()) {
              console.log('[Text-only Streaming] Waiting for waiting phrase to complete...');
              await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  if (!isWaitingPhraseActive()) {
                    clearInterval(checkInterval);
                    console.log(
                      '[Text-only Streaming] Waiting phrase completed, proceeding with audio'
                    );
                    resolve();
                  }
                }, 100);
              });
            }

            // Add to audio buffer for playback
            try {
              await audioBufferManager.bufferAudio(audioData.audioBlob, {
                isWaitingPhrase: false,
                originalText: audioData.text,
                language: language,
                priority: 1,
                streamingSegment: true,
                id: audioData.taskId
              });
            } catch (bufferError) {
              console.error('[Text-only Streaming] Buffer error:', bufferError);
            }
          },
          onError: (error, task) => {
            console.error('[Text-only Streaming] TTS error:', error, task);
          }
        });

        streamingTTSCoordinator.start();

        let firstSentenceReceived = false;

        const streamingHandler = new StreamingResponseHandler({
          onSentenceComplete: async (sentence) => {
            console.log('[Text-only Streaming] Complete sentence:', sentence.substring(0, 50));

            // Stop waiting phrase on first real sentence
            if (!firstSentenceReceived) {
              firstSentenceReceived = true;
              console.log('[Text-only Streaming] First sentence received, stopping waiting phrase');

              // Clear waiting phrases from queue
              clearWaitingPhrasesFromQueue();

              // Stop any currently playing audio if it's a waiting phrase
              if (
                typeof window !== 'undefined' &&
                window.audioPlayer &&
                !window.audioPlayer.paused
              ) {
                try {
                  const currentMetadata = window.audioPlayer.dataset?.metadata;
                  if (currentMetadata && JSON.parse(currentMetadata).isWaitingPhrase) {
                    console.log('[Text-only Streaming] Stopping currently playing waiting phrase');
                    window.audioPlayer.pause();
                    window.audioPlayer.currentTime = 0;
                  }
                } catch (e) {
                  console.warn('[Text-only Streaming] Could not stop audio player:', e);
                }
              }
            }

            // Queue sentence for TTS synthesis
            await streamingTTSCoordinator.queueSentence(sentence, language);
          },
          onStreamComplete: () => {
            console.log('[Text-only Streaming] Stream complete');
          },
          onError: (error) => {
            console.error('[Text-only Streaming] Handler error:', error);
          }
        });

        let fullResponse = '';

        try {
          // Read stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            fullResponse += chunk;

            // Process chunk through streaming handler
            streamingHandler.processChunk(chunk);
          }

          // Finalize stream
          streamingHandler.finalize();

          // Update message with full response
          updateMessage(waitingMessageId, {
            content: fullResponse,
            waiting: false,
            animate: true
          });

          // Trigger avatar animation based on response emotion
          determineEmotion(fullResponse);

          return true;
        } catch (streamError) {
          console.error('[Text-only] Streaming error:', streamError);
          streamingTTSCoordinator.stop();
          throw streamError;
        }
      } else {
        // Non-streaming response (backward compatibility)
        const data = await response.json();

        // Add the AI's response to the chat
        updateMessage(waitingMessageId, {
          content: data.response,
          waiting: false,
          animate: true,
          ...(data.provider ? { provider: data.provider } : {})
        });

        // Trigger avatar animation based on response emotion
        determineEmotion(data.response);

        // Synthesize speech for the AI response if in voice mode
        console.log('Checking if speech synthesis is needed for text-only response');
        await synthesizeResponseSpeech(data.response);

        return true;
      }
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
