import { writable } from 'svelte/store';

// Language store for managing selected language
export const selectedLanguage = writable('en');

// Available languages
export const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];