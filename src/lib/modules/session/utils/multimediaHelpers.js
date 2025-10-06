/**
 * Multimedia Helpers for Session Messages
 * Utilities for handling voice, audio, and image metadata in session messages
 */

/**
 * Create metadata object for voice input message
 * @param {Object} options - Voice metadata options
 * @param {string} options.audioUrl - URL to the recorded audio
 * @param {number} options.duration - Duration of the audio in seconds
 * @param {string} options.language - Language of the audio
 * @param {string} options.transcription - Transcribed text (optional, for reference)
 * @returns {Object} Metadata object
 */
export function createVoiceMetadata(options = {}) {
  const { audioUrl, duration, language, transcription } = options;
  
  return {
    type: 'voice',
    audioUrl,
    duration,
    language,
    transcription,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create metadata object for image upload message
 * @param {Object} options - Image metadata options
 * @param {string|Array<string>} options.imageUrl - URL(s) to the uploaded image(s)
 * @param {string} options.imageType - MIME type of the image
 * @param {number} options.imageSize - Size of the image in bytes
 * @param {Object} options.imageDimensions - Image dimensions {width, height}
 * @returns {Object} Metadata object
 */
export function createImageMetadata(options = {}) {
  const { imageUrl, imageType, imageSize, imageDimensions } = options;
  
  // Handle both single image and multiple images
  const images = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
  
  return {
    type: 'image',
    images: images.map((url, index) => ({
      url,
      type: imageType,
      size: imageSize,
      dimensions: imageDimensions,
      index
    })),
    timestamp: new Date().toISOString()
  };
}

/**
 * Create metadata object for AI response with audio
 * @param {Object} options - Audio response metadata options
 * @param {string} options.audioUrl - URL to the synthesized audio
 * @param {number} options.duration - Duration of the audio in seconds
 * @param {string} options.language - Language of the audio
 * @param {string} options.emotion - Detected emotion from the text
 * @param {boolean} options.isWaitingPhrase - Whether this is a waiting phrase
 * @returns {Object} Metadata object
 */
export function createAudioResponseMetadata(options = {}) {
  const { audioUrl, duration, language, emotion, isWaitingPhrase = false } = options;
  
  return {
    type: 'audio_response',
    audioUrl,
    duration,
    language,
    emotion,
    isWaitingPhrase,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create metadata object for mixed multimedia message
 * @param {Object} options - Mixed metadata options
 * @param {string} options.audioUrl - URL to audio (optional)
 * @param {Array<string>} options.images - Array of image URLs (optional)
 * @param {string} options.language - Language
 * @param {Object} options.additional - Additional metadata fields
 * @returns {Object} Metadata object
 */
export function createMixedMetadata(options = {}) {
  const { audioUrl, images, language, additional = {} } = options;
  
  const metadata = {
    type: 'mixed',
    timestamp: new Date().toISOString(),
    ...additional
  };
  
  if (audioUrl) {
    metadata.audioUrl = audioUrl;
  }
  
  if (images && images.length > 0) {
    metadata.images = images;
  }
  
  if (language) {
    metadata.language = language;
  }
  
  return metadata;
}

/**
 * Extract audio URL from message metadata
 * @param {Object} metadata - Message metadata
 * @returns {string|null} Audio URL or null
 */
export function getAudioUrl(metadata) {
  if (!metadata) return null;
  return metadata.audioUrl || null;
}

/**
 * Extract image URLs from message metadata
 * @param {Object} metadata - Message metadata
 * @returns {Array<string>} Array of image URLs
 */
export function getImageUrls(metadata) {
  if (!metadata) return [];
  
  // Handle different metadata structures
  if (metadata.images) {
    if (Array.isArray(metadata.images)) {
      // New structure with image objects
      return metadata.images.map(img => typeof img === 'string' ? img : img.url).filter(Boolean);
    }
    return [];
  }
  
  if (metadata.imageUrl) {
    return Array.isArray(metadata.imageUrl) ? metadata.imageUrl : [metadata.imageUrl];
  }
  
  return [];
}

/**
 * Check if message has audio
 * @param {Object} message - Message object
 * @returns {boolean} True if message has audio
 */
export function hasAudio(message) {
  return !!(message?.metadata?.audioUrl);
}

/**
 * Check if message has images
 * @param {Object} message - Message object
 * @returns {boolean} True if message has images
 */
export function hasImages(message) {
  const urls = getImageUrls(message?.metadata);
  return urls.length > 0;
}

/**
 * Check if message has any multimedia content
 * @param {Object} message - Message object
 * @returns {boolean} True if message has multimedia
 */
export function hasMultimedia(message) {
  return hasAudio(message) || hasImages(message);
}

/**
 * Get multimedia summary for a message
 * @param {Object} message - Message object
 * @returns {Object} Summary of multimedia content
 */
export function getMultimediaSummary(message) {
  const metadata = message?.metadata;
  
  return {
    hasAudio: hasAudio(message),
    hasImages: hasImages(message),
    audioUrl: getAudioUrl(metadata),
    imageUrls: getImageUrls(metadata),
    language: metadata?.language,
    emotion: metadata?.emotion,
    type: metadata?.type,
    timestamp: metadata?.timestamp
  };
}

/**
 * Validate audio URL
 * @param {string} url - Audio URL to validate
 * @returns {boolean} True if valid
 */
export function isValidAudioUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Check for common audio file extensions or blob URLs
    return (
      urlObj.protocol === 'http:' ||
      urlObj.protocol === 'https:' ||
      urlObj.protocol === 'blob:' ||
      /\.(mp3|wav|ogg|m4a|aac)$/i.test(urlObj.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Validate image URL
 * @param {string} url - Image URL to validate
 * @returns {boolean} True if valid
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    // Check for common image file extensions or blob URLs
    return (
      urlObj.protocol === 'http:' ||
      urlObj.protocol === 'https:' ||
      urlObj.protocol === 'blob:' ||
      urlObj.protocol === 'data:' ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(urlObj.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Format audio duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1:23")
 */
export function formatAudioDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a blob URL from audio data
 * @param {Blob} audioBlob - Audio blob
 * @returns {string} Blob URL
 */
export function createAudioBlobUrl(audioBlob) {
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    throw new Error('Invalid audio blob');
  }
  
  return URL.createObjectURL(audioBlob);
}

/**
 * Revoke a blob URL to free memory
 * @param {string} blobUrl - Blob URL to revoke
 */
export function revokeBlobUrl(blobUrl) {
  if (blobUrl && typeof blobUrl === 'string' && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Extract metadata from audio file
 * @param {File} audioFile - Audio file
 * @returns {Promise<Object>} Audio metadata
 */
export async function extractAudioMetadata(audioFile) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioFile);
    
    audio.addEventListener('loadedmetadata', () => {
      const metadata = {
        duration: audio.duration,
        type: audioFile.type,
        size: audioFile.size,
        name: audioFile.name
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    });
    
    audio.addEventListener('error', (error) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    });
    
    audio.src = url;
  });
}

/**
 * Extract metadata from image file
 * @param {File} imageFile - Image file
 * @returns {Promise<Object>} Image metadata
 */
export async function extractImageMetadata(imageFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    
    img.onload = () => {
      const metadata = {
        width: img.width,
        height: img.height,
        type: imageFile.type,
        size: imageFile.size,
        name: imageFile.name,
        aspectRatio: img.width / img.height
      };
      
      URL.revokeObjectURL(url);
      resolve(metadata);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image metadata'));
    };
    
    img.src = url;
  });
}

export default {
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
  revokeBlobUrl,
  extractAudioMetadata,
  extractImageMetadata
};
