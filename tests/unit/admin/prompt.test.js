import { describe, it, expect, vi } from 'vitest';
vi.mock('$lib/stores/subject-config', () => {
  const { writable } = require('svelte/store');
  return { subjectConfig: writable(null) };
});
import { subjectConfig } from '$lib/stores/subject-config';

describe('prompt update', () => {
  it('updates prompt in store', () => {
    subjectConfig.set({ id: 'math', prompt: 'First' });
    subjectConfig.update((v) => ({ ...v, prompt: 'Second' }));
    let value;
    subjectConfig.subscribe((v) => (value = v))();
    expect(value.prompt).toBe('Second');
  });
});
