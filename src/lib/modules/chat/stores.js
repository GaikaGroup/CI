import { writable } from 'svelte/store';

// Chat mode store (text or voice)
export const chatMode = writable('text');

// Messages store
export const messages = writable([]);

// Input message store
export const inputMessage = writable('');

// Recording status store
export const isRecording = writable(false);

// Selected images store
export const selectedImages = writable([]);

// Processing images map store (messageId -> boolean)
export const processingImagesMap = writable({});

// OCR notes store (messageId -> string)
export const ocrNotes = writable({});

// OCR results store (messageId -> OCR data)
export const ocrResults = writable({});

// OCR processing state
export const isOcrProcessing = writable(false);

// Second opinion stores
export const secondOpinionRequests = writable({}); // messageId -> { loading, error }
export const secondOpinions = writable({}); // messageId -> array of opinion messages

// Initialize chat with welcome message
export function initializeChat(welcomeMessage) {
  const initialMessage = {
    id: 1,
    type: 'tutor',
    content: welcomeMessage,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  messages.set([initialMessage]);
}

// Add a message to the chat
export function addMessage(type, content, images = [], id = null, additionalProps = {}) {
  messages.update((msgs) => {
    const newMessage = {
      id: id || (msgs.length > 0 ? Math.max(...msgs.map((m) => m.id)) + 1 : 1),
      type,
      content,
      images,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...additionalProps
    };
    return [...msgs, newMessage];
  });
}

// Add a system message
export function addSystemMessage(content) {
  addMessage('system', content);
}

// Simulate tutor response
export function simulateTutorResponse(content, delay = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      addMessage('tutor', content);
      resolve();
    }, delay);
  });
}

// Set processing state for a message
export function setProcessingImages(messageId, processing) {
  processingImagesMap.update((map) => {
    console.log(`[STORE] setProcessingImages before for ${messageId}:`, map[messageId]);
    const updatedMap = { ...map, [messageId]: processing };
    console.log(`[STORE] setProcessingImages after for ${messageId}:`, updatedMap[messageId]);
    console.log(`[STORE] processingImagesMap:`, updatedMap);
    return updatedMap;
  });
}

// Set OCR note for a message
export function setOcrNote(messageId, note) {
  ocrNotes.update((notes) => {
    console.log(`[STORE] setOcrNote before for ${messageId}:`, notes[messageId]);
    const updatedNotes = { ...notes, [messageId]: note };
    console.log(`[STORE] setOcrNote after for ${messageId}:`, updatedNotes[messageId]);
    console.log(`[STORE] ocrNotes:`, updatedNotes);
    return updatedNotes;
  });
}

// Update an existing message
export function updateMessage(messageId, updates) {
  messages.update((msgs) => {
    const originalMessage = msgs.find((msg) => msg.id === messageId);
    console.log(`[STORE] updateMessage before for ${messageId}:`, originalMessage);

    const updatedMsgs = msgs.map((msg) => {
      if (msg.id === messageId) {
        const updatedMsg = { ...msg, ...updates };
        console.log(`[STORE] updateMessage after for ${messageId}:`, updatedMsg);
        return updatedMsg;
      }
      return msg;
    });

    return updatedMsgs;
  });
}

// Set OCR results for a message
export function setOcrResults(messageId, results) {
  ocrResults.update((data) => {
    return { ...data, [messageId]: results };
  });
}

// Get OCR results for a message
export function getOcrResults(messageId) {
  let results = null;
  ocrResults.subscribe((data) => {
    results = data[messageId];
  })();
  return results;
}

// Clear OCR data
export function clearOcrData() {
  ocrResults.set({});
  ocrNotes.set({});
  isOcrProcessing.set(false);
}

// Second opinion functions
export async function requestSecondOpinion(messageId, provider = null) {
  // Set loading state
  secondOpinionRequests.update((requests) => ({
    ...requests,
    [messageId]: { loading: true, error: null }
  }));

  try {
    const response = await fetch('/api/chat/second-opinion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId,
        provider: provider || undefined
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get second opinion');
    }

    // Add the opinion message to the messages store
    if (result.data && result.data.opinionMessage) {
      messages.update((msgs) => [...msgs, result.data.opinionMessage]);
    }

    // Update second opinions store
    secondOpinions.update((opinions) => {
      const existing = opinions[messageId] || [];
      return {
        ...opinions,
        [messageId]: [...existing, result.data.opinionMessage]
      };
    });

    // Clear loading state
    secondOpinionRequests.update((requests) => ({
      ...requests,
      [messageId]: { loading: false, error: null }
    }));

    return result.data;
  } catch (error) {
    console.error('Error requesting second opinion:', error);

    // Set error state
    secondOpinionRequests.update((requests) => ({
      ...requests,
      [messageId]: { loading: false, error: error.message }
    }));

    throw error;
  }
}

export async function fetchSecondOpinions(messageId) {
  try {
    const response = await fetch(`/api/chat/second-opinions/${messageId}`);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch second opinions');
    }

    // Update second opinions store
    secondOpinions.update((opinions) => ({
      ...opinions,
      [messageId]: result.data.opinions || []
    }));

    return result.data.opinions;
  } catch (error) {
    console.error('Error fetching second opinions:', error);
    throw error;
  }
}

export async function submitOpinionFeedback(opinionId, messageId, helpful) {
  try {
    const response = await fetch(`/api/chat/second-opinion/${opinionId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ helpful })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to submit feedback');
    }

    // Update the message to mark feedback as submitted
    updateMessage(messageId, {
      metadata: {
        feedbackSubmitted: true
      }
    });

    return result.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
}

export function getSecondOpinionsForMessage(messageId) {
  let opinions = [];
  secondOpinions.subscribe((data) => {
    opinions = data[messageId] || [];
  })();
  return opinions;
}

export function clearSecondOpinionData() {
  secondOpinionRequests.set({});
  secondOpinions.set({});
}
