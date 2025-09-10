import { addMessage, updateMessage, messages } from './stores';
import { selectedLanguage } from '$modules/i18n/stores';
import { get } from 'svelte/store';
import { mode, subject, activity } from '$lib/stores/ui';
import { buildSystemPrompt } from '$lib/stores/prompt';
import { RetrievalService } from '$lib/modules/rag/RetrievalService';
import { setLoading, setError } from '$lib/stores/app';
import { processDocumentInClient } from '$lib/modules/document/ClientDocumentProcessor';
import { container } from '$lib/shared/di/container';

/**
 * Send a message to the AI tutor
 * @param {string} content - The message content
 * @param {Array} images - Array of image URLs
 * @param {string} sessionId - Optional session ID for maintaining context
 * @param {string} provider - Optional provider to use (openai or ollama)
 * @returns {Promise} - Promise that resolves when the message is sent
 */

export async function sendMessage(content, images = [], sessionId = null, provider = null) {
  try {
    console.log('sendMessage called with content:', content);
    console.log('sendMessage called with images:', images.length);
    if (sessionId) {
      console.log('sendMessage called with sessionId:', sessionId);
    }

    setLoading(true);

    const meta = {
      mode: get(mode),
      subject: get(subject) || undefined,
      activity: get(activity) || undefined
    };
    const retrieval = new RetrievalService();
    const references =
      meta.mode === 'learning' && meta.subject ? await retrieval.search(meta.subject, content) : [];
    const system = buildSystemPrompt({
      mode: meta.mode,
      subject: meta.subject,
      activity: meta.activity,
      references
    });

    // Get session storage adapter if available
    const sessionStorageAdapter = container.has('sessionStorageAdapter')
      ? container.resolve('sessionStorageAdapter')
      : null;

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
              resolve(reader.result);
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
      if (sessionId && sessionStorageAdapter) {
        const sessionFactory = container.resolve('sessionFactory');
        const session = sessionFactory.getOrCreateSession(sessionId);
        sessionContext = session.getContext();
        console.log(
          `[Session] Including context in API request for image message:`,
          sessionContext
        );
      }
      const imgRefs =
        meta.mode === 'learning' && meta.subject
          ? await retrieval.search(meta.subject, content + '\n' + recognizedText)
          : [];
      const systemWithImg = buildSystemPrompt({
        mode: meta.mode,
        subject: meta.subject,
        activity: meta.activity,
        references: imgRefs
      });

      const requestBody = {
        content,
        images: validImageData,
        recognizedText, // Send the already processed text
        language: get(selectedLanguage),
        sessionContext, // Include session context in the request
        provider, // Include provider selection if specified
        meta,
        system: systemWithImg
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
      // Add the AI's response to the chat with provider info if available
      addMessage('tutor', data.response, null, null, { provider: data.provider });

      // If session storage adapter is available and sessionId is provided, store in session
      if (sessionStorageAdapter && sessionId) {
        console.log(`[Session] Storing conversation in session ${sessionId}`);
        // Store user message
        sessionStorageAdapter.handleUserMessage(content, sessionId, async (message, context) => {
          console.log(`[Session] Generating response for message: ${message}`);
          console.log(`[Session] Using context:`, context);
          return data.response;
        });
      }

      // If OCR text was returned, update the original message with it
      if (data.ocrText) {
        console.log(`[OCR] Got text:`, data.ocrText);
        // Find the message we're processing (should be the most recent user message with images)
        const userMessage = [...get(messages)]
          .reverse()
          .find((m) => m.type === 'user' && m.images && m.images.length > 0);

        if (userMessage) {
          console.log(`[OCR] Updating message ${userMessage.id} with text:`, data.ocrText);
          // Update the message with the OCR text
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
      if (sessionId && sessionStorageAdapter) {
        const sessionFactory = container.resolve('sessionFactory');
        const session = sessionFactory.getOrCreateSession(sessionId);
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
          meta,
          system
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      // Add the AI's response to the chat with provider info if available
      addMessage('tutor', data.response, null, null, { provider: data.provider });

      // If session storage adapter is available and sessionId is provided, store in session
      if (sessionStorageAdapter && sessionId) {
        console.log(`[Session] Storing conversation in session ${sessionId}`);
        // Store user message
        sessionStorageAdapter.handleUserMessage(content, sessionId, async (message, context) => {
          console.log(`[Session] Generating response for message: ${message}`);
          console.log(`[Session] Using context:`, context);
          return data.response;
        });
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

    // In a real implementation, this would be an API call
    // const response = await fetch(API_ENDPOINTS.CHAT.HISTORY, {
    //   headers: {
    //     'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    //   }
    // });

    // if (!response.ok) {
    //   throw new Error('Failed to get chat history');
    // }

    // const data = await response.json();
    // return data.messages;

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
