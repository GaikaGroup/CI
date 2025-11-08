/**
 * Speech Synthesizer Service
 * Handles text-to-speech synthesis for responses and waiting phrases
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { setLoading, setError } from '$lib/stores/app';
import { isVoiceModeActive } from './voiceModeManager.js';
import { determineEmotion } from './avatarAnimation.js';
import { playAudioWithBuffering } from './audioPlayer.js';

/**
 * Synthesize waiting phrase
 */
export async function synthesizeWaitingPhrase(text, language = null) {
  const targetLanguage = language || get(selectedLanguage);
  console.log(`Synthesizing waiting phrase in ${targetLanguage}: "${text}"`);

  return synthesizeSpeech(text, {
    isWaitingPhrase: true,
    language: targetLanguage,
    priority: 2
  });
}

/**
 * Synthesize response speech (handles long texts)
 */
export async function synthesizeResponseSpeech(text) {
  if (!get(isVoiceModeActive)) {
    console.log('Voice mode not active, skipping speech synthesis');
    return;
  }

  console.log('Voice mode active, synthesizing speech for response');
  determineEmotion(text);

  const MAX_TTS_LENGTH = 1000;
  console.log(`[TTS] Text length: ${text.length} chars (max: ${MAX_TTS_LENGTH})`);

  if (text.length > MAX_TTS_LENGTH) {
    console.log(`[TTS] Text is long, splitting into chunks`);
    const chunks = splitTextForTTS(text, MAX_TTS_LENGTH);
    console.log(`[TTS] Split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[TTS] Synthesizing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      try {
        await synthesizeSpeech(chunk, {
          isWaitingPhrase: false,
          priority: 1
        });

        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error synthesizing chunk ${i + 1}:`, error);
      }
    }

    console.log('[TTS] Completed synthesizing all chunks');
  } else {
    console.log(`[TTS] Text is short enough, synthesizing as single chunk`);
    await synthesizeSpeech(text, {
      isWaitingPhrase: false,
      priority: 1
    });
  }
}

/**
 * Core speech synthesis function
 */
async function synthesizeSpeech(text, options = {}) {
  const startTime = Date.now();
  let networkTime = 0;
  let processingTime = 0;

  const {
    isWaitingPhrase = false,
    language = get(selectedLanguage),
    priority = isWaitingPhrase ? 2 : 1
  } = options;

  if (!get(isVoiceModeActive)) {
    console.warn('Voice mode inactive, skipping speech synthesis');
    return;
  }

  try {
    console.log(
      `Synthesizing ${isWaitingPhrase ? 'waiting phrase' : 'response'}: "${text.substring(0, 50)}..." (language: ${language}, priority: ${priority})`
    );

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text for synthesis');
    }

    setLoading(true);

    const networkStartTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), isWaitingPhrase ? 5000 : 15000);

    try {
      const response = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          isWaitingPhrase,
          priority
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      networkTime = Date.now() - networkStartTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Synthesis API error (${response.status}): ${errorText}`);
      }

      const processingStartTime = Date.now();
      const audioBlob = await response.blob();
      processingTime = Date.now() - processingStartTime;

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Received empty audio blob');
      }

      if (audioBlob.size > 10 * 1024 * 1024) {
        console.warn(`Audio blob is very large (${Math.round(audioBlob.size / 1024 / 1024)}MB)`);
      }

      const audioWithMetadata = {
        blob: audioBlob,
        metadata: {
          isWaitingPhrase,
          originalText: text,
          language,
          priority,
          timestamp: Date.now(),
          synthesisTime: Date.now() - startTime,
          networkTime,
          processingTime,
          blobSize: audioBlob.size,
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      };

      console.log(
        `Synthesis completed (total: ${Date.now() - startTime}ms, network: ${networkTime}ms, size: ${Math.round(audioBlob.size / 1024)}KB)`
      );

      await playAudioWithBuffering(audioWithMetadata);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        throw new Error(`Synthesis request timed out`);
      }

      throw fetchError;
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`Error synthesizing speech after ${totalTime}ms:`, error);

    if (isWaitingPhrase) {
      console.warn('Waiting phrase synthesis failed, continuing without phrase');
      return;
    } else {
      console.error('AI response synthesis failed');
      setError('Speech synthesis failed. You can see the text response above.');
    }
  } finally {
    setLoading(false);
  }
}

/**
 * Split text into chunks for TTS
 */
function splitTextForTTS(text, maxChunkLength = 1000) {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const chunks = [];
  const sentenceRegex = /[^.!?]+[.!?]+(?:\s+|$)/g;
  const sentences = text.match(sentenceRegex) || [text];

  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (trimmedSentence.length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      chunks.push(trimmedSentence);
      continue;
    }

    const potentialLength = currentChunk.length + (currentChunk ? 1 : 0) + trimmedSentence.length;

    if (potentialLength > maxChunkLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
