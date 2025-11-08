/**
 * Audio Utilities
 * Helper functions for audio processing
 */

/**
 * Get fallback waiting phrase for language
 */
export function getFallbackWaitingPhrase(language) {
  const fallbacks = {
    en: 'Let me think about that...',
    ru: 'Дайте мне подумать...',
    es: 'Déjame pensar en eso...',
    fr: 'Laissez-moi réfléchir...',
    de: 'Lass mich darüber nachdenken...',
    it: 'Fammi pensare...',
    pt: 'Deixe-me pensar nisso...',
    zh: '让我想想...',
    ja: '考えさせてください...',
    ko: '생각해 볼게요...'
  };

  return fallbacks[language] || fallbacks.en;
}

/**
 * Format audio duration (ms to human readable)
 */
export function formatAudioDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '0:00';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate audio file size estimate
 */
export function estimateAudioSize(text, language = 'en') {
  // Rough estimate: ~1KB per character for TTS audio
  const baseSize = text.length * 1024;

  // Language multipliers (some languages produce larger audio)
  const multipliers = {
    en: 1.0,
    ru: 1.2,
    es: 1.1,
    fr: 1.1,
    de: 1.15,
    zh: 0.9,
    ja: 0.95
  };

  const multiplier = multipliers[language] || 1.0;
  return Math.round(baseSize * multiplier);
}

/**
 * Validate audio blob
 */
export function validateAudioBlob(blob) {
  if (!blob) {
    return { valid: false, error: 'Audio blob is null or undefined' };
  }

  if (!(blob instanceof Blob)) {
    return { valid: false, error: 'Not a valid Blob object' };
  }

  if (blob.size === 0) {
    return { valid: false, error: 'Audio blob is empty (0 bytes)' };
  }

  if (blob.size > 50 * 1024 * 1024) {
    // 50MB limit
    return {
      valid: false,
      error: `Audio blob too large (${Math.round(blob.size / 1024 / 1024)}MB)`
    };
  }

  // Check MIME type
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp3'];
  if (!validTypes.includes(blob.type) && blob.type !== '') {
    return { valid: false, error: `Invalid audio type: ${blob.type}` };
  }

  return { valid: true };
}

/**
 * Create audio URL from blob
 */
export function createAudioURL(blob) {
  try {
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating audio URL:', error);
    return null;
  }
}

/**
 * Revoke audio URL
 */
export function revokeAudioURL(url) {
  try {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error revoking audio URL:', error);
  }
}

/**
 * Convert audio blob to base64
 */
export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 to audio blob
 */
export function base64ToBlob(base64, mimeType = 'audio/mpeg') {
  try {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeType });
  } catch (error) {
    console.error('Error converting base64 to blob:', error);
    return null;
  }
}

/**
 * Merge multiple audio blobs
 */
export async function mergeAudioBlobs(blobs) {
  if (!blobs || blobs.length === 0) return null;
  if (blobs.length === 1) return blobs[0];

  // Simple concatenation (works for most formats)
  return new Blob(blobs, { type: blobs[0].type });
}

/**
 * Get audio metadata
 */
export async function getAudioMetadata(blob) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = createAudioURL(blob);

    audio.onloadedmetadata = () => {
      const metadata = {
        duration: audio.duration,
        size: blob.size,
        type: blob.type
      };
      revokeAudioURL(url);
      resolve(metadata);
    };

    audio.onerror = () => {
      revokeAudioURL(url);
      resolve(null);
    };

    audio.src = url;
  });
}
