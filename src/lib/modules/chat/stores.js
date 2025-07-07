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
export function addMessage(type, content, images = []) {
  messages.update(msgs => {
    const newMessage = {
      id: msgs.length > 0 ? Math.max(...msgs.map(m => m.id)) + 1 : 1,
      type,
      content,
      images,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  return new Promise(resolve => {
    setTimeout(() => {
      addMessage('tutor', content);
      resolve();
    }, delay);
  });
}