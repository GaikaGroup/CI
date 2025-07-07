// Voice Chat Services
import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { setLoading, setError } from '$lib/stores/app';
import { addMessage } from './stores';

// Audio recording variables
let mediaRecorder;
let audioChunks = [];
let audioContext;
let audioPlayer;

/**
 * Initialize audio context and player
 */
export function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  if (!audioPlayer) {
    audioPlayer = new Audio();
  }
}

/**
 * Start recording audio
 * @returns {Promise<void>}
 */
export async function startRecording() {
  try {
    initAudioContext();
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
 * @returns {Promise<string>} - Transcribed text
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
      
      // Stop all tracks in the stream
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error stopping recording:', error);
      reject(error);
    }
  });
}

/**
 * Transcribe audio using Whisper API
 * @param {Blob} audioBlob - Audio blob to transcribe
 * @returns {Promise<string>} - Transcribed text
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
 * Send transcribed text to chat API and get response
 * @param {string} transcription - Transcribed text
 * @returns {Promise<string>} - AI response
 */
export async function sendTranscribedText(transcription) {
  try {
    setLoading(true);
    
    // Add the transcription as a user message
    addMessage('user', transcription);
    
    // Send the transcribed message to the OpenAI API
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: transcription,
        language: get(selectedLanguage)
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to process voice data');
    }
    
    const data = await response.json();
    
    // Add the AI's response to the chat
    addMessage('tutor', data.response);
    
    // Synthesize speech from the response
    await synthesizeSpeech(data.response);
    
    return data.response;
  } catch (error) {
    console.error('Error processing voice data:', error);
    setError('Failed to process voice data. Please try again.');
    throw error;
  } finally {
    setLoading(false);
  }
}

/**
 * Synthesize speech from text using TTS API
 * @param {string} text - Text to synthesize
 * @returns {Promise<void>}
 */
async function synthesizeSpeech(text) {
  try {
    setLoading(true);
    
    const response = await fetch('/api/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language: get(selectedLanguage)
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to synthesize speech');
    }
    
    const audioBlob = await response.blob();
    playAudio(audioBlob);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    setError('Failed to synthesize speech. Please try again.');
  } finally {
    setLoading(false);
  }
}

/**
 * Play audio from blob
 * @param {Blob} audioBlob - Audio blob to play
 */
function playAudio(audioBlob) {
  const audioUrl = URL.createObjectURL(audioBlob);
  audioPlayer.src = audioUrl;
  audioPlayer.play();
  
  // Clean up the URL object after playing
  audioPlayer.onended = () => {
    URL.revokeObjectURL(audioUrl);
  };
}