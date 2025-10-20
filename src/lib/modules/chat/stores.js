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
