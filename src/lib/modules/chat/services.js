import { API_ENDPOINTS } from '$shared/utils/constants';
import { addMessage, simulateTutorResponse } from './stores';
import { selectedLanguage } from '$modules/i18n/stores';
import { get } from 'svelte/store';
import { setLoading, setError } from '$lib/stores/app';

/**
 * Send a message to the AI tutor
 * @param {string} content - The message content
 * @param {Array} images - Array of image URLs
 * @returns {Promise} - Promise that resolves when the message is sent
 */
export async function sendMessage(content, images = []) {
  try {
    setLoading(true);

    // Make a real API call to our OpenAI endpoint
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        images,
        language: get(selectedLanguage)
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();

    // Add the AI's response to the chat
    addMessage('tutor', data.response);

    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    setError('Failed to send message. Please try again.');
    return false;
  } finally {
    setLoading(false);
  }
}

/**
 * Get chat history
 * @returns {Promise} - Promise that resolves with chat history
 */
export async function getChatHistory() {
  try {
    setLoading(true);

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
    await new Promise(resolve => setTimeout(resolve, 500));

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
