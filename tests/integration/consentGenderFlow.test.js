import { describe, it, expect } from 'vitest';
import { writable } from 'svelte/store';

describe('consent and gender flow', () => {
  it('records consent and gender selection', () => {
    const consent = writable({ agreed: false, gender: null });
    const giveConsent = (gender) => consent.set({ agreed: true, gender });
    let state;
    consent.subscribe((v) => (state = v));
    giveConsent('female');
    expect(state).toEqual({ agreed: true, gender: 'female' });
  });
});
