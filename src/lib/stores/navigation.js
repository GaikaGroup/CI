import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { user } from '$modules/auth/stores';
import { coursesStore } from './coursesDB.js';
import { activeEnrollments } from './enrollmentDB.js';

/**
 * Navigation State Store
 * Manages current navigation mode and badge counts for Student/Tutor sections
 */

// Navigation modes
export const NAVIGATION_MODES = {
  FUN: 'fun',
  STUDENT: 'student',
  TUTOR: 'tutor'
};

// Current navigation mode
export const currentMode = writable(NAVIGATION_MODES.FUN);

// Navigation state store
function createNavigationStore() {
  const { subscribe, set, update } = writable({
    currentMode: NAVIGATION_MODES.FUN,
    badges: {
      student: 0,
      tutor: 0
    },
    isInitialized: false
  });

  return {
    subscribe,
    
    /**
     * Set current navigation mode
     */
    setMode: (mode) => {
      if (Object.values(NAVIGATION_MODES).includes(mode)) {
        update(state => ({
          ...state,
          currentMode: mode
        }));
        
        // Store in localStorage for persistence
        if (browser) {
          localStorage.setItem('navigationMode', mode);
        }
      }
    },

    /**
     * Update badge counts
     */
    updateBadges: (studentCount, tutorCount) => {
      update(state => ({
        ...state,
        badges: {
          student: studentCount || 0,
          tutor: tutorCount || 0
        }
      }));
    },

    /**
     * Initialize navigation state
     */
    initialize: () => {
      update(state => ({
        ...state,
        isInitialized: true
      }));

      // Restore mode from localStorage
      if (browser) {
        const savedMode = localStorage.getItem('navigationMode');
        if (savedMode && Object.values(NAVIGATION_MODES).includes(savedMode)) {
          update(state => ({
            ...state,
            currentMode: savedMode
          }));
        }
      }
    },

    /**
     * Reset to default state
     */
    reset: () => {
      set({
        currentMode: NAVIGATION_MODES.FUN,
        badges: {
          student: 0,
          tutor: 0
        },
        isInitialized: false
      });
      
      if (browser) {
        localStorage.removeItem('navigationMode');
      }
    }
  };
}

export const navigationStore = createNavigationStore();

// Derived store for student course count (enrolled courses)
export const studentCourseCount = derived(
  [activeEnrollments],
  ([$activeEnrollments]) => {
    return $activeEnrollments ? $activeEnrollments.length : 0;
  }
);

// Derived store for tutor course count (authored courses)
export const tutorCourseCount = derived(
  [coursesStore, user],
  ([$coursesStore, $user]) => {
    if (!$user || !$coursesStore.courses) return 0;
    
    return $coursesStore.courses.filter(course => 
      course.creatorId === $user.id || 
      course.creatorRole === 'user' // For backward compatibility
    ).length;
  }
);

// Combined badge counts
export const badgeCounts = derived(
  [studentCourseCount, tutorCourseCount],
  ([$studentCount, $tutorCount]) => ({
    student: $studentCount,
    tutor: $tutorCount
  })
);

// Auto-update navigation badges when counts change
if (browser) {
  badgeCounts.subscribe(counts => {
    navigationStore.updateBadges(counts.student, counts.tutor);
  });
}

// Initialize navigation store when user changes
if (browser) {
  user.subscribe(($user) => {
    if ($user) {
      navigationStore.initialize();
    } else {
      navigationStore.reset();
    }
  });
}

// Export current mode as derived store
export const navigationMode = derived(
  navigationStore,
  $nav => $nav.currentMode
);

// Export badge counts as derived store
export const navigationBadges = derived(
  navigationStore,
  $nav => $nav.badges
);

// Helper functions
export const isStudentMode = derived(
  navigationMode,
  $mode => $mode === NAVIGATION_MODES.STUDENT
);

export const isTutorMode = derived(
  navigationMode,
  $mode => $mode === NAVIGATION_MODES.TUTOR
);

export const isFunMode = derived(
  navigationMode,
  $mode => $mode === NAVIGATION_MODES.FUN
);