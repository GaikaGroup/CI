import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  navigationStore,
  NAVIGATION_MODES,
  studentCourseCount,
  tutorCourseCount,
  badgeCounts
} from '../../../src/lib/stores/navigation.js';

// Mock browser environment
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
  },
  writable: true
});

// Mock browser flag
vi.mock('$app/environment', () => ({
  browser: true
}));

describe('Navigation Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationStore.reset();
  });

  describe('navigationStore', () => {
    it('should initialize with default state', () => {
      const state = get(navigationStore);
      expect(state.currentMode).toBe(NAVIGATION_MODES.FUN);
      expect(state.badges.student).toBe(0);
      expect(state.badges.tutor).toBe(0);
      expect(state.isInitialized).toBe(false);
    });

    it('should set navigation mode', () => {
      navigationStore.setMode(NAVIGATION_MODES.STUDENT);
      const state = get(navigationStore);
      expect(state.currentMode).toBe(NAVIGATION_MODES.STUDENT);
      expect(localStorage.setItem).toHaveBeenCalledWith('navigationMode', NAVIGATION_MODES.STUDENT);
    });

    it('should not set invalid navigation mode', () => {
      navigationStore.setMode('invalid-mode');
      const state = get(navigationStore);
      expect(state.currentMode).toBe(NAVIGATION_MODES.FUN);
    });

    it('should update badge counts', () => {
      navigationStore.updateBadges(3, 2);
      const state = get(navigationStore);
      expect(state.badges.student).toBe(3);
      expect(state.badges.tutor).toBe(2);
    });

    it('should initialize and restore mode from localStorage', () => {
      localStorage.getItem.mockReturnValue(NAVIGATION_MODES.TUTOR);
      navigationStore.initialize();
      const state = get(navigationStore);
      expect(state.isInitialized).toBe(true);
      expect(state.currentMode).toBe(NAVIGATION_MODES.TUTOR);
    });

    it('should reset to default state', () => {
      navigationStore.setMode(NAVIGATION_MODES.STUDENT);
      navigationStore.updateBadges(5, 3);
      navigationStore.reset();

      const state = get(navigationStore);
      expect(state.currentMode).toBe(NAVIGATION_MODES.FUN);
      expect(state.badges.student).toBe(0);
      expect(state.badges.tutor).toBe(0);
      expect(state.isInitialized).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('navigationMode');
    });
  });

  describe('NAVIGATION_MODES', () => {
    it('should have correct mode constants', () => {
      expect(NAVIGATION_MODES.FUN).toBe('fun');
      expect(NAVIGATION_MODES.STUDENT).toBe('student');
      expect(NAVIGATION_MODES.TUTOR).toBe('tutor');
    });
  });

  describe('Badge calculation', () => {
    it('should calculate badge counts correctly', () => {
      const counts = get(badgeCounts);
      expect(counts).toHaveProperty('student');
      expect(counts).toHaveProperty('tutor');
      expect(typeof counts.student).toBe('number');
      expect(typeof counts.tutor).toBe('number');
    });
  });
});
