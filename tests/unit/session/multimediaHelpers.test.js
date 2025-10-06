/**
 * Tests for Multimedia Helpers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createVoiceMetadata,
  createImageMetadata,
  createAudioResponseMetadata,
  createMixedMetadata,
  getAudioUrl,
  getImageUrls,
  hasAudio,
  hasImages,
  hasMultimedia,
  getMultimediaSummary,
  isValidAudioUrl,
  isValidImageUrl,
  formatAudioDuration,
  formatFileSize,
  createAudioBlobUrl,
  revokeBlobUrl
} from '../../../src/lib/modules/session/utils/multimediaHelpers.js';

describe('Multimedia Helpers', () => {
  describe('createVoiceMetadata', () => {
    it('should create voice metadata with all fields', () => {
      const metadata = createVoiceMetadata({
        audioUrl: 'https://example.com/audio.mp3',
        duration: 10.5,
        language: 'en',
        transcription: 'Hello world'
      });

      expect(metadata.type).toBe('voice');
      expect(metadata.audioUrl).toBe('https://example.com/audio.mp3');
      expect(metadata.duration).toBe(10.5);
      expect(metadata.language).toBe('en');
      expect(metadata.transcription).toBe('Hello world');
      expect(metadata.timestamp).toBeDefined();
    });

    it('should create voice metadata with partial fields', () => {
      const metadata = createVoiceMetadata({
        language: 'es'
      });

      expect(metadata.type).toBe('voice');
      expect(metadata.language).toBe('es');
      expect(metadata.timestamp).toBeDefined();
    });
  });

  describe('createImageMetadata', () => {
    it('should create image metadata for single image', () => {
      const metadata = createImageMetadata({
        imageUrl: 'https://example.com/image.jpg',
        imageType: 'image/jpeg',
        imageSize: 1024,
        imageDimensions: { width: 800, height: 600 }
      });

      expect(metadata.type).toBe('image');
      expect(metadata.images).toHaveLength(1);
      expect(metadata.images[0].url).toBe('https://example.com/image.jpg');
      expect(metadata.images[0].type).toBe('image/jpeg');
      expect(metadata.timestamp).toBeDefined();
    });

    it('should create image metadata for multiple images', () => {
      const metadata = createImageMetadata({
        imageUrl: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg'
        ]
      });

      expect(metadata.type).toBe('image');
      expect(metadata.images).toHaveLength(2);
      expect(metadata.images[0].url).toBe('https://example.com/image1.jpg');
      expect(metadata.images[1].url).toBe('https://example.com/image2.jpg');
    });
  });

  describe('createAudioResponseMetadata', () => {
    it('should create audio response metadata', () => {
      const metadata = createAudioResponseMetadata({
        audioUrl: 'https://example.com/response.mp3',
        duration: 5.2,
        language: 'en',
        emotion: 'happy',
        isWaitingPhrase: false
      });

      expect(metadata.type).toBe('audio_response');
      expect(metadata.audioUrl).toBe('https://example.com/response.mp3');
      expect(metadata.duration).toBe(5.2);
      expect(metadata.emotion).toBe('happy');
      expect(metadata.isWaitingPhrase).toBe(false);
    });
  });

  describe('createMixedMetadata', () => {
    it('should create mixed metadata with audio and images', () => {
      const metadata = createMixedMetadata({
        audioUrl: 'https://example.com/audio.mp3',
        images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        language: 'en',
        additional: { customField: 'value' }
      });

      expect(metadata.type).toBe('mixed');
      expect(metadata.audioUrl).toBe('https://example.com/audio.mp3');
      expect(metadata.images).toHaveLength(2);
      expect(metadata.language).toBe('en');
      expect(metadata.customField).toBe('value');
    });
  });

  describe('getAudioUrl', () => {
    it('should extract audio URL from metadata', () => {
      const metadata = { audioUrl: 'https://example.com/audio.mp3' };
      expect(getAudioUrl(metadata)).toBe('https://example.com/audio.mp3');
    });

    it('should return null for metadata without audio', () => {
      expect(getAudioUrl({})).toBeNull();
      expect(getAudioUrl(null)).toBeNull();
    });
  });

  describe('getImageUrls', () => {
    it('should extract image URLs from new structure', () => {
      const metadata = {
        images: [
          { url: 'https://example.com/img1.jpg' },
          { url: 'https://example.com/img2.jpg' }
        ]
      };
      const urls = getImageUrls(metadata);
      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe('https://example.com/img1.jpg');
    });

    it('should extract image URLs from legacy imageUrl field', () => {
      const metadata = {
        imageUrl: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg']
      };
      const urls = getImageUrls(metadata);
      expect(urls).toHaveLength(2);
    });

    it('should handle single image URL', () => {
      const metadata = { imageUrl: 'https://example.com/img.jpg' };
      const urls = getImageUrls(metadata);
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('https://example.com/img.jpg');
    });

    it('should return empty array for no images', () => {
      expect(getImageUrls({})).toEqual([]);
      expect(getImageUrls(null)).toEqual([]);
    });
  });

  describe('hasAudio', () => {
    it('should return true for message with audio', () => {
      const message = {
        metadata: { audioUrl: 'https://example.com/audio.mp3' }
      };
      expect(hasAudio(message)).toBe(true);
    });

    it('should return false for message without audio', () => {
      expect(hasAudio({ metadata: {} })).toBe(false);
      expect(hasAudio({})).toBe(false);
      expect(hasAudio(null)).toBe(false);
    });
  });

  describe('hasImages', () => {
    it('should return true for message with images', () => {
      const message = {
        metadata: { images: [{ url: 'https://example.com/img.jpg' }] }
      };
      expect(hasImages(message)).toBe(true);
    });

    it('should return false for message without images', () => {
      expect(hasImages({ metadata: {} })).toBe(false);
      expect(hasImages({})).toBe(false);
    });
  });

  describe('hasMultimedia', () => {
    it('should return true for message with audio', () => {
      const message = {
        metadata: { audioUrl: 'https://example.com/audio.mp3' }
      };
      expect(hasMultimedia(message)).toBe(true);
    });

    it('should return true for message with images', () => {
      const message = {
        metadata: { images: [{ url: 'https://example.com/img.jpg' }] }
      };
      expect(hasMultimedia(message)).toBe(true);
    });

    it('should return false for message without multimedia', () => {
      expect(hasMultimedia({ metadata: {} })).toBe(false);
    });
  });

  describe('getMultimediaSummary', () => {
    it('should return complete summary for multimedia message', () => {
      const message = {
        metadata: {
          audioUrl: 'https://example.com/audio.mp3',
          images: [{ url: 'https://example.com/img.jpg' }],
          language: 'en',
          emotion: 'happy',
          type: 'mixed'
        }
      };

      const summary = getMultimediaSummary(message);
      expect(summary.hasAudio).toBe(true);
      expect(summary.hasImages).toBe(true);
      expect(summary.audioUrl).toBe('https://example.com/audio.mp3');
      expect(summary.imageUrls).toHaveLength(1);
      expect(summary.language).toBe('en');
      expect(summary.emotion).toBe('happy');
      expect(summary.type).toBe('mixed');
    });
  });

  describe('isValidAudioUrl', () => {
    it('should validate HTTP/HTTPS URLs', () => {
      expect(isValidAudioUrl('https://example.com/audio.mp3')).toBe(true);
      expect(isValidAudioUrl('http://example.com/audio.wav')).toBe(true);
    });

    it('should validate blob URLs', () => {
      expect(isValidAudioUrl('blob:https://example.com/123')).toBe(true);
    });

    it('should validate audio file extensions', () => {
      expect(isValidAudioUrl('https://example.com/file.mp3')).toBe(true);
      expect(isValidAudioUrl('https://example.com/file.wav')).toBe(true);
      expect(isValidAudioUrl('https://example.com/file.ogg')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidAudioUrl('')).toBe(false);
      expect(isValidAudioUrl(null)).toBe(false);
      expect(isValidAudioUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidImageUrl', () => {
    it('should validate HTTP/HTTPS URLs', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('http://example.com/image.png')).toBe(true);
    });

    it('should validate blob and data URLs', () => {
      expect(isValidImageUrl('blob:https://example.com/123')).toBe(true);
      expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(true);
    });

    it('should validate image file extensions', () => {
      expect(isValidImageUrl('https://example.com/file.jpg')).toBe(true);
      expect(isValidImageUrl('https://example.com/file.png')).toBe(true);
      expect(isValidImageUrl('https://example.com/file.gif')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidImageUrl('')).toBe(false);
      expect(isValidImageUrl(null)).toBe(false);
      expect(isValidImageUrl('not-a-url')).toBe(false);
    });
  });

  describe('formatAudioDuration', () => {
    it('should format duration correctly', () => {
      expect(formatAudioDuration(0)).toBe('0:00');
      expect(formatAudioDuration(30)).toBe('0:30');
      expect(formatAudioDuration(60)).toBe('1:00');
      expect(formatAudioDuration(90)).toBe('1:30');
      expect(formatAudioDuration(125)).toBe('2:05');
      expect(formatAudioDuration(3661)).toBe('61:01');
    });

    it('should handle invalid input', () => {
      expect(formatAudioDuration(null)).toBe('0:00');
      expect(formatAudioDuration(-10)).toBe('0:00');
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500.0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(1073741824)).toBe('1.0 GB');
    });

    it('should handle invalid input', () => {
      expect(formatFileSize(null)).toBe('0 B');
      expect(formatFileSize(-100)).toBe('0 B');
    });
  });

  describe('createAudioBlobUrl', () => {
    it('should create blob URL from audio blob', () => {
      const blob = new Blob(['audio data'], { type: 'audio/mp3' });
      const url = createAudioBlobUrl(blob);
      
      // In test environment, URL.createObjectURL might be mocked
      // Just verify it returns a string
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
      
      // Clean up
      URL.revokeObjectURL(url);
    });

    it('should throw error for invalid blob', () => {
      expect(() => createAudioBlobUrl(null)).toThrow('Invalid audio blob');
      expect(() => createAudioBlobUrl('not a blob')).toThrow('Invalid audio blob');
    });
  });

  describe('revokeBlobUrl', () => {
    it('should revoke blob URL', () => {
      const blob = new Blob(['data']);
      const url = URL.createObjectURL(blob);
      
      // Should not throw
      revokeBlobUrl(url);
    });

    it('should handle non-blob URLs gracefully', () => {
      // Should not throw
      revokeBlobUrl('https://example.com/file.mp3');
      revokeBlobUrl(null);
      revokeBlobUrl('');
    });
  });
});
