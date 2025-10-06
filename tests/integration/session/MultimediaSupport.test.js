/**
 * Integration Tests for Multimedia Support in Sessions
 * Tests voice input, image upload, and audio playback functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { chatStore } from '../../../src/lib/modules/session/stores/chatStore.js';
import { sessionStore } from '../../../src/lib/modules/session/stores/sessionStore.js';
import { MessageService } from '../../../src/lib/modules/session/services/MessageService.js';
import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';
import {
  createVoiceMetadata,
  createImageMetadata,
  createAudioResponseMetadata,
  hasAudio,
  hasImages,
  getAudioUrl,
  getImageUrls
} from '../../../src/lib/modules/session/utils/multimediaHelpers.js';

// Mock user
const mockUser = {
  id: 'test-user-multimedia',
  email: 'multimedia@test.com'
};

describe('Multimedia Support Integration', () => {
  let testSessionId;

  beforeEach(async () => {
    // Create a test session
    const session = await SessionService.createSession(
      mockUser.id,
      'Multimedia Test Session',
      'fun',
      'en'
    );
    testSessionId = session.id;

    // Initialize chat store with the session
    await chatStore.initializeSession(testSessionId);
  });

  afterEach(async () => {
    // Clean up
    if (testSessionId) {
      try {
        await SessionService.deleteSession(testSessionId, mockUser.id);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    chatStore.reset();
  });

  describe('Voice Input Integration', () => {
    it('should store voice message with metadata', async () => {
      const voiceMetadata = createVoiceMetadata({
        audioUrl: 'blob:https://example.com/audio-123',
        duration: 5.5,
        language: 'en',
        transcription: 'Hello, this is a voice message'
      });

      const message = await chatStore.sendMessage(
        'Hello, this is a voice message',
        voiceMetadata
      );

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello, this is a voice message');
      expect(message.metadata).toBeDefined();
      expect(message.metadata.type).toBe('voice');
      expect(message.metadata.audioUrl).toBe('blob:https://example.com/audio-123');
      expect(message.metadata.duration).toBe(5.5);
      expect(message.metadata.language).toBe('en');
    });

    it('should retrieve voice message with metadata', async () => {
      const voiceMetadata = createVoiceMetadata({
        audioUrl: 'https://example.com/voice.mp3',
        duration: 3.2,
        language: 'es',
        transcription: 'Hola mundo'
      });

      await chatStore.sendMessage('Hola mundo', voiceMetadata);

      // Reload messages
      await chatStore.initializeSession(testSessionId);

      const state = get(chatStore);
      expect(state.messages).toHaveLength(1);
      
      const message = state.messages[0];
      expect(hasAudio(message)).toBe(true);
      expect(getAudioUrl(message.metadata)).toBe('https://example.com/voice.mp3');
    });

    it('should store voice message with images', async () => {
      const voiceMetadata = createVoiceMetadata({
        audioUrl: 'blob:https://example.com/audio-456',
        duration: 4.0,
        language: 'en',
        transcription: 'Look at this image'
      });

      // Add images to metadata
      voiceMetadata.images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];

      const message = await chatStore.sendMessage(
        'Look at this image',
        voiceMetadata
      );

      expect(message.metadata.type).toBe('voice');
      expect(message.metadata.images).toHaveLength(2);
      expect(hasAudio(message)).toBe(true);
      expect(hasImages(message)).toBe(true);
    });
  });

  describe('Image Upload Integration', () => {
    it('should store message with single image', async () => {
      const imageMetadata = createImageMetadata({
        imageUrl: 'https://example.com/test-image.jpg',
        imageType: 'image/jpeg',
        imageSize: 102400,
        imageDimensions: { width: 800, height: 600 }
      });

      const message = await chatStore.sendMessage(
        'Check out this image',
        imageMetadata
      );

      expect(message).toBeDefined();
      expect(message.metadata.type).toBe('image');
      expect(message.metadata.images).toHaveLength(1);
      expect(message.metadata.images[0].url).toBe('https://example.com/test-image.jpg');
      expect(hasImages(message)).toBe(true);
    });

    it('should store message with multiple images', async () => {
      const imageMetadata = createImageMetadata({
        imageUrl: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
          'https://example.com/image3.jpg'
        ]
      });

      const message = await chatStore.sendMessage(
        'Here are multiple images',
        imageMetadata
      );

      expect(message.metadata.images).toHaveLength(3);
      
      const imageUrls = getImageUrls(message.metadata);
      expect(imageUrls).toHaveLength(3);
      expect(imageUrls[0]).toBe('https://example.com/image1.jpg');
      expect(imageUrls[1]).toBe('https://example.com/image2.jpg');
      expect(imageUrls[2]).toBe('https://example.com/image3.jpg');
    });

    it('should retrieve messages with images after reload', async () => {
      const imageMetadata = createImageMetadata({
        imageUrl: 'https://example.com/persistent-image.jpg'
      });

      await chatStore.sendMessage('Persistent image test', imageMetadata);

      // Reload session
      await chatStore.initializeSession(testSessionId);

      const state = get(chatStore);
      const message = state.messages[0];
      
      expect(hasImages(message)).toBe(true);
      const imageUrls = getImageUrls(message.metadata);
      expect(imageUrls[0]).toBe('https://example.com/persistent-image.jpg');
    });
  });

  describe('Audio Response Integration', () => {
    it('should store AI response with audio metadata', async () => {
      const audioMetadata = createAudioResponseMetadata({
        audioUrl: 'https://example.com/response-audio.mp3',
        duration: 7.5,
        language: 'en',
        emotion: 'happy',
        isWaitingPhrase: false
      });

      const message = await chatStore.addAssistantMessage(
        'This is an AI response with audio',
        audioMetadata
      );

      expect(message).toBeDefined();
      expect(message.type).toBe('assistant');
      expect(message.metadata.type).toBe('audio_response');
      expect(message.metadata.audioUrl).toBe('https://example.com/response-audio.mp3');
      expect(message.metadata.emotion).toBe('happy');
      expect(hasAudio(message)).toBe(true);
    });

    it('should store waiting phrase audio', async () => {
      const waitingPhraseMetadata = createAudioResponseMetadata({
        audioUrl: 'https://example.com/waiting-phrase.mp3',
        duration: 2.0,
        language: 'en',
        isWaitingPhrase: true
      });

      const message = await chatStore.addAssistantMessage(
        'Just a moment...',
        waitingPhraseMetadata
      );

      expect(message.metadata.isWaitingPhrase).toBe(true);
      expect(message.metadata.audioUrl).toBe('https://example.com/waiting-phrase.mp3');
    });
  });

  describe('Mixed Multimedia Messages', () => {
    it('should handle conversation with mixed multimedia', async () => {
      // User sends voice message with image
      const voiceMetadata = createVoiceMetadata({
        audioUrl: 'blob:https://example.com/user-voice.mp3',
        duration: 3.5,
        language: 'en',
        transcription: 'What is this?'
      });
      voiceMetadata.images = ['https://example.com/question-image.jpg'];

      await chatStore.sendMessage('What is this?', voiceMetadata);

      // AI responds with audio
      const audioMetadata = createAudioResponseMetadata({
        audioUrl: 'https://example.com/ai-response.mp3',
        duration: 5.0,
        language: 'en',
        emotion: 'neutral'
      });

      await chatStore.addAssistantMessage(
        'This appears to be a test image',
        audioMetadata
      );

      // Verify conversation
      const state = get(chatStore);
      expect(state.messages).toHaveLength(2);

      const userMessage = state.messages[0];
      expect(userMessage.type).toBe('user');
      expect(hasAudio(userMessage)).toBe(true);
      expect(hasImages(userMessage)).toBe(true);

      const aiMessage = state.messages[1];
      expect(aiMessage.type).toBe('assistant');
      expect(hasAudio(aiMessage)).toBe(true);
    });

    it('should persist mixed multimedia conversation', async () => {
      // Create a conversation with various multimedia types
      const voiceMetadata = createVoiceMetadata({
        audioUrl: 'https://example.com/voice1.mp3',
        duration: 2.5,
        language: 'en'
      });

      const imageMetadata = createImageMetadata({
        imageUrl: 'https://example.com/image1.jpg'
      });

      const audioResponseMetadata = createAudioResponseMetadata({
        audioUrl: 'https://example.com/response1.mp3',
        duration: 4.0,
        language: 'en'
      });

      // Add messages
      await chatStore.sendMessage('Voice message', voiceMetadata);
      await chatStore.sendMessage('Image message', imageMetadata);
      await chatStore.addAssistantMessage('Audio response', audioResponseMetadata);

      // Reload and verify
      await chatStore.initializeSession(testSessionId);

      const state = get(chatStore);
      expect(state.messages).toHaveLength(3);
      expect(hasAudio(state.messages[0])).toBe(true);
      expect(hasImages(state.messages[1])).toBe(true);
      expect(hasAudio(state.messages[2])).toBe(true);
    });
  });

  describe('Multimedia Metadata Validation', () => {
    it('should handle messages without metadata', async () => {
      const message = await chatStore.sendMessage('Plain text message');

      expect(message.metadata).toBeNull();
      expect(hasAudio(message)).toBe(false);
      expect(hasImages(message)).toBe(false);
    });

    it('should handle empty metadata gracefully', async () => {
      const message = await chatStore.sendMessage('Message with empty metadata', {});

      expect(message.metadata).toBeDefined();
      expect(hasAudio(message)).toBe(false);
      expect(hasImages(message)).toBe(false);
    });

    it('should preserve metadata structure through database', async () => {
      const complexMetadata = {
        type: 'voice',
        audioUrl: 'https://example.com/audio.mp3',
        duration: 5.5,
        language: 'en',
        transcription: 'Test transcription',
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        customField: 'custom value',
        timestamp: new Date().toISOString()
      };

      const message = await chatStore.sendMessage('Complex metadata test', complexMetadata);

      // Reload from database
      const retrieved = await MessageService.getMessage(message.id, mockUser.id);

      expect(retrieved.metadata.type).toBe('voice');
      expect(retrieved.metadata.audioUrl).toBe('https://example.com/audio.mp3');
      expect(retrieved.metadata.duration).toBe(5.5);
      expect(retrieved.metadata.images).toHaveLength(2);
      expect(retrieved.metadata.customField).toBe('custom value');
    });
  });

  describe('Multimedia Search and Filtering', () => {
    it('should find messages with audio', async () => {
      // Add messages with and without audio
      await chatStore.sendMessage('Text only');
      
      const voiceMetadata = createVoiceMetadata({
        audioUrl: 'https://example.com/voice.mp3',
        language: 'en'
      });
      await chatStore.sendMessage('Voice message', voiceMetadata);

      const state = get(chatStore);
      const messagesWithAudio = state.messages.filter(msg => hasAudio(msg));
      
      expect(messagesWithAudio).toHaveLength(1);
      expect(messagesWithAudio[0].content).toBe('Voice message');
    });

    it('should find messages with images', async () => {
      // Add messages with and without images
      await chatStore.sendMessage('Text only');
      
      const imageMetadata = createImageMetadata({
        imageUrl: 'https://example.com/image.jpg'
      });
      await chatStore.sendMessage('Image message', imageMetadata);

      const state = get(chatStore);
      const messagesWithImages = state.messages.filter(msg => hasImages(msg));
      
      expect(messagesWithImages).toHaveLength(1);
      expect(messagesWithImages[0].content).toBe('Image message');
    });
  });
});
