import { writable } from 'svelte/store';

// Theme store for managing dark/light mode
export const darkMode = writable(false);