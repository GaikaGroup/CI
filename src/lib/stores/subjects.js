// Backward compatibility - this module now imports from courses.js
import { coursesStore } from './coursesDB.js';

// Re-export everything from courses store for backward compatibility
export const subjectsStore = coursesStore;
export const DEFAULT_SUBJECTS = [];

// Legacy function names for backward compatibility
export function createSubjectsStore() {
  return coursesStore;
}
