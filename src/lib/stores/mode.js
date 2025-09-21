import { writable, get } from 'svelte/store';
import { isAuthenticated } from '$modules/auth/stores';
import { goto } from '$app/navigation';

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('appMode') : null;
export const appMode = writable(stored || 'fun');

appMode.subscribe((mode) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('appMode', mode);
  }
});

export function setMode(mode) {
  appMode.set(mode);
}

export function requireAuth(mode) {
  if ((mode === 'learn' || mode === 'catalogue') && !get(isAuthenticated)) {
    goto('/login?redirect=/catalogue');
    return;
  }
  setMode(mode);
  goto(mode === 'learn' || mode === 'catalogue' ? '/catalogue' : '/');
}
