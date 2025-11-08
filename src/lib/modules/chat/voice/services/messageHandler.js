/**
 * Message Handler Service
 * Handles transcribed text processing and AI response generation
 */

import { get } from 'svelte/store';
import { setError } from '$lib/stores/app';
import { selectedImages } from '../../stores';
import { sendMessageWithOCRContext } from '../../enhancedServices.js';
import { isVoiceModeActive, setVoiceModeActive } from './voiceModeManager.js';

/**
 * Send transcribed text and get AI response
 * Uses the SAME logic as Text mode (enhancedServices.js) which includes:
 * - OCR memory integration
 * - Streaming response support
 * - Language detection
 * - Session management
 * - All the features that work correctly in Text mode
 */
export async function sendTranscribedText(transcription, sessionId = null) {
  try {
    if (!get(isVoiceModeActive)) {
      console.log('Activating voice mode for transcribed text processing');
      setVoiceModeActive(true);
    }

    console.log('[Voice] Processing transcribed text:', transcription.substring(0, 50));

    let images = get(selectedImages);
    console.log('[Voice] Selected images:', images?.length || 0);

    // Convert image objects to URLs for sendMessage
    // sendMessage expects array of URLs or objects with {url, type, name}
    if (images && images.length > 0) {
      images = images.map((img) => {
        if (typeof img === 'string') {
          return img;
        }
        // Keep the object structure with type and name for PDF detection
        return {
          url: img.url,
          type: img.type,
          name: img.name
        };
      });
    }

    // Use enhancedServices for streaming support and OCR memory
    // This ensures:
    // - Streaming response works (for TTS)
    // - OCR memory integration works (full session context)
    // - Language detection works correctly
    // - Session management works
    await sendMessageWithOCRContext(
      transcription,
      images,
      null, // maxTokens
      null, // detailLevel
      null, // minWords
      true // useOCRMemory - keep full session context
    );

    // Update session title from first message if needed
    if (sessionId) {
      await updateSessionTitle(sessionId, transcription);
    }

    // Clear selected images after sending
    if (images && images.length > 0) {
      selectedImages.set([]);
    }

    return transcription;
  } catch (error) {
    console.error('Error processing voice data:', error);
    setError('Failed to process voice data. Please try again.');
    throw error;
  }
}

/**
 * Update session title from first message
 */
async function updateSessionTitle(sessionId, transcription) {
  try {
    const sessionResponse = await fetch(`/api/sessions/${sessionId}`);
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      if (sessionData.title && sessionData.title.startsWith('New Session')) {
        console.log(
          '[Voice] Updating session title from voice message:',
          transcription.substring(0, 50)
        );

        await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : ''),
            preview: transcription.substring(0, 200)
          })
        });
      }
    }
  } catch (error) {
    console.warn('[Voice] Failed to update session title:', error);
  }
}
