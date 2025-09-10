import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '$lib/stores/prompt';
import { subjectConfig } from '$lib/stores/subject-config';

describe('subject-specific prompts', () => {
  it('uses loaded subject prompt when available', () => {
    subjectConfig.set({ id: 'dele-b1', prompt: 'Test prompt content' });
    const result = buildSystemPrompt({ mode: 'learning', subject: 'dele-b1' });
    expect(result).toBe('Test prompt content');
  });
});
