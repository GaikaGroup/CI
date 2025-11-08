/**
 * Audio Recorder Service
 * Handles microphone recording and transcription
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { setLoading, setError } from '$lib/stores/app';

// Recording state
let mediaRecorder;
let audioChunks = [];

/**
 * Start recording audio from microphone
 */
export async function startRecording() {
  try {
    audioChunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    return true;
  } catch (error) {
    console.error('Error starting recording:', error);
    setError('Failed to start recording. Please check your microphone permissions.');
    return false;
  }
}

/**
 * Stop recording and transcribe audio
 */
export async function stopRecording() {
  return new Promise((resolve, reject) => {
    try {
      if (!mediaRecorder) {
        reject('No recording in progress');
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const transcription = await transcribeAudio(audioBlob);
          resolve(transcription);
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error('Error stopping recording:', error);
      reject(error);
    }
  });
}

/**
 * Transcribe audio using Whisper API
 */
async function transcribeAudio(audioBlob) {
  try {
    setLoading(true);

    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', get(selectedLanguage));

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();

    if (data.detectedLanguage && data.detectedLanguage !== get(selectedLanguage)) {
      console.log(
        `Language detected: ${data.detectedLanguage}, updating from ${get(selectedLanguage)}`
      );
      selectedLanguage.set(data.detectedLanguage);
    } else {
      const detectedLang = detectLanguageFromText(data.transcription);
      if (detectedLang && detectedLang !== get(selectedLanguage)) {
        console.log(
          `Language detected from text: ${detectedLang}, updating from ${get(selectedLanguage)}`
        );
        selectedLanguage.set(detectedLang);
      }
    }

    return data.transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    setError('Failed to transcribe audio. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
}

/**
 * Detect language from text content
 */
function detectLanguageFromText(text) {
  if (!text || text.length < 3) return null;

  if (/[а-яё]/i.test(text)) {
    return 'ru';
  }

  if (
    /[ñáéíóúü¿¡]/i.test(text) ||
    /\b(el|la|los|las|un|una|de|del|en|con|por|para|que|es|son|está|están)\b/i.test(text)
  ) {
    return 'es';
  }

  return 'en';
}
