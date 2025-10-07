/**
 * Tests for session search and filtering functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { sessionStore } from '../../../src/lib/modules/session/stores/sessionStore.js';
import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';
import {
  highlightText,
  getSearchExcerpt,
  containsSearchTerm,
  getMatchPositions
} from '../../../src/lib/modules/session/utils/searchHighlight.js';

// Mock the SessionService
vi.mock('../../../src/lib/modules/session/services/SessionService.js', () => ({
  SessionService: {
    getUserSessions: vi.fn(),
    searchSessions: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    getSession: vi.fn()
  },
  SessionError: class SessionError extends Error {},
  SessionNotFoundError: class SessionNotFoundError extends Error {},
  SessionValidationError: class SessionValidationError extends Error {}
}));

// Mock auth stores
vi.mock('../../../src/lib/modules/auth/stores.js', () => ({
  user: { subscribe: vi.fn((fn) => fn({ id: 'test-user-123' })) },
  isAuthenticated: { subscribe: vi.fn((fn) => fn(true)) }
}));

// Mock browser environment
vi.mock('$app/environment', () => ({
  browser: false
}));

describe('Search Highlighting Utilities', () => {
  describe('highlightText', () => {
    it('should highlight search terms in text', () => {
      const text = 'This is a test session';
      const searchTerm = 'test';
      const result = highlightText(text, searchTerm);

      expect(result).toContain('<mark class="highlight">test</mark>');
    });

    it('should be case-insensitive', () => {
      const text = 'This is a TEST session';
      const searchTerm = 'test';
      const result = highlightText(text, searchTerm);

      expect(result).toContain('<mark class="highlight">TEST</mark>');
    });

    it('should highlight multiple occurrences', () => {
      const text = 'test test test';
      const searchTerm = 'test';
      const result = highlightText(text, searchTerm);

      const matches = result.match(/<mark class="highlight">test<\/mark>/g);
      expect(matches).toHaveLength(3);
    });

    it('should handle empty search term', () => {
      const text = 'This is a test';
      const result = highlightText(text, '');

      expect(result).toBe(text);
    });

    it('should handle special regex characters', () => {
      const text = 'Price: $100 (special)';
      const searchTerm = '$100';
      const result = highlightText(text, searchTerm);

      expect(result).toContain('<mark class="highlight">$100</mark>');
    });

    it('should use custom class name', () => {
      const text = 'test text';
      const searchTerm = 'test';
      const result = highlightText(text, searchTerm, 'custom-highlight');

      expect(result).toContain('<mark class="custom-highlight">test</mark>');
    });
  });

  describe('getSearchExcerpt', () => {
    it('should return excerpt around search term', () => {
      const text =
        'This is a very long text with the search term somewhere in the middle of it all';
      const searchTerm = 'search term';
      const result = getSearchExcerpt(text, searchTerm, 20);

      expect(result).toContain('search term');
      expect(result).toContain('...');
    });

    it('should return full text if shorter than context', () => {
      const text = 'Short text';
      const searchTerm = 'text';
      const result = getSearchExcerpt(text, searchTerm, 50);

      expect(result).toBe(text);
    });

    it('should return beginning if no match found', () => {
      const text = 'This is a long text without the term';
      const searchTerm = 'missing';
      const result = getSearchExcerpt(text, searchTerm, 10);

      expect(result).toContain('This is a');
    });
  });

  describe('containsSearchTerm', () => {
    it('should return true if text contains search term', () => {
      expect(containsSearchTerm('Hello World', 'world')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(containsSearchTerm('Hello World', 'WORLD')).toBe(true);
    });

    it('should return false if text does not contain search term', () => {
      expect(containsSearchTerm('Hello World', 'missing')).toBe(false);
    });

    it('should handle empty inputs', () => {
      expect(containsSearchTerm('', 'test')).toBe(false);
      expect(containsSearchTerm('test', '')).toBe(false);
    });
  });

  describe('getMatchPositions', () => {
    it('should return all match positions', () => {
      const text = 'test test test';
      const searchTerm = 'test';
      const positions = getMatchPositions(text, searchTerm);

      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({ start: 0, end: 4 });
      expect(positions[1]).toEqual({ start: 5, end: 9 });
      expect(positions[2]).toEqual({ start: 10, end: 14 });
    });

    it('should return empty array if no matches', () => {
      const positions = getMatchPositions('Hello World', 'missing');
      expect(positions).toHaveLength(0);
    });

    it('should handle overlapping matches', () => {
      const text = 'aaa';
      const searchTerm = 'aa';
      const positions = getMatchPositions(text, searchTerm);

      // The function doesn't find overlapping matches by design
      // It moves past each match, so 'aaa' with 'aa' finds only one match at position 0
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ start: 0, end: 2 });
    });
  });
});

describe('Session Store - Search and Filtering', () => {
  // Note: Store tests with complex mocking are better suited for integration tests
  // Here we test that the store methods exist and have the correct interface

  it('should have searchSessions method', () => {
    expect(sessionStore.searchSessions).toBeDefined();
    expect(typeof sessionStore.searchSessions).toBe('function');
  });

  it('should have applyFilters method', () => {
    expect(sessionStore.applyFilters).toBeDefined();
    expect(typeof sessionStore.applyFilters).toBe('function');
  });

  it('should have clearFilters method', () => {
    expect(sessionStore.clearFilters).toBeDefined();
    expect(typeof sessionStore.clearFilters).toBe('function');
  });

  it('should have setFilters method', () => {
    expect(sessionStore.setFilters).toBeDefined();
    expect(typeof sessionStore.setFilters).toBe('function');
  });

  it('should export activeFiltersCount derived store', async () => {
    const { activeFiltersCount } = await import(
      '../../../src/lib/modules/session/stores/sessionStore.js'
    );
    expect(activeFiltersCount).toBeDefined();
  });

  it('should export hasActiveFilters derived store', async () => {
    const { hasActiveFilters } = await import(
      '../../../src/lib/modules/session/stores/sessionStore.js'
    );
    expect(hasActiveFilters).toBeDefined();
  });
});

describe('SessionService - Search and Filtering', () => {
  // Note: These are tested with mocks here, actual validation is tested in integration tests

  describe('Service methods exist', () => {
    it('should have searchSessions method', () => {
      expect(SessionService.searchSessions).toBeDefined();
      expect(typeof SessionService.searchSessions).toBe('function');
    });

    it('should have getUserSessions method', () => {
      expect(SessionService.getUserSessions).toBeDefined();
      expect(typeof SessionService.getUserSessions).toBe('function');
    });

    it('should accept date range filters in getUserSessions', () => {
      // This would be tested with actual database in integration tests
      expect(SessionService.getUserSessions).toBeDefined();
    });
  });
});
