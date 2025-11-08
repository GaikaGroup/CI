/**
 * Avatar Animation Service
 * Manages cat avatar emotions and speaking state
 */

import { get, writable } from 'svelte/store';

// Stores for avatar state
export const isSpeaking = writable(false);
export const currentEmotion = writable('neutral');
export const audioAmplitude = writable(0);

// Emotion persistence
let lastEmotionChangeTime = 0;
const MIN_EMOTION_DURATION = 2000; // 2 seconds minimum

/**
 * Determine emotion from text
 */
export function determineEmotion(text) {
  const emotionPatterns = {
    happy:
      /\b(happy|great|excellent|good|congratulations|well done|fantastic|wonderful|amazing|delighted|pleased|joy|enjoy|glad|success|achievement|perfect|brilliant|awesome|love it|impressive)\b/i,

    sad: /\b(sad|sorry|unfortunate|regret|disappointed|unhappy|upset|apology|apologize|depressed|gloomy|miserable|heartbroken|grief|sorrow|tragic|pity|sympathy|condolences|failed)\b/i,

    surprised:
      /\b(surprised|wow|amazing|incredible|unexpected|astonishing|shocking|startling|remarkable|extraordinary|unbelievable|stunned|astounded|speechless|wonder|awe|fascinating|impressive|sudden|unpredictable)\b/i,

    angry:
      /\b(angry|frustrated|error|wrong|incorrect|failed|annoyed|upset|mad|furious|irritated|outraged|enraged|livid|hostile|agitated|displeased|indignant|exasperated|problem|issue|mistake|fault)\b/i
  };

  const scores = {
    happy: (text.match(emotionPatterns.happy) || []).length,
    sad: (text.match(emotionPatterns.sad) || []).length,
    surprised: (text.match(emotionPatterns.surprised) || []).length,
    angry: (text.match(emotionPatterns.angry) || []).length
  };

  console.log('Emotion scores:', scores);

  let maxScore = 0;
  let dominantEmotion = 'neutral';

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion;
    }
  }

  const now = Date.now();
  if (now - lastEmotionChangeTime < MIN_EMOTION_DURATION) {
    return get(currentEmotion);
  }

  if (maxScore > 0) {
    if (dominantEmotion !== get(currentEmotion)) {
      lastEmotionChangeTime = now;
    }
    currentEmotion.set(dominantEmotion);
    return dominantEmotion;
  } else {
    if (get(currentEmotion) !== 'neutral') {
      lastEmotionChangeTime = now;
    }
    currentEmotion.set('neutral');
    return 'neutral';
  }
}
