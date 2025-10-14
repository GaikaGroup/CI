/**
 * Session Store Mode Mapping Tests
 * Tests for mode mapping functionality in session store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { sessionStore } from '../../../src/lib/modules/session/stores/sessionStore.js';
import { user, isAuthenticated } from '../../../src/lib/modules/auth/stores.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Session Store Mode Mapping', () => {
  beforeEach(() => {
    // Reset store
    sessionStore.reset();

    // Mock authenticated user
    user.set({ id: 'test-user-1', name: 'Test User' });
    isAuthenticated.set(true);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadSessions mode mapping', () => {
    it('should map catalogue mode to learn for API calls', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 20,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      });

      // Call loadSessions with catalogue mode
      await sessionStore.loadSessions({ mode: 'catalogue' });

      // Verify fetch was called with mapped mode
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('mode=learn'));
    });

    it('should map learn mode to learn for API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 20,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      });

      await sessionStore.loadSessions({ mode: 'learn' });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('mode=learn'));
    });

    it('should map fun mode to fun for API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 20,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      });

      await sessionStore.loadSessions({ mode: 'fun' });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('mode=fun'));
    });

    it('should not include mode parameter when mode is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 20,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      });

      await sessionStore.loadSessions({ mode: null });

      const fetchCall = mockFetch.mock.calls[0][0];
      expect(fetchCall).not.toContain('mode=');
    });
  });

  describe('searchSessions mode mapping', () => {
    it('should map catalogue mode to learn for search API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 20,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      });

      await sessionStore.searchSessions('test query', { mode: 'catalogue' });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('mode=learn'));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('search=test+query'));
    });

    it('should map fun mode to fun for search API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          sessions: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 20,
            hasNextPage: false,
            hasPreviousPage: false
          }
        })
      });

      await sessionStore.searchSessions('test query', { mode: 'fun' });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('mode=fun'));
    });
  });

  describe('createSession mode mapping', () => {
    it('should map catalogue mode to learn for session creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'new-session-id',
          title: 'Test Session',
          mode: 'learn',
          language: 'en'
        })
      });

      await sessionStore.createSession('Test Session', 'catalogue');

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Session',
          mode: 'learn', // Should be mapped from 'catalogue'
          language: 'en',
          preview: null,
          courseId: null
        })
      });
    });

    it('should map fun mode to fun for session creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'new-session-id',
          title: 'Test Session',
          mode: 'fun',
          language: 'en'
        })
      });

      await sessionStore.createSession('Test Session', 'fun');

      expect(mockFetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Session',
          mode: 'fun',
          language: 'en',
          preview: null,
          courseId: null
        })
      });
    });
  });
});
