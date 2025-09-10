import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function persisted(key, initial) {
  const store = writable(initial);
  if (browser) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        store.set(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    store.subscribe((value) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }
  return store;
}

export const consent = persisted('consent', false);
export const gender = persisted('gender', null);
export const language = persisted('sessionLanguage', 'en');

export function setConsent(value) {
  consent.set(value);
}

export function setGender(value) {
  gender.set(value);
}

export function setSessionLanguage(value) {
  language.set(value);
}
