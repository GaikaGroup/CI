import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'learnModeExamProfile';

function createExamProfileStore() {
  const { subscribe, set, update } = writable(null);
  let initialised = false;

  const load = () => {
    if (!browser || initialised) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('[ExamProfile] Failed to load stored profile.', error);
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    initialised = true;
  };

  subscribe((value) => {
    if (!browser || !initialised) {
      return;
    }

    if (!value) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn('[ExamProfile] Failed to persist profile.', error);
    }
  });

  return {
    subscribe,
    initialise: load,
    setProfile(profile) {
      if (browser && !initialised) {
        load();
      }
      set(profile);
      if (browser) {
        try {
          if (profile) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.warn('[ExamProfile] Failed to persist profile.', error);
        }
      }
    },
    updateProfile(updater) {
      update((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        if (browser) {
          try {
            if (next) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (error) {
            console.warn('[ExamProfile] Failed to persist profile.', error);
          }
        }
        return next;
      });
    },
    clearProfile() {
      set(null);
      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };
}

export const examProfileStore = createExamProfileStore();
export const examProfile = { subscribe: examProfileStore.subscribe };
export const initialiseExamProfile = examProfileStore.initialise;
export const setExamProfile = examProfileStore.setProfile;
export const updateExamProfile = examProfileStore.updateProfile;
export const clearExamProfile = examProfileStore.clearProfile;
