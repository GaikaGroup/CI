/**
 * Integration tests for session search and filtering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from '../../../src/lib/modules/session/services/SessionService.js';
import { db } from '../../../src/lib/database/index.js';

describe('Session Search and Filtering Integration', () => {
  const testUserId = 'test-user-search-filter';
  let createdSessionIds = [];

  beforeEach(async () => {
    // Clean up any existing test data
    await db.session.deleteMany({
      where: { userId: testUserId }
    });

    // Create test sessions with various attributes
    const sessions = [
      {
        userId: testUserId,
        title: 'JavaScript Basics',
        preview: 'Learning about variables and functions',
        mode: 'learn',
        language: 'en',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        userId: testUserId,
        title: 'Python Fun Time',
        preview: 'Having fun with Python programming',
        mode: 'fun',
        language: 'en',
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-02-20')
      },
      {
        userId: testUserId,
        title: 'Spanish Conversation',
        preview: 'Practicing Spanish speaking skills',
        mode: 'learn',
        language: 'es',
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10')
      },
      {
        userId: testUserId,
        title: 'Math Problem Solving',
        preview: 'Working through algebra problems',
        mode: 'learn',
        language: 'en',
        createdAt: new Date('2024-04-05'),
        updatedAt: new Date('2024-04-05')
      },
      {
        userId: testUserId,
        title: 'Russian Language Practice',
        preview: 'Learning Russian vocabulary',
        mode: 'learn',
        language: 'ru',
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-01')
      }
    ];

    for (const sessionData of sessions) {
      const session = await db.session.create({ data: sessionData });
      createdSessionIds.push(session.id);
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db.session.deleteMany({
      where: { userId: testUserId }
    });
    createdSessionIds = [];
  });

  describe('Search Functionality', () => {
    it('should search sessions by title', async () => {
      const result = await SessionService.searchSessions(testUserId, 'JavaScript');

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('JavaScript Basics');
      expect(result.sessions[0]._searchMeta.matchedIn.title).toBe(true);
    });

    it('should search sessions by preview content', async () => {
      const result = await SessionService.searchSessions(testUserId, 'algebra');

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Math Problem Solving');
      expect(result.sessions[0]._searchMeta.matchedIn.preview).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const result = await SessionService.searchSessions(testUserId, 'PYTHON');

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].title).toBe('Python Fun Time');
    });

    it('should find multiple matches', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Learning');

      expect(result.sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty results for no matches', async () => {
      const result = await SessionService.searchSessions(testUserId, 'NonexistentTerm');

      expect(result.sessions).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });

    it('should include search metadata', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Python');

      expect(result.sessions[0]._searchMeta).toBeDefined();
      expect(result.sessions[0]._searchMeta.searchTerm).toBe('Python');
      expect(result.sessions[0]._searchMeta.matchedIn).toBeDefined();
    });
  });

  describe('Mode Filtering', () => {
    it('should filter sessions by fun mode', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        mode: 'fun'
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].mode).toBe('fun');
    });

    it('should filter sessions by learn mode', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        mode: 'learn'
      });

      expect(result.sessions.length).toBeGreaterThanOrEqual(4);
      result.sessions.forEach(session => {
        expect(session.mode).toBe('learn');
      });
    });

    it('should combine search with mode filter', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Learning', {
        mode: 'learn'
      });

      expect(result.sessions.length).toBeGreaterThan(0);
      result.sessions.forEach(session => {
        expect(session.mode).toBe('learn');
      });
    });
  });

  describe('Language Filtering', () => {
    it('should filter sessions by language', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        language: 'es'
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].language).toBe('es');
    });

    it('should filter English sessions', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        language: 'en'
      });

      expect(result.sessions.length).toBeGreaterThanOrEqual(3);
      result.sessions.forEach(session => {
        expect(session.language).toBe('en');
      });
    });

    it('should combine search with language filter', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Language', {
        language: 'ru'
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].language).toBe('ru');
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter sessions from a start date', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        dateFrom: '2024-03-01'
      });

      expect(result.sessions.length).toBeGreaterThanOrEqual(3);
      result.sessions.forEach(session => {
        expect(new Date(session.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date('2024-03-01').getTime()
        );
      });
    });

    it('should filter sessions to an end date', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        dateTo: '2024-02-28'
      });

      expect(result.sessions.length).toBeGreaterThanOrEqual(2);
      result.sessions.forEach(session => {
        expect(new Date(session.updatedAt).getTime()).toBeLessThanOrEqual(
          new Date('2024-02-28').getTime()
        );
      });
    });

    it('should filter sessions within a date range', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        dateFrom: '2024-02-01',
        dateTo: '2024-03-31'
      });

      expect(result.sessions.length).toBeGreaterThanOrEqual(2);
      result.sessions.forEach(session => {
        const sessionDate = new Date(session.updatedAt).getTime();
        expect(sessionDate).toBeGreaterThanOrEqual(new Date('2024-02-01').getTime());
        expect(sessionDate).toBeLessThanOrEqual(new Date('2024-03-31').getTime());
      });
    });

    it('should combine search with date range filter', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Learning', {
        dateFrom: '2024-01-01',
        dateTo: '2024-03-31'
      });

      expect(result.sessions.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters together', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        mode: 'learn',
        language: 'en',
        dateFrom: '2024-01-01',
        dateTo: '2024-04-30'
      });

      expect(result.sessions.length).toBeGreaterThanOrEqual(2);
      result.sessions.forEach(session => {
        expect(session.mode).toBe('learn');
        expect(session.language).toBe('en');
        const sessionDate = new Date(session.updatedAt).getTime();
        expect(sessionDate).toBeGreaterThanOrEqual(new Date('2024-01-01').getTime());
        expect(sessionDate).toBeLessThanOrEqual(new Date('2024-04-30').getTime());
      });
    });

    it('should combine search with all filters', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Learning', {
        mode: 'learn',
        language: 'en',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });

      result.sessions.forEach(session => {
        expect(session.mode).toBe('learn');
        expect(session.language).toBe('en');
      });
    });
  });

  describe('Pagination with Filters', () => {
    it('should paginate filtered results', async () => {
      const result = await SessionService.getUserSessions(testUserId, {
        mode: 'learn',
        page: 1,
        limit: 2
      });

      expect(result.sessions.length).toBeLessThanOrEqual(2);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });

    it('should paginate search results', async () => {
      const result = await SessionService.searchSessions(testUserId, 'Learning', {
        page: 1,
        limit: 1
      });

      expect(result.sessions.length).toBeLessThanOrEqual(1);
      expect(result.pagination.limit).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle search efficiently', async () => {
      const startTime = Date.now();

      await SessionService.searchSessions(testUserId, 'Learning');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle complex filters efficiently', async () => {
      const startTime = Date.now();

      await SessionService.getUserSessions(testUserId, {
        mode: 'learn',
        language: 'en',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });
  });
});
