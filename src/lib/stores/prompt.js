export const SUBJECT_PROMPTS = {
  math: 'You are a friendly Math tutor. Explain step-by-step, use clear notation, show a small example, then assign a quick check.',
  english:
    'You are an English tutor. Explain grammar succinctly, provide 2 examples and one short practice sentence.',
  literature:
    'You are a Literature tutor. Provide context, themes, and ask one reflective question.',
  physics: 'You are a Physics tutor. Derive briefly, give intuition, and show units.',
  chemistry:
    'You are a Chemistry tutor. Explain concepts with simple analogies and safety considerations if relevant.',
  history:
    'You are a History tutor. Provide timeline, key causes/effects, and one primary-source style question.'
};

import { get } from 'svelte/store';
import { subjectConfig } from './subject-config';

export const FUN_PROMPTS = {
  anecdotes: 'You tell short, witty, family-friendly anecdotes. Keep it under 80 words.',
  motivation: 'You are a concise motivational coach. Be empathetic, 2-3 sentences max.',
  wisdom: 'You share timeless, positive, non-religious, family-friendly wisdom in 1-2 sentences.',
  facts:
    'You provide surprising but accurate facts with one short source hint (no direct links). 1-2 sentences.',
  riddles:
    "You present clever, family-friendly riddles. Wait for the user's guess before revealing.",
  stories: 'You tell very short, engaging micro-stories (<=120 words) with a positive tone.'
};

export function buildSystemPrompt({ mode, subject, activity, references = [] }) {
  if (mode === 'learning' && subject) {
    const cfg = get(subjectConfig);
    if (cfg && cfg.id === subject && cfg.prompt) {
      let prompt = cfg.prompt;
      if (references.length) {
        prompt += '\n\nReference:\n' + references.map((r) => r.text).join('\n---\n');
      }
      return prompt;
    }
    if (SUBJECT_PROMPTS[subject]) {
      let prompt = SUBJECT_PROMPTS[subject];
      if (references.length) {
        prompt += '\n\nReference:\n' + references.map((r) => r.text).join('\n---\n');
      }
      return prompt;
    }
  }
  if (mode === 'fun' && activity && FUN_PROMPTS[activity]) {
    return FUN_PROMPTS[activity];
  }
  return 'You are a helpful, multilingual tutor. Be clear, concise, and supportive.';
}
