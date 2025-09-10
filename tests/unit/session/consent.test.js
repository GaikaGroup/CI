import { describe, it, expect } from 'vitest';
import { consent, gender, setConsent, setGender } from '$lib/stores/session';
import { get } from 'svelte/store';

describe('session store', () => {
  it('stores consent and gender', () => {
    setConsent(true);
    setGender('female');
    expect(get(consent)).toBe(true);
    expect(get(gender)).toBe('female');
  });
});
