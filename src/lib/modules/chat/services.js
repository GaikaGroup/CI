import { addMessage, updateMessage, messages } from './stores';
import { synthesizeWaitingPhrase, isVoiceModeActive } from './voiceServices.js';
import { selectedLanguage } from '$modules/i18n/stores';
import { get } from 'svelte/store';
import { setLoading, setError } from '$lib/stores/app';
import { examProfile } from '$lib/stores/examProfile';
import { processDocumentInClient } from '$lib/modules/document/ClientDocumentProcessor';
import { container } from '$lib/shared/di/container';
import {
  WAITING_PHRASES_DEFAULT,
  WAITING_PHRASES_DETAILED,
  OPENAI_CONFIG
} from '$lib/config/api.js';
import { waitingPhrasesService } from './waitingPhrasesService.js';
import { languageDetector } from './LanguageDetector.js';

const TEXT_MODE_PHRASE_INTERVAL = 2000;
const VOICE_MODE_PHRASE_INTERVAL = 4000;

// Dynamic delay tuning
const DELAY_MIN_RATIO = 0.6;
const SENTENCE_LENGTH_THRESHOLD = 12;
const EXTRA_DELAY_PER_WORD = 80;
const JITTER_FACTOR = 0.15;

function calculateSentenceDelay(baseInterval, sentence) {
  const trimmed = sentence.trim();
  if (!trimmed) {
    return baseInterval;
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const jitter = (Math.random() * 2 - 1) * baseInterval * JITTER_FACTOR;
  const extraWords = Math.max(0, wordCount - SENTENCE_LENGTH_THRESHOLD);
  const extraDelay = extraWords * EXTRA_DELAY_PER_WORD;
  const rawDelay = baseInterval + jitter + extraDelay;
  const minimumDelay = baseInterval * DELAY_MIN_RATIO;

  return Math.max(Math.round(minimumDelay), Math.round(rawDelay));
}

// Helper to synchronously store a conversation turn in session memory
function storeConversation(adapter, sessionId, message, reply) {
  return adapter.handleUserMessage(message, sessionId, () => reply);
}

/**
 * Display a waiting phrase sentence by sentence.
 * Each sentence is emitted as a separate message bubble with its own ID.
 * The full phrase is also sent to voiceServices for TTS handling.
 *
 * @param {string} phrase - Full waiting phrase
 * @param {number|null} delayOverride - Optional explicit delay in milliseconds between sentence additions
 * @returns {number[]} Array of message IDs created for the waiting phrase
 */
export function emitWaitingPhraseIncrementally(phrase, delayOverride = null) {
  const sentences = phrase.match(/[^.!?]+[.!?]+/g) || [phrase];
  const ids = [];

  const isVoiceMode = Boolean(get(isVoiceModeActive));
  const baseInterval = isVoiceMode ? VOICE_MODE_PHRASE_INTERVAL : TEXT_MODE_PHRASE_INTERVAL;
  const useDynamicDelays = typeof delayOverride !== 'number';
  const shouldSplitVoice = isVoiceMode && delayOverride == null;

  const computeDelay = (sentence) =>
    useDynamicDelays ? calculateSentenceDelay(baseInterval, sentence) : delayOverride;

  const scheduleVoice = (callback, delay) => {
    if (!shouldSplitVoice) {
      return;
    }

    if (delay <= 0) {
      callback();
    } else {
      setTimeout(callback, delay);
    }
  };

  if (!shouldSplitVoice) {
    // In text mode (or when an explicit delay is provided), synthesize the whole phrase at once
    synthesizeWaitingPhrase(phrase).catch((e) =>
      console.warn('Failed to synthesize waiting phrase:', e)
    );
  }

  let accumulatedDelay = 0;

  sentences.forEach((sentence, index) => {
    const id = Date.now() + index;
    ids.push(id);

    const trimmedSentence = sentence.trim();
    const emit = () => addMessage('tutor', trimmedSentence, null, id, { waiting: true });
    const speak = () =>
      synthesizeWaitingPhrase(trimmedSentence).catch((e) =>
        console.warn('Failed to synthesize waiting phrase:', e)
      );

    if (index === 0) {
      emit();
      scheduleVoice(speak, 0);
    } else {
      const delayForSentence = computeDelay(trimmedSentence);
      accumulatedDelay += delayForSentence;
      setTimeout(emit, accumulatedDelay);
      scheduleVoice(speak, accumulatedDelay);
    }
  });

  return ids;
}

/**
 * Send a message to the AI tutor
 * @param {string} content - The message content
 * @param {Array} images - Array of image URLs
 * @param {string} sessionId - Optional session ID for maintaining context
 * @param {string} provider - Optional provider to use (openai or ollama)
 * @returns {Promise} - Promise that resolves when the message is sent
 */
export async function sendMessage(
  content,
  images = [],
  sessionId = null,
  provider = null,
  maxTokens = null,
  detailLevel = null,
  minWords = null
) {
  let waitingMessageIds = [];
  try {
    console.log('sendMessage called with content:', content);
    console.log('sendMessage called with images:', images.length);
    if (sessionId) {
      console.log('sendMessage called with sessionId:', sessionId);
    }

    setLoading(true);

    const activeExamProfile = get(examProfile);

    // Detect the language of the incoming message before generating waiting phrases
    let targetLanguage = get(selectedLanguage);
    try {
      const detectionResult = languageDetector.detectLanguageFromText(content);
      if (detectionResult?.language) {
        targetLanguage = detectionResult.language;
        const currentLanguage = get(selectedLanguage);
        if (targetLanguage !== currentLanguage) {
          console.log(`Detected message language: ${targetLanguage} (was ${currentLanguage})`);
          selectedLanguage.set(targetLanguage);
        }
      }
    } catch (error) {
      console.warn('Failed to detect language from message content:', error);
    }

    // Select appropriate waiting phrase
    const phraseCategory =
      (maxTokens && maxTokens > OPENAI_CONFIG.MAX_TOKENS) || detailLevel === 'detailed'
        ? WAITING_PHRASES_DETAILED
        : WAITING_PHRASES_DEFAULT;
    const waitingPhrase = await waitingPhrasesService.selectWaitingPhrase(
      targetLanguage,
      phraseCategory
    );
    waitingMessageIds = emitWaitingPhraseIncrementally(waitingPhrase);

    // Get session storage adapter if available
    const sessionStorageAdapter = container.has('sessionStorageAdapter')
      ? container.resolve('sessionStorageAdapter')
      : null;

    let session = null;
    if (sessionId && container.has('sessionFactory')) {
      try {
        const sessionFactory = container.resolve('sessionFactory');
        session = sessionFactory.getOrCreateSession(sessionId);
        if (activeExamProfile) {
          session.updateContext({ examProfile: activeExamProfile });
        }
      } catch (error) {
        console.warn('[Chat] Failed to prepare session context', error);
      }
    }

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
              resolve(typeof reader.result === 'string' ? reader.result : null);
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
      const validImageData = imageData.filter((data) => typeof data === 'string');
      console.log('Valid image data count:', validImageData.length);

      if (validImageData.length === 0) {
        console.error('No valid images to process');
        throw new Error('Failed to process images: No valid images found');
      }

      // Process images locally first
      let recognizedText = '';
      console.log('[OCR] Processing images locally in the browser');

      for (const base64Data of validImageData) {
        try {
          // Process in browser
          console.log('[OCR] Processing image with ClientDocumentProcessor');
          const result = await processDocumentInClient(base64Data);
          recognizedText += result.text + '\n\n';
          console.log('[OCR] Image processed successfully, text length:', result.text.length);
        } catch (error) {
          console.error('[OCR] Error processing image:', error);
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

      // Make API call with images and already processed text
      console.log('[OCR] Sending image and recognized text for message', content, {
        snippet: validImageData[0].slice(0, 50) + '…',
        textLength: recognizedText.length
      });
      // Get session context if available
      let sessionContext = null;
      if (session) {
        sessionContext = session.getContext();
        console.log('[Session] Including context in API request for image message:', sessionContext);
      }

      const requestBody = {
        content,
        images: validImageData,
        recognizedText, // Send the already processed text
        language: get(selectedLanguage),
        sessionContext, // Include session context in the request
        provider, // Include provider selection if specified
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
      // Remove waiting bubbles and add the AI's response (with provider info if available)
      messages.update((msgs) => msgs.filter((m) => !waitingMessageIds.includes(m.id)));
      addMessage('tutor', data.response, null, Date.now(), { provider: data.provider });

      // If session storage adapter is available and sessionId is provided, store in session
      if (sessionStorageAdapter && sessionId) {
        console.log(`[Session] Storing conversation in session ${sessionId}`);
        await storeConversation(sessionStorageAdapter, sessionId, content, data.response);
      }

      // If OCR text was returned, update the original message with it
      if (data.ocrText) {
        console.log(`[OCR] Got text:`, data.ocrText);
        const userMessage = [...get(messages)]
          .reverse()
          .find((m) => m.type === 'user' && m.images && m.images.length > 0);

        if (userMessage) {
          console.log(`[OCR] Updating message ${userMessage.id} with text:`, data.ocrText);
          updateMessage(userMessage.id, { ocrText: data.ocrText });
          console.log(`[STORE] addOcrNote for ${userMessage.id}:`, data.ocrText);
        } else {
          console.error('[OCR] Could not find user message to update with OCR text');
        }
      } else {
        console.warn('[OCR] No OCR text returned from server');
      }

      return true;
    } else {
      // No images, just send the text message
      console.log('No images to process, sending text-only message');

      // Get session context if available
      let sessionContext = null;
      if (session) {
        sessionContext = session.getContext();
        console.log(`[Session] Including context in API request:`, sessionContext);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          images: [],
          language: get(selectedLanguage),
          sessionContext, // Include session context in the request
          provider, // Include provider selection if specified
          ...(activeExamProfile ? { examProfile: activeExamProfile } : {}),
          ...(maxTokens ? { maxTokens } : {}),
          ...(detailLevel ? { detailLevel } : {}),
          ...(minWords ? { minWords } : {})
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      // Remove waiting bubbles and add the AI's response (with provider info if available)
      messages.update((msgs) => msgs.filter((m) => !waitingMessageIds.includes(m.id)));
      addMessage('tutor', data.response, null, Date.now(), { provider: data.provider });

      // If session storage adapter is available and sessionId is provided, store in session
      if (sessionStorageAdapter && sessionId) {
        console.log(`[Session] Storing conversation in session ${sessionId}`);
        await storeConversation(sessionStorageAdapter, sessionId, content, data.response);
      }

      return true;
    }
  } catch (error) {
    console.error('Error sending message:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Set a more descriptive error message for the user
    const errorMessage = error.message || 'Unknown error occurred';
    setError(`Failed to send message: ${errorMessage}. Please try again.`);
    messages.update((msgs) => msgs.filter((m) => !waitingMessageIds.includes(m.id)));
    addMessage('tutor', `Error: ${errorMessage}`, null, Date.now(), { waiting: false });
    return false;
  } finally {
    console.log('sendMessage function completed, setting loading to false');
    setLoading(false);
  }
}

/**
 * Get chat history
 * @param {string} sessionId - Optional session ID for retrieving context
 * @returns {Promise} - Promise that resolves with chat history
 */
export async function getChatHistory(sessionId = null) {
  try {
    setLoading(true);

    // If sessionId is provided and session storage adapter is available, get history from session
    if (sessionId) {
      const sessionStorageAdapter = container.has('sessionStorageAdapter')
        ? container.resolve('sessionStorageAdapter')
        : null;

      if (sessionStorageAdapter) {
        console.log(`[Session] Getting chat history from session ${sessionId}`);
        const sessionFactory = container.resolve('sessionFactory');
        const session = sessionFactory.getOrCreateSession(sessionId);
        const context = session.getContext();

        if (context && context.history && context.history.length > 0) {
          console.log(`[Session] Found ${context.history.length} messages in session history`);
          // Convert session history format to app format
          return context.history.map((entry) => ({
            id: entry.timestamp,
            type: entry.role === 'user' ? 'user' : 'tutor',
            content: entry.content,
            timestamp: entry.timestamp
          }));
        }
      }
    }

    // Simulate API call for demonstration
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return empty array for demonstration
    return [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    setError('Failed to load chat history. Please try again.');
    return [];
  } finally {
    setLoading(false);
  }
}

// Voice chat functionality has been moved to voiceServices.js
