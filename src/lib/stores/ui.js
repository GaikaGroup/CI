import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { addSystemMessage } from '$lib/modules/chat/stores';
import { selectedLanguage } from '$lib/modules/i18n/stores';
import { getTranslation } from '$lib/modules/i18n/translations';

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

export const mode = persisted('mode', 'learning');
export const chatType = persisted('chatType', 'text');
export const subject = persisted('subject', null);
export const activity = persisted('activity', null);

// Update legacy chatMode store to keep in sync
import { chatMode } from '$lib/modules/chat/stores';
chatType.subscribe((v) => chatMode.set(v));

export function setMode(value) {
  mode.set(value);
}

export function setChatType(value) {
  chatType.set(value);
}

export function setSubject(value) {
  subject.set(value);
  if (value) {
    const lang = get(selectedLanguage);
    const subj = getTranslation(lang, `subjects.${value}`);
    const msg = getTranslation(lang, 'banner.switched.subject').replace('{subject}', subj);
    addSystemMessage(msg);
  }
}

export function setActivity(value) {
  activity.set(value);
  if (value) {
    const lang = get(selectedLanguage);
    const act = getTranslation(lang, `fun.${value}`);
    const msg = getTranslation(lang, 'banner.switched.activity').replace('{activity}', act);
    addSystemMessage(msg);
  }
}

export function resetSelectionsToMode() {
  subject.set(null);
  activity.set(null);
}
